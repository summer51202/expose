import type { PhotoRecord } from "@/types/photo";

type AlbumSlideshowPhoto = Pick<
  PhotoRecord,
  "id" | "title" | "mediumUrl" | "thumbnailUrl" | "blurDataUrl"
>;

export function buildAlbumSlideshowPhotos(
  albumId: number,
  photos: Array<Pick<PhotoRecord, "id" | "albumId" | "title" | "mediumUrl" | "thumbnailUrl" | "blurDataUrl">>,
  limit: number,
  random: () => number = Math.random,
): AlbumSlideshowPhoto[] {
  const albumPhotos = photos.filter((photo) => photo.albumId === albumId);

  for (let index = albumPhotos.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    const currentPhoto = albumPhotos[index];
    albumPhotos[index] = albumPhotos[nextIndex];
    albumPhotos[nextIndex] = currentPhoto;
  }

  return albumPhotos.slice(0, limit).map((photo) => ({
    id: photo.id,
    title: photo.title,
    mediumUrl: photo.mediumUrl,
    thumbnailUrl: photo.thumbnailUrl,
    blurDataUrl: photo.blurDataUrl,
  }));
}
