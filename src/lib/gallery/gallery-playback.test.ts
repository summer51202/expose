import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_GALLERY_DELAY_MS,
  getNextGalleryIndex,
  getPreviousGalleryIndex,
  resolveGalleryDelay,
} from "./gallery-playback";

test("getNextGalleryIndex loops from the last photo to the first", () => {
  assert.equal(getNextGalleryIndex(0, 4), 1);
  assert.equal(getNextGalleryIndex(3, 4), 0);
});

test("getPreviousGalleryIndex loops from the first photo to the last", () => {
  assert.equal(getPreviousGalleryIndex(2, 4), 1);
  assert.equal(getPreviousGalleryIndex(0, 4), 3);
});

test("gallery index helpers stay at zero for empty photo sets", () => {
  assert.equal(getNextGalleryIndex(0, 0), 0);
  assert.equal(getPreviousGalleryIndex(0, 0), 0);
});

test("resolveGalleryDelay only accepts supported playback delays", () => {
  assert.equal(resolveGalleryDelay(3000), 3000);
  assert.equal(resolveGalleryDelay(8000), 8000);
  assert.equal(resolveGalleryDelay(9999), DEFAULT_GALLERY_DELAY_MS);
  assert.equal(resolveGalleryDelay(Number.NaN), DEFAULT_GALLERY_DELAY_MS);
});
