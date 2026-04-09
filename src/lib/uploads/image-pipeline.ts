import sharp from "sharp";

import { extractExifData, type ExifRecord } from "@/lib/photos/exif";

type ProcessUploadInput = {
  fileName: string;
  buffer: Buffer;
};

type ProcessUploadResult = {
  baseName: string;
  originalBuffer: Buffer;
  mediumBuffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
  blurDataUrl: string;
  exifData: ExifRecord | null;
};

function slugifyFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function createBaseName(fileName: string) {
  const slug = slugifyFileName(fileName) || "photo";
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${slug}`;
}

export async function processUpload({
  fileName,
  buffer,
}: ProcessUploadInput): Promise<ProcessUploadResult> {
  const baseName = createBaseName(fileName);

  const normalized = sharp(buffer).rotate();
  const metadata = await normalized.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const exifData = await extractExifData(buffer);

  const originalBuffer = await normalized.clone().webp({ quality: 92 }).toBuffer();
  const mediumBuffer = await normalized
    .clone()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();
  const thumbnailBuffer = await normalized
    .clone()
    .resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 76 })
    .toBuffer();
  const blurBuffer = await normalized
    .clone()
    .resize({ width: 32, height: 32, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    baseName,
    originalBuffer,
    mediumBuffer,
    thumbnailBuffer,
    width,
    height,
    blurDataUrl: `data:image/webp;base64,${blurBuffer.toString("base64")}`,
    exifData,
  };
}
