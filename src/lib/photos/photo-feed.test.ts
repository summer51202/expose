import test from "node:test";
import assert from "node:assert/strict";

import {
  BLUR_PLACEHOLDER_LIMIT,
  buildFeedPageHref,
  decodeFeedCursor,
  encodeFeedCursor,
  getNumberedFeedPage,
  paginateFeed,
  parseLimitParam,
  parsePageParam,
  PHOTO_FEED_MAX_LIMIT,
  PHOTO_FEED_PAGE_SIZE,
  sortFeedPhotos,
  toAlbumPhoto,
  toGridPhoto,
  toHeroPhoto,
  toSlimPhotos,
} from "./photo-feed";
import { toPublicPhoto } from "./public-photo";
import type { PhotoRecord } from "@/types/photo";

const record: PhotoRecord = {
  id: 7,
  title: "Harbour",
  description: "A long public description that grid cards never show.",
  location: "Keelung",
  shotAt: "2026-04-01T00:00:00.000Z",
  albumName: "Coast",
  albumSlug: "coast",
  exifData: { iso: 100, model: "X100" },
  createdAt: "2026-04-02T00:00:00.000Z",
  width: 3000,
  height: 2000,
  originalUrl: "https://private.example/original.webp",
  originalKey: "uploads/original.webp",
  mediumUrl: "https://cdn.example/medium.webp",
  largeUrl: "https://cdn.example/large.webp",
  thumbnailUrl: "https://cdn.example/thumb.webp",
  blurDataUrl: "data:image/webp;base64,AAAA",
  featured: true,
  featuredAt: "2026-04-03T00:00:00.000Z",
  source: "uploaded",
  albumId: 3,
  storageProvider: "r2",
};

const forbidden = [
  "originalUrl",
  "originalKey",
  "storageProvider",
  "exifData",
  "description",
  "featured",
  "featuredAt",
  "albumId",
  "createdAt",
];

function assertNoForbiddenKeys(value: object) {
  for (const key of forbidden) {
    assert.equal(key in value, false, `unexpected key ${key}`);
  }
}

test("toGridPhoto keeps only what a grid card needs", () => {
  const grid = toGridPhoto(toPublicPhoto(record));
  assert.deepEqual(grid, {
    id: 7,
    source: "uploaded",
    title: "Harbour",
    width: 3000,
    height: 2000,
    mediumUrl: "https://cdn.example/medium.webp",
    largeUrl: "https://cdn.example/large.webp",
    location: "Keelung",
    shotAt: "2026-04-01T00:00:00.000Z",
    albumSlug: "coast",
  });
  assertNoForbiddenKeys(grid);
});

test("toGridPhoto never leaks private fields even when handed a raw record", () => {
  // The type says PublicPhoto, but a whitelist must not depend on callers.
  const grid = toGridPhoto(record as unknown as ReturnType<typeof toPublicPhoto>, {
    withBlur: true,
  });
  assertNoForbiddenKeys(grid);
  assert.equal(JSON.stringify(grid).includes("private.example"), false);
});

test("blur preview only when asked; empty optional fields are dropped", () => {
  const photo = toPublicPhoto({ ...record, location: "", albumSlug: undefined });
  assert.equal(toGridPhoto(photo).blurDataUrl, undefined);
  assert.equal(toGridPhoto(photo, { withBlur: true }).blurDataUrl, record.blurDataUrl);
  const grid = toGridPhoto(photo);
  assert.equal("location" in grid, false);
  assert.equal("albumSlug" in grid, false);
});

test("album and hero payloads add only their own fields", () => {
  const photo = toPublicPhoto(record);
  const album = toAlbumPhoto(photo);
  assert.equal(album.thumbnailUrl, record.thumbnailUrl);
  assertNoForbiddenKeys(album);

  const hero = toHeroPhoto(photo, { withBlur: true });
  assert.deepEqual(hero, {
    id: 7,
    source: "uploaded",
    title: "Harbour",
    mediumUrl: "https://cdn.example/medium.webp",
    largeUrl: "https://cdn.example/large.webp",
    albumName: "Coast",
    blurDataUrl: "data:image/webp;base64,AAAA",
  });
});

test("toSlimPhotos keeps the blur preview on the first N photos only", () => {
  const photos = Array.from({ length: 10 }, (_, index) =>
    toPublicPhoto({ ...record, id: index + 1 }),
  );
  const slim = toSlimPhotos(photos, toGridPhoto);
  assert.equal(slim.filter((photo) => photo.blurDataUrl).length, BLUR_PLACEHOLDER_LIMIT);
  assert.ok(slim.slice(0, BLUR_PLACEHOLDER_LIMIT).every((photo) => photo.blurDataUrl));
  assert.equal(toSlimPhotos(photos, toGridPhoto, 0).some((photo) => photo.blurDataUrl), false);
});

type Item = { id: number; createdAt: string };

function makeFeed(count: number): Item[] {
  // Pairs share a timestamp so ties must be broken by id.
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    createdAt: new Date(Date.UTC(2026, 0, 1) + Math.floor(index / 2) * 60_000).toISOString(),
  }));
}

test("sortFeedPhotos: newest first, higher id first on ties, input untouched", () => {
  const items = makeFeed(5);
  const sorted = sortFeedPhotos(items);
  assert.deepEqual(
    sorted.map((item) => item.id),
    [5, 4, 3, 2, 1],
  );
  assert.deepEqual(
    items.map((item) => item.id),
    [1, 2, 3, 4, 5],
  );
});

