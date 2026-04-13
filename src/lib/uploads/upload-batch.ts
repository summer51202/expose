export const UPLOAD_ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
export const UPLOAD_MAX_FILE_SIZE = 20 * 1024 * 1024;
export const UPLOAD_MAX_FILES = 100;
export const UPLOAD_MAX_TOTAL_BYTES = 200 * 1024 * 1024;

type UploadBatchFile = {
  name: string;
  size: number;
  type: string;
};

export function getUploadBatchError(files: UploadBatchFile[]): string | null {
  if (files.length > UPLOAD_MAX_FILES) {
    return "Too many files were selected for one upload batch.";
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > UPLOAD_MAX_TOTAL_BYTES) {
    return "The selected batch is larger than the total upload size limit.";
  }

  for (const file of files) {
    if (!UPLOAD_ALLOWED_IMAGE_TYPES.has(file.type)) {
      return "File type is not supported.";
    }

    if (file.size > UPLOAD_MAX_FILE_SIZE) {
      return "A file is larger than the per-file upload limit.";
    }
  }

  return null;
}

export function formatUploadBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}
