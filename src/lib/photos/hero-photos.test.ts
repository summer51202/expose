import test from "node:test";
import assert from "node:assert/strict";

import { isLandscapePhoto, nextHeroIndex, selectHeroPhotos } from "./hero-photos";

type P = { id: number; width: number; height: number; createdAt: string };

function photo(id: number, width: number, height: number, day: number): P {
  return { id, width, height, createdAt: `2026-01-${String(day).padStart(2, "0")}T00:00:00.000Z` };
}

const ids = (list: P[]) => list.map((p) => p.id);

test("isLandscapePhoto uses width / height >= 1.2 and rejects bad sizes", () => {
  assert.equal(isLandscapePhoto({ width: 1200, height: 1000 }), true);
  assert.equal(isLandscapePhoto({ width: 1199, height: 1000 }), false);
  assert.equal(isLandscapePhoto({ width: 1000, height: 1500 }), false);
  assert.equal(isLandscapePhoto({ width: 1000, height: 0 }), false);
  assert.equal(isLandscapePhoto({ width: 0, height: 0 }), false);
  assert.equal(isLandscapePhoto({ width: Number.NaN, height: 10 }), false);
});

test("selectHeroPhotos keeps only landscape photos, newest first", () => {
  const photos = [
    photo(1, 1500, 1000, 1),
    photo(2, 1000, 1500, 9), // portrait, newest
    photo(3, 1600, 900, 5),
    photo(4, 1000, 1000, 8), // square
    photo(5, 1334, 1000, 3),
  ];

  assert.deepEqual(ids(selectHeroPhotos(photos)), [3, 5, 1]);
});

test("selectHeroPhotos caps at 6 by default and honours limit", () => {
  const photos = Array.from({ length: 10 }, (_, i) => photo(i + 1, 1600, 900, i + 1));

  assert.deepEqual(ids(selectHeroPhotos(photos)), [10, 9, 8, 7, 6, 5]);
  assert.deepEqual(ids(selectHeroPhotos(photos, { limit: 3 })), [10, 9, 8]);
  assert.deepEqual(selectHeroPhotos(photos, { limit: 0 }), []);
});

test("selectHeroPhotos tops up with the newest other photos when fewer than 2 are landscape", () => {
  const photos = [
    photo(1, 1600, 900, 1), // the only landscape, oldest
    photo(2, 1000, 1500, 7),
    photo(3, 1000, 1500, 9),
    photo(4, 1000, 1500, 8),
  ];

  // Landscape first, then the newest portrait to reach 2.
  assert.deepEqual(ids(selectHeroPhotos(photos)), [1, 3]);
});

test("selectHeroPhotos with no landscape photos returns the newest 2", () => {
  const photos = [photo(1, 900, 1400, 1), photo(2, 900, 1400, 4), photo(3, 900, 1400, 2)];

  assert.deepEqual(ids(selectHeroPhotos(photos)), [2, 3]);
});

test("selectHeroPhotos handles empty and single-photo inputs", () => {
  assert.deepEqual(selectHeroPhotos([]), []);
  assert.deepEqual(ids(selectHeroPhotos([photo(1, 900, 1400, 1)])), [1]);
});

test("selectHeroPhotos does not mutate its input and keeps order on equal timestamps", () => {
  const photos = [photo(1, 1600, 900, 2), photo(2, 1600, 900, 2), photo(3, 1600, 900, 5)];
  const before = ids(photos);

  assert.deepEqual(ids(selectHeroPhotos(photos)), [3, 1, 2]);
  assert.deepEqual(ids(photos), before);
});

test("nextHeroIndex wraps around and skips rejected indexes", () => {
  assert.equal(nextHeroIndex(4, 0), 1);
  assert.equal(nextHeroIndex(4, 3), 0);
  assert.equal(nextHeroIndex(4, 1, (i) => i === 2), 3);
  assert.equal(nextHeroIndex(4, 2, (i) => i === 3 || i === 0), 1);
  // Only the current photo is usable, or there is nothing else.
  assert.equal(nextHeroIndex(3, 1, (i) => i !== 1), null);
  assert.equal(nextHeroIndex(1, 0), null);
  assert.equal(nextHeroIndex(0, 0), null);
});
