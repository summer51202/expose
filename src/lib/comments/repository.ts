import "server-only";

import {
  appendManifestComment,
  deleteManifestComment,
  listManifestComments,
} from "@/lib/comments/manifest-repository";
import { getDataBackend } from "@/lib/data/backend";
import { toPrismaBigInt } from "@/lib/prisma-id";
import { prisma } from "@/lib/prisma";
import type { CommentRecord } from "@/types/comment";

export interface CommentRepository {
  listComments(): Promise<CommentRecord[]>;
  appendComment(record: CommentRecord): Promise<void>;
  deleteComment(commentId: number): Promise<void>;
}

const jsonCommentRepository: CommentRepository = {
  async listComments() {
    return listManifestComments();
  },
  async appendComment(record) {
    await appendManifestComment(record);
  },
  async deleteComment(commentId) {
    await deleteManifestComment(commentId);
  },
};

const prismaCommentRepository: CommentRepository = {
  async listComments() {
    const [uploadedComments, sampleComments] = await Promise.all([
      prisma.comment.findMany({
        orderBy: {
          createdAt: "desc",
        },
      }),
      listManifestComments().then((comments) =>
        comments.filter((comment) => comment.photoSource === "sample"),
      ),
    ]);

    const records = uploadedComments.map((comment) => ({
      id: Number(comment.id),
      photoId: Number(comment.photoId),
      photoSource: "uploaded" as const,
      nickname: comment.nickname,
      content: comment.content,
      ipHash: comment.ipHash,
      createdAt: comment.createdAt.toISOString(),
    }));

    return [...records, ...sampleComments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },
  async appendComment(record) {
    if (record.photoSource === "sample") {
      await appendManifestComment(record);
      return;
    }

    await prisma.comment.create({
      data: {
        id: toPrismaBigInt(record.id),
        photoId: toPrismaBigInt(record.photoId),
        nickname: record.nickname,
        content: record.content,
        ipHash: record.ipHash,
        createdAt: new Date(record.createdAt),
      },
    });
  },
  async deleteComment(commentId) {
    const sampleComments = await listManifestComments();
    if (sampleComments.some((comment) => comment.id === commentId)) {
      await deleteManifestComment(commentId);
      return;
    }

    await prisma.comment.delete({
      where: { id: toPrismaBigInt(commentId) },
    });
  },
};

export function getCommentRepository(): CommentRepository {
  return getDataBackend() === "prisma"
    ? prismaCommentRepository
    : jsonCommentRepository;
}
