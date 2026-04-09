import { PhotoCard } from "@/components/gallery/photo-card";
import type { GalleryPhoto } from "@/types/photo";

type PhotoGridProps = {
  photos: GalleryPhoto[];
};

export function PhotoGrid({ photos }: PhotoGridProps) {
  return (
    <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
      {photos.map((photo) => (
        <PhotoCard key={`${photo.source}-${photo.id}`} photo={photo} />
      ))}
    </div>
  );
}
