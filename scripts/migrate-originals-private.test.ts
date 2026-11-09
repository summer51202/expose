import assert from "node:assert/strict";
import test from "node:test";

import {
  formatSummary,
  planOriginalMigration,
  resolveLegacyOriginalKey,
} from "./migrate-originals-private.mjs";

const r2 = { storageBackend: "r2", publicBaseUrl: "https://pub-1.r2.dev" };
const local = { storageBackend: "local", publicBaseUrl: undefined };

test("migrates a legacy R2 original using its stored key", () => {
  assert.deepEqual(
    planOriginalMigration(
      {
        originalUrl: "https://pub-1.r2.dev/uploads/a-original.webp",
        originalKey: "uploads/a-original.webp",
        storageProvider: "r2",
      },
      r2,
    ),
    { action: "migrate", key: "uploads/a-original.webp" },
  );
});

test("migrates a legacy local JSON original without a stored key", () => {
  assert.deepEqual(planOriginalMigration({ originalUrl: "/uploads/b-original.webp" }, local), {
    action: "migrate",
    key: "uploads/b-original.webp",
  });
});

test("skips photos that are already private (re-runs are no-ops)", () => {
  assert.deepEqual(
    planOriginalMigration(
      { originalUrl: "private:uploads/c-original.webp", originalKey: "uploads/c-original.webp", storageProvider: "r2" },
      r2,
    ),
    { action: "already-private", key: "uploads/c-original.webp" },
  );
  assert.deepEqual(planOriginalMigration({ originalUrl: "private:uploads/d-original.webp" }, local), {
    action: "already-private",
    key: "uploads/d-original.webp",
  });
});

test("skips photos on another storage backend, samples, and unresolvable URLs", () => {
  const onLocal = planOriginalMigration(
    { originalUrl: "/uploads/e-original.webp", storageProvider: "local" },
    r2,
  );
  assert.equal(onLocal.action, "skip");
  assert.match(onLocal.reason, /stored on local but STORAGE_BACKEND=r2/);

  assert.equal(
    planOriginalMigration({ originalUrl: "", source: "sample" }, local).action,
    "skip",
  );

  const foreign = planOriginalMigration(
    { originalUrl: "https://elsewhere.example/f-original.webp", storageProvider: "r2" },
    r2,
  );
  assert.equal(foreign.action, "skip");
  assert.match(foreign.reason, /cannot resolve original key/);
});

test("ignores an originalKey that is really a URL (old JSON -> Prisma imports)", () => {
  assert.equal(
    resolveLegacyOriginalKey(
      {
        originalUrl: "https://pub-1.r2.dev/uploads/g-original.webp",
        originalKey: "https://pub-1.r2.dev/uploads/g-original.webp",
      },
      "https://pub-1.r2.dev/",
    ),
    "uploads/g-original.webp",
  );
  assert.equal(
    resolveLegacyOriginalKey({ originalUrl: "/uploads/h-original.webp", originalKey: "/uploads/h-original.webp" }),
    "uploads/h-original.webp",
  );
});

test("summary reports migrated, skipped and failed counts", () => {
  const counts = { migrated: 3, cleaned: 1, skipped: 2, failed: 0 };
  assert.match(formatSummary(counts, false), /Migrated 3, cleaned 1 .* skipped 2, failed 0/);
  assert.match(formatSummary(counts, true), /^DRY RUN: would migrate 3/);
});
