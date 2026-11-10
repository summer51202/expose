import { PhotoCard } from "@/components/gallery/photo-card";
import type { GridPhoto } from "@/lib/photos/photo-feed";

type PhotoGridProps = {
  photos: GridPhoto[];
  /** How many leading cards load eagerly; the rest use native lazy loading. */
  eagerCount?: number;
};

export function PhotoGridEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-neutral-400">
      <p className="text-lg font-medium">No photos yet</p>
      <p className="mt-1 text-sm">Check back soon — new work is on the way.</p>
    </div>
  );
}

/**
 * Masonry block (CSS columns). The paginated home wall renders one block per
 * batch so appending photos never reflows the columns already on screen.
 */
export function PhotoGridBlock({ photos, eagerCount = 0 }: PhotoGridProps) {
  return (
    <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
      {photos.map((photo, index) => (
        <PhotoCard
          key={`${photo.source}-${photo.id}`}
          photo={photo}
          eager={index < eagerCount}
        />
      ))}
    </div>
  );
}

export function PhotoGrid({ photos, eagerCount }: PhotoGridProps) {
  if (photos.length === 0) {
    return <PhotoGridEmpty />;
  }

  return <PhotoGridBlock photos={photos} eagerCount={eagerCount} />;
}
