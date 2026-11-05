import test from "node:test";
import assert from "node:assert/strict";

import { toPublicPhoto, toPublicPhotos } from "./public-photo";
import type { PhotoRecord } from "@/types/photo";

const fullPhoto: PhotoRecord = {
  id: 7,
  title: "Hidden Original",
  description: "Public description",
  location: "Taipei",
  shotAt: "2026-04-01T00:00:00.000Z",
  albumName: "Portfolio",
  albumSlug: "portfolio",
  exifData: { iso: 100 },
  createdAt: "2026-04-02T00:00:00.000Z",
  width: 3000,
  height: 2000,
  originalUrl: "https://cdn.example/photos/original.webp",
  mediumUrl: "https://cdn.example/photos/medium.webp",
  thumbnailUrl: "https://cdn.example/photos/thumb.webp",
  blurDataUrl: "data:image/webp;base64,abc",
  source: "uploaded",
  albumId: 11,
  originalKey: "private/original.webp",
  mediumKey: "public/medium.webp",
  thumbnailKey: "public/thumb.webp",
  storageProvider: "r2",
};

test("toPublicPhoto strips original URL and storage key", () => {
  const result = toPublicPhoto(fullPhoto);

  assert.equal("originalUrl" in result, false);
  assert.equal("originalKey" in result, false);
  assert.equal(result.mediumUrl, fullPhoto.mediumUrl);
  assert.equal(result.thumbnailUrl, fullPhoto.thumbnailUrl);
  assert.equal(result.title, fullPhoto.title);
  assert.equal(result.albumSlug, fullPhoto.albumSlug);
});

test("toPublicPhotos maps every record through the public boundary", () => {
  const result = toPublicPhotos([fullPhoto]);

  assert.equal(result.length, 1);
  assert.equal("originalUrl" in result[0], false);
  assert.equal("originalKey" in result[0], false);
  assert.equal(result[0].id, fullPhoto.id);
});
