"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import type { PublicPhoto } from "@/types/photo";

type HeroSectionProps = {
  photos: PublicPhoto[];
};

const sampleGradients = [
  "from-stone-800 via-amber-700 to-orange-300",
  "from-sky-900 via-cyan-700 to-teal-300",
  "from-zinc-900 via-slate-700 to-zinc-300",
  "from-emerald-950 via-lime-700 to-lime-300",
  "from-indigo-950 via-blue-700 to-sky-300",
];

function PhotoBackground({ photo, priority }: { photo: PublicPhoto; priority?: boolean }) {
  if (photo.source === "sample") {
    const gradient = sampleGradients[photo.id % sampleGradients.length];
    return <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />;
  }

  return (
    <Image
      src={photo.mediumUrl}
      alt={photo.title}
      fill
      priority={priority}
      className="object-cover"
      sizes="100vw"
      placeholder={photo.blurDataUrl ? "blur" : "empty"}
      blurDataURL={photo.blurDataUrl ?? undefined}
    />
  );
}

export function HeroSection({ photos }: HeroSectionProps) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const hasMultiple = photos.length > 1;

  useEffect(() => {
    if (!hasMultiple) return;

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent((i) => (i + 1) % photos.length);
        setVisible(true);
      }, 600);
    }, 5000);

    return () => clearInterval(interval);
  }, [hasMultiple, photos.length]);

  function scrollToPortfolio() {
    document.getElementById("albums")?.scrollIntoView({ behavior: "smooth" });
  }

  const currentPhoto = photos.length > 0 ? photos[current] : null;

  return (
    <section className="relative h-screen w-full overflow-hidden bg-stone-900">
      {currentPhoto ? (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <PhotoBackground photo={currentPhoto} priority={current === 0} />
        </div>
      ) : null}

      {/* Top-to-transparent + bottom-to-dark overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.40)_0%,transparent_28%,transparent_52%,rgba(0,0,0,0.72)_100%)]" />

      {/* Bottom content row */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-5 pb-10 sm:px-8 lg:px-12">
        <div>
          <p className="text-xs tracking-[0.32em] text-white/55 uppercase">
            {siteConfig.photographerName}
          </p>
          <h1 className="mt-2 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            {siteConfig.tagline}
          </h1>
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
