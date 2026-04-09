"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { GalleryPhoto } from "@/types/photo";
import { PhotoStage } from "@/components/gallery/photo-stage";

type FilmStripProps = {
  photos: GalleryPhoto[];
  currentIndex: number;
  onSelect: (index: number) => void;
};

export function FilmStrip({ photos, currentIndex, onSelect }: FilmStripProps) {
  const [isVisible, setIsVisible] = useState(true);
  const stripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = thumbRefs.current[currentIndex];
    if (el && isVisible) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentIndex, isVisible]);

  return (
    <div className="border-t border-white/10">
      {/* Toggle bar */}
      <div className="flex items-center justify-between px-4 py-2">
        {isVisible ? (
          <span className="text-xs text-white/35">
            {currentIndex + 1} / {photos.length}
          </span>
        ) : (
          /* Dot indicator */
          <div className="flex items-center gap-1 overflow-hidden">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentIndex
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/30 hover:bg-white/60",
                )}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsVisible((v) => !v)}
          className="ml-auto text-xs text-white/40 transition hover:text-white/80"
          aria-label={isVisible ? "Hide filmstrip" : "Show filmstrip"}
        >
          {isVisible ? "Hide ↓" : "Show ↑"}
        </button>
      </div>

      {/* Thumbnails (CSS max-height transition) */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isVisible ? "112px" : 0 }}
      >
        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto px-4 pb-4 pt-1 scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {photos.map((photo, i) => (
            <button
              key={`${photo.source}-${photo.id}`}
              ref={(el) => { thumbRefs.current[i] = el; }}
              type="button"
              onClick={() => onSelect(i)}
              className={cn(
                "flex-none overflow-hidden rounded-lg border-2 transition-all duration-200",
                i === currentIndex
                  ? "border-white opacity-100"
                  : "border-transparent opacity-45 hover:opacity-75",
              )}
              style={{ width: 72, height: 72 }}
              aria-label={`Jump to ${photo.title}`}
            >
              <div className="h-full w-full">
                <PhotoStage photo={photo} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
