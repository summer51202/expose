export const MAX_UPLOAD_FILES = 100;
export const MAX_UPLOAD_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_TOTAL_SIZE_BYTES = 200 * 1024 * 1024;

export const ALLOWED_UPLOAD_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

type ValidateUploadInput = {
  files: File[];
  albumId?: number | null;
};

export function formatBytes(bytes: number) {
  const megabytes = bytes / 1024 / 1024;

  if (megabytes >= 10) {
    return `${Math.round(megabytes)}MB`;
  }

  return `${megabytes.toFixed(1)}MB`;
}

export function validateUploadInput({ files, albumId }: ValidateUploadInput) {
  const validFiles = files.filter((file) => file.size > 0);

  if (!albumId) {
    throw new Error("請先選擇要上傳到哪一本相簿。");
  }

  if (validFiles.length === 0) {
    throw new Error("請至少選擇一張照片。");
  }

  if (validFiles.length > MAX_UPLOAD_FILES) {
    throw new Error(`一次最多上傳 ${MAX_UPLOAD_FILES} 張照片。`);
  }

  const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_UPLOAD_TOTAL_SIZE_BYTES) {
    throw new Error(
      `整批上傳大小為 ${formatBytes(totalSize)}，不可超過 ${formatBytes(
        MAX_UPLOAD_TOTAL_SIZE_BYTES,
      )}。`,
    );
  }

  for (const file of validFiles) {
    if (!ALLOWED_UPLOAD_IMAGE_TYPES.has(file.type)) {
      throw new Error(`檔案 ${file.name} 格式不支援，目前只接受 JPG、PNG、WebP、AVIF。`);
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      throw new Error(
        `檔案 ${file.name} 超過 ${formatBytes(MAX_UPLOAD_FILE_SIZE_BYTES)}，請先縮小後再上傳。`,
      );
    }
  }

  return validFiles;
}
