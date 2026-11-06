type FeaturedFields = {
  featured?: boolean;
  featuredAt?: string;
};

export function isFeaturedPhoto(photo: FeaturedFields) {
  return photo.featured === true;
}

/**
 * Returns a copy with the featured flag set. Marking an already featured photo keeps
 * its `featuredAt`, so a repeated submit does not reorder it; unmarking drops the
 * timestamp. Pure: never mutates the input.
 */
export function applyFeatured<T extends FeaturedFields>(photo: T, featured: boolean, now: Date): T {
  if (featured) {
    if (photo.featured === true && photo.featuredAt) {
      return photo;
    }

    return { ...photo, featured: true, featuredAt: now.toISOString() };
  }

  const next: T = { ...photo, featured: false };
  delete next.featuredAt;
  return next;
}

function featuredAtTime(photo: FeaturedFields) {
  const time = photo.featuredAt ? new Date(photo.featuredAt).getTime() : Number.NaN;
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/**
 * Featured photos only, most recently featured first. Photos without a usable
 * `featuredAt` go last; ties keep the input order (stable sort).
 */
export function sortFeaturedPhotos<T extends FeaturedFields>(photos: readonly T[]): T[] {
  return photos
    .filter(isFeaturedPhoto)
    .sort((a, b) => {
      const left = featuredAtTime(a);
      const right = featuredAtTime(b);
      // Explicit compare: -Infinity - -Infinity would be NaN.
      return left === right ? 0 : left < right ? 1 : -1;
    });
}
