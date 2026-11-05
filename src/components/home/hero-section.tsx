"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FocusEvent, PointerEvent } from "react";

import { siteConfig } from "@/config/site";
import { buildPhotoDetailHref } from "@/lib/gallery/album-gallery-url";
import { getDisplayImageUrl } from "@/lib/photos/display-image";
import { nextHeroIndex } from "@/lib/photos/hero-photos";
import { cn } from "@/lib/utils";
import type { PublicPhoto } from "@/types/photo";

type HeroSectionProps = {
  /** Already picked on the server (see `selectHeroPhotos`). */
  photos: PublicPhoto[];
};

/** How long a photo stays fully visible before the next one fades in. */
const DISPLAY_MS = 5000;
/** Cross-fade duration; must match the inline `transitionDuration` below. */
const FADE_MS = 1000;
/** Grace period after the CSS transition before the layers are swapped. */
const FADE_SETTLE_MS = 100;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const sampleGradients = [
  "from-stone-800 via-amber-700 to-orange-300",
  "from-sky-900 via-cyan-700 to-teal-300",
  "from-zinc-900 via-slate-700 to-zinc-300",
  "from-emerald-950 via-lime-700 to-lime-300",
  "from-indigo-950 via-blue-700 to-sky-300",
];

function photoKey(photo: PublicPhoto) {
  return `${photo.source}-${photo.id}`;
}

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/**
 * Server snapshot is `true` so SSR + hydration never start the carousel or
 * fetch a second image before the client knows the user's preference.
 */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => true,
  );
}

function usePageVisible() {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== "hidden",
    () => true,
  );
}

type PhotoLayerProps = {
  photo: PublicPhoto;
  /** First photo of the page: the LCP element. */
  isInitial: boolean;
  /** Mounted ahead of time, invisible until it has loaded and the fade starts. */
  isIncoming: boolean;
  fading: boolean;
  onLoad: (key: string) => void;
  onError: (key: string) => void;
};

function PhotoLayer({ photo, isInitial, isIncoming, fading, onLoad, onError }: PhotoLayerProps) {
  const key = photoKey(photo);
  const visible = !isIncoming || fading;
  const imgRef = useRef<HTMLImageElement>(null);

  // Readiness comes from the <img> itself rather than next/image's onLoad:
  // next/image can call onLoad for an <img> that is `complete` but has no pixels
  // yet, and then dedupes the real load event for the same src.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const check = () => {
      if (img.complete && img.naturalWidth > 0) onLoad(key);
    };

    const fail = () => onError(key);

    check();
    img.addEventListener("load", check);
    img.addEventListener("error", fail);
    return () => {
      img.removeEventListener("load", check);
      img.removeEventListener("error", fail);
    };
  }, [key, onLoad, onError]);

  return (
    <div
      data-hero-layer={key}
      data-hero-role={isIncoming ? "incoming" : "current"}
      className={cn("absolute inset-0", isIncoming ? "z-10" : "z-0")}
      style={{
        opacity: visible ? 1 : 0,
        // Only the fade-in is animated. When an incoming layer is (re)assigned
        // it must drop to 0 instantly, or it would briefly cover the current one.
        transitionProperty: isIncoming && fading ? "opacity" : "none",
        transitionDuration: `${FADE_MS}ms`,
        transitionTimingFunction: "ease-in-out",
      }}
    >
      {photo.source === "sample" ? (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            sampleGradients[photo.id % sampleGradients.length],
          )}
        />
      ) : (
        <Image
          src={getDisplayImageUrl(photo, "large")}
          // Decorative: the caption link below names the current photo.
          alt=""
          fill
          preload={isInitial}
          loading={isInitial ? undefined : "eager"}
          fetchPriority={isIncoming ? "low" : undefined}
          draggable={false}
          className="object-cover"
          sizes="100vw"
          placeholder={isInitial && photo.blurDataUrl ? "blur" : "empty"}
          blurDataURL={isInitial ? photo.blurDataUrl : undefined}
          ref={imgRef}
        />
      )}
    </div>
  );
}

