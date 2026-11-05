import test from "node:test";
import assert from "node:assert/strict";

import { toPublicPhoto } from "./public-photo";
import type { PhotoRecord } from "@/types/photo";

const record: PhotoRecord = {
  id: 1,
  title: "Query Boundary",
  createdAt: "2026-04-01T00:00:00.000Z",
  width: 1200,
  height: 800,
  originalUrl: "https://cdn.example/private/original.webp",
  mediumUrl: "https://cdn.example/public/medium.webp",
  thumbnailUrl: "https://cdn.example/public/thumb.webp",
  source: "uploaded",
  originalKey: "private/original.webp",
};

test("public photo DTO is safe to serialize for public routes", () => {
  const publicPhoto = toPublicPhoto(record);
  const serialized = JSON.stringify(publicPhoto);

  assert.equal(serialized.includes("originalUrl"), false);
  assert.equal(serialized.includes("originalKey"), false);
  assert.equal(serialized.includes("original.webp"), false);
  assert.equal(serialized.includes("medium.webp"), true);
  assert.equal(serialized.includes("thumb.webp"), true);
});
