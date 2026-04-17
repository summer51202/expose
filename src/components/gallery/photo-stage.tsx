import Image from "next/image";

import { cn } from "@/lib/utils";
import type { PublicPhoto } from "@/types/photo";

type PhotoStageProps = {
  photo: PublicPhoto;
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

export function PhotoStage({ photo, priority = false }: PhotoStageProps) {
  const isSample = photo.source === "sample";
  const sampleGradient = sampleGradients[photo.id % sampleGradients.length];

  return (
    <div className="relative w-full overflow-hidden rounded-[1.25rem]" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
      {isSample ? (
        <div className={cn("absolute inset-0 bg-gradient-to-br", sampleGradient)}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(17,12,8,0.68))]" />
        </div>
      ) : (
        <Image
          src={photo.mediumUrl}
          alt={photo.title}
          fill
          priority={priority}
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 70vw, 1200px"
          placeholder={photo.blurDataUrl ? "blur" : "empty"}
          blurDataURL={photo.blurDataUrl}
        />
      )}
    </div>
  );
}
