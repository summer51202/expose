import assert from "node:assert/strict";
import test from "node:test";

import { getPhotoDeleteError, getPhotoStorageKeys } from "./photo-delete";

test("getPhotoDeleteError requires at least one photo id", () => {
  assert.equal(
    getPhotoDeleteError([]),
    "Please choose at least one photo to delete.",
  );
});

test("getPhotoDeleteError accepts valid photo ids", () => {
  assert.equal(getPhotoDeleteError([1, 2]), null);
});

test("getPhotoStorageKeys returns every derivative key including large", () => {
  assert.deepEqual(
    getPhotoStorageKeys({
      originalUrl: "https://cdn.example/uploads/a-original.webp",
      originalKey: "uploads/a-original.webp",
      largeUrl: "https://cdn.example/uploads/a-large.webp",
      largeKey: "uploads/a-large.webp",
      mediumUrl: "https://cdn.example/uploads/a-medium.webp",
      mediumKey: "uploads/a-medium.webp",
      thumbnailUrl: "https://cdn.example/uploads/a-thumb.webp",
      thumbnailKey: "uploads/a-thumb.webp",
    }),
    [
      "uploads/a-original.webp",
      "uploads/a-large.webp",
      "uploads/a-medium.webp",
      "uploads/a-thumb.webp",
    ],
  );
});

test("getPhotoStorageKeys skips large for photos uploaded before it existed", () => {
  assert.deepEqual(
    getPhotoStorageKeys({
      originalUrl: "/uploads/b-original.webp",
      mediumUrl: "/uploads/b-medium.webp",
      thumbnailUrl: "/uploads/b-thumb.webp",
    }),
    ["uploads/b-original.webp", "uploads/b-medium.webp", "uploads/b-thumb.webp"],
  );
});

test("getPhotoStorageKeys derives R2 keys from public URLs and ignores foreign hosts", () => {
  assert.deepEqual(
    getPhotoStorageKeys(
      {
        originalUrl: "https://pub-1.r2.dev/uploads/c-original.webp",
        largeUrl: "https://pub-1.r2.dev/uploads/c-large.webp",
        mediumUrl: "https://elsewhere.example/c-medium.webp",
        thumbnailUrl: "//pub-1.r2.dev/uploads/c-thumb.webp",
      },
      "https://pub-1.r2.dev/",
    ),
    ["uploads/c-original.webp", "uploads/c-large.webp"],
  );
});
