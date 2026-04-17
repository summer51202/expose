import Link from "next/link";

import { PhotoStage } from "@/components/gallery/photo-stage";
import type { PublicPhoto } from "@/types/photo";

type PhotoCardProps = {
  photo: PublicPhoto;
};

export function PhotoCard({ photo }: PhotoCardProps) {
  const detailHref = photo.albumSlug
    ? `/photos/${photo.source}/${photo.id}?returnAlbum=${encodeURIComponent(photo.albumSlug)}&returnView=grid&returnPhoto=${photo.id}`
    : `/photos/${photo.source}/${photo.id}`;

  return (
    <article id={`photo-${photo.id}`} className="mb-4 break-inside-avoid scroll-mt-24">
      <Link href={detailHref} className="group block">
        <div className="relative overflow-hidden rounded-[1.25rem]">
          <PhotoStage photo={photo} />

          {photo.location ? (
            <div className="absolute right-3 top-3 rounded-full bg-black/30 px-3 py-1 text-xs text-white backdrop-blur-sm">
              {photo.location}
            </div>
          ) : null}

          {/* Hover overlay */}
          <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/75 to-transparent p-4 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <h3 className="text-base font-semibold leading-tight">{photo.title}</h3>
            {photo.shotAt ? (
              <p className="mt-1 text-xs text-white/70">
                {new Date(photo.shotAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
