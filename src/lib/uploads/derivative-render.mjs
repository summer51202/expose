// Renders the public derivatives (large / medium / thumbnail) of a photo: resize,
// watermark, copyright EXIF, webp. Plain ESM so both the upload pipeline (TypeScript,
// via image-derivatives.ts) and standalone scripts (scripts/regenerate-derivatives.mjs)
// share one implementation; scripts cannot import the app's TypeScript modules.
import path from "node:path";

import sharp from "sharp";

/** Long edge of the public `large` derivative. */
export const LARGE_MAX_DIMENSION = 2048;

/**
 * Bump when the look of the public derivatives changes (watermark, size, metadata).
 * Derivative keys carry it (`-large.v2.webp`), so a new version gets new URLs: old
 * copies cached by the CDN or browsers stop being served once the old keys are deleted.
 */
export const DERIVATIVE_VERSION = 2;

export const DERIVATIVE_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** Resize specs for every public derivative of an uploaded photo. */
export const IMAGE_DERIVATIVES = /** @type {const} */ ({
  large: { maxDimension: LARGE_MAX_DIMENSION, quality: 85, suffix: "large", watermark: true },
  medium: { maxDimension: 1200, quality: 84, suffix: "medium", watermark: true },
  thumbnail: { maxDimension: 400, quality: 76, suffix: "thumb", watermark: false },
});

/** @typedef {keyof typeof IMAGE_DERIVATIVES} ImageDerivativeName */
/** @typedef {(typeof IMAGE_DERIVATIVES)[ImageDerivativeName]} ImageDerivativeSpec */

/**
 * Watermark drawn on the derivatives whose spec has `watermark: true`.
 * Sizes are ratios of the derivative's short edge so it looks the same at every size.
 */
export const WATERMARK = /** @type {const} */ ({
  enabled: true,
  /** `{name}` is replaced by siteConfig.photographerName. */
  text: "© {name}",
  /** Opacity of the white text, 0–1. */
  opacity: 0.6,
  /** Font size as a share of the short edge (2048×1365 -> 27px, 1200×800 -> 16px). */
  fontSizeRatio: 0.02,
  minFontSize: 10,
  /** Distance from the right and bottom edges, as a share of the short edge. */
  marginRatio: 0.025,
  /** Soft dark shadow so the text stays readable on bright photos. */
  shadow: { opacity: 0.4, blurRatio: 0.08, offsetRatio: 0.05 },
  /** Bundled font (SIL OFL, see fonts/OFL.txt) so servers without system fonts render it too. */
  font: { family: "Geist", file: "src/lib/uploads/fonts/Geist-Regular.ttf" },
});

/** @typedef {typeof WATERMARK} WatermarkConfig */

/**
 * EXIF written into every public derivative; nothing from the original's EXIF (camera,
 * GPS, dates) is carried over. libvips stores EXIF text as ASCII, so "©" is written as "(C)".
 */
export const COPYRIGHT_METADATA = /** @type {const} */ ({
  artist: "{name}",
  copyright: "© {name}. All rights reserved.",
});

/** @param {string} template @param {string} name */
const fillName = (template, name) => template.replaceAll("{name}", name);

/** @param {string} photographerName */
export function getWatermarkText(photographerName, config = WATERMARK) {
  return fillName(config.text, photographerName);
}

/** @param {string} photographerName */
export function buildCopyrightExif(photographerName) {
  return {
    IFD0: {
      Artist: fillName(COPYRIGHT_METADATA.artist, photographerName),
      Copyright: fillName(COPYRIGHT_METADATA.copyright, photographerName),
    },
  };
}

/**
 * Output size of sharp's `resize({ width: max, height: max, fit: "inside",
 * withoutEnlargement: true })`: scale the longest edge down to `maxDimension`,
 * keep aspect ratio, never upscale.
 * @param {number} width @param {number} height @param {number} maxDimension
 */
