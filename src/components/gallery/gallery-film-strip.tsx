"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { PublicPhoto } from "@/types/photo";

type GalleryFilmStripProps = {
  photos: PublicPhoto[];
  currentIndex: number;
  onSelect: (index: number) => void;
};

export function GalleryFilmStrip({
  photos,
  currentIndex,
  onSelect,
}: GalleryFilmStripProps) {
  const [isVisible, setIsVisible] = useState(true);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = thumbRefs.current[currentIndex];
    if (el && isVisible) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentIndex, isVisible]);

  return (
    <div className="border-t border-white/10 bg-black/90">
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <span className="text-xs text-white/45">
          {currentIndex + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={() => setIsVisible((value) => !value)}
          className="text-xs text-white/45 transition hover:text-white"
          aria-label={isVisible ? "Hide" : "Show"}
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </div>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isVisible ? "104px" : 0 }}
      >
        <div
          className="flex gap-2 overflow-x-auto px-4 pb-4 pt-1"
          style={{ scrollbarWidth: "none" }}
        >
          {photos.map((photo, index) => (
            <button
              key={`${photo.source}-${photo.id}`}
              ref={(el) => {
                thumbRefs.current[index] = el;
              }}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "relative h-[72px] w-[72px] flex-none overflow-hidden rounded-lg border-2 transition",
                index === currentIndex
                  ? "border-white opacity-100"
                  : "border-transparent opacity-50 hover:opacity-80",
              )}
              aria-label={`Go to photo ${index + 1}`}
            >
              <Image
                src={photo.thumbnailUrl}
                alt=""
                fill
                sizes="72px"
                draggable={false}
                className="object-cover"
                placeholder={photo.blurDataUrl ? "blur" : "empty"}
                blurDataURL={photo.blurDataUrl}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

