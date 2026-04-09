import {
  UploadProcessingError,
  UploadValidationError,
} from "../security/errors.ts";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_FILE_COUNT = 12;
export const MAX_IMAGE_DIMENSION = 10_000;
export const MAX_IMAGE_PIXELS = 40_000_000;

type UploadFileLike = {
  name: string;
  size: number;
  type: string;
};

type ImageMetadataInput = {
  fileName: string;
  width: number;
  height: number;
};

export function validateUploadBatch<T extends UploadFileLike>(files: T[]) {
  const validFiles = files.filter((file) => file.size > 0);

  if (validFiles.length === 0) {
    throw new UploadValidationError("請至少選擇一張照片。");
  }

  if (validFiles.length > MAX_FILE_COUNT) {
    throw new UploadValidationError(`一次最多只能上傳 ${MAX_FILE_COUNT} 張照片。`);
  }

  for (const file of validFiles) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new UploadValidationError(
        `檔案 ${file.name} 格式不支援，目前只接受 JPG、PNG、WebP、AVIF。`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new UploadValidationError(
        `檔案 ${file.name} 超過 20MB，請先縮小後再上傳。`,
      );
    }
  }

  return validFiles;
}

export function validateImageMetadata({
  fileName,
  width,
  height,
}: ImageMetadataInput) {
  if (!width || !height) {
    throw new UploadProcessingError(`無法判斷檔案 ${fileName} 的圖片尺寸。`);
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new UploadValidationError(
      `檔案 ${fileName} 尺寸過大，請先縮小後再上傳。`,
    );
  }

  if (width * height > MAX_IMAGE_PIXELS) {
    throw new UploadValidationError(
      `檔案 ${fileName} 像素過高，請先縮小解析度後再上傳。`,
    );
  }
}
