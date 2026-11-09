// One-off: moves photo originals (*-original.webp) from public storage to private storage.
//
//   npm run originals:migrate:private            # dry run: list what would move (default)
//   npm run originals:migrate:private -- --apply # actually move
//
// Reads DATA_BACKEND (json | prisma) and STORAGE_BACKEND (local | r2) the same way the app
// does. With r2, originals go from R2_BUCKET_NAME to R2_PRIVATE_BUCKET_NAME (same
// credentials and endpoint); with local, from public/uploads/ to storage/private/uploads/.
//
// Per photo, in order: copy to private -> read back and compare size + sha256 -> update the
// DB (originalUrl = "private:<key>", originalKey = <key>) -> delete the public copy.
// Safe to re-run: photos already marked private are skipped (a public copy left behind by an
// interrupted run is deleted once the private copy is confirmed). See
// docs/runbooks/railway-runbook.md for running it on Railway.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  getR2PrivateBucketName,
  isPrivateOriginalUrl,
  privateKeyFromOriginalUrl,
  resolvePrivateLocalPath,
  resolvePublicLocalPath,
  toPrivateOriginalUrl,
} from "./lib/private-originals.mjs";
import { deleteR2Object, getR2Config, getR2Object, headR2Object, putR2Object } from "./lib/r2-client.mjs";
import { loadEnvFile } from "./lib/script-env.mjs";

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, "data", "photos.json");

const normalizeKey = (key) => key.replace(/\\/g, "/").replace(/^\/+/, "");

