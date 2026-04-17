import { PhotoCard } from "@/components/gallery/photo-card";
import type { GalleryPhoto } from "@/types/photo";

type PhotoGridProps = {
  photos: GalleryPhoto[];
};

export function PhotoGrid({ photos }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-neutral-400">
        <p className="text-lg font-medium">No photos yet</p>
        <p className="mt-1 text-sm">Check back soon — new work is on the way.</p>
      </div>
    );
  }

  return (
    <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
      {photos.map((photo) => (
        <PhotoCard key={`${photo.source}-${photo.id}`} photo={photo} />
      ))}
    </div>
  );
}
