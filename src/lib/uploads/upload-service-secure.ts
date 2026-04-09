import path from "node:path";

import { getAlbumOptions } from "@/lib/albums/queries";
import { getPhotoRepository } from "@/lib/photos/repository";
import { UploadStorageError } from "@/lib/security/errors";
import { getStorageBackend, getStorageDriver } from "@/lib/storage/provider";
import { processUpload } from "@/lib/uploads/image-pipeline";
import { validateUploadBatch } from "@/lib/uploads/upload-guards";
import type { PhotoRecord } from "@/types/photo";

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
  const validFiles = validateUploadBatch(files);
  const album = albumId
    ? (await getAlbumOptions()).find((item) => item.id === albumId) ?? null
    : null;
  const storageDriver = getStorageDriver();
  const storageProvider = getStorageBackend();

  const records: PhotoRecord[] = [];

  for (const file of validFiles) {
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

    if (!originalAsset.url || !mediumAsset.url || !thumbnailAsset.url) {
      throw new UploadStorageError();
    }

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
