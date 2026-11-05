import type { PhotoRecord } from "@/types/photo";

export function getPhotoDeleteError(photoIds: number[]): string | null {
  return photoIds.length === 0 ? "Please choose at least one photo to delete." : null;
}

type StoredAsset = { url?: string; key?: string };

function resolveAssetKey({ url, key }: StoredAsset, publicBaseUrl?: string) {
  if (key) {
    return key.replace(/^\/+/, "");
  }

  if (!url) {
    return null;
  }

  // Older JSON-manifest records only stored a site-relative URL such as /uploads/x.webp.
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url.replace(/^\/+/, "");
  }

  const base = publicBaseUrl?.replace(/\/+$/, "");
  if (base && url.startsWith(`${base}/`)) {
    return url.slice(base.length + 1);
  }

  return null;
}

/**
 * Every storage key a photo owns (original, large, medium, thumbnail), so a delete
 * can remove all derivatives. Photos without a large derivative simply yield fewer keys.
 */
export function getPhotoStorageKeys(
  photo: Pick<
    PhotoRecord,
    | "originalUrl"
    | "originalKey"
    | "largeUrl"
    | "largeKey"
    | "mediumUrl"
    | "mediumKey"
    | "thumbnailUrl"
    | "thumbnailKey"
  >,
  publicBaseUrl?: string,
): string[] {
  const assets: StoredAsset[] = [
    { url: photo.originalUrl, key: photo.originalKey },
    { url: photo.largeUrl, key: photo.largeKey },
    { url: photo.mediumUrl, key: photo.mediumKey },
    { url: photo.thumbnailUrl, key: photo.thumbnailKey },
  ];
  const keys = assets
    .map((asset) => resolveAssetKey(asset, publicBaseUrl))
    .filter((key): key is string => Boolean(key));

  return [...new Set(keys)];
}
