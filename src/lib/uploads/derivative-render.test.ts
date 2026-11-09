import assert from "node:assert/strict";
import test from "node:test";

import exifr from "exifr";
import sharp from "sharp";

import {
  DERIVATIVE_VERSION,
  IMAGE_DERIVATIVES,
  LARGE_MAX_DIMENSION,
  WATERMARK,
  baseKeyFromOriginalKey,
  currentDerivativeKeys,
  derivativeKey,
  getWatermarkLayout,
  getWatermarkText,
  previousDerivativeKeys,
  renderAllDerivatives,
} from "./derivative-render.mjs";
import { siteConfig } from "@/config/site";

const GRAY = 128;

function grayPhoto(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: GRAY, g: GRAY, b: GRAY } } })
    .jpeg({ quality: 95 })
    .withExif({ IFD0: { Make: "Canon", Model: "EOS R5" }, IFD3: { GPSLatitudeRef: "N", GPSLongitudeRef: "E" } })
    .toBuffer();
}

/** Brightest luma in a region; the white watermark text is far above the gray background. */
async function maxLuma(buffer: Buffer, region: { left: number; top: number; width: number; height: number }) {
  const { data } = await sharp(buffer).extract(region).greyscale().raw().toBuffer({ resolveWithObject: true });
  return data.reduce((max, value) => Math.max(max, value), 0);
}

async function readExif(buffer: Buffer) {
  const { exif } = await sharp(buffer).metadata();
  assert.ok(exif, "derivative carries EXIF");
  // sharp returns the APP1 payload ("Exif\0\0" + TIFF); exifr reads the TIFF part.
  return exifr.parse(exif.subarray(6), { tiff: true, ifd0: true, exif: true, gps: true, mergeOutput: false } as never);
}

test("large is 2048px, set by one constant", () => {
  assert.equal(LARGE_MAX_DIMENSION, 2048);
  assert.equal(IMAGE_DERIVATIVES.large.maxDimension, LARGE_MAX_DIMENSION);
  assert.equal(IMAGE_DERIVATIVES.medium.maxDimension, 1200);
  assert.equal(IMAGE_DERIVATIVES.thumbnail.maxDimension, 400);
});

test("watermark goes on large and medium only", () => {
  assert.equal(IMAGE_DERIVATIVES.large.watermark, true);
  assert.equal(IMAGE_DERIVATIVES.medium.watermark, true);
  assert.equal(IMAGE_DERIVATIVES.thumbnail.watermark, false);
});

test("watermark text comes from siteConfig.photographerName", () => {
  assert.equal(getWatermarkText(siteConfig.photographerName), `© ${siteConfig.photographerName}`);
  assert.equal(getWatermarkText("Edward Lee"), "© Edward Lee");
});

test("getWatermarkLayout scales with the short edge, so landscape and portrait match", () => {
  const landscape = getWatermarkLayout(2048, 1365);
  const portrait = getWatermarkLayout(1365, 2048);
  assert.deepEqual(landscape, portrait);
  assert.equal(landscape.fontSize, Math.round(1365 * WATERMARK.fontSizeRatio));
  assert.equal(landscape.margin, Math.round(1365 * WATERMARK.marginRatio));

  const medium = getWatermarkLayout(1200, 800);
  assert.equal(medium.fontSize, Math.round(800 * WATERMARK.fontSizeRatio));
  assert.ok(medium.fontSize < landscape.fontSize);
});

test("getWatermarkLayout keeps a minimum font size and room for the shadow", () => {
  const tiny = getWatermarkLayout(200, 150);
  assert.equal(tiny.fontSize, WATERMARK.minFontSize);
  assert.ok(tiny.margin >= tiny.padding, "the shadow never sticks out of the image");
});

test("derivative keys carry the pipeline version", () => {
  assert.equal(DERIVATIVE_VERSION, 2);
  assert.equal(baseKeyFromOriginalKey("uploads/1-ab-photo-original.webp"), "uploads/1-ab-photo");
  assert.equal(baseKeyFromOriginalKey("/uploads/legacy.jpg"), "uploads/legacy");
  assert.equal(baseKeyFromOriginalKey(""), null);
  assert.equal(derivativeKey("uploads/1-ab-photo", "large"), "uploads/1-ab-photo-large.v2.webp");
  assert.deepEqual(currentDerivativeKeys("uploads/x"), {
    large: "uploads/x-large.v2.webp",
    medium: "uploads/x-medium.v2.webp",
    thumbnail: "uploads/x-thumb.v2.webp",
  });
  assert.deepEqual(previousDerivativeKeys("uploads/x"), [
    "uploads/x-large.webp",
    "uploads/x-large.v1.webp",
    "uploads/x-medium.webp",
    "uploads/x-medium.v1.webp",
    "uploads/x-thumb.webp",
    "uploads/x-thumb.v1.webp",
  ]);
});

test("renderAllDerivatives watermarks the bottom-right of large and medium, not thumbnail", async () => {
  const result = await renderAllDerivatives(await grayPhoto(3000, 2000), { photographerName: "Edward Lee" });

  assert.equal(result.width, 3000);
  assert.equal(result.height, 2000);
  const large = await sharp(result.large).metadata();
  assert.deepEqual([large.width, large.height], [2048, 1365]);

  const corner = (w: number, h: number, size: number) => ({ left: w - size * 3, top: h - size, width: size * 3, height: size });
  assert.ok((await maxLuma(result.large, corner(2048, 1365, 120))) > 200, "large has white text bottom-right");
  assert.ok((await maxLuma(result.large, { left: 0, top: 0, width: 600, height: 300 })) < GRAY + 10, "top-left untouched");
  assert.ok((await maxLuma(result.large, { left: 0, top: 1245, width: 600, height: 120 })) < GRAY + 10, "bottom-left untouched");
  assert.ok((await maxLuma(result.medium, corner(1200, 800, 80))) > 200, "medium has the watermark");
  assert.ok((await maxLuma(result.thumbnail, { left: 0, top: 0, width: 400, height: 267 })) < GRAY + 10, "thumbnail has none");
});

test("renderAllDerivatives places the watermark bottom-right of portrait photos too", async () => {
  const result = await renderAllDerivatives(await grayPhoto(2000, 3000), { photographerName: "Edward Lee" });
  const large = await sharp(result.large).metadata();
  assert.deepEqual([large.width, large.height], [1365, 2048]);
  assert.ok((await maxLuma(result.large, { left: 1365 - 300, top: 2048 - 90, width: 300, height: 90 })) > 200);
  assert.ok((await maxLuma(result.large, { left: 0, top: 1900, width: 600, height: 148 })) < GRAY + 10);
});

test("derivatives carry only Artist/Copyright, never the original's camera or GPS EXIF", async () => {
  const result = await renderAllDerivatives(await grayPhoto(1600, 1200), { photographerName: "Edward Lee" });

  for (const buffer of [result.large, result.medium, result.thumbnail]) {
    const parsed = (await readExif(buffer)) as Record<string, Record<string, unknown> | undefined>;
    assert.equal(parsed.ifd0?.Artist, "Edward Lee");
    // libvips writes EXIF text as ASCII: "©" becomes "(C)".
    assert.equal(parsed.ifd0?.Copyright, "(C) Edward Lee. All rights reserved.");
    assert.equal(parsed.ifd0?.Make, undefined);
    assert.equal(parsed.ifd0?.Model, undefined);
    assert.equal(parsed.gps, undefined);
    const { xmp, iptc } = await sharp(buffer).metadata();
    assert.equal(xmp, undefined);
    assert.equal(iptc, undefined);
  }
});
