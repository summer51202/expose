"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { GalleryFilmStrip } from "@/components/gallery/gallery-film-strip";
import { GalleryImageStage } from "@/components/gallery/gallery-image-stage";
import {
  DEFAULT_GALLERY_DELAY_MS,
  GALLERY_PLAYBACK_DELAYS_MS,
  getNextGalleryIndex,
  getPreviousGalleryIndex,
  resolveGalleryDelay,
} from "@/lib/gallery/gallery-playback";
import type { GalleryPhoto } from "@/types/photo";

type AlbumGalleryModeProps = {
  albumName: string;
  albumSlug: string;
  photos: GalleryPhoto[];
  initialPhotoId?: number | null;
  onBackToGrid: (photoId?: number | null) => void;
  onPhotoChange: (photoId: number) => void;
};

const GALLERY_DELAY_STORAGE_KEY = "albumGalleryDelayMs";

function getSavedDelay() {
  if (typeof window === "undefined") {
    return DEFAULT_GALLERY_DELAY_MS;
  }

  return resolveGalleryDelay(Number(window.localStorage.getItem(GALLERY_DELAY_STORAGE_KEY)));
}

function getInitialIndex(photos: GalleryPhoto[], photoId?: number | null) {
  return Math.max(
    photos.findIndex((photo) => photo.id === photoId),
    0,
  );
}

export function AlbumGalleryMode({
  albumName,
  albumSlug,
  photos,
  initialPhotoId,
  onBackToGrid,
  onPhotoChange,
}: AlbumGalleryModeProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(() => getInitialIndex(photos, initialPhotoId));
  const [isPlaying, setIsPlaying] = useState(false);
  const [delayMs, setDelayMs] = useState(getSavedDelay);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);

  const currentPhoto = photos[currentIndex] ?? photos[0];
  const hasMultiplePhotos = photos.length > 1;

  const goPrevious = useCallback(() => {
    setCurrentIndex((index) => getPreviousGalleryIndex(index, photos.length));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((index) => getNextGalleryIndex(index, photos.length));
  }, [photos.length]);

  const backToGrid = useCallback(() => {
    setIsPlaying(false);
    onBackToGrid(currentPhoto?.id);
  }, [currentPhoto?.id, onBackToGrid]);

  const openCurrentPhotoDetail = useCallback(() => {
    if (!currentPhoto) {
      return;
    }

    setIsPlaying(false);
    startTransition(() => {
      router.push(
        `/photos/${currentPhoto.source}/${currentPhoto.id}?returnAlbum=${encodeURIComponent(albumSlug)}&returnView=gallery&returnPhoto=${currentPhoto.id}`,
      );
    });
  }, [albumSlug, currentPhoto, router]);

  useEffect(() => {
    setCurrentIndex(getInitialIndex(photos, initialPhotoId));
  }, [initialPhotoId, photos]);

  useEffect(() => {
    if (currentPhoto) {
      onPhotoChange(currentPhoto.id);
    }
  }, [currentPhoto, onPhotoChange]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncReducedMotion() {
      setReducedMotion(mediaQuery.matches);
      if (mediaQuery.matches) {
        setIsPlaying(false);
      }
    }

    syncReducedMotion();
    mediaQuery.addEventListener("change", syncReducedMotion);
    return () => mediaQuery.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(GALLERY_DELAY_STORAGE_KEY, String(delayMs));
  }, [delayMs]);

  useEffect(() => {
    if (!isPlaying || !hasMultiplePhotos || reducedMotion) {
      return;
    }

    const timer = window.setInterval(goNext, delayMs);
    return () => window.clearInterval(timer);
  }, [delayMs, goNext, hasMultiplePhotos, isPlaying, reducedMotion]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        setIsPlaying(false);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPlaying]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        backToGrid();
        return;
      }

      if (event.key === "ArrowLeft" && hasMultiplePhotos) {
        event.preventDefault();
        setIsPlaying(false);
        goPrevious();
        return;
      }

      if (event.key === "ArrowRight" && hasMultiplePhotos) {
        event.preventDefault();
        setIsPlaying(false);
        goNext();
        return;
      }

      if (event.key === " " && hasMultiplePhotos && !reducedMotion) {
        event.preventDefault();
        setIsPlaying((value) => !value);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [backToGrid, goNext, goPrevious, hasMultiplePhotos, reducedMotion]);

  if (!currentPhoto) {
    return null;
  }

  return (
    <section
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
      aria-label={`${albumName} gallery view`}
      onMouseEnter={() => setAreControlsVisible(true)}
      onMouseMove={() => setAreControlsVisible(true)}
    >
      <div
        className={[
          "flex flex-none items-center justify-between gap-3 px-4 py-3 transition-opacity duration-300 sm:px-8",
          areControlsVisible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={backToGrid}
          className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/75 transition hover:border-white/40 hover:text-white"
        >
          Grid View
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-white/45">
            {currentIndex + 1} / {photos.length}
          </span>
          {hasMultiplePhotos && !reducedMotion ? (
            <>
              <select
                value={delayMs}
                onChange={(event) => setDelayMs(resolveGalleryDelay(Number(event.target.value)))}
                className="rounded-lg border border-white/15 bg-black px-3 py-2 text-xs text-white"
                aria-label="Playback speed"
              >
                {GALLERY_PLAYBACK_DELAYS_MS.map((delay) => (
                  <option key={delay} value={delay}>
                    {delay / 1000} sec
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsPlaying((value) => !value)}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/75 transition hover:border-white/40 hover:text-white"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={openCurrentPhotoDetail}
            className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/75 transition hover:border-white/40 hover:text-white"
          >
            View Detail
          </button>
        </div>
      </div>

      <div
        className="group relative min-h-0 flex-1 overflow-hidden"
        onMouseLeave={() => setAreControlsVisible(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentPhoto.source}-${currentPhoto.id}`}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <GalleryImageStage photo={currentPhoto} priority />
          </motion.div>
        </AnimatePresence>

        {hasMultiplePhotos ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => {
                setIsPlaying(false);
                goPrevious();
              }}
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg border border-white/15 bg-black/35 text-xl text-white opacity-100 backdrop-blur-sm transition hover:border-white/35 hover:bg-black/55 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <span aria-hidden="true">&lt;</span>
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => {
                setIsPlaying(false);
                goNext();
              }}
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg border border-white/15 bg-black/35 text-xl text-white opacity-100 backdrop-blur-sm transition hover:border-white/35 hover:bg-black/55 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <span aria-hidden="true">&gt;</span>
            </button>
          </>
        ) : null}
      </div>

      {hasMultiplePhotos ? (
        <GalleryFilmStrip
          photos={photos}
          currentIndex={currentIndex}
          onSelect={(index) => {
            setIsPlaying(false);
            setCurrentIndex(index);
          }}
        />
      ) : null}
    </section>
  );
}
