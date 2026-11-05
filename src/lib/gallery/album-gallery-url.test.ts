import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAlbumReturnHref,
  buildAlbumViewQuery,
  buildPhotoDetailHref,
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

test("buildAlbumReturnHref encodes the slug and keeps view + photo", () => {
  assert.equal(buildAlbumReturnHref("tokyo", "grid", 42), "/albums/tokyo?view=grid&photo=42");
  assert.equal(buildAlbumReturnHref("台北 2026", "gallery", 7), "/albums/%E5%8F%B0%E5%8C%97%202026?view=gallery&photo=7");
  assert.equal(buildAlbumReturnHref("tokyo", "grid", null), "/albums/tokyo?view=grid");
});

test("buildPhotoDetailHref without return state is the bare photo path", () => {
  assert.equal(buildPhotoDetailHref({ source: "uploaded", id: 5 }), "/photos/uploaded/5");
  assert.equal(buildPhotoDetailHref({ source: "uploaded", id: 5 }, null), "/photos/uploaded/5");
});

test("buildPhotoDetailHref carries album + view and points returnPhoto at the target", () => {
  const href = buildPhotoDetailHref({ source: "uploaded", id: 9 }, { album: "tokyo", view: "gallery" });
  assert.equal(href, "/photos/uploaded/9?returnAlbum=tokyo&returnView=gallery&returnPhoto=9");
});

test("buildPhotoDetailHref round-trips special characters in the album slug", () => {
  const href = buildPhotoDetailHref({ source: "uploaded", id: 3 }, { album: "a&b=c 台", view: "grid" });
  const params = new URL(href, "http://x").searchParams;
  assert.equal(params.get("returnAlbum"), "a&b=c 台");
  assert.equal(params.get("returnView"), "grid");
  assert.equal(params.get("returnPhoto"), "3");
});
