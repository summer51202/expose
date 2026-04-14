import assert from "node:assert/strict";
import test from "node:test";

import { getPhotoDeleteError } from "./photo-delete";

test("getPhotoDeleteError requires at least one photo id", () => {
  assert.equal(
    getPhotoDeleteError([]),
    "Please choose at least one photo to delete.",
  );
});

test("getPhotoDeleteError accepts valid photo ids", () => {
  assert.equal(getPhotoDeleteError([1, 2]), null);
});
