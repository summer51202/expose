export const GALLERY_PLAYBACK_DELAYS_MS = [3000, 5000, 8000, 12000] as const;

export const DEFAULT_GALLERY_DELAY_MS = 5000;

export function getNextGalleryIndex(currentIndex: number, photoCount: number) {
  if (photoCount <= 0) {
    return 0;
  }

  return (currentIndex + 1) % photoCount;
}

export function getPreviousGalleryIndex(currentIndex: number, photoCount: number) {
  if (photoCount <= 0) {
    return 0;
  }

  return (currentIndex - 1 + photoCount) % photoCount;
}

export function resolveGalleryDelay(value: number) {
  return GALLERY_PLAYBACK_DELAYS_MS.some((delay) => delay === value)
    ? value
    : DEFAULT_GALLERY_DELAY_MS;
}
