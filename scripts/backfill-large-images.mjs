// Generates the 2560px `large` derivative for photos uploaded before it existed.
//
//   npm run images:backfill:large              # process photos missing largeUrl
//   npm run images:backfill:large -- --dry-run # only list what would be processed
//
// Reads DATA_BACKEND (json | prisma) and STORAGE_BACKEND (local | r2) the same way the
// app does. Originals marked `private:<key>` are read from private storage
// (R2_PRIVATE_BUCKET_NAME, or storage/private/ locally); legacy originals that have not
// been moved by originals:migrate:private yet are read from public storage. Safe to re-run: photos that already have largeUrl are skipped, and each
// photo is written back as soon as it is done.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import sharp from "sharp";

import {
  getR2PrivateBucketName,
  isPrivateOriginalUrl,
  privateKeyFromOriginalUrl,
  resolvePrivateLocalPath,
  resolvePublicLocalPath,
} from "./lib/private-originals.mjs";
import { getR2Config, getR2Object, putR2Object } from "./lib/r2-client.mjs";
import { loadEnvFile } from "./lib/script-env.mjs";

// Keep in sync with IMAGE_DERIVATIVES.large in src/lib/uploads/image-derivatives.ts.
export const LARGE_MAX_DIMENSION = 2560;
export const LARGE_WEBP_QUALITY = 85;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, "data", "photos.json");

/** Storage key of an asset: the stored key, else derived from a relative or R2 public URL. */
export function resolveStorageKey(url, key, publicBaseUrl) {
  if (key) {
    return key.replace(/^\/+/, "");
  }
  if (!url) {
    return null;
  }
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url.replace(/^\/+/, "");
  }
  const base = publicBaseUrl?.replace(/\/+$/, "");
  if (base && url.startsWith(`${base}/`)) {
    return url.slice(base.length + 1);
  }
  return null;
}

/** uploads/123-abc-original.webp -> uploads/123-abc-large.webp */
export function deriveLargeKey(originalKey) {
  if (/-original\.[^./]+$/.test(originalKey)) {
    return originalKey.replace(/-original\.[^./]+$/, "-large.webp");
  }
  return originalKey.replace(/(\.[^./]+)?$/, "-large.webp");
}

/** Decide what to do with one photo; pure so it can be unit-tested. */
export function planBackfill(photo, { storageBackend, publicBaseUrl }) {
  if (photo.largeUrl) {
    return { action: "skip", reason: "already has large" };
  }

  const provider = photo.storageProvider === "r2" ? "r2" : "local";
  if (provider !== storageBackend) {
    return {
      action: "skip",
      reason: `stored on ${provider} but STORAGE_BACKEND=${storageBackend} (run storage:migrate:r2 first)`,
    };
  }

  const originalPrivate = isPrivateOriginalUrl(photo.originalUrl);
  const originalKey = originalPrivate
    ? photo.originalKey?.replace(/^\/+/, "") || privateKeyFromOriginalUrl(photo.originalUrl)
    : resolveStorageKey(photo.originalUrl, photo.originalKey, publicBaseUrl);
  if (!originalKey) {
    return { action: "skip", reason: `cannot resolve original key from ${photo.originalUrl}` };
  }

  return { action: "process", originalKey, originalPrivate, largeKey: deriveLargeKey(originalKey) };
}

const resolveLocalPath = (key) => resolvePublicLocalPath(projectRoot, key);

/** Reads the original from private storage, or public storage for legacy photos. */
async function readOriginal(plan, storageBackend, r2Config) {
  if (storageBackend === "local") {
    return readFile(
      plan.originalPrivate
        ? resolvePrivateLocalPath(projectRoot, plan.originalKey)
        : resolveLocalPath(plan.originalKey),
    );
  }

  const bucket = plan.originalPrivate ? getR2PrivateBucketName() : r2Config.bucketName;
  const original = await getR2Object(r2Config, { key: plan.originalKey, bucket });
  if (!original) {
    throw new Error(`Original ${plan.originalKey} not found in bucket ${bucket}`);
  }
  return original;
}

