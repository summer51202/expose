import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dataDir = path.join(process.cwd(), "data");

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

async function main() {
  const [albums, photos, comments, likes] = await Promise.all([
    readJsonArray("albums.json"),
    readJsonArray("photos.json"),
    readJsonArray("comments.json"),
    readJsonArray("likes.json"),
  ]);

  const uploadedComments = comments.filter((comment) => comment.photoSource === "uploaded");
  const uploadedLikes = likes.filter((like) => like.photoSource === "uploaded");

  const [albumCount, photoCount, commentCount, likeCount] = await Promise.all([
    prisma.album.count(),
    prisma.photo.count(),
    prisma.comment.count(),
    prisma.photoLike.count(),
  ]);

  const checks = [
    ["albums", albums.length, albumCount],
    ["photos", photos.length, photoCount],
    ["uploaded comments", uploadedComments.length, commentCount],
    ["uploaded likes", uploadedLikes.length, likeCount],
  ];

  let allPassed = true;

  for (const [label, expected, actual] of checks) {
    const ok = expected === actual;
    allPassed &&= ok;
    console.log(`${ok ? "OK" : "FAIL"} ${label}: expected ${expected}, actual ${actual}`);
  }

  if (!allPassed) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
