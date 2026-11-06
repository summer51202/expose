import test from "node:test";
import assert from "node:assert/strict";

import { applyFeatured, isFeaturedPhoto, sortFeaturedPhotos } from "./featured-photos";

const NOW = new Date("2026-11-06T10:00:00.000Z");

type P = { id: number; featured?: boolean; featuredAt?: string };

test("isFeaturedPhoto treats a missing flag as not featured", () => {
  assert.equal(isFeaturedPhoto({}), false);
  assert.equal(isFeaturedPhoto({ featured: false }), false);
  assert.equal(isFeaturedPhoto({ featured: true }), true);
});

test("applyFeatured stamps featuredAt when marking and keeps the original on repeat", () => {
  const photo: P = { id: 1 };
  const marked = applyFeatured(photo, true, NOW);

  assert.deepEqual(marked, { id: 1, featured: true, featuredAt: NOW.toISOString() });
  assert.deepEqual(photo, { id: 1 });

  const again = applyFeatured(marked, true, new Date("2026-12-01T00:00:00.000Z"));
  assert.equal(again.featuredAt, NOW.toISOString());
});

test("applyFeatured drops featuredAt when unmarking", () => {
  const photo: P = { id: 1, featured: true, featuredAt: NOW.toISOString() };
  const unmarked = applyFeatured(photo, false, NOW);

  assert.deepEqual(unmarked, { id: 1, featured: false });
  assert.equal("featuredAt" in unmarked, false);
  assert.equal(photo.featured, true);
});

test("sortFeaturedPhotos keeps only featured photos, newest featured first, undated last", () => {
  const photos: P[] = [
    { id: 1, featured: true, featuredAt: "2026-11-01T00:00:00.000Z" },
    { id: 2 },
    { id: 3, featured: true },
    { id: 4, featured: true, featuredAt: "2026-11-03T00:00:00.000Z" },
    { id: 5, featured: true, featuredAt: "not a date" },
    { id: 6, featured: false, featuredAt: "2026-11-09T00:00:00.000Z" },
  ];

  assert.deepEqual(
    sortFeaturedPhotos(photos).map((photo) => photo.id),
    [4, 1, 3, 5],
  );
});
