import assert from "node:assert/strict";
import test from "node:test";

import { getPhotoDeleteError, getPhotoStorageObjects } from "./photo-delete";

const keysOf = (...args: Parameters<typeof getPhotoStorageObjects>) =>
  getPhotoStorageObjects(...args).map(({ visibility, key }) => `${visibility}:${key}`);

test("getPhotoDeleteError requires at least one photo id", () => {
  assert.equal(
    getPhotoDeleteError([]),
    "Please choose at least one photo to delete.",
  );
});

test("getPhotoDeleteError accepts valid photo ids", () => {
  assert.equal(getPhotoDeleteError([1, 2]), null);
});

test("getPhotoStorageObjects returns every derivative key including large", () => {
  assert.deepEqual(
    keysOf({
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
      "public:uploads/a-original.webp",
      "public:uploads/a-large.webp",
      "public:uploads/a-medium.webp",
      "public:uploads/a-thumb.webp",
    ],
  );
});

test("getPhotoStorageObjects skips large for photos uploaded before it existed", () => {
  assert.deepEqual(
    keysOf({
      originalUrl: "/uploads/b-original.webp",
      mediumUrl: "/uploads/b-medium.webp",
      thumbnailUrl: "/uploads/b-thumb.webp",
    }),
    ["public:uploads/b-original.webp", "public:uploads/b-medium.webp", "public:uploads/b-thumb.webp"],
  );
});

test("getPhotoStorageObjects derives R2 keys from public URLs and ignores foreign hosts", () => {
  assert.deepEqual(
    keysOf(
      {
        originalUrl: "https://pub-1.r2.dev/uploads/c-original.webp",
        largeUrl: "https://pub-1.r2.dev/uploads/c-large.webp",
        mediumUrl: "https://elsewhere.example/c-medium.webp",
        thumbnailUrl: "//pub-1.r2.dev/uploads/c-thumb.webp",
      },
      "https://pub-1.r2.dev/",
    ),
    ["public:uploads/c-original.webp", "public:uploads/c-large.webp"],
  );
});

test("getPhotoStorageObjects puts a private original in private storage", () => {
  assert.deepEqual(
    keysOf({
      originalUrl: "private:uploads/d-original.webp",
      originalKey: "uploads/d-original.webp",
      largeUrl: "https://pub-1.r2.dev/uploads/d-large.webp",
      largeKey: "uploads/d-large.webp",
      mediumUrl: "https://pub-1.r2.dev/uploads/d-medium.webp",
      mediumKey: "uploads/d-medium.webp",
      thumbnailUrl: "https://pub-1.r2.dev/uploads/d-thumb.webp",
      thumbnailKey: "uploads/d-thumb.webp",
    }),
    [
      "private:uploads/d-original.webp",
      "public:uploads/d-large.webp",
      "public:uploads/d-medium.webp",
      "public:uploads/d-thumb.webp",
    ],
  );
});

test("getPhotoStorageObjects reads the private key from the marker when originalKey is missing", () => {
  assert.deepEqual(
    keysOf({
      originalUrl: "private:uploads/e-original.webp",
      mediumUrl: "/uploads/e-medium.webp",
      thumbnailUrl: "/uploads/e-thumb.webp",
    }),
    ["private:uploads/e-original.webp", "public:uploads/e-medium.webp", "public:uploads/e-thumb.webp"],
  );
});
