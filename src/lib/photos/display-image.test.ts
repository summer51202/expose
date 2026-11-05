import assert from "node:assert/strict";
import test from "node:test";

import { getDisplayImageUrl } from "./display-image";

const withLarge = { mediumUrl: "/uploads/a-medium.webp", largeUrl: "/uploads/a-large.webp" };
const legacy = { mediumUrl: "/uploads/b-medium.webp" };

test("large variant uses largeUrl when the photo has one", () => {
  assert.equal(getDisplayImageUrl(withLarge, "large"), withLarge.largeUrl);
});

test("large variant falls back to mediumUrl for photos without large", () => {
  assert.equal(getDisplayImageUrl(legacy, "large"), legacy.mediumUrl);
  assert.equal(getDisplayImageUrl({ ...legacy, largeUrl: "" }, "large"), legacy.mediumUrl);
});

test("medium variant always uses mediumUrl, even when large exists", () => {
  assert.equal(getDisplayImageUrl(withLarge, "medium"), withLarge.mediumUrl);
});
