import { getAlbumRepository } from "@/lib/albums/repository";
import { normalizeAlbumSlug } from "@/lib/albums/slug";
import { getPhotoRepository } from "@/lib/photos/repository";
import type { AlbumSummary } from "@/types/album";

export async function getAlbums(): Promise<AlbumSummary[]> {
  const albumRepository = getAlbumRepository();
  const photoRepository = getPhotoRepository();
  const [albums, photos] = await Promise.all([
    albumRepository.listAlbums(),
    photoRepository.listUploadedPhotos(),
  ]);

  return albums.map((album) => ({
    ...album,
    photoCount: photos.filter((photo) => photo.albumId === album.id).length,
  }));
}

export async function getAlbumBySlug(slug: string) {
  const albums = await getAlbums();
  const normalizedSlug = normalizeAlbumSlug(slug);

  return (
    albums.find((album) => normalizeAlbumSlug(album.slug) === normalizedSlug) ?? null
  );
}

export async function getAlbumOptions() {
  const albums = await getAlbums();
  return albums.map((album) => ({
    id: album.id,
    name: album.name,
    slug: album.slug,
  }));
}
