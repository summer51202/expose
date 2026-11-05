type HeroCandidate = {
  width: number;
  height: number;
  createdAt: string;
};

export type SelectHeroPhotosOptions = {
  /** Maximum number of photos in the carousel. Defaults to 6. */
  limit?: number;
  /** `width / height` at or above this counts as landscape. Defaults to 1.2. */
  minAspectRatio?: number;
  /** Below this many landscape photos, top up with the newest other photos. Defaults to 2. */
  minCount?: number;
};

export const HERO_PHOTO_LIMIT = 6;
export const HERO_MIN_ASPECT_RATIO = 1.2;
const HERO_MIN_COUNT = 2;

export function isLandscapePhoto(
  photo: Pick<HeroCandidate, "width" | "height">,
  minAspectRatio = HERO_MIN_ASPECT_RATIO,
) {
  if (!(photo.width > 0) || !(photo.height > 0)) {
    return false;
  }

  return photo.width / photo.height >= minAspectRatio;
}

function createdAtTime(photo: HeroCandidate) {
  const time = new Date(photo.createdAt).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/**
 * Picks the photos for the full-bleed home hero: newest landscape photos first,
 * because portrait shots get heavily cropped by `object-cover` on a wide screen.
 * When fewer than `minCount` landscape photos exist, the newest remaining photos
 * fill the gap so the carousel still has something to rotate through.
 * Pure: never mutates the input.
 */
export function selectHeroPhotos<T extends HeroCandidate>(
  photos: readonly T[],
  options: SelectHeroPhotosOptions = {},
): T[] {
  const limit = Math.max(0, Math.floor(options.limit ?? HERO_PHOTO_LIMIT));
  const minAspectRatio = options.minAspectRatio ?? HERO_MIN_ASPECT_RATIO;
  const minCount = Math.min(limit, options.minCount ?? HERO_MIN_COUNT);

  if (limit === 0) {
    return [];
  }

  // Stable sort: equal timestamps keep the repository order.
  const newestFirst = [...photos].sort((a, b) => createdAtTime(b) - createdAtTime(a));
  const landscape = newestFirst.filter((photo) => isLandscapePhoto(photo, minAspectRatio));
  const selected = landscape.slice(0, limit);

  if (selected.length >= minCount) {
    return selected;
  }

  const chosen = new Set<T>(selected);
  for (const photo of newestFirst) {
    if (selected.length >= minCount) break;
    if (!chosen.has(photo)) {
      selected.push(photo);
      chosen.add(photo);
    }
  }

  return selected;
}

/**
 * Index of the photo after `current` in carousel order, wrapping around and
 * skipping entries `isSkipped` rejects (e.g. images that failed to load).
 * Returns null when no other photo is available.
 */
export function nextHeroIndex(
  count: number,
  current: number,
  isSkipped: (index: number) => boolean = () => false,
): number | null {
  for (let step = 1; step < count; step++) {
    const index = (current + step) % count;
    if (!isSkipped(index)) return index;
  }

  return null;
}
