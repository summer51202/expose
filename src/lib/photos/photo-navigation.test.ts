import test from "node:test";
import assert from "node:assert/strict";

import {
  filterAlbumPhotos,
  findPhotoNeighbors,
  getScopedPhotoNeighbors,
  resolvePhotoNavigationScope,
} from "./photo-navigation";

type P = { id: number; source: string; albumId?: number | null };

// Site-wide order, newest first (what listUploadedPhotos returns).
const photos: P[] = [
  { id: 10, source: "uploaded", albumId: 1 },
  { id: 9, source: "uploaded", albumId: 2 },
  { id: 8, source: "uploaded", albumId: 1 },
  { id: 7, source: "uploaded", albumId: null },
  { id: 6, source: "uploaded", albumId: 1 },
  { id: 5, source: "uploaded", albumId: 2 },
];

const albums = [
  { id: 1, slug: "tokyo" },
  { id: 2, slug: "kyoto" },
];

test("filterAlbumPhotos keeps repository order and only the album's photos", () => {
  assert.deepEqual(
    filterAlbumPhotos(photos, 1).map((photo) => photo.id),
    [10, 8, 6],
  );
});

test("findPhotoNeighbors returns previous/next without wrapping", () => {
  const list = [{ id: 3 }, { id: 2 }, { id: 1 }];

  assert.deepEqual(findPhotoNeighbors(list, 3), { previous: null, next: { id: 2 }, index: 0, total: 3 });
  assert.deepEqual(findPhotoNeighbors(list, 2), { previous: { id: 3 }, next: { id: 1 }, index: 1, total: 3 });
  assert.deepEqual(findPhotoNeighbors(list, 1), { previous: { id: 2 }, next: null, index: 2, total: 3 });
});

test("findPhotoNeighbors handles a missing photo and a single-photo list", () => {
  assert.deepEqual(findPhotoNeighbors([{ id: 1 }], 99), { previous: null, next: null, index: -1, total: 1 });
  assert.deepEqual(findPhotoNeighbors([{ id: 1 }], 1), { previous: null, next: null, index: 0, total: 1 });
});

test("neighbors stay inside the photo's album", () => {
  const first = getScopedPhotoNeighbors(photos[0], photos, albums, "tokyo");
  assert.deepEqual(first.scope, { kind: "album", albumId: 1, albumSlug: "tokyo" });
  assert.equal(first.previous, null);
  assert.equal(first.next?.id, 8);

  const middle = getScopedPhotoNeighbors(photos[2], photos, albums, "tokyo");
  assert.equal(middle.previous?.id, 10);
  assert.equal(middle.next?.id, 6);

  const last = getScopedPhotoNeighbors(photos[4], photos, albums, "tokyo");
  assert.equal(last.previous?.id, 8);
  assert.equal(last.next, null, "last photo of the album has no next");
  assert.equal(last.index, 2);
  assert.equal(last.total, 3);
});

test("without returnAlbum the photo's own album is used", () => {
  const result = getScopedPhotoNeighbors(photos[1], photos, albums, undefined);
  assert.deepEqual(result.scope, { kind: "album", albumId: 2, albumSlug: "kyoto" });
  assert.equal(result.previous, null);
  assert.equal(result.next?.id, 5);
});

test("returnAlbum slug matching ignores case and URL encoding", () => {
  const scope = resolvePhotoNavigationScope(photos[0], [{ id: 1, slug: "Tokyo Trip" }], "tokyo%20trip");
  assert.deepEqual(scope, { kind: "album", albumId: 1, albumSlug: "Tokyo Trip" });
});

test("returnAlbum the photo is not in falls back to its own album", () => {
  const scope = resolvePhotoNavigationScope(photos[0], albums, "kyoto");
  assert.deepEqual(scope, { kind: "album", albumId: 1, albumSlug: "tokyo" });
});

test("malformed returnAlbum does not throw", () => {
  const scope = resolvePhotoNavigationScope(photos[0], albums, "100%");
  assert.deepEqual(scope, { kind: "album", albumId: 1, albumSlug: "tokyo" });
});

test("photos without an album use the site-wide order", () => {
  const result = getScopedPhotoNeighbors(photos[3], photos, albums, null);
  assert.deepEqual(result.scope, { kind: "all" });
  assert.equal(result.previous?.id, 8);
  assert.equal(result.next?.id, 6);
  assert.equal(result.total, photos.length);
});

test("photo pointing at a deleted album falls back to site-wide order", () => {
  const orphan = { id: 4, source: "uploaded", albumId: 99 };
  assert.deepEqual(resolvePhotoNavigationScope(orphan, albums, "tokyo"), { kind: "all" });
});

test("sample photos never use album scope", () => {
  const sample = { id: 1, source: "sample", albumId: 1 };
  assert.deepEqual(resolvePhotoNavigationScope(sample, albums, "tokyo"), { kind: "all" });
});
