import path from "node:path";

import { getAlbumOptions } from "@/lib/albums/queries";
import { getPhotoRepository } from "@/lib/photos/repository";
import { UploadStorageError, UploadValidationError } from "@/lib/security/errors";
import { toPrivateOriginalUrl } from "@/lib/storage/private-original";
import {
  assertPrivateStorageReady,
  getPrivateStorageDriver,
  getStorageBackend,
  getStorageDriver,
} from "@/lib/storage/provider";
import { currentDerivativeKeys, DERIVATIVE_CACHE_CONTROL } from "@/lib/uploads/image-derivatives";
import { processUpload } from "@/lib/uploads/image-pipeline";
import { getUploadBatchError } from "@/lib/uploads/upload-batch";
import { getUploadSelectionError } from "@/lib/uploads/upload-selection";
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
  const validFiles = files.filter((file) => file.size > 0);
  const selectionError = getUploadSelectionError({
    albumId: albumId == null ? "" : String(albumId),
    fileCount: validFiles.length,
  });
  const batchError = getUploadBatchError(
    validFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    })),
  );

  if (selectionError) {
    throw new UploadValidationError(selectionError);
  }

  if (batchError) {
    throw new UploadValidationError(batchError);
  }

  const album = (await getAlbumOptions()).find((item) => item.id === albumId) ?? null;
  if (!album) {
    throw new UploadValidationError("找不到指定的相簿，請重新選擇後再試一次。");
  }

  const storageProvider = getStorageBackend();
  // Originals go to private storage only; fail before writing anything if it is not set up.
  assertPrivateStorageReady(storageProvider);
  const storageDriver = getStorageDriver();
  const privateStorageDriver = getPrivateStorageDriver();

  const records: PhotoRecord[] = [];

  for (const file of validFiles) {
    const processed = await processUpload({
      fileName: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    });
    const storageRoot = `uploads/${processed.baseName}`;
    // Versioned keys (`-large.v2.webp`); scripts/regenerate-derivatives.mjs moves older photos to them.
    const derivativeKeys = currentDerivativeKeys(storageRoot);
    const [originalAsset, largeAsset, mediumAsset, thumbnailAsset] = await Promise.all([
      privateStorageDriver.putObject({
        key: `${storageRoot}-original.webp`,
        body: processed.originalBuffer,
        contentType: "image/webp",
      }),
      storageDriver.putObject({
        key: derivativeKeys.large,
        body: processed.largeBuffer,
        contentType: "image/webp",
        cacheControl: DERIVATIVE_CACHE_CONTROL,
      }),
      storageDriver.putObject({
        key: derivativeKeys.medium,
        body: processed.mediumBuffer,
        contentType: "image/webp",
        cacheControl: DERIVATIVE_CACHE_CONTROL,
      }),
      storageDriver.putObject({
        key: derivativeKeys.thumbnail,
        body: processed.thumbnailBuffer,
        contentType: "image/webp",
        cacheControl: DERIVATIVE_CACHE_CONTROL,
      }),
    ]);

    if (!originalAsset.key || !largeAsset.url || !mediumAsset.url || !thumbnailAsset.url) {
      throw new UploadStorageError();
    }

    records.push({
      id: Date.now() + records.length,
      title: path.basename(file.name, path.extname(file.name)).replace(/[-_]+/g, " "),
      description: "",
      createdAt: new Date().toISOString(),
      width: processed.width,
      height: processed.height,
      // No public URL for originals: a `private:<key>` marker, the key is the source of truth.
      originalUrl: toPrivateOriginalUrl(originalAsset.key),
      largeUrl: largeAsset.url,
      mediumUrl: mediumAsset.url,
      thumbnailUrl: thumbnailAsset.url,
      blurDataUrl: processed.blurDataUrl,
      originalKey: originalAsset.key,
      largeKey: largeAsset.key,
      mediumKey: mediumAsset.key,
      thumbnailKey: thumbnailAsset.key,
      storageProvider,
      source: "uploaded",
      shotAt:
        typeof processed.exifData?.takenAt === "string"
          ? new Date(processed.exifData.takenAt).toISOString()
          : undefined,
      exifData: processed.exifData,
      albumId: album.id,
      albumName: album.name,
      albumSlug: album.slug,
    });
  }

  await getPhotoRepository().savePhotos(records);

  return {
    uploadedCount: records.length,
    photos: records,
  };
}
