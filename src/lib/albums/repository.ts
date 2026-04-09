import "server-only";

import {
  createManifestAlbum,
  listManifestAlbums,
  updateManifestAlbum,
} from "@/lib/albums/manifest-repository";
import { getDataBackend } from "@/lib/data/backend";
import { fromPrismaBigInt, toPrismaBigInt } from "@/lib/prisma-id";
import { prisma } from "@/lib/prisma";
import type { AlbumRecord } from "@/types/album";

export interface AlbumRepository {
  listAlbums(): Promise<AlbumRecord[]>;
  createAlbum(record: AlbumRecord): Promise<void>;
  updateAlbum(albumId: number, updater: (record: AlbumRecord) => AlbumRecord): Promise<void>;
}

const jsonAlbumRepository: AlbumRepository = {
  async listAlbums() {
    return listManifestAlbums();
  },
  async createAlbum(record) {
    await createManifestAlbum(record);
  },
  async updateAlbum(albumId, updater) {
    await updateManifestAlbum(albumId, updater);
  },
};

const prismaAlbumRepository: AlbumRepository = {
  async listAlbums() {
    const albums = await prisma.album.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return albums.map((album) => ({
      id: Number(album.id),
      name: album.name,
      slug: album.slug,
      description: album.description ?? undefined,
      coverPhotoId: fromPrismaBigInt(album.coverPhotoId),
      sortOrder: album.sortOrder,
      createdAt: album.createdAt.toISOString(),
    }));
  },
  async createAlbum(record) {
    await prisma.album.create({
      data: {
        id: toPrismaBigInt(record.id),
        name: record.name,
        slug: record.slug,
        description: record.description,
        coverPhotoId:
          record.coverPhotoId != null ? toPrismaBigInt(record.coverPhotoId) : null,
        sortOrder: record.sortOrder,
        createdAt: new Date(record.createdAt),
      },
    });
  },
  async updateAlbum(albumId, updater) {
    const current = await prisma.album.findUnique({
      where: { id: toPrismaBigInt(albumId) },
    });

    if (!current) {
      return;
    }

    const next = updater({
      id: Number(current.id),
      name: current.name,
      slug: current.slug,
      description: current.description ?? undefined,
      coverPhotoId: fromPrismaBigInt(current.coverPhotoId),
      sortOrder: current.sortOrder,
      createdAt: current.createdAt.toISOString(),
    });

    await prisma.album.update({
      where: { id: toPrismaBigInt(albumId) },
      data: {
        name: next.name,
        slug: next.slug,
        description: next.description,
        coverPhotoId:
          next.coverPhotoId != null ? toPrismaBigInt(next.coverPhotoId) : null,
        sortOrder: next.sortOrder,
      },
    });
  },
};

export function getAlbumRepository(): AlbumRepository {
  return getDataBackend() === "prisma"
    ? prismaAlbumRepository
    : jsonAlbumRepository;
}
