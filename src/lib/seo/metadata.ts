import { siteConfig } from "@/config/site";
import type { AlbumRecord } from "@/types/album";
import type { GalleryPhoto } from "@/types/photo";

const DESCRIPTION_MAX_LENGTH = 160;

/**
 * Next.js replaces (not deep-merges) `openGraph` when a page sets it,
 * so every page-level openGraph object must re-include these shared fields.
 */
export const baseOpenGraph = {
  siteName: siteConfig.name,
  type: "website",
} as const;

export function truncateDescription(value: string, maxLength = DESCRIPTION_MAX_LENGTH) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildPhotoPath(photo: Pick<GalleryPhoto, "source" | "id">) {
  return `/photos/${photo.source}/${photo.id}`;
}

export function buildAlbumPath(album: Pick<AlbumRecord, "slug">) {
  return `/albums/${encodeURIComponent(album.slug)}`;
}

export function buildPhotoDescription(
  photo: Pick<GalleryPhoto, "title" | "description" | "albumName" | "location">,
) {
  const custom = photo.description?.trim();

  if (custom) {
    return truncateDescription(custom);
  }

  const context = [photo.albumName, photo.location].filter(Boolean).join(" · ");
  const base = `${photo.title} — photo by ${siteConfig.photographerName}`;

  return truncateDescription(context ? `${base}. ${context}` : base);
}

export function buildAlbumDescription(
  album: Pick<AlbumRecord, "name" | "description">,
  photoCount: number,
) {
  const custom = album.description?.trim();

  if (custom) {
    return truncateDescription(custom);
  }

  return truncateDescription(
    `${album.name} — ${photoCount} photos by ${siteConfig.photographerName}.`,
  );
}

/** Album cover for share previews: explicit cover photo, otherwise the first photo. */
export function pickAlbumCoverPhoto<T extends Pick<GalleryPhoto, "id">>(
  album: Pick<AlbumRecord, "coverPhotoId">,
  photos: T[],
): T | null {
  if (album.coverPhotoId != null) {
    const cover = photos.find((photo) => photo.id === album.coverPhotoId);

    if (cover) {
      return cover;
    }
  }

  return photos[0] ?? null;
}
