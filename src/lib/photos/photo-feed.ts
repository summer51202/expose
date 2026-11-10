import type { PublicPhoto } from "@/types/photo";

/**
 * Photo feed helpers for the paginated home wall (and the slim payloads the
 * album page and hero hand to Client Components).
 *
 * Every payload type here is an explicit whitelist: originalUrl, exifData and
 * the description never leave the server through these shapes.
 */

/** Photos per batch: the first server-rendered page and every `/api/photos` call. */
export const PHOTO_FEED_PAGE_SIZE = 24;
/** Hard ceiling for the `limit` query parameter. */
export const PHOTO_FEED_MAX_LIMIT = 48;
/**
 * Only the first few photos of a page carry the base64 blur preview; later ones
 * use the CSS colour placeholder, so the inline previews stay a few KB total.
 */
export const BLUR_PLACEHOLDER_LIMIT = 6;
/** Photo wall cards that load eagerly; the rest use native lazy loading. */
export const EAGER_IMAGE_LIMIT = 3;

/** What a grid card needs: image, aspect ratio, caption and link. */
export type GridPhoto = Pick<
  PublicPhoto,
  "id" | "source" | "title" | "width" | "height" | "mediumUrl"
> &
  Partial<Pick<PublicPhoto, "largeUrl" | "location" | "shotAt" | "albumSlug" | "blurDataUrl">>;

/** Grid card plus what the album slideshow and film strip need. */
export type AlbumPhoto = GridPhoto & Pick<PublicPhoto, "thumbnailUrl">;

/** What the home hero carousel needs. */
export type HeroPhoto = Pick<PublicPhoto, "id" | "source" | "title" | "mediumUrl"> &
  Partial<Pick<PublicPhoto, "largeUrl" | "albumName" | "blurDataUrl">>;

type SlimOptions = {
  /** Keep the base64 blur preview (only for the first few photos of a page). */
  withBlur?: boolean;
};

function assignDefined<T extends object>(target: T, source: Partial<T>): T {
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== null && value !== "") {
      (target as Record<string, unknown>)[key] = value;
    }
  }
  return target;
}

export function toGridPhoto(photo: PublicPhoto, options: SlimOptions = {}): GridPhoto {
  return assignDefined<GridPhoto>(
    {
      id: photo.id,
      source: photo.source,
      title: photo.title,
      width: photo.width,
      height: photo.height,
      mediumUrl: photo.mediumUrl,
    },
    {
      largeUrl: photo.largeUrl,
      location: photo.location,
      shotAt: photo.shotAt,
      albumSlug: photo.albumSlug,
      blurDataUrl: options.withBlur ? photo.blurDataUrl : undefined,
    },
  );
}

export function toAlbumPhoto(photo: PublicPhoto, options: SlimOptions = {}): AlbumPhoto {
  return { ...toGridPhoto(photo, options), thumbnailUrl: photo.thumbnailUrl };
}

export function toHeroPhoto(photo: PublicPhoto, options: SlimOptions = {}): HeroPhoto {
  return assignDefined<HeroPhoto>(
    {
      id: photo.id,
      source: photo.source,
      title: photo.title,
      mediumUrl: photo.mediumUrl,
    },
    {
      largeUrl: photo.largeUrl,
      albumName: photo.albumName,
      blurDataUrl: options.withBlur ? photo.blurDataUrl : undefined,
    },
  );
}

/** Slims a list, keeping the blur preview only on the first `blurLimit` photos. */
export function toSlimPhotos<T>(
  photos: readonly PublicPhoto[],
  toSlim: (photo: PublicPhoto, options: SlimOptions) => T,
  blurLimit = BLUR_PLACEHOLDER_LIMIT,
): T[] {
  return photos.map((photo, index) => toSlim(photo, { withBlur: index < blurLimit }));
}

// ---------------------------------------------------------------------------
// Ordering and cursors
// ---------------------------------------------------------------------------

type FeedSortable = Pick<PublicPhoto, "id" | "createdAt">;

export type FeedPosition = { time: number; id: number };

// Invalid dates sort last, like before (new Date(NaN) compared as oldest).
const MIN_TIME = -8.64e15;

