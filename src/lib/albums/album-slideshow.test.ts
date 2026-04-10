import test from "node:test";
import assert from "node:assert/strict";

import { buildAlbumSlideshowPhotos } from "./album-slideshow";

const photos = [
  {
    id: 1,
    albumId: 10,
    mediumUrl: "/a-1.jpg",
    thumbnailUrl: "/a-1-thumb.jpg",
    blurDataUrl: "blur-a1",
    title: "A1",
  },
  {
    id: 2,
    albumId: 10,
    mediumUrl: "/a-2.jpg",
    thumbnailUrl: "/a-2-thumb.jpg",
    blurDataUrl: "blur-a2",
    title: "A2",
  },
  {
    id: 3,
    albumId: 10,
    mediumUrl: "/a-3.jpg",
    thumbnailUrl: "/a-3-thumb.jpg",
    blurDataUrl: "blur-a3",
    title: "A3",
  },
  {
    id: 4,
    albumId: 20,
    mediumUrl: "/b-1.jpg",
    thumbnailUrl: "/b-1-thumb.jpg",
    blurDataUrl: "blur-b1",
    title: "B1",
  },
];

function createSequenceRandom(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

test("buildAlbumSlideshowPhotos only returns photos from the requested album", () => {
  const result = buildAlbumSlideshowPhotos(10, photos, 5, () => 0);

  assert.deepEqual(result.map((photo) => photo.id), [2, 3, 1]);
});

test("buildAlbumSlideshowPhotos respects the requested limit", () => {
  const result = buildAlbumSlideshowPhotos(10, photos, 2, () => 0);

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((photo) => photo.id), [2, 3]);
});

test("buildAlbumSlideshowPhotos returns an empty array when the album has no photos", () => {
  const result = buildAlbumSlideshowPhotos(999, photos, 3);

  assert.deepEqual(result, []);
});

test("buildAlbumSlideshowPhotos can randomize the selected album photos", () => {
  const result = buildAlbumSlideshowPhotos(10, photos, 2, createSequenceRandom([0.6, 0.1]));

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((photo) => photo.id), [3, 1]);
});

