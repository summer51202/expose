import test from "node:test";
import assert from "node:assert/strict";

import { getCommentStoreForSource } from "./comment-store";

test("getCommentStoreForSource keeps all json-backed comments in the manifest store", () => {
  assert.equal(getCommentStoreForSource("json", "sample"), "manifest");
  assert.equal(getCommentStoreForSource("json", "uploaded"), "manifest");
});

test("getCommentStoreForSource keeps sample comments in the manifest store when prisma is enabled", () => {
  assert.equal(getCommentStoreForSource("prisma", "sample"), "manifest");
});

test("getCommentStoreForSource sends uploaded comments to prisma when prisma is enabled", () => {
  assert.equal(getCommentStoreForSource("prisma", "uploaded"), "prisma");
});
