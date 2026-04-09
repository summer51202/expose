import path from "node:path";

import { getAlbumOptions } from "@/lib/albums/queries";
import { getPhotoRepository } from "@/lib/photos/repository";
import { getStorageBackend, getStorageDriver } from "@/lib/storage/provider";
import { processUpload } from "@/lib/uploads/image-pipeline";
import type { PhotoRecord } from "@/types/photo";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export type UploadSummary = {
  uploadedCount: number;
  photos: PhotoRecord[];
};

type UploadPhotosInput = {
  files: File[];
  albumId?: number | null;
};

export async function uploadPhotos({
  files,
  albumId,
}: UploadPhotosInput): Promise<UploadSummary> {
  const validFiles = files.filter((file) => file.size > 0);
  if (validFiles.length === 0) {
    throw new Error("請至少選擇一張照片。");
  }

  const album = albumId
    ? (await getAlbumOptions()).find((item) => item.id === albumId) ?? null
    : null;
  const storageDriver = getStorageDriver();
  const storageProvider = getStorageBackend();

  const records: PhotoRecord[] = [];

  for (const file of validFiles) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new Error(`檔案 ${file.name} 格式不支援，目前只接受 JPG、PNG、WebP、AVIF。`);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`檔案 ${file.name} 超過 20MB，請先縮小後再上傳。`);
    }

    const processed = await processUpload({
      fileName: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    });
    const storageRoot = `uploads/${processed.baseName}`;
    const [originalAsset, mediumAsset, thumbnailAsset] = await Promise.all([
      storageDriver.putObject({
        key: `${storageRoot}-original.webp`,
        body: processed.originalBuffer,
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      }),
      storageDriver.putObject({
        key: `${storageRoot}-medium.webp`,
        body: processed.mediumBuffer,
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      }),
      storageDriver.putObject({
        key: `${storageRoot}-thumb.webp`,
        body: processed.thumbnailBuffer,
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      }),
    ]);

    records.push({
      id: Date.now() + records.length,
      title: path.basename(file.name, path.extname(file.name)).replace(/[-_]+/g, " "),
      description: "",
      createdAt: new Date().toISOString(),
      width: processed.width,
      height: processed.height,
      originalUrl: originalAsset.url,
      mediumUrl: mediumAsset.url,
      thumbnailUrl: thumbnailAsset.url,
      blurDataUrl: processed.blurDataUrl,
      originalKey: originalAsset.key,
      mediumKey: mediumAsset.key,
      thumbnailKey: thumbnailAsset.key,
      storageProvider,
      source: "uploaded",
      shotAt:
        typeof processed.exifData?.takenAt === "string"
          ? new Date(processed.exifData.takenAt).toISOString()
          : undefined,
      exifData: processed.exifData,
      albumId: album?.id ?? null,
      albumName: album?.name,
      albumSlug: album?.slug,
    });
  }

  await getPhotoRepository().savePhotos(records);

  return {
    uploadedCount: records.length,
    photos: records,
  };
}
