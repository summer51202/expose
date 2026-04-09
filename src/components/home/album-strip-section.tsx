import Link from "next/link";

import { SectionHeading } from "@/components/ui/section-heading";
import type { AlbumSummary } from "@/types/album";

type AlbumStripSectionProps = {
  albums: AlbumSummary[];
};

const albumGradients = [
  "from-stone-800 via-stone-600 to-stone-400",
  "from-amber-900 via-amber-700 to-amber-400",
  "from-sky-900 via-sky-700 to-sky-400",
  "from-emerald-900 via-emerald-700 to-emerald-400",
  "from-rose-900 via-rose-700 to-rose-400",
  "from-indigo-900 via-indigo-700 to-indigo-400",
];

export function AlbumStripSection({ albums }: AlbumStripSectionProps) {
  if (albums.length === 0) {
    return null;
  }

  return (
    <section id="albums" className="mt-8">
      <div className="mb-5">
        <SectionHeading eyebrow="Collections" title="Albums" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {albums.map((album, index) => {
          const gradient = albumGradients[index % albumGradients.length];

          return (
            <Link
              key={album.id}
              href={`/albums/${encodeURIComponent(album.slug)}`}
              className="group relative block aspect-[4/3] overflow-hidden rounded-[1.75rem]"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-transform duration-500 group-hover:scale-105`}
              />

              <div className="absolute inset-0 bg-white/10 opacity-20 mix-blend-overlay" />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
                <p className="text-xs tracking-[0.2em] text-white/60 uppercase">Album</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{album.name}</h3>
                <p className="mt-1 text-sm text-white/65">
                  {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
                </p>
              </div>

              <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                <span aria-hidden="true">-&gt;</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}