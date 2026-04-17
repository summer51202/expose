"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type { AlbumSlideshowPhoto } from "@/types/album";

type AlbumCoverSlideshowProps = {
  photos: AlbumSlideshowPhoto[];
};

export function AlbumCoverSlideshow({ photos }: AlbumCoverSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultiplePhotos = photos.length > 1;

  useEffect(() => {
    if (!hasMultiplePhotos) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % photos.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, [hasMultiplePhotos, photos.length]);

  return (
    <div className="absolute inset-0">
      {photos.map((photo, index) => {
        const isVisible = index === currentIndex;

        return (
          <Image
            key={photo.id}
            src={photo.mediumUrl}
            alt={photo.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            draggable={false}
            className="object-cover transition-opacity duration-700"
            style={{ opacity: isVisible ? 1 : 0 }}
            placeholder={photo.blurDataUrl ? "blur" : "empty"}
            blurDataURL={photo.blurDataUrl ?? undefined}
          />
        );
      })}
    </div>
  );
}
