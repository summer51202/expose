import assert from "node:assert/strict";

import {
  UploadProcessingError,
  UploadStorageError,
  UploadValidationError,
  mapUploadErrorToMessage,
} from "./errors.ts";

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("keeps validation errors actionable", () => {
  const message = mapUploadErrorToMessage(
    new UploadValidationError("請至少選擇一張照片。"),
  );

  assert.equal(message, "請至少選擇一張照片。");
});

runTest("maps storage errors to a generic admin-safe message", () => {
  const message = mapUploadErrorToMessage(
    new UploadStorageError("provider details should stay internal"),
  );

  assert.equal(message, "照片上傳失敗，請稍後再試一次。");
});

runTest("maps unknown errors to a generic admin-safe message", () => {
  const message = mapUploadErrorToMessage(new Error("low-level stack details"));

  assert.equal(message, "照片上傳失敗，請稍後再試一次。");
});

runTest("maps processing errors to a generic admin-safe message", () => {
  const message = mapUploadErrorToMessage(
    new UploadProcessingError("sharp metadata failure"),
  );

  assert.equal(message, "照片處理失敗，請確認檔案格式後再試一次。");
});
