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
    largeUrl: photo.largeUrl,
    thumbnailUrl: photo.thumbnailUrl,
    blurDataUrl: photo.blurDataUrl,
    featured: photo.featured === true,
    featuredAt: photo.featured === true ? photo.featuredAt : undefined,
    source: photo.source,
    albumId: photo.albumId,
  };
}

export function toPublicPhotos(photos: PhotoRecord[]): PublicPhoto[] {
  return photos.map(toPublicPhoto);
}
