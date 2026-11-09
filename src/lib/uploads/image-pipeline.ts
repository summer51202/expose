import sharp, { type Metadata, type Sharp } from "sharp";

import { extractExifData, type ExifRecord } from "@/lib/photos/exif";
import { UploadProcessingError } from "@/lib/security/errors";
import { siteConfig } from "@/config/site";
import { IMAGE_DERIVATIVES, renderDerivative } from "@/lib/uploads/image-derivatives";
import { validateImageMetadata } from "@/lib/uploads/upload-guards";

type ProcessUploadInput = {
  fileName: string;
  buffer: Buffer;
};

type ProcessUploadResult = {
  baseName: string;
  originalBuffer: Buffer;
  largeBuffer: Buffer;
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

  let normalized: Sharp;
  let metadata: Metadata;

  try {
    normalized = sharp(buffer).rotate();
    metadata = await normalized.metadata();
  } catch (error) {
    throw new UploadProcessingError(
      error instanceof Error ? error.message : "Image metadata extraction failed.",
    );
  }

  // metadata() describes the input, not the pipeline, so `.rotate()` does not
  // swap width/height. `autoOrient` holds the size after applying EXIF
  // orientation, which is what the derivatives (and the gallery layout) use.
  const width = metadata.autoOrient?.width ?? metadata.width ?? 0;
  const height = metadata.autoOrient?.height ?? metadata.height ?? 0;
  validateImageMetadata({ fileName, width, height });
  const exifData = await extractExifData(buffer);

  // Public derivatives: resized, watermarked (large/medium) and carrying only the copyright
  // EXIF (Artist/Copyright); none of the original's EXIF, such as GPS, is copied.
  const render = (spec: (typeof IMAGE_DERIVATIVES)[keyof typeof IMAGE_DERIVATIVES]) =>
    renderDerivative(normalized, spec, { photographerName: siteConfig.photographerName });

  try {
    const originalBuffer = await normalized.clone().webp({ quality: 92 }).toBuffer();
    const largeBuffer = await render(IMAGE_DERIVATIVES.large);
    const mediumBuffer = await render(IMAGE_DERIVATIVES.medium);
    const thumbnailBuffer = await render(IMAGE_DERIVATIVES.thumbnail);
    const blurBuffer = await normalized
      .clone()
      .resize({ width: 32, height: 32, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 40 })
      .toBuffer();

    return {
      baseName,
      originalBuffer,
      largeBuffer,
      mediumBuffer,
      thumbnailBuffer,
      width,
      height,
      blurDataUrl: `data:image/webp;base64,${blurBuffer.toString("base64")}`,
      exifData,
    };
  } catch (error) {
    throw new UploadProcessingError(
      error instanceof Error ? error.message : "Image transformation failed.",
    );
  }
}
