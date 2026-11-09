import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import { IMAGE_DERIVATIVES, getFitInsideDimensions } from "./image-derivatives";
import { processUpload } from "./image-pipeline";

function createImage(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 90, b: 60 } },
  })
    .jpeg()
    .toBuffer();
}

async function sizeOf(buffer: Buffer) {
  const { width, height, format } = await sharp(buffer).metadata();
  return { width, height, format };
}

test("large derivative spec is 2048px webp q85", () => {
  assert.equal(IMAGE_DERIVATIVES.large.maxDimension, 2048);
  assert.equal(IMAGE_DERIVATIVES.large.quality, 85);
  assert.equal(IMAGE_DERIVATIVES.medium.maxDimension, 1200);
  assert.equal(IMAGE_DERIVATIVES.thumbnail.maxDimension, 400);
});

test("getFitInsideDimensions scales the longest edge down and keeps aspect ratio", () => {
  assert.deepEqual(getFitInsideDimensions(6000, 4000, 2560), { width: 2560, height: 1707 });
  assert.deepEqual(getFitInsideDimensions(3000, 5000, 2560), { width: 1536, height: 2560 });
});

test("getFitInsideDimensions never enlarges", () => {
  assert.deepEqual(getFitInsideDimensions(1600, 900, 2560), { width: 1600, height: 900 });
  assert.deepEqual(getFitInsideDimensions(2560, 2560, 2560), { width: 2560, height: 2560 });
});

test("processUpload renders a 2048px large derivative for big landscape photos", async () => {
  const result = await processUpload({ fileName: "wide.jpg", buffer: await createImage(4000, 3000) });

  assert.deepEqual(await sizeOf(result.largeBuffer), { width: 2048, height: 1536, format: "webp" });
  assert.deepEqual(await sizeOf(result.mediumBuffer), { width: 1200, height: 900, format: "webp" });
  assert.deepEqual(await sizeOf(result.thumbnailBuffer), { width: 400, height: 300, format: "webp" });
  assert.equal(result.width, 4000);
});

test("processUpload limits the long edge of portrait photos", async () => {
  const result = await processUpload({ fileName: "tall.jpg", buffer: await createImage(3000, 5000) });

  assert.deepEqual(await sizeOf(result.largeBuffer), { width: 1229, height: 2048, format: "webp" });
});

test("processUpload reports the displayed size of EXIF-rotated photos", async () => {
  // 3000×2000 pixels stored sideways; EXIF orientation 6 displays it as 2000×3000.
  const buffer = await sharp({
    create: { width: 3000, height: 2000, channels: 3, background: { r: 120, g: 90, b: 60 } },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await processUpload({ fileName: "rotated.jpg", buffer });

  assert.equal(result.width, 2000);
  assert.equal(result.height, 3000);
  assert.deepEqual(await sizeOf(result.mediumBuffer), { width: 800, height: 1200, format: "webp" });
  assert.deepEqual(await sizeOf(result.originalBuffer), { width: 2000, height: 3000, format: "webp" });
});

test("processUpload does not enlarge small photos into large", async () => {
  const result = await processUpload({ fileName: "small.jpg", buffer: await createImage(1000, 800) });

  assert.deepEqual(await sizeOf(result.largeBuffer), { width: 1000, height: 800, format: "webp" });
  assert.deepEqual(await sizeOf(result.mediumBuffer), { width: 1000, height: 800, format: "webp" });
});
