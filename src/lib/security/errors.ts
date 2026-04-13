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
    switch (error.message) {
      case "Please choose an album before uploading photos.":
        return "請先選擇要上傳到哪一本相簿。";
      case "Please choose at least one photo.":
        return "請至少選擇一張照片。";
      case "File type is not supported.":
        return "有檔案格式不支援，目前只接受 JPG、PNG、WebP、AVIF。";
      case "A file is larger than the per-file upload limit.":
        return "單張照片超過 20MB，請先縮小後再上傳。";
      case "Too many files were selected for one upload batch.":
        return "單次最多可上傳 100 張照片，請分批處理。";
      case "The selected batch is larger than the total upload size limit.":
        return "本次上傳總大小超過 200MB，請分批處理。";
      default:
        return error.message;
    }
  }

  if (error instanceof UploadProcessingError) {
    return "照片處理失敗，請確認檔案格式後再試一次。";
  }

  if (error instanceof UploadStorageError) {
    return "照片上傳失敗，請稍後再試一次。";
  }

  return "照片上傳失敗，請稍後再試一次。";
}
