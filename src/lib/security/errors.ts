export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export class UploadStorageError extends Error {
  constructor(message = "Storage provider failed to persist the upload.") {
    super(message);
    this.name = "UploadStorageError";
  }
}

export class UploadProcessingError extends Error {
  constructor(message = "Image processing failed.") {
    super(message);
    this.name = "UploadProcessingError";
  }
}

export function mapUploadErrorToMessage(error: unknown) {
  if (error instanceof UploadValidationError) {
    return error.message;
  }

  if (error instanceof UploadProcessingError) {
    return "照片處理失敗，請確認檔案格式後再試一次。";
  }

  if (error instanceof UploadStorageError) {
    return "照片上傳失敗，請稍後再試一次。";
  }

  return "照片上傳失敗，請稍後再試一次。";
}
