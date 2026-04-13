import { getAlbums } from "@/lib/albums/queries";
import { normalizeAlbumSlug } from "@/lib/albums/slug";
import { getPhotoRepository } from "@/lib/photos/repository";
import { samplePhotos } from "@/lib/photos/sample-photos";
import type { GalleryPhoto } from "@/types/photo";

function byCreatedAtDesc(a: GalleryPhoto, b: GalleryPhoto) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

async function listPhotosForSource(source: string): Promise<GalleryPhoto[]> {
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
  return listPhotosForSource(source);
}

export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const uploadedPhotos = await getPhotoRepository().listUploadedPhotos();
  if (uploadedPhotos.length > 0) {
    return uploadedPhotos;
  }

  return samplePhotos;
}

export async function getRecentUploads(limit = 6): Promise<GalleryPhoto[]> {
  const uploadedPhotos = await getPhotoRepository().listUploadedPhotos();
  return uploadedPhotos.slice(0, limit);
}

export async function getAdminUploadedPhotos(): Promise<GalleryPhoto[]> {
  const uploadedPhotos = await getPhotoRepository().listUploadedPhotos();
  return uploadedPhotos.sort(byCreatedAtDesc);
}

export async function getPhotoBySourceAndId(source: string, id: number) {
  const photos = await listPhotosForSource(source);
  return photos.find((photo) => photo.id === id) ?? null;
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
    previous: photos[index - 1] ?? null,
    next: photos[index + 1] ?? null,
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

  return photos.filter((photo) => photo.albumId === album.id);
}
