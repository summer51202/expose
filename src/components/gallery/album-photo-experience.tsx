"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AlbumGalleryMode } from "@/components/gallery/album-gallery-mode";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import {
  type AlbumViewMode,
  buildAlbumViewQuery,
  resolveAlbumViewMode,
  resolvePhotoIdParam,
  shouldReplaceAlbumViewQuery,
} from "@/lib/gallery/album-gallery-url";
import type { GalleryPhoto } from "@/types/photo";

type AlbumPhotoExperienceProps = {
  albumName: string;
  albumSlug: string;
  photos: GalleryPhoto[];
};

export function AlbumPhotoExperience({
  albumName,
  albumSlug,
  photos,
}: AlbumPhotoExperienceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const requestedMode = resolveAlbumViewMode(searchParams.get("view"));
  const requestedPhotoId = resolvePhotoIdParam(searchParams.get("photo"));
  const [mode, setMode] = useState<AlbumViewMode>(requestedMode);

  const replaceAlbumState = useCallback(
    (nextMode: AlbumViewMode, photoId?: number | null) => {
      if (!shouldReplaceAlbumViewQuery(search, nextMode, photoId)) {
        return;
      }

      const query = buildAlbumViewQuery(search, nextMode, photoId);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, search],
  );

  useEffect(() => {
    setMode(requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    if (mode !== "grid" || !requestedPhotoId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById(`photo-${requestedPhotoId}`)
        ?.scrollIntoView({ block: "center" });
    });
  }, [mode, requestedPhotoId]);

  if (photos.length === 0) {
    return null;
  }

  const requestedPhotoExists = photos.some((photo) => photo.id === requestedPhotoId);
  const activePhotoId = requestedPhotoExists ? requestedPhotoId : photos[0]?.id;

  function openGalleryView() {
    setMode("gallery");
    replaceAlbumState("gallery", activePhotoId);
  }

  function returnToGrid(photoId?: number | null) {
    setMode("grid");
    replaceAlbumState("grid", photoId ?? activePhotoId);
  }

  return (
    <>
      <section className="mt-8">
        <div className="mb-5 flex justify-end">
          <button
            type="button"
            onClick={openGalleryView}
            className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
          >
            Gallery View
          </button>
        </div>
        <PhotoGrid photos={photos} />
      </section>

      {mode === "gallery" ? (
        <AlbumGalleryMode
          albumName={albumName}
          albumSlug={albumSlug}
          photos={photos}
          initialPhotoId={activePhotoId}
          onBackToGrid={returnToGrid}
          onPhotoChange={(photoId) => replaceAlbumState("gallery", photoId)}
        />
      ) : null}
    </>
  );
}
