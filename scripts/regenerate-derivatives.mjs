// Re-renders the public derivatives (large / medium / thumbnail) of every photo from its
// original, with the current pipeline: watermark, LARGE_MAX_DIMENSION, copyright EXIF.
//
//   npm run images:regenerate                       # dry run: list what would change (default)
//   npm run images:regenerate -- --apply            # do it
//   npm run images:regenerate -- --apply --limit 1  # only the first photo that needs it (spot check)
//   npm run images:regenerate -- --apply --only <photo id>
//
// Reads DATA_BACKEND (json | prisma) and STORAGE_BACKEND (local | r2) the same way the app
// does. Originals marked `private:<key>` are read from private storage (R2_PRIVATE_BUCKET_NAME,
// or storage/private/ locally); legacy originals still in public storage are read from there.
//
// New derivatives get new, versioned keys (`<base>-large.v2.webp`, see DERIVATIVE_VERSION in
// src/lib/uploads/derivative-render.mjs), so copies cached by the CDN or browsers under the
// old URLs are never served again. Per photo, in order: render -> upload the new keys ->
// update the DB (URLs, keys, and width/height if they differ from the original) -> delete
// the old keys. Safe to re-run: photos already on the current keys are skipped, and old
// keys left behind by an interrupted run are deleted then. See docs/runbooks/railway-runbook.md.
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  DERIVATIVE_CACHE_CONTROL,
  DERIVATIVE_VERSION,
  IMAGE_DERIVATIVES,
  baseKeyFromOriginalKey,
  currentDerivativeKeys,
  previousDerivativeKeys,
  renderAllDerivatives,
} from "../src/lib/uploads/derivative-render.mjs";
import {
  getR2PrivateBucketName,
  isPrivateOriginalUrl,
  privateKeyFromOriginalUrl,
  resolvePrivateLocalPath,
  resolvePublicLocalPath,
} from "./lib/private-originals.mjs";
import { deleteR2Object, getR2Config, getR2Object, headR2Object, putR2Object } from "./lib/r2-client.mjs";
import { loadEnvFile } from "./lib/script-env.mjs";
import { readPhotographerName } from "./lib/site-config.mjs";

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, "data", "photos.json");
const DERIVATIVE_NAMES = /** @type {const} */ (["large", "medium", "thumbnail"]);

const normalizeKey = (key) => key.replace(/\\/g, "/").replace(/^\/+/, "");

/** Public storage key of an asset: the stored key, else derived from its relative or R2 URL. */
export function resolvePublicKey(url, key, publicBaseUrl) {
  // Old JSON -> Prisma imports copied URLs into the key columns; ignore keys that are URLs.
  if (key && !key.includes("://")) {
    return normalizeKey(key);
  }
  if (!url) {
    return null;
  }
  if (url.startsWith("/") && !url.startsWith("//")) {
    return normalizeKey(url);
  }
  const base = publicBaseUrl?.replace(/\/+$/, "");
  if (base && url.startsWith(`${base}/`)) {
    return normalizeKey(url.slice(base.length + 1));
  }
  return null;
}

/**
 * What to do with one photo; pure so it can be unit-tested.
 *   { action: "regenerate", originalKey, originalPrivate, baseKey, newKeys, staleKeys }
 *   { action: "current", baseKey, leftoverCandidates }  already on the current keys
 *   { action: "skip", reason }
 */
export function planRegeneration(photo, { storageBackend, publicBaseUrl }) {
  if ((photo.source ?? "uploaded") !== "uploaded") {
    return { action: "skip", reason: "not an uploaded photo" };
  }

  const provider = photo.storageProvider === "r2" ? "r2" : "local";
  if (provider !== storageBackend) {
    return { action: "skip", reason: `stored on ${provider} but STORAGE_BACKEND=${storageBackend}` };
  }

  const originalPrivate = isPrivateOriginalUrl(photo.originalUrl);
  const originalKey = originalPrivate
    ? (photo.originalKey && normalizeKey(photo.originalKey)) || privateKeyFromOriginalUrl(photo.originalUrl)
    : resolvePublicKey(photo.originalUrl, photo.originalKey, publicBaseUrl);
  const baseKey = baseKeyFromOriginalKey(originalKey);
  if (!originalKey || !baseKey) {
    return { action: "skip", reason: `cannot resolve original key from ${photo.originalUrl}` };
  }

  const newKeys = currentDerivativeKeys(baseKey);
  const oldKeys = {
    large: resolvePublicKey(photo.largeUrl, photo.largeKey, publicBaseUrl),
    medium: resolvePublicKey(photo.mediumUrl, photo.mediumKey, publicBaseUrl),
    thumbnail: resolvePublicKey(photo.thumbnailUrl, photo.thumbnailKey, publicBaseUrl),
  };

  if (DERIVATIVE_NAMES.every((name) => oldKeys[name] === newKeys[name])) {
    return { action: "current", baseKey, leftoverCandidates: previousDerivativeKeys(baseKey) };
  }

  const keep = new Set([...Object.values(newKeys), originalKey]);
  const staleKeys = [...new Set(Object.values(oldKeys).filter((key) => key && !keep.has(key)))];

  return { action: "regenerate", originalKey, originalPrivate, baseKey, newKeys, staleKeys };
}

