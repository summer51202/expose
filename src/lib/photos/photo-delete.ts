import { isPrivateOriginalUrl, privateKeyFromOriginalUrl } from "@/lib/storage/private-original";
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

export type PhotoStorageObject = {
  key: string;
  /** "private" = the original in private storage; "public" = every URL-served file. */
  visibility: "public" | "private";
};

type PhotoStorageFields = Pick<
  PhotoRecord,
  | "originalUrl"
  | "originalKey"
  | "largeUrl"
  | "largeKey"
  | "mediumUrl"
  | "mediumKey"
  | "thumbnailUrl"
  | "thumbnailKey"
>;

/**
 * Every stored object a photo owns (original, large, medium, thumbnail) and where it lives,
 * so a delete can remove all of them. Originals marked `private:<key>` are in private
 * storage; legacy originals (a real URL) are still in public storage. Photos without a large
 * derivative simply yield fewer objects.
 */
export function getPhotoStorageObjects(
  photo: PhotoStorageFields,
  publicBaseUrl?: string,
): PhotoStorageObject[] {
  const objects: PhotoStorageObject[] = [];

  if (isPrivateOriginalUrl(photo.originalUrl)) {
    const key = photo.originalKey?.replace(/^\/+/, "") || privateKeyFromOriginalUrl(photo.originalUrl);
    if (key) {
      objects.push({ key, visibility: "private" });
    }
  } else {
    const key = resolveAssetKey({ url: photo.originalUrl, key: photo.originalKey }, publicBaseUrl);
    if (key) {
      objects.push({ key, visibility: "public" });
    }
  }

  const publicAssets: StoredAsset[] = [
    { url: photo.largeUrl, key: photo.largeKey },
    { url: photo.mediumUrl, key: photo.mediumKey },
    { url: photo.thumbnailUrl, key: photo.thumbnailKey },
  ];
  for (const asset of publicAssets) {
    const key = resolveAssetKey(asset, publicBaseUrl);
    if (key) {
      objects.push({ key, visibility: "public" });
    }
  }

  const seen = new Set<string>();
  return objects.filter((object) => {
    const id = `${object.visibility}:${object.key}`;
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}
