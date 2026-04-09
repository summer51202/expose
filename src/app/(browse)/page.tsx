import { getAlbums } from "@/lib/albums/queries";
import { AlbumStripSection } from "@/components/home/album-strip-section";
import { HeroSection } from "@/components/home/hero-section";
import { PhotoWallSection } from "@/components/home/photo-wall-section";
import { getGalleryPhotos } from "@/lib/photos/queries";

export default async function Home() {
  const [photos, albums] = await Promise.all([getGalleryPhotos(), getAlbums()]);

  return (
    <>
      <HeroSection photos={photos} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-12 pt-8 sm:px-8 lg:px-12">
        <AlbumStripSection albums={albums} />
        <PhotoWallSection photos={photos} />
      </main>
    </>
  );
}
