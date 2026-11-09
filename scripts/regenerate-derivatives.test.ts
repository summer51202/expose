import assert from "node:assert/strict";
import test from "node:test";

import { parsePhotographerName, readPhotographerName } from "./lib/site-config.mjs";
import { formatSummary, parseArgs, planRegeneration, resolvePublicKey } from "./regenerate-derivatives.mjs";
import { siteConfig } from "../src/config/site";

const local = { storageBackend: "local", publicBaseUrl: undefined };
const r2 = { storageBackend: "r2", publicBaseUrl: "https://pub.example.r2.dev" };

const legacyLocal = {
  id: 1,
  source: "uploaded",
  storageProvider: "local",
  originalUrl: "/uploads/1-ab-photo-original.webp",
  mediumUrl: "/uploads/1-ab-photo-medium.webp",
  thumbnailUrl: "/uploads/1-ab-photo-thumb.webp",
};

const privateR2 = {
  id: 2,
  storageProvider: "r2",
  originalUrl: "private:uploads/2-cd-pic-original.webp",
  originalKey: "uploads/2-cd-pic-original.webp",
  largeUrl: "https://pub.example.r2.dev/uploads/2-cd-pic-large.webp",
  largeKey: "uploads/2-cd-pic-large.webp",
  mediumUrl: "https://pub.example.r2.dev/uploads/2-cd-pic-medium.webp",
  mediumKey: "uploads/2-cd-pic-medium.webp",
  thumbnailUrl: "https://pub.example.r2.dev/uploads/2-cd-pic-thumb.webp",
  thumbnailKey: "uploads/2-cd-pic-thumb.webp",
};

test("the script uses the app's photographer name", () => {
  assert.equal(readPhotographerName(), siteConfig.photographerName);
  assert.equal(parsePhotographerName(`photographerName: 'A & B',`), "A & B");
  assert.throws(() => parsePhotographerName("name: 'x'"));
});

test("resolvePublicKey prefers keys, ignores keys that are URLs, and derives from URLs", () => {
  assert.equal(resolvePublicKey("/uploads/a.webp", null, undefined), "uploads/a.webp");
  assert.equal(resolvePublicKey("x", "/uploads/k.webp", undefined), "uploads/k.webp");
  assert.equal(
    resolvePublicKey("https://pub.example.r2.dev/uploads/a.webp", "https://pub.example.r2.dev/uploads/a.webp", r2.publicBaseUrl),
    "uploads/a.webp",
  );
  assert.equal(resolvePublicKey("https://elsewhere.example/a.webp", null, r2.publicBaseUrl), null);
  assert.equal(resolvePublicKey(null, null, undefined), null);
});

test("planRegeneration moves a private-original R2 photo to v2 keys and deletes the old ones", () => {
  assert.deepEqual(planRegeneration(privateR2, r2), {
    action: "regenerate",
    originalKey: "uploads/2-cd-pic-original.webp",
    originalPrivate: true,
    baseKey: "uploads/2-cd-pic",
    newKeys: {
      large: "uploads/2-cd-pic-large.v2.webp",
      medium: "uploads/2-cd-pic-medium.v2.webp",
      thumbnail: "uploads/2-cd-pic-thumb.v2.webp",
    },
    staleKeys: ["uploads/2-cd-pic-large.webp", "uploads/2-cd-pic-medium.webp", "uploads/2-cd-pic-thumb.webp"],
  });
});

test("planRegeneration handles legacy local photos: public original, no large", () => {
  const plan = planRegeneration(legacyLocal, local);
  assert.equal(plan.action, "regenerate");
  assert.equal(plan.originalPrivate, false);
  assert.equal(plan.originalKey, "uploads/1-ab-photo-original.webp");
  assert.deepEqual(plan.staleKeys, ["uploads/1-ab-photo-medium.webp", "uploads/1-ab-photo-thumb.webp"]);
});

test("planRegeneration never deletes the original, even if a derivative URL points at it", () => {
  const plan = planRegeneration({ ...legacyLocal, largeUrl: "/uploads/1-ab-photo-original.webp" }, local);
  assert.equal(plan.action, "regenerate");
  assert.ok(!plan.staleKeys?.includes("uploads/1-ab-photo-original.webp"));
});

test("planRegeneration leaves photos on the current keys alone (re-runs are no-ops)", () => {
  const done = {
    ...privateR2,
    largeKey: "uploads/2-cd-pic-large.v2.webp",
    mediumKey: "uploads/2-cd-pic-medium.v2.webp",
    thumbnailKey: "uploads/2-cd-pic-thumb.v2.webp",
  };
  const plan = planRegeneration(done, r2);
  assert.equal(plan.action, "current");
  assert.ok(plan.leftoverCandidates?.includes("uploads/2-cd-pic-large.webp"));
  assert.ok(!plan.leftoverCandidates?.includes("uploads/2-cd-pic-large.v2.webp"));
});

test("planRegeneration redoes a photo where only some derivatives are current", () => {
  const partial = { ...privateR2, largeKey: "uploads/2-cd-pic-large.v2.webp" };
  const plan = planRegeneration(partial, r2);
  assert.equal(plan.action, "regenerate");
  assert.deepEqual(plan.staleKeys, ["uploads/2-cd-pic-medium.webp", "uploads/2-cd-pic-thumb.webp"]);
});

test("planRegeneration skips what it cannot or should not touch", () => {
  assert.deepEqual(planRegeneration({ ...legacyLocal, source: "sample" }, local), {
    action: "skip",
    reason: "not an uploaded photo",
  });
  assert.equal(planRegeneration(privateR2, local).action, "skip");
  assert.equal(planRegeneration({ ...privateR2, originalUrl: "https://elsewhere/x.jpg", originalKey: null }, r2).action, "skip");
});

test("parseArgs defaults to a dry run", () => {
  assert.deepEqual(parseArgs([]), { apply: false, limit: Infinity, only: null });
  assert.deepEqual(parseArgs(["--apply", "--limit", "1"]), { apply: true, limit: 1, only: null });
  assert.deepEqual(parseArgs(["--only", "42"]), { apply: false, limit: Infinity, only: "42" });
  assert.throws(() => parseArgs(["--limit", "0"]));
});

test("formatSummary says when nothing was written", () => {
  const counts = { regenerated: 3, cleaned: 1, current: 2, skipped: 0, failed: 0 };
  assert.match(formatSummary(counts, true), /^DRY RUN: would regenerate 3/);
  assert.match(formatSummary(counts, false), /^Regenerated 3, cleaned 1 leftover old files, already current 2/);
});
