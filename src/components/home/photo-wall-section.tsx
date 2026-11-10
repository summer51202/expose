import Link from "next/link";

import { PhotoWallFeed } from "@/components/home/photo-wall-feed";
import { SectionHeading } from "@/components/ui/section-heading";
import { buildFeedPageHref, type GridPhoto } from "@/lib/photos/photo-feed";

type PhotoWallSectionProps = {
  photos: GridPhoto[];
  nextCursor: string | null;
  page: number;
  totalPages: number;
};

export function PhotoWallSection({ photos, nextCursor, page, totalPages }: PhotoWallSectionProps) {
  return (
    <section className="mt-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <SectionHeading eyebrow="Photography" title="Latest Work" />
        {page > 1 ? (
          <p className="text-sm text-stone-500">
            Page {page} of {totalPages}
          </p>
        ) : null}
      </div>

      {page > 1 ? (
        <nav aria-label="Photo pages" className="mb-5 text-sm">
          <Link
            href={buildFeedPageHref(page - 1)}
            rel="prev"
            className="text-stone-600 underline-offset-4 hover:underline"
          >
            ← Newer photos
          </Link>
        </nav>
      ) : null}

      {/* key: a client-side jump to another ?page= starts a fresh feed. */}
      <PhotoWallFeed key={page} initialPhotos={photos} initialCursor={nextCursor} page={page} />
    </section>
  );
}
