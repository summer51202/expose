"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

import { PhotoGridBlock, PhotoGridEmpty } from "@/components/gallery/photo-grid";
import {
  buildFeedPageHref,
  EAGER_IMAGE_LIMIT,
  type GridPhoto,
  PHOTO_FEED_PAGE_SIZE,
} from "@/lib/photos/photo-feed";

type PhotoWallFeedProps = {
  /** Server-rendered batch (the page named by `page`). */
  initialPhotos: GridPhoto[];
  /** Cursor for the batch after `initialPhotos`; null when it was the last one. */
  initialCursor: string | null;
  /** Page number of the server-rendered batch (`/?page=N`). */
  page: number;
};

type Status = "idle" | "loading" | "error";

/** Start fetching well before the visitor reaches the end of the wall. */
const PREFETCH_MARGIN = "0px 0px 1200px 0px";

function photoKey(photo: GridPhoto) {
  return `${photo.source}-${photo.id}`;
}

function isGridPhotoList(value: unknown): value is GridPhoto[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as GridPhoto).id === "number" &&
        typeof (item as GridPhoto).mediumUrl === "string",
    )
  );
}

/**
 * The home "Latest Work" wall. Renders the server batch, then fetches the next
 * one from `/api/photos` when the sentinel below the wall nears the viewport.
 *
 * The "Load more" control is a real link to `/?page=N+1`: crawlers and no-JS
 * visitors follow it to a server-rendered page, while with JS the click
 * fetches the batch in place (also the fallback when IntersectionObserver is
 * missing or a request failed).
 */
export function PhotoWallFeed({ initialPhotos, initialCursor, page }: PhotoWallFeedProps) {
  const [batches, setBatches] = useState<GridPhoto[][]>(() => [initialPhotos]);
  const [cursor, setCursor] = useState(initialCursor);
  const [status, setStatus] = useState<Status>("idle");
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Synchronous guards: a fast observer can fire twice before React re-renders.
  const loadingRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set(initialPhotos.map(photoKey)));

  const loadMore = useCallback(async () => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setStatus("loading");

    try {
      const params = new URLSearchParams({
        cursor,
        limit: String(PHOTO_FEED_PAGE_SIZE),
      });
      const response = await fetch(`/api/photos?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const body: unknown = await response.json();
      const photos = (body as { photos?: unknown }).photos;
      const nextCursor = (body as { nextCursor?: unknown }).nextCursor;
      if (!isGridPhotoList(photos)) throw new Error("Malformed photo batch");

      // Drop anything already on screen (defensive: keyset cursors should not repeat).
      const fresh = photos.filter((photo) => {
        const key = photoKey(photo);
        if (seenRef.current.has(key)) return false;
        seenRef.current.add(key);
        return true;
      });

      if (fresh.length > 0) {
        setBatches((current) => [...current, fresh]);
      }
      setCursor(typeof nextCursor === "string" && nextCursor ? nextCursor : null);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      loadingRef.current = false;
    }
  }, [cursor]);

  // Auto-load while idle. After an error, only the button retries, so a broken
  // endpoint is not hammered on every scroll.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !cursor || status !== "idle") return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, status, loadMore]);

  function handleLoadMoreClick(event: MouseEvent<HTMLAnchorElement>) {
    // Let modified clicks (new tab / window) follow the real link.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    void loadMore();
  }

  if (initialPhotos.length === 0) {
    return <PhotoGridEmpty />;
  }

  // Batches are full pages except the last, so this is the page after the last one shown.
  const nextPage = page + batches.length;

  return (
    <div>
      <div className="flex flex-col gap-4">
        {batches.map((photos, index) => (
          <PhotoGridBlock
            key={photos[0] ? photoKey(photos[0]) : index}
            photos={photos}
            eagerCount={index === 0 && page === 1 ? EAGER_IMAGE_LIMIT : 0}
          />
        ))}
      </div>

      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      <div className="mt-6 flex min-h-12 flex-col items-center gap-2 text-sm" aria-live="polite">
        {cursor ? (
          <>
            <a
              href={buildFeedPageHref(nextPage)}
              onClick={handleLoadMoreClick}
              aria-disabled={status === "loading"}
              data-photo-wall-more=""
              className="rounded-lg border border-stone-300 px-5 py-2.5 font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950 aria-disabled:pointer-events-none aria-disabled:opacity-60"
            >
              {status === "loading" ? "Loading…" : "Load more"}
            </a>
            {status === "error" ? (
              <p className="text-stone-500">Couldn&apos;t load more photos. Try again.</p>
            ) : null}
          </>
        ) : batches.length > 1 || page > 1 ? (
          <p className="text-stone-500">You&apos;ve reached the end.</p>
        ) : null}
      </div>
    </div>
  );
}
