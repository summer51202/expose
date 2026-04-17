import Image from "next/image";

import type { GalleryPhoto } from "@/types/photo";

type GalleryImageStageProps = {
  photo: GalleryPhoto;
  priority?: boolean;
};

const sampleGradients = [
  "from-stone-800 via-amber-700 to-orange-300",
  "from-sky-900 via-cyan-700 to-teal-300",
  "from-zinc-900 via-slate-700 to-zinc-300",
  "from-emerald-950 via-lime-700 to-lime-300",
  "from-indigo-950 via-blue-700 to-sky-300",
  "from-rose-950 via-fuchsia-700 to-pink-300",
];

export function GalleryImageStage({
  photo,
  priority = false,
}: GalleryImageStageProps) {
  const isSample = photo.source === "sample";
  const sampleGradient = sampleGradients[photo.id % sampleGradients.length];

  return (
    <div className="relative h-full w-full">
      {isSample ? (
        <div className="flex h-full w-full items-center justify-center bg-black">
          <div
            className={`h-[min(80vh,80%)] w-[min(80vw,80%)] rounded-lg bg-gradient-to-br ${sampleGradient}`}
            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
          />
        </div>
      ) : (
        <Image
          src={photo.mediumUrl}
          alt={photo.title}
          fill
          priority={priority}
          className="object-contain"
          sizes="100vw"
          placeholder={photo.blurDataUrl ? "blur" : "empty"}
          blurDataURL={photo.blurDataUrl}
        />
      )}
    </div>
  );
}
