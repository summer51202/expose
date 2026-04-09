import "server-only";

import {
  appendManifestLike,
  listManifestLikes,
  replaceManifestLikes,
} from "@/lib/likes/manifest-repository";
import { getDataBackend } from "@/lib/data/backend";
import { toPrismaBigInt } from "@/lib/prisma-id";
import { prisma } from "@/lib/prisma";
import type { PhotoLikeRecord } from "@/types/like";

export interface LikeRepository {
  listLikes(): Promise<PhotoLikeRecord[]>;
  appendLike(record: PhotoLikeRecord): Promise<void>;
  deleteLike(likeId: number): Promise<void>;
  clearLikesByPhoto(photoSource: "uploaded" | "sample", photoId: number): Promise<void>;
}

const jsonLikeRepository: LikeRepository = {
  async listLikes() {
    return listManifestLikes();
  },
  async appendLike(record) {
    await appendManifestLike(record);
  },
  async deleteLike(likeId) {
    const likes = await listManifestLikes();
    await replaceManifestLikes(likes.filter((like) => like.id !== likeId));
  },
  async clearLikesByPhoto(photoSource, photoId) {
    const likes = await listManifestLikes();
    await replaceManifestLikes(
      likes.filter(
        (like) => !(like.photoSource === photoSource && like.photoId === photoId),
      ),
    );
  },
};

const prismaLikeRepository: LikeRepository = {
  async listLikes() {
    const [uploadedLikes, sampleLikes] = await Promise.all([
      prisma.photoLike.findMany({
        orderBy: {
          createdAt: "desc",
        },
      }),
      listManifestLikes().then((likes) =>
        likes.filter((like) => like.photoSource === "sample"),
      ),
    ]);

    const records = uploadedLikes.map((like) => ({
      id: Number(like.id),
      photoId: Number(like.photoId),
      photoSource: "uploaded" as const,
      visitorId: like.visitorId,
      createdAt: like.createdAt.toISOString(),
    }));

    return [...records, ...sampleLikes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },
  async appendLike(record) {
    if (record.photoSource === "sample") {
      await appendManifestLike(record);
      return;
    }

    await prisma.photoLike.create({
      data: {
        id: toPrismaBigInt(record.id),
        photoId: toPrismaBigInt(record.photoId),
        visitorId: record.visitorId,
        createdAt: new Date(record.createdAt),
      },
    });
  },
  async deleteLike(likeId) {
    const sampleLikes = await listManifestLikes();
    if (sampleLikes.some((like) => like.id === likeId)) {
      await replaceManifestLikes(
        sampleLikes.filter((like) => like.id !== likeId),
      );
      return;
    }

    await prisma.photoLike.delete({
      where: { id: toPrismaBigInt(likeId) },
    });
  },
  async clearLikesByPhoto(photoSource, photoId) {
    if (photoSource === "sample") {
      const likes = await listManifestLikes();
      await replaceManifestLikes(
        likes.filter(
          (like) => !(like.photoSource === photoSource && like.photoId === photoId),
        ),
      );
      return;
    }

    await prisma.photoLike.deleteMany({
      where: {
        photoId: toPrismaBigInt(photoId),
      },
    });
  },
};

export function getLikeRepository(): LikeRepository {
  return getDataBackend() === "prisma"
    ? prismaLikeRepository
    : jsonLikeRepository;
}
