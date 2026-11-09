import assert from "node:assert/strict";
import test from "node:test";

import {
  PRIVATE_ORIGINAL_URL_PREFIX,
  isPrivateOriginalUrl,
  privateKeyFromOriginalUrl,
  toPrivateOriginalUrl,
} from "./private-original";
import * as scriptHelpers from "../../../scripts/lib/private-originals.mjs";

test("toPrivateOriginalUrl turns a key into a private marker, never a URL", () => {
  assert.equal(toPrivateOriginalUrl("uploads/a-original.webp"), "private:uploads/a-original.webp");
  assert.equal(toPrivateOriginalUrl("/uploads/a-original.webp"), "private:uploads/a-original.webp");
  assert.equal(toPrivateOriginalUrl("uploads\\a-original.webp"), "private:uploads/a-original.webp");
  assert.throws(() => toPrivateOriginalUrl(""));
  assert.throws(() => toPrivateOriginalUrl("/"));
});

test("privateKeyFromOriginalUrl round-trips the key and ignores public URLs", () => {
  const key = "uploads/1-ab-photo-original.webp";
  assert.equal(privateKeyFromOriginalUrl(toPrivateOriginalUrl(key)), key);
  assert.equal(privateKeyFromOriginalUrl("https://pub-1.r2.dev/uploads/a-original.webp"), null);
  assert.equal(privateKeyFromOriginalUrl("/uploads/a-original.webp"), null);
  assert.equal(privateKeyFromOriginalUrl("private:"), null);
  assert.equal(privateKeyFromOriginalUrl(undefined), null);
});

test("isPrivateOriginalUrl tells migrated records from legacy ones", () => {
  assert.equal(isPrivateOriginalUrl("private:uploads/a-original.webp"), true);
  assert.equal(isPrivateOriginalUrl("https://pub-1.r2.dev/uploads/a-original.webp"), false);
  assert.equal(isPrivateOriginalUrl("/uploads/a-original.webp"), false);
  assert.equal(isPrivateOriginalUrl(""), false);
  assert.equal(isPrivateOriginalUrl(null), false);
});

test("the script helpers use the same marker as the app", () => {
  assert.equal(scriptHelpers.PRIVATE_ORIGINAL_URL_PREFIX, PRIVATE_ORIGINAL_URL_PREFIX);
  const key = "uploads/x-original.webp";
  assert.equal(scriptHelpers.toPrivateOriginalUrl(key), toPrivateOriginalUrl(key));
  assert.equal(scriptHelpers.privateKeyFromOriginalUrl(toPrivateOriginalUrl(key)), key);
});
