import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAlbumViewQuery,
  resolveAlbumViewMode,
  resolvePhotoIdParam,
  shouldReplaceAlbumViewQuery,
} from "./album-gallery-url";

test("resolveAlbumViewMode accepts grid and gallery", () => {
  assert.equal(resolveAlbumViewMode("grid"), "grid");
  assert.equal(resolveAlbumViewMode("gallery"), "gallery");
});

test("resolveAlbumViewMode defaults unknown values to grid", () => {
  assert.equal(resolveAlbumViewMode(null), "grid");
  assert.equal(resolveAlbumViewMode("wall"), "grid");
  assert.equal(resolveAlbumViewMode("slideshow"), "grid");
});

test("resolvePhotoIdParam accepts positive integer photo ids", () => {
  assert.equal(resolvePhotoIdParam("123"), 123);
  assert.equal(resolvePhotoIdParam("001"), 1);
});

test("resolvePhotoIdParam rejects invalid photo ids", () => {
  assert.equal(resolvePhotoIdParam(null), null);
  assert.equal(resolvePhotoIdParam("0"), null);
  assert.equal(resolvePhotoIdParam("-1"), null);
  assert.equal(resolvePhotoIdParam("1.5"), null);
  assert.equal(resolvePhotoIdParam("abc"), null);
});

test("buildAlbumViewQuery preserves unrelated query params", () => {
  const query = buildAlbumViewQuery("token=abc", "gallery", 42);

  assert.equal(query, "token=abc&view=gallery&photo=42");
});

test("shouldReplaceAlbumViewQuery returns false when the query already matches", () => {
  assert.equal(
    shouldReplaceAlbumViewQuery("view=gallery&photo=42", "gallery", 42),
    false,
  );
});

test("shouldReplaceAlbumViewQuery returns true when view or photo changes", () => {
  assert.equal(shouldReplaceAlbumViewQuery("view=grid&photo=42", "gallery", 42), true);
  assert.equal(shouldReplaceAlbumViewQuery("view=gallery&photo=41", "gallery", 42), true);
});