/** Public storage key of a legacy original: the stored key, else derived from its URL. */
export function resolveLegacyOriginalKey(photo, publicBaseUrl) {
  // Old JSON -> Prisma imports copied the URL into originalKey; ignore keys that are URLs.
  if (photo.originalKey && !photo.originalKey.includes("://")) {
    return normalizeKey(photo.originalKey);
  }

  const url = photo.originalUrl;
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
 *   { action: "migrate", key }          original is public, move it
 *   { action: "already-private", key }  done before (check for a leftover public copy)
 *   { action: "skip", reason }          nothing this run can do
 */
export function planOriginalMigration(photo, { storageBackend, publicBaseUrl }) {
  if ((photo.source ?? "uploaded") !== "uploaded") {
    return { action: "skip", reason: "not an uploaded photo" };
  }

  if (isPrivateOriginalUrl(photo.originalUrl)) {
    const key =
      (photo.originalKey && normalizeKey(photo.originalKey)) || privateKeyFromOriginalUrl(photo.originalUrl);
    return key
      ? { action: "already-private", key }
      : { action: "skip", reason: `private marker without a key: ${photo.originalUrl}` };
  }

  const provider = photo.storageProvider === "r2" ? "r2" : "local";
  if (provider !== storageBackend) {
    return { action: "skip", reason: `stored on ${provider} but STORAGE_BACKEND=${storageBackend}` };
  }

  const key = resolveLegacyOriginalKey(photo, publicBaseUrl);
  if (!key) {
    return { action: "skip", reason: `cannot resolve original key from ${photo.originalUrl}` };
  }

  return { action: "migrate", key };
}

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

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

async function fileSizeOrNull(filePath) {
  try {
    return (await stat(filePath)).size;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function createLocalStorage() {
  const publicPath = (key) => resolvePublicLocalPath(projectRoot, key);
  const privatePath = (key) => resolvePrivateLocalPath(projectRoot, key);
  return {
    label: "local (public/uploads -> storage/private/uploads)",
    readPublic: (key) => readFileOrNull(publicPath(key)),
    publicSize: (key) => fileSizeOrNull(publicPath(key)),
    deletePublic: (key) => rm(publicPath(key), { force: true }),
    readPrivate: (key) => readFileOrNull(privatePath(key)),
    privateSize: (key) => fileSizeOrNull(privatePath(key)),
    async putPrivate(key, body) {
      const target = privatePath(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    },
  };
}

function createR2Storage(config, privateBucket) {
  const pub = config.bucketName;
  return {
    label: `r2 (${pub} -> ${privateBucket})`,
    readPublic: (key) => getR2Object(config, { key, bucket: pub }),
    publicSize: (key) => headR2Object(config, { key, bucket: pub }),
    deletePublic: (key) => deleteR2Object(config, { key, bucket: pub }),
    readPrivate: (key) => getR2Object(config, { key, bucket: privateBucket }),
    privateSize: (key) => headR2Object(config, { key, bucket: privateBucket }),
    async putPrivate(key, body) {
      await putR2Object(config, { key, body, contentType: "image/webp", bucket: privateBucket });
    },
  };
}

function createJsonStore() {
  let photos = [];
  return {
    label: "json (data/photos.json)",
    async list() {
      const content = (await readFile(manifestPath, "utf8")).replace(/^﻿/, "");
      photos = JSON.parse(content);
      return photos;
    },
    async markPrivate(photo, key) {
      photo.originalUrl = toPrivateOriginalUrl(key);
      photo.originalKey = key;
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
        select: { id: true, title: true, originalUrl: true, originalKey: true, storageProvider: true },
        orderBy: { createdAt: "asc" },
      });
      return photos.map((photo) => ({ ...photo, source: "uploaded" }));
    },
    async markPrivate(photo, key) {
      await prisma.photo.update({
        where: { id: photo.id },
        data: { originalUrl: toPrivateOriginalUrl(key), originalKey: key },
      });
    },
    async close() {
      await prisma.$disconnect();
    },
  };
}

/** Copy -> verify -> DB -> delete public. Returns a short note for the log. */
async function migrateOne(photo, key, storage, store) {
  const source = await storage.readPublic(key);

  if (!source) {
    // An earlier run may have copied it and lost the DB write; accept the private copy.
    const existing = await storage.privateSize(key);
    if (existing == null) {
      throw new Error(`original ${key} is in neither public nor private storage`);
    }
    await store.markPrivate(photo, key);
    return `public copy already gone; private copy (${existing} B) kept`;
  }

  await storage.putPrivate(key, source);

  const copied = await storage.readPrivate(key);
  if (!copied || copied.length !== source.length || sha256(copied) !== sha256(source)) {
    throw new Error(
      `verification failed for ${key}: public ${source.length} B, private ${copied ? copied.length : "missing"} B`,
    );
  }

  await store.markPrivate(photo, key);
  await storage.deletePublic(key);
  return `${source.length} B`;
}

export function formatSummary(counts, dryRun) {
  return dryRun
    ? `DRY RUN: would migrate ${counts.migrated}, would clean ${counts.cleaned} leftover public copies, ` +
        `skipped ${counts.skipped}, failed ${counts.failed}. Re-run with --apply to move them.`
    : `Migrated ${counts.migrated}, cleaned ${counts.cleaned} leftover public copies, ` +
        `skipped ${counts.skipped}, failed ${counts.failed}.`;
}

async function main() {
  loadEnvFile(projectRoot);
  const dryRun = !process.argv.includes("--apply");
  const storageBackend = process.env.STORAGE_BACKEND === "r2" ? "r2" : "local";
  const dataBackend = process.env.DATA_BACKEND === "prisma" ? "prisma" : "json";
  const r2Config = storageBackend === "r2" ? getR2Config() : null;
  const storage =
    storageBackend === "r2" ? createR2Storage(r2Config, getR2PrivateBucketName()) : createLocalStorage();
  const publicBaseUrl = r2Config?.publicBaseUrl ?? process.env.R2_PUBLIC_BASE_URL?.trim();
  const store = dataBackend === "prisma" ? await createPrismaStore() : createJsonStore();

  try {
    console.log(
      `Migrate originals to private storage — data: ${store.label}, storage: ${storage.label}` +
        `${dryRun ? ", DRY RUN (add --apply to move)" : ", APPLY"}`,
    );

    const photos = await store.list();
    const counts = { migrated: 0, cleaned: 0, skipped: 0, failed: 0 };

    for (const photo of photos) {
      const id = String(photo.id);
      const plan = planOriginalMigration(photo, { storageBackend, publicBaseUrl });

      if (plan.action === "skip") {
        counts.skipped += 1;
        if (plan.reason !== "not an uploaded photo") {
          console.warn(`  skip  ${id}: ${plan.reason}`);
        }
        continue;
      }

      try {
        if (plan.action === "already-private") {
          counts.skipped += 1;
          // Only on matching storage: a leftover public copy from an interrupted run.
          const provider = photo.storageProvider === "r2" ? "r2" : "local";
          if (provider !== storageBackend || (await storage.publicSize(plan.key)) == null) {
            continue;
          }
          if ((await storage.privateSize(plan.key)) == null) {
            throw new Error(`marked private but ${plan.key} is missing from private storage; public copy kept`);
          }
          counts.cleaned += 1;
          if (dryRun) {
            console.log(`  would clean ${id}: leftover public ${plan.key}`);
          } else {
            await storage.deletePublic(plan.key);
            console.log(`  clean ${id}: deleted leftover public ${plan.key}`);
          }
          continue;
        }

        if (dryRun) {
          counts.migrated += 1;
          const size = await storage.publicSize(plan.key);
          console.log(
            `  would ${id} "${photo.title}": ${plan.key}${size == null ? " (not in public storage!)" : ` (${size} B)`}`,
          );
          continue;
        }

        const note = await migrateOne(photo, plan.key, storage, store);
        counts.migrated += 1;
        console.log(`  moved ${id}: ${plan.key} (${note})`);
      } catch (error) {
        counts.failed += 1;
        console.error(`  FAIL  ${id}: ${error instanceof Error ? error.message : error}`);
      }
    }

    console.log(formatSummary(counts, dryRun) + ` (of ${photos.length} photos)`);
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