export function getFitInsideDimensions(width, height, maxDimension) {
  const longestEdge = Math.max(width, height);

  if (longestEdge <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestEdge;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Watermark size and placement for an image of this size; pure so it can be unit-tested.
 * @param {number} width @param {number} height
 * @param {Pick<WatermarkConfig, "fontSizeRatio" | "minFontSize" | "marginRatio" | "shadow">} [config]
 */
export function getWatermarkLayout(width, height, config = WATERMARK) {
  const shortEdge = Math.min(width, height);
  const fontSize = Math.max(config.minFontSize, Math.round(shortEdge * config.fontSizeRatio));
  const shadowBlur = Math.max(0.3, fontSize * config.shadow.blurRatio);
  const shadowOffset = Math.max(1, Math.round(fontSize * config.shadow.offsetRatio));
  // Room around the text for the blurred, offset shadow.
  const padding = Math.ceil(shadowBlur * 3) + shadowOffset;
  const margin = Math.max(padding, Math.round(shortEdge * config.marginRatio));

  return { fontSize, margin, shadowBlur, shadowOffset, padding };
}

/** Pango markup escaping (sharp's text input is Pango markup). @param {string} text */
const escapeMarkup = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Single-channel mask of the text (255 = ink), cropped to the ink box.
 * @param {string} text @param {number} fontSize @param {WatermarkConfig["font"]} font @param {string} projectRoot
 */
async function renderTextMask(text, fontSize, font, projectRoot) {
  const { data, info } = await sharp({
    text: {
      text: escapeMarkup(text),
      font: `${font.family} ${fontSize}`,
      fontfile: path.resolve(projectRoot, font.file),
      // 72 dpi: font size in points == pixels.
      dpi: 72,
    },
  })
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data, width: info.width, height: info.height };
}

/**
 * The watermark as a raw RGBA overlay positioned at the bottom-right of a
 * `width`×`height` image, or null when the image is too small to fit it.
 * @param {{ width: number, height: number, text: string, config?: WatermarkConfig, projectRoot?: string }} input
 */
export async function renderWatermarkOverlay({
  width,
  height,
  text,
  config = WATERMARK,
  projectRoot = process.cwd(),
}) {
  const layout = getWatermarkLayout(width, height, config);
  const mask = await renderTextMask(text, layout.fontSize, config.font, projectRoot);
  const { padding, shadowOffset, margin } = layout;

  if (mask.width + margin * 2 > width || mask.height + margin * 2 > height) {
    return null;
  }

  const overlayWidth = mask.width + padding * 2;
  const overlayHeight = mask.height + padding * 2;

  // Shadow: the mask shifted down-right by shadowOffset, then blurred.
  const shadowMask = Buffer.alloc(overlayWidth * overlayHeight);
  for (let y = 0; y < mask.height; y += 1) {
    const from = y * mask.width;
    mask.data.copy(
      shadowMask,
      (y + padding + shadowOffset) * overlayWidth + padding + shadowOffset,
      from,
      from + mask.width,
    );
  }
  const blurred = await sharp(shadowMask, { raw: { width: overlayWidth, height: overlayHeight, channels: 1 } })
    .blur(layout.shadowBlur)
    .extractChannel(0)
    .raw()
    .toBuffer();

  // White text over the dark shadow, composed into one RGBA layer.
  const rgba = Buffer.alloc(overlayWidth * overlayHeight * 4);
  for (let y = 0; y < overlayHeight; y += 1) {
    for (let x = 0; x < overlayWidth; x += 1) {
      const index = y * overlayWidth + x;
      const maskX = x - padding;
      const maskY = y - padding;
      const ink =
        maskX >= 0 && maskY >= 0 && maskX < mask.width && maskY < mask.height
          ? mask.data[maskY * mask.width + maskX] / 255
          : 0;
      const textAlpha = ink * config.opacity;
      const shadowAlpha = (blurred[index] / 255) * config.shadow.opacity * (1 - textAlpha);
      const alpha = textAlpha + shadowAlpha;
      const value = alpha > 0 ? Math.round((255 * textAlpha) / alpha) : 0;
      rgba[index * 4] = value;
      rgba[index * 4 + 1] = value;
      rgba[index * 4 + 2] = value;
      rgba[index * 4 + 3] = Math.round(alpha * 255);
    }
  }

  return {
    input: rgba,
    raw: { width: overlayWidth, height: overlayHeight, channels: /** @type {const} */ (4) },
    // The text's ink box ends `margin` px from the right and bottom edges.
    left: width - margin - mask.width - padding,
    top: height - margin - mask.height - padding,
  };
}

/**
 * Renders one public derivative from an already auto-oriented image.
 * @param {import("sharp").Sharp} image auto-oriented source (`sharp(buffer).rotate()`); cloned, not consumed
 * @param {ImageDerivativeSpec} spec
 * @param {{ photographerName: string, watermark?: WatermarkConfig, projectRoot?: string }} options
 */
export async function renderDerivative(image, spec, options) {
  const { photographerName, watermark = WATERMARK, projectRoot } = options;

  // Resize in its own pass so the overlay is placed on exactly the pixels sharp produced.
  const { data, info } = await image
    .clone()
    .resize({ width: spec.maxDimension, height: spec.maxDimension, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let output = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });

  if (spec.watermark && watermark.enabled) {
    const overlay = await renderWatermarkOverlay({
      width: info.width,
      height: info.height,
      text: getWatermarkText(photographerName, watermark),
      config: watermark,
      projectRoot,
    });
    if (overlay) {
      output = output.composite([overlay]);
    }
  }

  return output.webp({ quality: spec.quality }).withExif(buildCopyrightExif(photographerName)).toBuffer();
}

/**
 * Renders every derivative of one source image.
 * @param {Buffer} source original image bytes
 * @param {{ photographerName: string, watermark?: WatermarkConfig, projectRoot?: string }} options
 */
export async function renderAllDerivatives(source, options) {
  const image = sharp(source).rotate();
  const metadata = await image.metadata();
  // metadata() describes the input, so use the size after EXIF orientation.
  const width = metadata.autoOrient?.width ?? metadata.width ?? 0;
  const height = metadata.autoOrient?.height ?? metadata.height ?? 0;
  const render = (/** @type {ImageDerivativeSpec} */ spec) =>
    renderDerivative(image, spec, options);

  return {
    width,
    height,
    large: await render(IMAGE_DERIVATIVES.large),
    medium: await render(IMAGE_DERIVATIVES.medium),
    thumbnail: await render(IMAGE_DERIVATIVES.thumbnail),
  };
}

/* ---------- storage keys ---------- */

/**
 * `uploads/<base>` from `uploads/<base>-original.webp`; for other names the key
 * without its extension. Null for an empty key.
 * @param {string | null | undefined} originalKey
 */
export function baseKeyFromOriginalKey(originalKey) {
  const key = originalKey?.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!key) {
    return null;
  }
  return key.replace(/-original\.[^./]+$/, "").replace(/\.[^./]+$/, "") || null;
}

