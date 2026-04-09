import assert from "node:assert/strict";

import {
  MAX_FILE_COUNT,
  MAX_FILE_SIZE,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
  validateImageMetadata,
  validateUploadBatch,
} from "./upload-guards.ts";

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createFileLike(input: { name: string; type: string; size: number }) {
  return input;
}

runTest("validateUploadBatch rejects empty uploads", () => {
  assert.throws(
    () => validateUploadBatch([]),
    /請至少選擇一張照片/,
  );
});

runTest("validateUploadBatch rejects unsupported mime types", () => {
  assert.throws(
    () =>
      validateUploadBatch([
        createFileLike({
          name: "payload.svg",
          type: "image/svg+xml",
          size: 10,
        }),
      ]),
    /格式不支援/,
  );
});

runTest("validateUploadBatch rejects oversized files", () => {
  assert.throws(
    () =>
      validateUploadBatch([
        createFileLike({
          name: "huge.jpg",
          type: "image/jpeg",
          size: MAX_FILE_SIZE + 1,
        }),
      ]),
    /超過 20MB/,
  );
});

runTest("validateUploadBatch rejects too many files", () => {
  assert.throws(
    () =>
      validateUploadBatch(
        Array.from({ length: MAX_FILE_COUNT + 1 }, (_, index) =>
          createFileLike({
            name: `photo-${index}.jpg`,
            type: "image/jpeg",
            size: 1024,
          }),
        ),
      ),
    /一次最多只能上傳/,
  );
});

runTest("validateImageMetadata rejects absurd image dimensions", () => {
  assert.throws(
    () =>
      validateImageMetadata({
        fileName: "panorama.jpg",
        width: MAX_IMAGE_DIMENSION + 1,
        height: 100,
      }),
    /尺寸過大/,
  );
});

runTest("validateImageMetadata rejects excessive pixel counts", () => {
  assert.throws(
    () =>
      validateImageMetadata({
        fileName: "bomb.jpg",
        width: MAX_IMAGE_DIMENSION,
        height: Math.ceil(MAX_IMAGE_PIXELS / MAX_IMAGE_DIMENSION) + 1,
      }),
    /像素過高/,
  );
});
