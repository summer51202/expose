"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { FilmStrip } from "@/components/gallery/film-strip";
import { PhotoStage } from "@/components/gallery/photo-stage";
import { Button } from "@/components/ui/button";
import type { GalleryPhoto } from "@/types/photo";

type SlideshowViewerProps = {
  photos: GalleryPhoto[];
  initialPhotoId: number;
};

const AUTO_PLAY_DELAY_MS = 5000;

export function SlideshowViewer({ photos, initialPhotoId }: SlideshowViewerProps) {
  const router = useRouter();
  const initialIndex = Math.max(
    photos.findIndex((photo) => photo.id === initialPhotoId),
    0,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentPhoto = photos[currentIndex] ?? photos[0];
  const hasMultiplePhotos = photos.length > 1;

  function openViewer() {
    setCurrentIndex(initialIndex);
    setIsPlaying(false);
    setIsOpen(true);
  }

  function closeViewer() {
    setIsPlaying(false);
    setIsOpen(false);
  }

  function goPrevious() {
    setCurrentIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  function goNext() {
    setCurrentIndex((i) => (i + 1) % photos.length);
  }

  function openCurrentPhotoDetail() {
    setIsPlaying(false);
    setIsOpen(false);
    startTransition(() => {
      router.push(`/photos/${currentPhoto.source}/${currentPhoto.id}`);
    });
  }

  useEffect(() => {
    if (!isOpen || !isPlaying || !hasMultiplePhotos) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((i) => (i + 1) % photos.length);
    }, AUTO_PLAY_DELAY_MS);

    return () => window.clearInterval(timer);
  }, [hasMultiplePhotos, isOpen, isPlaying, photos.length]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeViewer();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCurrentIndex((i) => (i - 1 + photos.length) % photos.length);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setCurrentIndex((i) => (i + 1) % photos.length);
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        if (hasMultiplePhotos) {
          setIsPlaying((value) => !value);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultiplePhotos, isOpen, photos.length]);

  if (!currentPhoto) return null;

  return (
    <>
      <Button variant="secondary" onClick={openViewer}>
        Slideshow
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
          <div className="flex flex-none items-center justify-between gap-4 px-5 py-3 sm:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={closeViewer}
                className="text-sm text-white/50 transition hover:text-white"
              >
                Close
              </button>
              <span className="text-sm text-white/35">
                {currentIndex + 1} / {photos.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasMultiplePhotos ? (
                <button
                  type="button"
                  onClick={() => setIsPlaying((value) => !value)}
                  className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={openCurrentPhotoDetail}
                className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
              >
                View Detail
              </button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center p-4"
              >
                <PhotoStage photo={currentPhoto} priority />
              </motion.div>
            </AnimatePresence>

            {hasMultiplePhotos ? (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={goPrevious}
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-xl text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-black/60"
                >
                  <span aria-hidden="true">&lt;</span>
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={goNext}
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-xl text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-black/60"
                >
                  <span aria-hidden="true">&gt;</span>
                </button>
              </>
            ) : null}
          </div>

          <div className="flex-none py-2 text-center">
            <p className="text-sm text-white/60">{currentPhoto.title}</p>
            {currentPhoto.shotAt ? (
              <p className="mt-0.5 text-xs text-white/35">
                {new Date(currentPhoto.shotAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            ) : null}
          </div>

          <FilmStrip
            photos={photos}
            currentIndex={currentIndex}
            onSelect={(index) => {
              setCurrentIndex(index);
              setIsPlaying(false);
            }}
          />
        </div>
      ) : null}
    </>
  );
}
