// Resize specs for every stored derivative of an uploaded photo.
// scripts/backfill-large-images.mjs mirrors the `large` values; keep them in sync.
export const IMAGE_DERIVATIVES = {
  large: { maxDimension: 2560, quality: 85, suffix: "large" },
  medium: { maxDimension: 1200, quality: 84, suffix: "medium" },
  thumbnail: { maxDimension: 400, quality: 76, suffix: "thumb" },
} as const;

export type ImageDerivativeName = keyof typeof IMAGE_DERIVATIVES;

/**
 * Output size of sharp's `resize({ width: max, height: max, fit: "inside",
 * withoutEnlargement: true })`: scale the longest edge down to `maxDimension`,
 * keep aspect ratio, never upscale.
 */
export function getFitInsideDimensions(
  width: number,
  height: number,
  maxDimension: number,
) {
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
