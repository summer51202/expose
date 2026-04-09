import { createAlbumSlug } from "@/lib/albums/slug";
import { getDataFilePath, readJsonArrayFile, writeJsonFile } from "@/lib/data/json-store";
import type { AlbumRecord } from "@/types/album";
import type { PhotoRecord } from "@/types/photo";

const albumsPath = getDataFilePath("albums.json");
const photosPath = getDataFilePath("photos.json");

export async function repairAlbumSlugs() {
  const [albumsRaw, photosRaw] = await Promise.all([
    readJsonArrayFile<AlbumRecord>(albumsPath),
    readJsonArrayFile<PhotoRecord>(photosPath),
  ]);
  const albums = albumsRaw;
  const photos = photosRaw;

  const slugMap = new Map<number, string>();
  const usedSlugs = new Set<string>();

  const repairedAlbums = albums.map((album) => {
    let slug = createAlbumSlug(album.name, album.id);
    let suffix = 2;

    while (usedSlugs.has(slug)) {
      slug = `${createAlbumSlug(album.name, album.id)}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(slug);
    slugMap.set(album.id, slug);

    return {
      ...album,
      slug,
    };
  });

  const repairedPhotos = photos.map((photo) => {
    if (!photo.albumId) {
      return photo;
    }

    const album = repairedAlbums.find((item) => item.id === photo.albumId);
    if (!album) {
      return {
        ...photo,
        albumId: null,
        albumName: undefined,
        albumSlug: undefined,
      };
    }

    return {
      ...photo,
      albumName: album.name,
      albumSlug: slugMap.get(album.id),
    };
  });

  await Promise.all([
    writeJsonFile(albumsPath, repairedAlbums),
    writeJsonFile(photosPath, repairedPhotos),
  ]);

  return {
    albumCount: repairedAlbums.length,
    photoCount: repairedPhotos.filter((photo) => photo.albumId).length,
  };
}
