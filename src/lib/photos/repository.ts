import "server-only";

import {
  listManifestPhotos,
  replaceManifestPhotos,
  saveManifestPhotos,
} from "@/lib/photos/manifest-repository";
import { getDataBackend } from "@/lib/data/backend";
import { fromPrismaBigInt, toPrismaBigInt } from "@/lib/prisma-id";
import { prisma } from "@/lib/prisma";
import type { PhotoRecord } from "@/types/photo";

type PrismaPhotoWithAlbum = Awaited<
  ReturnType<typeof prisma.photo.findMany>
>[number] & {
  album?: {
    name: string;
    slug: string;
  } | null;
};

export type PhotoAlbumAssignment = {
  albumId: number;
  albumName: string;
  albumSlug: string;
};

function mapPhotoRecordFromPrisma(photo: PrismaPhotoWithAlbum): PhotoRecord {
  return {
    id: Number(photo.id),
    title: photo.title,
    description: photo.description ?? undefined,
    shotAt: photo.takenAt?.toISOString(),
    albumName: photo.album?.name,
    albumSlug: photo.album?.slug,
    exifData:
      photo.exifData && typeof photo.exifData === "object"
        ? (photo.exifData as Record<string, string | number | boolean | null>)
        : null,
    createdAt: photo.createdAt.toISOString(),
    width: photo.width,
    height: photo.height,
    originalUrl: photo.originalUrl,
    mediumUrl: photo.mediumUrl,
    thumbnailUrl: photo.thumbnailUrl,
    blurDataUrl: photo.blurDataUrl ?? undefined,
    originalKey: photo.originalKey ?? undefined,
    mediumKey: photo.mediumKey ?? undefined,
    thumbnailKey: photo.thumbnailKey ?? undefined,
    storageProvider:
      photo.storageProvider === "r2" ? "r2" : "local",
    source: "uploaded",
    albumId: fromPrismaBigInt(photo.albumId),
  };
}

function assignPhotoAlbum(
  photo: PhotoRecord,
  assignment: PhotoAlbumAssignment,
): PhotoRecord {
  return {
    ...photo,
    albumId: assignment.albumId,
    albumName: assignment.albumName,
    albumSlug: assignment.albumSlug,
  };
}

function mapPhotoCreateInput(record: PhotoRecord) {
  return {
    id: toPrismaBigInt(record.id),
    albumId: record.albumId != null ? toPrismaBigInt(record.albumId) : null,
    title: record.title,
    description: record.description,
    originalUrl: record.originalUrl,
    mediumUrl: record.mediumUrl,
    thumbnailUrl: record.thumbnailUrl,
    originalKey: record.originalKey ?? null,
    mediumKey: record.mediumKey ?? null,
    thumbnailKey: record.thumbnailKey ?? null,
    blurDataUrl: record.blurDataUrl ?? null,
    storageProvider: record.storageProvider ?? "local",
    width: record.width,
    height: record.height,
    exifData: record.exifData ?? undefined,
    takenAt: record.shotAt ? new Date(record.shotAt) : null,
    createdAt: new Date(record.createdAt),
  };
}

export interface PhotoRepository {
  listUploadedPhotos(): Promise<PhotoRecord[]>;
  savePhotos(records: PhotoRecord[]): Promise<void>;
  movePhotoToAlbum(photoId: number, assignment: PhotoAlbumAssignment): Promise<void>;
  movePhotosToAlbum(photoIds: number[], assignment: PhotoAlbumAssignment): Promise<void>;
  deletePhoto(photoId: number): Promise<PhotoRecord | null>;
  deletePhotos(photoIds: number[]): Promise<PhotoRecord[]>;
  renameAlbumReferences(albumId: number, name: string, slug: string): Promise<void>;
}

const jsonPhotoRepository: PhotoRepository = {
  async listUploadedPhotos() {
    return listManifestPhotos();
  },
  async savePhotos(records) {
    await saveManifestPhotos(records);
  },
  async movePhotoToAlbum(photoId, assignment) {
    const photos = await listManifestPhotos();
    await replaceManifestPhotos(
      photos.map((photo) =>
        photo.id === photoId ? assignPhotoAlbum(photo, assignment) : photo,
      ),
    );
  },
  async movePhotosToAlbum(photoIds, assignment) {
    const targetIds = new Set(photoIds);
    const photos = await listManifestPhotos();
    await replaceManifestPhotos(
      photos.map((photo) =>
        targetIds.has(photo.id) ? assignPhotoAlbum(photo, assignment) : photo,
      ),
    );
  },
  async deletePhoto(photoId) {
    const deletedPhotos = await this.deletePhotos([photoId]);

    return deletedPhotos[0] ?? null;
  },
  async deletePhotos(photoIds) {
    const targetIds = new Set(photoIds);
    const photos = await listManifestPhotos();
    const deletedPhotos = photos.filter((photo) => targetIds.has(photo.id));

    await replaceManifestPhotos(photos.filter((photo) => !targetIds.has(photo.id)));

    return deletedPhotos;
  },
  async renameAlbumReferences(albumId, name, slug) {
    const photos = await listManifestPhotos();
    await replaceManifestPhotos(
      photos.map((photo) =>
        photo.albumId === albumId
          ? {
              ...photo,
              albumName: name,
              albumSlug: slug,
            }
          : photo,
      ),
    );
  },
};

const prismaPhotoRepository: PhotoRepository = {
  async listUploadedPhotos() {
    const photos = await prisma.photo.findMany({
      include: {
        album: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return photos.map((photo) =>
      mapPhotoRecordFromPrisma(photo as PrismaPhotoWithAlbum),
    );
  },
  async savePhotos(records) {
    for (const record of records) {
      await prisma.photo.create({
        data: mapPhotoCreateInput(record),
      });
    }
  },
  async movePhotoToAlbum(photoId, assignment) {
    await prisma.photo.update({
      where: {
        id: toPrismaBigInt(photoId),
      },
      data: {
        albumId: toPrismaBigInt(assignment.albumId),
      },
    });
  },
  async movePhotosToAlbum(photoIds, assignment) {
    if (photoIds.length === 0) {
      return;
    }

    await prisma.photo.updateMany({
      where: {
        id: {
          in: photoIds.map(toPrismaBigInt),
        },
      },
      data: {
        albumId: toPrismaBigInt(assignment.albumId),
      },
    });
  },
  async deletePhoto(photoId) {
    const deletedPhotos = await this.deletePhotos([photoId]);

    return deletedPhotos[0] ?? null;
  },
  async deletePhotos(photoIds) {
    if (photoIds.length === 0) {
      return [];
    }

    const photos = await prisma.photo.findMany({
      where: {
        id: {
          in: photoIds.map(toPrismaBigInt),
        },
      },
      include: {
        album: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    await prisma.photo.deleteMany({
      where: {
        id: {
          in: photoIds.map(toPrismaBigInt),
        },
      },
    });

    return photos.map((photo) =>
      mapPhotoRecordFromPrisma(photo as PrismaPhotoWithAlbum),
    );
  },
  async renameAlbumReferences() {
    return;
  },
};

export function getPhotoRepository(): PhotoRepository {
  return getDataBackend() === "prisma"
    ? prismaPhotoRepository
    : jsonPhotoRepository;
}
