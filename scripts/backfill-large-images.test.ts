import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import {
  LARGE_MAX_DIMENSION,
  LARGE_WEBP_QUALITY,
  deriveLargeKey,
  planBackfill,
  renderLarge,
} from "./backfill-large-images.mjs";
import { IMAGE_DERIVATIVES } from "../src/lib/uploads/image-derivatives";

const local = { storageBackend: "local", publicBaseUrl: undefined };

test("backfill constants stay in sync with the upload pipeline", () => {
  assert.equal(LARGE_MAX_DIMENSION, IMAGE_DERIVATIVES.large.maxDimension);
  assert.equal(LARGE_WEBP_QUALITY, IMAGE_DERIVATIVES.large.quality);
});

test("deriveLargeKey sits next to the original", () => {
  assert.equal(deriveLargeKey("uploads/1-ab-photo-original.webp"), "uploads/1-ab-photo-large.webp");
  assert.equal(deriveLargeKey("uploads/legacy.jpg"), "uploads/legacy-large.webp");
});

test("planBackfill skips photos that already have large (re-runs are no-ops)", () => {
  const plan = planBackfill({ originalUrl: "/uploads/a-original.webp", largeUrl: "/uploads/a-large.webp" }, local);
  assert.deepEqual(plan, { action: "skip", reason: "already has large" });
});

test("planBackfill derives keys for legacy JSON photos without stored keys", () => {
  assert.deepEqual(planBackfill({ originalUrl: "/uploads/a-original.webp" }, local), {
    action: "process",
    originalKey: "uploads/a-original.webp",
    largeKey: "uploads/a-large.webp",
  });
});

test("planBackfill uses the stored R2 key", () => {
  const plan = planBackfill(
    {
      originalUrl: "https://pub-1.r2.dev/uploads/b-original.webp",
      originalKey: "uploads/b-original.webp",
      storageProvider: "r2",
    },
    { storageBackend: "r2", publicBaseUrl: "https://pub-1.r2.dev" },
  );
  assert.equal(plan.action, "process");
  assert.equal(plan.largeKey, "uploads/b-large.webp");
});

test("planBackfill refuses to split a photo across storages", () => {
  const plan = planBackfill({ originalUrl: "/uploads/c-original.webp", storageProvider: "local" }, {
    storageBackend: "r2",
    publicBaseUrl: "https://pub-1.r2.dev",
  });
  assert.equal(plan.action, "skip");
  assert.match(plan.reason ?? "", /storage:migrate:r2/);
});

test("renderLarge caps the long edge at 2560 and never enlarges", async () => {
  const make = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: "#456" } }).webp().toBuffer();

  const big = await sharp(await renderLarge(await make(5000, 3000))).metadata();
  assert.deepEqual([big.width, big.height, big.format], [2560, 1536, "webp"]);

  const small = await sharp(await renderLarge(await make(900, 600))).metadata();
  assert.deepEqual([small.width, small.height], [900, 600]);
});
