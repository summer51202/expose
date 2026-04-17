import { getAlbums } from "@/lib/albums/queries";
import { normalizeAlbumSlug } from "@/lib/albums/slug";
import { toPublicPhoto, toPublicPhotos } from "@/lib/photos/public-photo";
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

export async function getRecentUploads(limit = 6): Promise<PublicPhoto[]> {
  const uploadedPhotos = await getPhotoRepository().listUploadedPhotos();
  return toPublicPhotos(uploadedPhotos.slice(0, limit));
}

export async function getAdminUploadedPhotos(): Promise<PhotoRecord[]> {
  const uploadedPhotos = await getPhotoRepository().listUploadedPhotos();
  return uploadedPhotos.sort(byCreatedAtDesc);
}

export async function getPhotoBySourceAndId(source: string, id: number) {
  const photos = await listPhotosForSource(source);
  const photo = photos.find((item) => item.id === id);
  return photo ? toPublicPhoto(photo) : null;
}

export async function getPhotoNeighbors(source: string, id: number) {
  const photos = await listPhotosForSource(source);
  const index = photos.findIndex((photo) => photo.id === id);

  if (index === -1) {
    return {
      previous: null,
      next: null,
    };
  }

  return {
    previous: photos[index - 1] ? toPublicPhoto(photos[index - 1]) : null,
    next: photos[index + 1] ? toPublicPhoto(photos[index + 1]) : null,
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

  return toPublicPhotos(photos.filter((photo) => photo.albumId === album.id));
}

export async function getAlbumPageData(slug: string) {
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
    photos: toPublicPhotos(photos.filter((photo) => photo.albumId === album.id)),
  };
}
