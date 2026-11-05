import { normalizeAlbumSlug } from "@/lib/albums/slug";

type NavigablePhoto = {
  id: number;
  source: string;
  albumId?: number | null;
};

type NavigableAlbum = {
  id: number;
  slug: string;
};

export type PhotoNavigationScope =
  | { kind: "album"; albumId: number; albumSlug: string }
  | { kind: "all" };

export type PhotoNeighbors<T> = {
  previous: T | null;
  next: T | null;
  /** 0-based position of the photo inside the scope, or -1 when it is not there. */
  index: number;
  total: number;
};

function safeNormalizeSlug(slug: string) {
  try {
    return normalizeAlbumSlug(slug);
  } catch {
    // Malformed percent-encoding (e.g. "100%"); compare it as plain text instead.
    return slug.trim().toLowerCase();
  }
}

/**
 * The album page grid and gallery playback both show the uploaded photo list
 * (repository order, newest first) filtered by album id. Keep this the single
 * definition of "photos in an album" so the photo page steps through the same
 * sequence.
 */
export function filterAlbumPhotos<T extends { albumId?: number | null }>(
  photos: readonly T[],
  albumId: number,
): T[] {
  return photos.filter((photo) => photo.albumId === albumId);
}

/**
 * Decide which sequence previous/next walks through.
 *
 * - `returnAlbum` wins when the photo actually belongs to that album.
 * - Otherwise the photo's own album is used.
 * - Photos without an album (and sample photos, which never appear on album
 *   pages) fall back to the site-wide order of their source.
 */
export function resolvePhotoNavigationScope(
  photo: NavigablePhoto,
  albums: readonly NavigableAlbum[],
  returnAlbum?: string | null,
): PhotoNavigationScope {
  if (photo.source !== "uploaded" || photo.albumId == null) {
    return { kind: "all" };
  }

  const ownAlbum = albums.find((album) => album.id === photo.albumId);
  if (!ownAlbum) {
    return { kind: "all" };
  }

  if (returnAlbum) {
    const requestedSlug = safeNormalizeSlug(returnAlbum);
    const requestedAlbum = albums.find(
      (album) => safeNormalizeSlug(album.slug) === requestedSlug,
    );

    if (requestedAlbum && requestedAlbum.id === photo.albumId) {
      return { kind: "album", albumId: requestedAlbum.id, albumSlug: requestedAlbum.slug };
    }
  }

  return { kind: "album", albumId: ownAlbum.id, albumSlug: ownAlbum.slug };
}

/** Previous/next inside an already ordered list. No wrap-around at the ends. */
export function findPhotoNeighbors<T extends { id: number }>(
  photos: readonly T[],
  id: number,
): PhotoNeighbors<T> {
  const index = photos.findIndex((photo) => photo.id === id);

  if (index === -1) {
    return { previous: null, next: null, index: -1, total: photos.length };
  }

  return {
    previous: photos[index - 1] ?? null,
    next: photos[index + 1] ?? null,
    index,
    total: photos.length,
  };
}

/** Scope + neighbors from one photo list (the source's full, ordered list). */
export function getScopedPhotoNeighbors<T extends NavigablePhoto>(
  photo: NavigablePhoto,
  sourcePhotos: readonly T[],
  albums: readonly NavigableAlbum[],
  returnAlbum?: string | null,
): PhotoNeighbors<T> & { scope: PhotoNavigationScope } {
  const scope = resolvePhotoNavigationScope(photo, albums, returnAlbum);
  const sequence =
    scope.kind === "album" ? filterAlbumPhotos(sourcePhotos, scope.albumId) : sourcePhotos;

  return { ...findPhotoNeighbors(sequence, photo.id), scope };
}
