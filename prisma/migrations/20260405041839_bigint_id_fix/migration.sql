/*
  Warnings:

  - The primary key for the `Album` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `coverPhotoId` on the `Album` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `id` on the `Album` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - The primary key for the `Comment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Comment` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `photoId` on the `Comment` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - The primary key for the `Photo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `albumId` on the `Photo` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `id` on the `Photo` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - The primary key for the `PhotoLike` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `PhotoLike` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `photoId` on the `PhotoLike` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Album" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverPhotoId" BIGINT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Album_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "Photo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Album" ("coverPhotoId", "createdAt", "description", "id", "name", "slug", "sortOrder", "updatedAt") SELECT "coverPhotoId", "createdAt", "description", "id", "name", "slug", "sortOrder", "updatedAt" FROM "Album";
DROP TABLE "Album";
ALTER TABLE "new_Album" RENAME TO "Album";
CREATE UNIQUE INDEX "Album_slug_key" ON "Album"("slug");
CREATE UNIQUE INDEX "Album_coverPhotoId_key" ON "Album"("coverPhotoId");
CREATE TABLE "new_Comment" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "photoId" BIGINT NOT NULL,
    "photoSource" TEXT NOT NULL DEFAULT 'uploaded',
    "nickname" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("content", "createdAt", "id", "ipHash", "nickname", "photoId", "photoSource") SELECT "content", "createdAt", "id", "ipHash", "nickname", "photoId", "photoSource" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE TABLE "new_Photo" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "albumId" BIGINT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "originalUrl" TEXT NOT NULL,
    "originalKey" TEXT,
    "thumbnailUrl" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "mediumUrl" TEXT NOT NULL,
    "mediumKey" TEXT,
    "blurDataUrl" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "exifData" JSONB,
    "takenAt" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Photo_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("albumId", "blurDataUrl", "createdAt", "description", "exifData", "height", "id", "location", "mediumKey", "mediumUrl", "originalKey", "originalUrl", "sortOrder", "storageProvider", "takenAt", "thumbnailKey", "thumbnailUrl", "title", "updatedAt", "width") SELECT "albumId", "blurDataUrl", "createdAt", "description", "exifData", "height", "id", "location", "mediumKey", "mediumUrl", "originalKey", "originalUrl", "sortOrder", "storageProvider", "takenAt", "thumbnailKey", "thumbnailUrl", "title", "updatedAt", "width" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE TABLE "new_PhotoLike" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "photoId" BIGINT NOT NULL,
    "photoSource" TEXT NOT NULL DEFAULT 'uploaded',
    "visitorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhotoLike_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PhotoLike" ("createdAt", "id", "photoId", "photoSource", "visitorId") SELECT "createdAt", "id", "photoId", "photoSource", "visitorId" FROM "PhotoLike";
DROP TABLE "PhotoLike";
ALTER TABLE "new_PhotoLike" RENAME TO "PhotoLike";
CREATE UNIQUE INDEX "PhotoLike_photoId_visitorId_key" ON "PhotoLike"("photoId", "visitorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
