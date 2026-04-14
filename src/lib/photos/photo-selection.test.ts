import assert from "node:assert/strict";
import test from "node:test";

import { removePhotoIdsFromSelection } from "./photo-selection";

test("removePhotoIdsFromSelection removes moved or deleted photos from selection", () => {
  assert.deepEqual(removePhotoIdsFromSelection([10, 20, 30], [20, 30]), [10]);
});

test("removePhotoIdsFromSelection keeps selection order and ignores unknown ids", () => {
  assert.deepEqual(removePhotoIdsFromSelection([30, 10, 20], [99, 10]), [30, 20]);
});