function feedTime(photo: FeedSortable) {
  const time = new Date(photo.createdAt).getTime();
  return Number.isNaN(time) ? MIN_TIME : time;
}

function comparePositions(a: FeedPosition, b: FeedPosition) {
  if (a.time !== b.time) return b.time - a.time;
  return b.id - a.id;
}

function positionOf(photo: FeedSortable): FeedPosition {
  return { time: feedTime(photo), id: photo.id };
}

/**
 * Newest first; equal timestamps fall back to the higher id so the order is
 * total and a cursor always splits the list in exactly one place.
 */
export function sortFeedPhotos<T extends FeedSortable>(photos: readonly T[]): T[] {
  return [...photos].sort((a, b) => comparePositions(positionOf(a), positionOf(b)));
}

/** Opaque to clients: `<createdAt ms>.<id>`. */
export function encodeFeedCursor(photo: FeedSortable): string {
  const { time, id } = positionOf(photo);
  return `${time}.${id}`;
}

export function decodeFeedCursor(value: string | null | undefined): FeedPosition | null {
  if (typeof value !== "string") return null;
  const match = /^(-?\d{1,16})\.(\d{1,16})$/.exec(value);
  if (!match) return null;

  const time = Number(match[1]);
  const id = Number(match[2]);
  if (!Number.isSafeInteger(time) || !Number.isSafeInteger(id) || id <= 0) return null;
  if (time < MIN_TIME || time > -MIN_TIME) return null;

  return { time, id };
}

export type FeedPage<T> = {
  items: T[];
  /** Cursor for the batch after `items`; null when this was the last one. */
  nextCursor: string | null;
};

/**
 * Keyset pagination over a list already sorted with `sortFeedPhotos`.
 * Returns the photos strictly after `cursor` (or from the start when null), so
 * photos added or removed between requests never cause repeats or gaps
 * within the part of the feed a visitor has already scrolled past.
 */
export function paginateFeed<T extends FeedSortable>(
  sortedPhotos: readonly T[],
  options: { cursor?: FeedPosition | null; limit: number },
): FeedPage<T> {
  const limit = Math.max(1, Math.floor(options.limit));
  const cursor = options.cursor ?? null;
  const start = cursor
    ? sortedPhotos.findIndex((photo) => comparePositions(positionOf(photo), cursor) > 0)
    : 0;

  if (start < 0) {
    return { items: [], nextCursor: null };
  }

  const items = sortedPhotos.slice(start, start + limit);
  const hasMore = start + limit < sortedPhotos.length;
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: hasMore && last ? encodeFeedCursor(last) : null,
  };
}

export type NumberedFeedPage<T> = FeedPage<T> & {
  page: number;
  totalPages: number;
};

/**
 * Page-number access for the crawlable `/?page=N` links. Returns null for a
 * page that does not exist (page 1 always exists, even when empty).
 */
export function getNumberedFeedPage<T extends FeedSortable>(
  sortedPhotos: readonly T[],
  page: number,
  pageSize = PHOTO_FEED_PAGE_SIZE,
): NumberedFeedPage<T> | null {
  const totalPages = Math.max(1, Math.ceil(sortedPhotos.length / pageSize));
  if (!Number.isSafeInteger(page) || page < 1 || page > totalPages) {
    return null;
  }

  const start = (page - 1) * pageSize;
  const items = sortedPhotos.slice(start, start + pageSize);
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: page < totalPages && last ? encodeFeedCursor(last) : null,
    page,
    totalPages,
  };
}

/** `?page=` value → page number. Missing means page 1; anything malformed is null. */
export function parsePageParam(value: string | string[] | undefined): number | null {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d{0,5}$/.test(value)) return null;
  return Number(value);
}

/** `?limit=` value → clamped batch size. */
export function parseLimitParam(value: string | null): number {
  if (value === null || !/^\d{1,3}$/.test(value)) return PHOTO_FEED_PAGE_SIZE;
  return Math.min(PHOTO_FEED_MAX_LIMIT, Math.max(1, Number(value)));
}

/** Home page URL for a feed page (page 1 is the bare `/`). */
export function buildFeedPageHref(page: number) {
  return page <= 1 ? "/" : `/?page=${page}`;
}