/**
 * `uploads/<base>-large.v2.webp`
 * @param {string} baseKey @param {string} suffix @param {number} [version]
 */
export function derivativeKey(baseKey, suffix, version = DERIVATIVE_VERSION) {
  return `${baseKey}-${suffix}.v${version}.webp`;
}

/**
 * Keys of every derivative at the current version.
 * @param {string} baseKey
 * @returns {Record<ImageDerivativeName, string>}
 */
export function currentDerivativeKeys(baseKey) {
  return {
    large: derivativeKey(baseKey, IMAGE_DERIVATIVES.large.suffix),
    medium: derivativeKey(baseKey, IMAGE_DERIVATIVES.medium.suffix),
    thumbnail: derivativeKey(baseKey, IMAGE_DERIVATIVES.thumbnail.suffix),
  };
}

/**
 * Keys older versions of the pipeline used for this base: unversioned
 * (`-large.webp`) and `.v1` … `.v<current-1>`.
 * @param {string} baseKey
 */
export function previousDerivativeKeys(baseKey) {
  const keys = [];
  for (const spec of Object.values(IMAGE_DERIVATIVES)) {
    keys.push(`${baseKey}-${spec.suffix}.webp`);
    for (let version = 1; version < DERIVATIVE_VERSION; version += 1) {
      keys.push(derivativeKey(baseKey, spec.suffix, version));
    }
  }
  return keys;
}
