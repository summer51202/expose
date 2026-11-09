import "server-only";

import { getPhotoStorageObjects } from "@/lib/photos/photo-delete";
import { getPrivateStorageDriverFor, getStorageDriverFor } from "@/lib/storage/provider";
import type { PhotoRecord } from "@/types/photo";

/**
 * Deletes every stored derivative of already-removed photos from the storage each
 * photo was written to (the original from private storage, or public storage for
 * legacy photos not yet migrated). Failures are logged, not thrown: the DB rows are gone, so a
 * leftover file is an orphan to clean up later, not a reason to fail the request.
 */
export async function deletePhotoFiles(photos: PhotoRecord[]) {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();
  const jobs = photos
    .filter((photo) => photo.source === "uploaded")
    .flatMap((photo) => {
      const backend = photo.storageProvider ?? "local";
      const publicDriver = getStorageDriverFor(backend);
      const privateDriver = getPrivateStorageDriverFor(backend);
      return getPhotoStorageObjects(photo, publicBaseUrl).map(({ key, visibility }) => ({
        key: `${visibility}:${key}`,
        run: () =>
          visibility === "private" ? privateDriver.deleteObject(key) : publicDriver.deleteObject(key),
      }));
    });

  const results = await Promise.allSettled(jobs.map((job) => job.run()));

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`[photo-delete] failed to delete ${jobs[index].key}:`, result.reason);
    }
  });
}