test("sortFeedPhotos puts invalid dates last", () => {
  const sorted = sortFeedPhotos([
    { id: 1, createdAt: "not a date" },
    { id: 2, createdAt: "2026-01-01T00:00:00.000Z" },
  ]);
  assert.deepEqual(
    sorted.map((item) => item.id),
    [2, 1],
  );
});

test("cursor round-trips and rejects malformed input", () => {
  const item = { id: 42, createdAt: "2026-04-02T00:00:00.000Z" };
  const cursor = encodeFeedCursor(item);
  assert.equal(cursor, `${Date.parse(item.createdAt)}.42`);
  assert.deepEqual(decodeFeedCursor(cursor), { time: Date.parse(item.createdAt), id: 42 });
  assert.ok(decodeFeedCursor(encodeFeedCursor({ id: 1, createdAt: "bad" })));

  for (const bad of [null, undefined, "", "abc", "1.2.3", "1.0", "1.-5", "1e5.3", " 1.2", "99999999999999999.1"]) {
    assert.equal(decodeFeedCursor(bad), null, `accepted ${String(bad)}`);
  }
});

test("paginateFeed walks the whole feed with no repeats or gaps", () => {
  const sorted = sortFeedPhotos(makeFeed(103));
  const seen: number[] = [];
  let cursor = null;
  let calls = 0;

  do {
    const page = paginateFeed(sorted, { cursor: decodeFeedCursor(cursor), limit: 24 });
    seen.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor;
    calls += 1;
  } while (cursor && calls < 100);

  assert.equal(calls, 5);
  assert.deepEqual(
    seen,
    sorted.map((item) => item.id),
  );
});

test("paginateFeed: the last full page has no next cursor", () => {
  const sorted = sortFeedPhotos(makeFeed(48));
  const first = paginateFeed(sorted, { limit: 24 });
  const second = paginateFeed(sorted, { cursor: decodeFeedCursor(first.nextCursor), limit: 24 });
  assert.equal(second.items.length, 24);
  assert.equal(second.nextCursor, null);
});

test("paginateFeed survives inserts and deletes between requests", () => {
  const sorted = sortFeedPhotos(makeFeed(30));
  const first = paginateFeed(sorted, { limit: 10 });
  const cursor = decodeFeedCursor(first.nextCursor);

  // A newer upload lands at the top and one already-shown photo is deleted.
  const changed = sortFeedPhotos([
    ...sorted.filter((item) => item.id !== first.items[3]!.id),
    { id: 999, createdAt: "2027-01-01T00:00:00.000Z" },
  ]);
  const second = paginateFeed(changed, { cursor, limit: 10 });
  assert.deepEqual(
    second.items.map((item) => item.id),
    sorted.slice(10, 20).map((item) => item.id),
  );

  // The cursor photo itself was deleted: continue right after where it was.
  const withoutCursor = changed.filter((item) => item.id !== first.items[9]!.id);
  const third = paginateFeed(withoutCursor, { cursor, limit: 10 });
  assert.deepEqual(third.items[0]?.id, sorted[10]?.id);
});

test("paginateFeed past the end returns nothing", () => {
  const sorted = sortFeedPhotos(makeFeed(3));
  const page = paginateFeed(sorted, { cursor: decodeFeedCursor(encodeFeedCursor(sorted[2]!)), limit: 24 });
  assert.deepEqual(page, { items: [], nextCursor: null });
});

test("getNumberedFeedPage lines up with cursor pagination", () => {
  const sorted = sortFeedPhotos(makeFeed(50));
  const page2 = getNumberedFeedPage(sorted, 2, 24);
  assert.ok(page2);
  assert.equal(page2.totalPages, 3);
  assert.deepEqual(
    page2.items.map((item) => item.id),
    sorted.slice(24, 48).map((item) => item.id),
  );
  const next = paginateFeed(sorted, { cursor: decodeFeedCursor(page2.nextCursor), limit: 24 });
  assert.deepEqual(
    next.items.map((item) => item.id),
    sorted.slice(48).map((item) => item.id),
  );
  assert.equal(getNumberedFeedPage(sorted, 3, 24)?.nextCursor, null);
  assert.equal(getNumberedFeedPage(sorted, 4, 24), null);
  assert.equal(getNumberedFeedPage(sorted, 0, 24), null);
  assert.deepEqual(getNumberedFeedPage([], 1, 24), { items: [], nextCursor: null, page: 1, totalPages: 1 });
});

test("page and limit params", () => {
  assert.equal(parsePageParam(undefined), 1);
  assert.equal(parsePageParam("3"), 3);
  for (const bad of ["0", "-1", "abc", "1.5", "01", "", "9999999"]) {
    assert.equal(parsePageParam(bad), null, `accepted ${bad}`);
  }
  assert.equal(parsePageParam(["2", "3"]), null);

  assert.equal(parseLimitParam(null), PHOTO_FEED_PAGE_SIZE);
  assert.equal(parseLimitParam("abc"), PHOTO_FEED_PAGE_SIZE);
  assert.equal(parseLimitParam("0"), 1);
  assert.equal(parseLimitParam("10"), 10);
  assert.equal(parseLimitParam("500"), PHOTO_FEED_MAX_LIMIT);

  assert.equal(buildFeedPageHref(1), "/");
  assert.equal(buildFeedPageHref(4), "/?page=4");
});