export async function renderLarge(originalBuffer) {
  return sharp(originalBuffer)
    .rotate()
    .resize({
      width: LARGE_MAX_DIMENSION,
      height: LARGE_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: LARGE_WEBP_QUALITY })
    .toBuffer();
}

async function storeLarge(key, body, storageBackend, r2Config) {
  if (storageBackend === "r2") {
    return putR2Object(r2Config, { key, body, contentType: "image/webp", cacheControl: CACHE_CONTROL });
  }

  const absolutePath = resolveLocalPath(key);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, body);
  return { key, url: `/${key}` };
}

function createJsonStore() {
  let photos = [];
  return {
    label: "json (data/photos.json)",
    async list() {
      const content = (await readFile(manifestPath, "utf8")).replace(/^﻿/, "");
      photos = JSON.parse(content);
      return photos.filter((photo) => (photo.source ?? "uploaded") === "uploaded");
    },
    async saveLarge(photo, stored) {
      photo.largeUrl = stored.url;
      photo.largeKey = stored.key;
      await writeFile(manifestPath, JSON.stringify(photos, null, 2), "utf8");
    },
    async close() {},
  };
}

async function createPrismaStore() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  return {
    label: "prisma",
    async list() {
      return prisma.photo.findMany({
        select: {
          id: true,
          title: true,
          originalUrl: true,
          originalKey: true,
          largeUrl: true,
          largeKey: true,
          storageProvider: true,
        },
        orderBy: { createdAt: "asc" },
      });
    },
    async saveLarge(photo, stored) {
      await prisma.photo.update({
        where: { id: photo.id },
        data: { largeUrl: stored.url, largeKey: stored.key },
      });
    },
    async close() {
      await prisma.$disconnect();
    },
  };
}

async function main() {
  loadEnvFile(projectRoot);
  const dryRun = process.argv.includes("--dry-run");
  const storageBackend = process.env.STORAGE_BACKEND === "r2" ? "r2" : "local";
  const dataBackend = process.env.DATA_BACKEND === "prisma" ? "prisma" : "json";
  const r2Config = storageBackend === "r2" ? getR2Config() : null;
  const publicBaseUrl = r2Config?.publicBaseUrl ?? process.env.R2_PUBLIC_BASE_URL?.trim();
  const store = dataBackend === "prisma" ? await createPrismaStore() : createJsonStore();

  try {
    console.log(
      `Backfill large images — data: ${store.label}, storage: ${storageBackend}${dryRun ? ", DRY RUN" : ""}`,
    );

    const photos = await store.list();
    const counts = { processed: 0, alreadyDone: 0, skipped: 0, failed: 0 };

    for (const photo of photos) {
      const id = String(photo.id);
      const plan = planBackfill(photo, { storageBackend, publicBaseUrl });

      if (plan.action === "skip") {
        if (plan.reason === "already has large") {
          counts.alreadyDone += 1;
        } else {
          counts.skipped += 1;
          console.warn(`  skip  ${id}: ${plan.reason}`);
        }
        continue;
      }

      if (dryRun) {
        counts.processed += 1;
        console.log(`  would ${id} "${photo.title}": ${plan.originalKey} -> ${plan.largeKey}`);
        continue;
      }

      try {
        const original = await readOriginal(plan, storageBackend, r2Config);
        const largeBuffer = await renderLarge(original);
        const { width, height } = await sharp(largeBuffer).metadata();
        const stored = await storeLarge(plan.largeKey, largeBuffer, storageBackend, r2Config);
        await store.saveLarge(photo, stored);
        counts.processed += 1;
        console.log(`  done  ${id}: ${stored.key} (${width}x${height}, ${Math.round(largeBuffer.length / 1024)} KB)`);
      } catch (error) {
        counts.failed += 1;
        console.error(`  FAIL  ${id}: ${error instanceof Error ? error.message : error}`);
      }
    }

    console.log(
      `${dryRun ? "Would process" : "Processed"} ${counts.processed}, already had large ${counts.alreadyDone}, ` +
        `skipped ${counts.skipped}, failed ${counts.failed} (of ${photos.length} photos).`,
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
    console.error(error);
    process.exitCode = 1;
  });
}
