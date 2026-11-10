import { cache } from "react";

import { getAlbums } from "@/lib/albums/queries";
import { getAlbumRepository } from "@/lib/albums/repository";
import { normalizeAlbumSlug } from "@/lib/albums/slug";
import { toPublicPhoto, toPublicPhotos } from "@/lib/photos/public-photo";
import {
  filterAlbumPhotos,
  getScopedPhotoNeighbors,
} from "@/lib/photos/photo-navigation";
import {
  type FeedPosition,
  type GridPhoto,
  paginateFeed,
  sortFeedPhotos,
  toGridPhoto,
  toSlimPhotos,
} from "@/lib/photos/photo-feed";
import { getPhotoRepository } from "@/lib/photos/repository";
import { samplePhotos } from "@/lib/photos/sample-photos";
import type { GalleryPhoto, PhotoRecord, PublicPhoto } from "@/types/photo";

function byCreatedAtDesc(a: GalleryPhoto, b: GalleryPhoto) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

async function listPhotosForSource(source: string): Promise<PhotoRecord[]> {
  const photoRepository = getPhotoRepository();

  if (source === "uploaded") {
    return photoRepository.listUploadedPhotos();
  }

  if (source === "sample") {
    return [...samplePhotos].sort(byCreatedAtDesc);
  }

  return [];
}

export async function getPhotosForSource(source: string) {
  return toPublicPhotos(await listPhotosForSource(source));
}

export async function getGalleryPhotos(): Promise<PublicPhoto[]> {
  const uploadedPhotos = await getPhotoRepository().listUploadedPhotos();
  if (uploadedPhotos.length > 0) {
    return toPublicPhotos(uploadedPhotos);
  }

  return toPublicPhotos(samplePhotos);
}

/** Every gallery photo in feed order (newest first, id breaks ties). */
export async function getFeedPhotos(): Promise<PublicPhoto[]> {
  return sortFeedPhotos(await getGalleryPhotos());
}

/**
 * One batch of the home photo wall for `/api/photos`: slim grid payloads only,
 * with the blur preview reserved for the server-rendered first page.
 */
export async function getPhotoFeedBatch(options: {
  cursor: FeedPosition | null;
  limit: number;
}): Promise<{ photos: GridPhoto[]; nextCursor: string | null }> {
  const page = paginateFeed(await getFeedPhotos(), options);
  return {
    photos: toSlimPhotos(page.items, toGridPhoto, 0),
    nextCursor: page.nextCursor,
  };
}

export async function getRecentUploads(limit = 6): Promise<PublicPhoto[]> {
  const uploadedPhotos = await getPhotoRepository().listUploadedPhotos();
  return toPublicPhotos(uploadedPhotos.slice(0, limit));
}

export async function getAdminUploadedPhotos(): Promise<PhotoRecord[]> {
  const uploadedPhotos = await getPhotoRepository().listUploadedPhotos();
  return uploadedPhotos.sort(byCreatedAtDesc);
}

// Memoized per request so generateMetadata and the page share one lookup.
export const getPhotoBySourceAndId = cache(async (source: string, id: number) => {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  if (source === "uploaded") {
    const photo = await getPhotoRepository().findUploadedPhotoById(id);
    return photo ? toPublicPhoto(photo) : null;
  }

  const photos = await listPhotosForSource(source);
  const photo = photos.find((item) => item.id === id);
  return photo ? toPublicPhoto(photo) : null;
});

/**
 * Previous / next for the photo page. Walks the same album sequence as the
 * album grid and gallery playback (see filterAlbumPhotos); photos without an
 * album fall back to the site-wide order. One photo list read per call.
 */
export async function getPhotoNavigation(
  photo: Pick<PublicPhoto, "id" | "source" | "albumId">,
  returnAlbum?: string | null,
) {
  const needsAlbums = photo.source === "uploaded" && photo.albumId != null;
  const [sourcePhotos, albums] = await Promise.all([
    listPhotosForSource(photo.source),
    needsAlbums ? getAlbumRepository().listAlbums() : Promise.resolve([]),
  ]);
  const result = getScopedPhotoNeighbors(photo, sourcePhotos, albums, returnAlbum);

  return {
    scope: result.scope,
    index: result.index,
    total: result.total,
    previous: result.previous ? toPublicPhoto(result.previous) : null,
    next: result.next ? toPublicPhoto(result.next) : null,
  };
}

export async function getPhotosByAlbumSlug(slug: string) {
  const normalizedSlug = normalizeAlbumSlug(slug);
  const [albums, photos] = await Promise.all([
    getAlbums(),
    getPhotoRepository().listUploadedPhotos(),
  ]);
  const album = albums.find(
    (item) => normalizeAlbumSlug(item.slug) === normalizedSlug,
  );

  if (!album) {
    return [];
  }

  return toPublicPhotos(filterAlbumPhotos(photos, album.id));
}

// Memoized per request so generateMetadata and the page share one lookup.
export const getAlbumPageData = cache(async (slug: string) => {
  const normalizedSlug = normalizeAlbumSlug(slug);
  const [albums, photos] = await Promise.all([
    getAlbums(),
    getPhotoRepository().listUploadedPhotos(),
  ]);
  const album = albums.find(
    (item) => normalizeAlbumSlug(item.slug) === normalizedSlug,
  );

  if (!album) {
    return null;
  }

  return {
    album,
    photos: toPublicPhotos(filterAlbumPhotos(photos, album.id)),
  };
});