async function readFileOrNull(filePath) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function createLocalStorage() {
  const publicPath = (key) => resolvePublicLocalPath(projectRoot, key);
  return {
    label: "local (public/uploads, originals from storage/private/uploads)",
    readOriginal: (key, isPrivate) =>
      readFileOrNull(isPrivate ? resolvePrivateLocalPath(projectRoot, key) : publicPath(key)),
    async putPublic(key, body) {
      const target = publicPath(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
      return { key, url: `/${key}` };
    },
    publicExists: (key) => fileExists(publicPath(key)),
    deletePublic: (key) => rm(publicPath(key), { force: true }),
  };
}

function createR2Storage(config, privateBucket) {
  const pub = config.bucketName;
  return {
    label: `r2 (${pub}, originals from ${privateBucket})`,
    readOriginal: (key, isPrivate) => getR2Object(config, { key, bucket: isPrivate ? privateBucket : pub }),
    putPublic: (key, body) =>
      putR2Object(config, { key, body, contentType: "image/webp", cacheControl: DERIVATIVE_CACHE_CONTROL }),
    publicExists: async (key) => (await headR2Object(config, { key, bucket: pub })) != null,
    deletePublic: (key) => deleteR2Object(config, { key, bucket: pub }),
  };
}

const assetFields = (stored, size) => ({
  largeUrl: stored.large.url,
  largeKey: stored.large.key,
  mediumUrl: stored.medium.url,
  mediumKey: stored.medium.key,
  thumbnailUrl: stored.thumbnail.url,
  thumbnailKey: stored.thumbnail.key,
  ...(size ? { width: size.width, height: size.height } : {}),
});

function createJsonStore() {
  let photos = [];
  return {
    label: "json (data/photos.json)",
    async list() {
      const content = (await readFile(manifestPath, "utf8")).replace(/^﻿/, "");
      photos = JSON.parse(content);
      return photos;
    },
    async saveDerivatives(photo, stored, size) {
      Object.assign(photo, assetFields(stored, size));
      await writeFile(manifestPath, JSON.stringify(photos, null, 2), "utf8");
    },
    async close() {},
  };
}

/** Prisma store. Refuses a file: DATABASE_URL whose file is missing (e.g. `railway run` on a laptop). */
async function createPrismaStore() {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (databaseUrl.startsWith("file:")) {
    const filePart = databaseUrl.slice("file:".length).split("?")[0];
    const dbPath = path.isAbsolute(filePart) ? filePart : path.resolve(projectRoot, "prisma", filePart);
    if (!existsSync(dbPath)) {
      throw new Error(
        `DATABASE_URL points to ${dbPath}, which does not exist here. On Railway, run this inside the ` +
          "service (railway ssh) where the /data volume is mounted, not with `railway run` on your machine.",
      );
    }
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  return {
    label: `prisma (${databaseUrl.startsWith("file:") ? databaseUrl : "DATABASE_URL"})`,
    async list() {
      const photos = await prisma.photo.findMany({
        select: {
          id: true,
          title: true,
          originalUrl: true,
          originalKey: true,
          largeUrl: true,
          largeKey: true,
          mediumUrl: true,
          mediumKey: true,
          thumbnailUrl: true,
          thumbnailKey: true,
          storageProvider: true,
          width: true,
          height: true,
        },
        orderBy: { createdAt: "asc" },
      });
      return photos.map((photo) => ({ ...photo, source: "uploaded" }));
    },
    async saveDerivatives(photo, stored, size) {
      await prisma.photo.update({ where: { id: photo.id }, data: assetFields(stored, size) });
    },
    async close() {
      await prisma.$disconnect();
    },
  };
}

/** Render -> upload new keys -> DB -> delete stale keys. Returns a short note for the log. */
async function regenerateOne(photo, plan, storage, store, photographerName) {
  const original = await storage.readOriginal(plan.originalKey, plan.originalPrivate);
  if (!original) {
    throw new Error(
      `original ${plan.originalKey} not found in ${plan.originalPrivate ? "private" : "public"} storage`,
    );
  }

  const rendered = await renderAllDerivatives(original, { photographerName, projectRoot });
  const stored = {};
  for (const name of DERIVATIVE_NAMES) {
    stored[name] = await storage.putPublic(plan.newKeys[name], rendered[name]);
  }

  // width/height are the original's displayed size (the gallery uses them for aspect ratio).
  const sizeChanged = rendered.width !== photo.width || rendered.height !== photo.height;
  await store.saveDerivatives(photo, stored, sizeChanged ? rendered : null);

  for (const key of plan.staleKeys) {
    await storage.deletePublic(key);
  }

  const kb = Math.round(rendered.large.length / 1024);
  return (
    `${plan.newKeys.large} (${kb} KB), deleted ${plan.staleKeys.length} old` +
    (sizeChanged ? `, size ${photo.width}x${photo.height} -> ${rendered.width}x${rendered.height}` : "")
  );
}

export function parseArgs(argv) {
  const valueOf = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const limitValue = valueOf("--limit");
  const limit = limitValue == null ? Infinity : Number(limitValue);
  if (!(limit > 0)) {
    throw new Error(`--limit needs a positive number, got ${limitValue}`);
  }
  return { apply: argv.includes("--apply"), limit, only: valueOf("--only") ?? null };
}

export function formatSummary(counts, dryRun) {
  return dryRun
    ? `DRY RUN: would regenerate ${counts.regenerated}, would clean ${counts.cleaned} leftover old files, ` +
        `already current ${counts.current}, skipped ${counts.skipped}, failed ${counts.failed}. ` +
        "Re-run with --apply to write them."
    : `Regenerated ${counts.regenerated}, cleaned ${counts.cleaned} leftover old files, ` +
        `already current ${counts.current}, skipped ${counts.skipped}, failed ${counts.failed}.`;
}

async function main() {
  loadEnvFile(projectRoot);
  const { apply, limit, only } = parseArgs(process.argv.slice(2));
  const dryRun = !apply;
  const storageBackend = process.env.STORAGE_BACKEND === "r2" ? "r2" : "local";
  const dataBackend = process.env.DATA_BACKEND === "prisma" ? "prisma" : "json";
  const r2Config = storageBackend === "r2" ? getR2Config() : null;
  const storage =
    storageBackend === "r2" ? createR2Storage(r2Config, getR2PrivateBucketName()) : createLocalStorage();
  const publicBaseUrl = r2Config?.publicBaseUrl ?? process.env.R2_PUBLIC_BASE_URL?.trim();
  const photographerName = readPhotographerName(projectRoot);
  const store = dataBackend === "prisma" ? await createPrismaStore() : createJsonStore();

  try {
    const large = IMAGE_DERIVATIVES.large.maxDimension;
    console.log(
      `Regenerate derivatives (v${DERIVATIVE_VERSION}, large ${large}px, watermark "${photographerName}") — ` +
        `data: ${store.label}, storage: ${storage.label}${dryRun ? ", DRY RUN (add --apply to write)" : ", APPLY"}` +
        (Number.isFinite(limit) ? `, limit ${limit}` : "") +
        (only ? `, only ${only}` : ""),
    );

    const photos = (await store.list()).filter((photo) => !only || String(photo.id) === only);
    const counts = { regenerated: 0, cleaned: 0, current: 0, skipped: 0, failed: 0, deferred: 0 };

    for (const photo of photos) {
      const id = String(photo.id);
      const plan = planRegeneration(photo, { storageBackend, publicBaseUrl });

      if (plan.action === "skip") {
        counts.skipped += 1;
        if (plan.reason !== "not an uploaded photo") {
          console.warn(`  skip  ${id}: ${plan.reason}`);
        }
        continue;
      }

      try {
        if (plan.action === "current") {
          counts.current += 1;
          // Old keys left behind when an earlier run stopped between the DB update and the delete.
          const exists = await Promise.all(plan.leftoverCandidates.map((key) => storage.publicExists(key)));
          const leftovers = plan.leftoverCandidates.filter((_, index) => exists[index]);
          for (const key of leftovers) {
            counts.cleaned += 1;
            if (dryRun) {
              console.log(`  would clean ${id}: leftover ${key}`);
            } else {
              await storage.deletePublic(key);
              console.log(`  clean ${id}: deleted leftover ${key}`);
            }
          }
          continue;
        }

        if (counts.regenerated >= limit) {
          counts.deferred += 1;
          continue;
        }

        if (dryRun) {
          counts.regenerated += 1;
          console.log(
            `  would ${id} "${photo.title}": ${plan.originalPrivate ? "private" : "public"} ${plan.originalKey} -> ` +
              `${plan.newKeys.large} (+medium, thumb); delete ${plan.staleKeys.join(", ") || "nothing"}`,
          );
          continue;
        }

        const note = await regenerateOne(photo, plan, storage, store, photographerName);
        counts.regenerated += 1;
        console.log(`  done  ${id}: ${note}`);
      } catch (error) {
        counts.failed += 1;
        console.error(`  FAIL  ${id}: ${error instanceof Error ? error.message : error}`);
      }
    }

    console.log(
      formatSummary(counts, dryRun) +
        ` (of ${photos.length} photos)` +
        (counts.deferred ? ` ${counts.deferred} more left for a later run (--limit).` : ""),
    );
    if (counts.failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    await store.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
