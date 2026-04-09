import { SectionHeading } from "@/components/ui/section-heading";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import type { GalleryPhoto } from "@/types/photo";

type PhotoWallSectionProps = {
  photos: GalleryPhoto[];
};

export function PhotoWallSection({ photos }: PhotoWallSectionProps) {
  return (
    <section className="mt-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <SectionHeading eyebrow="Photography" title="Latest Work" />
      </div>

      <PhotoGrid photos={photos} />
    </section>
  );
}