export function HeroSection({ photos }: HeroSectionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const pageVisible = usePageVisible();

  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  // Photos whose image failed to load are skipped instead of stalling the carousel.
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const count = photos.length;
  // Reduced motion: no autoplay at all, the first photo just stays.
  const autoplay = count > 1 && !reducedMotion;
  const paused = !pageVisible || hovered || focused;

  const currentIndex = current < count ? current : 0;
  const currentPhoto = count > 0 ? photos[currentIndex] : null;
  const nextIndex = autoplay
    ? nextHeroIndex(count, currentIndex, (index) => failed.has(photoKey(photos[index])))
    : null;
  const nextPhoto = nextIndex === null ? null : photos[nextIndex];
  const nextKey = nextPhoto ? photoKey(nextPhoto) : null;
  const nextReady = nextPhoto
    ? nextPhoto.source === "sample" || loaded.has(photoKey(nextPhoto))
    : false;

  // Read from timer / onLoad callbacks; synced after every commit.
  const nextReadyRef = useRef(nextReady);
  const nextKeyRef = useRef(nextKey);
  const pausedRef = useRef(paused);
  // The display time ran out while the next photo was still loading.
  const dueRef = useRef(false);

  useEffect(() => {
    nextReadyRef.current = nextReady;
    nextKeyRef.current = nextKey;
    pausedRef.current = paused;
  });

  // Display timer: one shot per photo. Pausing clears it; resuming restarts the
  // full display time, so returning to the tab never skips several photos.
  useEffect(() => {
    if (!autoplay || paused || fading) return;

    dueRef.current = false;
    const timer = window.setTimeout(() => {
      if (nextReadyRef.current) {
        setFading(true);
      } else {
        dueRef.current = true;
      }
    }, DISPLAY_MS);

    return () => window.clearTimeout(timer);
  }, [autoplay, paused, fading, currentIndex]);

  // Fade end: the incoming layer becomes the current one. The old current
  // unmounts only now, after it is fully covered.
  useEffect(() => {
    if (!fading || nextIndex === null) return;

    const timer = window.setTimeout(() => {
      const oldCurrentKey = photoKey(photos[currentIndex]);
      const newCurrentKey = photoKey(photos[nextIndex]);
      const newNextIndex = nextHeroIndex(count, nextIndex, (index) =>
        failed.has(photoKey(photos[index])),
      );
      const newNextKey = newNextIndex === null ? null : photoKey(photos[newNextIndex]);

      setLoaded((previous) => {
        // Keep only layers that stay mounted; a remounted layer reports onLoad again.
        const keep = new Set<string>();
        if (previous.has(newCurrentKey)) keep.add(newCurrentKey);
        if (newNextKey === oldCurrentKey && previous.has(oldCurrentKey)) keep.add(oldCurrentKey);
        return keep;
      });
      setCurrent(nextIndex);
      setFading(false);
    }, FADE_MS + FADE_SETTLE_MS);

    return () => window.clearTimeout(timer);
  }, [fading, currentIndex, nextIndex, count, photos, failed]);

  const handleLayerLoad = useCallback((key: string) => {
    setLoaded((previous) => {
      if (previous.has(key)) return previous;
      const updated = new Set(previous);
      updated.add(key);
      return updated;
    });

    if (dueRef.current && !pausedRef.current && key === nextKeyRef.current) {
      dueRef.current = false;
      setFading(true);
    }
  }, []);

  const handleLayerError = useCallback((key: string) => {
    setFailed((previous) => {
      if (previous.has(key)) return previous;
      const updated = new Set(previous);
      updated.add(key);
      return updated;
    });
  }, []);

  function handlePointerEnter(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse") setHovered(true);
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
  }

  function scrollToPortfolio() {
    document.getElementById("albums")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section
      className="relative h-svh w-full overflow-hidden bg-stone-900"
      data-hero-paused={autoplay ? String(paused) : undefined}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
    >
      <div aria-hidden="true" className="absolute inset-0">
        {currentPhoto ? (
          <PhotoLayer
            key={photoKey(currentPhoto)}
            photo={currentPhoto}
            isInitial={currentIndex === 0}
            isIncoming={false}
            fading={fading}
            onLoad={handleLayerLoad}
            onError={handleLayerError}
          />
        ) : null}
        {nextPhoto && nextPhoto !== currentPhoto ? (
          <PhotoLayer
            key={photoKey(nextPhoto)}
            photo={nextPhoto}
            isInitial={false}
            isIncoming
            fading={fading}
            onLoad={handleLayerLoad}
            onError={handleLayerError}
          />
        ) : null}
      </div>

      {/* Top-to-transparent + bottom-to-dark overlay */}
      <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(180deg,rgba(0,0,0,0.40)_0%,transparent_28%,transparent_52%,rgba(0,0,0,0.72)_100%)]" />

      {/* Bottom content row */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-4 px-5 pb-10 sm:px-8 lg:px-12">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.32em] text-white/55 uppercase">
            {siteConfig.photographerName}
          </p>
          <h1 className="mt-2 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            {siteConfig.tagline}
          </h1>
          {currentPhoto ? (
            // Not a live region: screen readers are not interrupted on every change.
            <Link
              href={buildPhotoDetailHref(currentPhoto)}
              className="mt-4 block max-w-full truncate text-sm text-white/65 transition-opacity duration-500 hover:text-white motion-reduce:transition-none"
              style={{ opacity: fading ? 0 : 1 }}
            >
              {currentPhoto.title}
              {currentPhoto.albumName ? (
                <span className="text-white/45"> · {currentPhoto.albumName}</span>
              ) : null}
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          onClick={scrollToPortfolio}
          className="flex-none rounded-full border border-white/30 bg-black/25 px-6 py-3 text-sm text-white backdrop-blur-sm transition hover:bg-white/15 hover:border-white/50"
        >
          View Portfolio ↓
        </button>
      </div>
    </section>
  );
}
