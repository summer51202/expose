import test from "node:test";
import assert from "node:assert/strict";

import {
  canSubmitUploadSelection,
  getUploadSelectionError,
} from "./upload-selection";

test("getUploadSelectionError returns an error when no album is selected", () => {
  assert.equal(
    getUploadSelectionError({
      albumId: "",
      fileCount: 2,
    }),
    "Please choose an album before uploading photos.",
  );
});

test("getUploadSelectionError returns an error when no files are selected", () => {
  assert.equal(
    getUploadSelectionError({
      albumId: "12",
      fileCount: 0,
    }),
    "Please choose at least one photo.",
  );
});

test("getUploadSelectionError returns null when album and files are both present", () => {
  assert.equal(
    getUploadSelectionError({
      albumId: "12",
      fileCount: 3,
    }),
    null,
  );
});

test("canSubmitUploadSelection only returns true when album and files are both present", () => {
  assert.equal(
    canSubmitUploadSelection({
      albumId: "",
      fileCount: 3,
    }),
    false,
  );

  assert.equal(
    canSubmitUploadSelection({
      albumId: "12",
      fileCount: 0,
    }),
    false,
  );

  assert.equal(
    canSubmitUploadSelection({
      albumId: "12",
      fileCount: 3,
    }),
    true,
  );
});
