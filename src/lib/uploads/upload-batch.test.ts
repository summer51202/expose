import test from "node:test";
import assert from "node:assert/strict";

import {
  UPLOAD_MAX_FILE_SIZE,
  UPLOAD_MAX_FILES,
  UPLOAD_MAX_TOTAL_BYTES,
  getUploadBatchError,
} from "./upload-batch";

test("getUploadBatchError rejects unsupported image types", () => {
  assert.equal(
    getUploadBatchError([
      {
        name: "notes.txt",
        size: 200,
        type: "text/plain",
      },
    ]),
    "File type is not supported.",
  );
});

test("getUploadBatchError rejects files over the per-file size limit", () => {
  assert.equal(
    getUploadBatchError([
      {
        name: "huge.jpg",
        size: UPLOAD_MAX_FILE_SIZE + 1,
        type: "image/jpeg",
      },
    ]),
    "A file is larger than the per-file upload limit.",
  );
});

test("getUploadBatchError rejects batches with too many files", () => {
  assert.equal(
    getUploadBatchError(
      Array.from({ length: UPLOAD_MAX_FILES + 1 }, (_, index) => ({
        name: `image-${index}.jpg`,
        size: 1024,
        type: "image/jpeg",
      })),
    ),
    "Too many files were selected for one upload batch.",
  );
});

test("getUploadBatchError rejects batches over the total size limit", () => {
  assert.equal(
    getUploadBatchError([
      {
        name: "batch-a.jpg",
        size: UPLOAD_MAX_TOTAL_BYTES / 2,
        type: "image/jpeg",
      },
      {
        name: "batch-b.jpg",
        size: UPLOAD_MAX_TOTAL_BYTES / 2 + 1,
        type: "image/jpeg",
      },
    ]),
    "The selected batch is larger than the total upload size limit.",
  );
});

test("getUploadBatchError returns null for valid batches", () => {
  assert.equal(
    getUploadBatchError([
      {
        name: "ok-a.jpg",
        size: 1024,
        type: "image/jpeg",
      },
      {
        name: "ok-b.webp",
        size: 2048,
        type: "image/webp",
      },
    ]),
    null,
  );
});
