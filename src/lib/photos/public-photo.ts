import type { PhotoRecord, PublicPhoto } from "@/types/photo";

export function toPublicPhoto(photo: PhotoRecord): PublicPhoto {
  return {
    id: photo.id,
    title: photo.title,
    description: photo.description,
    location: photo.location,
    shotAt: photo.shotAt,
    albumName: photo.albumName,
    albumSlug: photo.albumSlug,
    exifData: photo.exifData,
    createdAt: photo.createdAt,
    width: photo.width,
    height: photo.height,
    mediumUrl: photo.mediumUrl,
    thumbnailUrl: photo.thumbnailUrl,
    blurDataUrl: photo.blurDataUrl,
    source: photo.source,
    albumId: photo.albumId,
  };
}

export function toPublicPhotos(photos: PhotoRecord[]): PublicPhoto[] {
  return photos.map(toPublicPhoto);
}
