import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dataDir = path.join(process.cwd(), "data");

function toBigInt(value) {
  return BigInt(value);
}

function stripBom(content) {
  return content.replace(/^\uFEFF/, "");
}

async function readJsonArray(fileName) {
  const filePath = path.join(dataDir, fileName);
  const content = await readFile(filePath, "utf8");
  const parsed = JSON.parse(stripBom(content));

  if (!Array.isArray(parsed)) {
    throw new Error(`${fileName} must contain a JSON array.`);
  }

  return parsed;
}

function toDateOrNull(value) {
  return value ? new Date(value) : null;
}

function ensureUniqueIds(records, label) {
  const seen = new Set();

  for (const record of records) {
    if (seen.has(record.id)) {
      throw new Error(`Duplicate ${label} id detected: ${record.id}`);
    }

    seen.add(record.id);
  }
}

async function main() {
  const [albums, photos, comments, likes] = await Promise.all([
    readJsonArray("albums.json"),
    readJsonArray("photos.json"),
    readJsonArray("comments.json"),
    readJsonArray("likes.json"),
  ]);

  ensureUniqueIds(albums, "album");
  ensureUniqueIds(photos, "photo");
  ensureUniqueIds(comments, "comment");
  ensureUniqueIds(likes, "like");

  const uploadedComments = comments.filter((comment) => comment.photoSource === "uploaded");
  const uploadedLikes = likes.filter((like) => like.photoSource === "uploaded");

  const photoIds = new Set(photos.map((photo) => photo.id));

  for (const comment of uploadedComments) {
    if (!photoIds.has(comment.photoId)) {
      throw new Error(`Comment ${comment.id} references missing photo ${comment.photoId}`);
    }
  }

  for (const like of uploadedLikes) {
    if (!photoIds.has(like.photoId)) {
      throw new Error(`Like ${like.id} references missing photo ${like.photoId}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const album of albums) {
      await tx.album.upsert({
        where: { id: toBigInt(album.id) },
        update: {
          name: album.name,
          slug: album.slug,
          description: album.description ?? null,
          coverPhotoId: album.coverPhotoId != null ? toBigInt(album.coverPhotoId) : null,
          sortOrder: album.sortOrder ?? 0,
          createdAt: toDateOrNull(album.createdAt) ?? undefined,
        },
        create: {
          id: toBigInt(album.id),
          name: album.name,
          slug: album.slug,
          description: album.description ?? null,
          coverPhotoId: album.coverPhotoId != null ? toBigInt(album.coverPhotoId) : null,
          sortOrder: album.sortOrder ?? 0,
          createdAt: toDateOrNull(album.createdAt) ?? undefined,
        },
      });
    }

    for (const photo of photos) {
      await tx.photo.upsert({
        where: { id: toBigInt(photo.id) },
        update: {
          albumId: photo.albumId != null ? toBigInt(photo.albumId) : null,
          title: photo.title,
          description: photo.description ?? null,
          location: photo.location ?? null,
          originalUrl: photo.originalUrl,
          originalKey: photo.originalUrl,
          mediumUrl: photo.mediumUrl,
          mediumKey: photo.mediumUrl,
          thumbnailUrl: photo.thumbnailUrl,
          thumbnailKey: photo.thumbnailUrl,
          blurDataUrl: photo.blurDataUrl ?? null,
          storageProvider: "local",
          width: photo.width,
          height: photo.height,
          exifData: photo.exifData ?? null,
          takenAt: toDateOrNull(photo.shotAt),
          createdAt: toDateOrNull(photo.createdAt) ?? undefined,
        },
        create: {
          id: toBigInt(photo.id),
          albumId: photo.albumId != null ? toBigInt(photo.albumId) : null,
          title: photo.title,
          description: photo.description ?? null,
          location: photo.location ?? null,
          originalUrl: photo.originalUrl,
          originalKey: photo.originalUrl,
          mediumUrl: photo.mediumUrl,
          mediumKey: photo.mediumUrl,
          thumbnailUrl: photo.thumbnailUrl,
          thumbnailKey: photo.thumbnailUrl,
          blurDataUrl: photo.blurDataUrl ?? null,
          storageProvider: "local",
          width: photo.width,
          height: photo.height,
          exifData: photo.exifData ?? null,
          takenAt: toDateOrNull(photo.shotAt),
          createdAt: toDateOrNull(photo.createdAt) ?? undefined,
        },
      });
    }

    for (const comment of uploadedComments) {
      await tx.comment.upsert({
        where: { id: toBigInt(comment.id) },
        update: {
          photoId: toBigInt(comment.photoId),
          photoSource: "uploaded",
          nickname: comment.nickname,
          content: comment.content,
          ipHash: comment.ipHash,
          createdAt: toDateOrNull(comment.createdAt) ?? undefined,
        },
        create: {
          id: toBigInt(comment.id),
          photoId: toBigInt(comment.photoId),
          photoSource: "uploaded",
          nickname: comment.nickname,
          content: comment.content,
          ipHash: comment.ipHash,
          createdAt: toDateOrNull(comment.createdAt) ?? undefined,
        },
      });
    }

    for (const like of uploadedLikes) {
      await tx.photoLike.upsert({
        where: { id: toBigInt(like.id) },
        update: {
          photoId: toBigInt(like.photoId),
          photoSource: "uploaded",
          visitorId: like.visitorId,
          createdAt: toDateOrNull(like.createdAt) ?? undefined,
        },
        create: {
          id: toBigInt(like.id),
          photoId: toBigInt(like.photoId),
          photoSource: "uploaded",
          visitorId: like.visitorId,
          createdAt: toDateOrNull(like.createdAt) ?? undefined,
        },
      });
    }
  });

  console.log("Prisma import completed.");
  console.log(`Albums:   ${albums.length}`);
  console.log(`Photos:   ${photos.length}`);
  console.log(`Comments: ${uploadedComments.length} uploaded / ${comments.length - uploadedComments.length} sample skipped`);
  console.log(`Likes:    ${uploadedLikes.length} uploaded / ${likes.length - uploadedLikes.length} sample skipped`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
