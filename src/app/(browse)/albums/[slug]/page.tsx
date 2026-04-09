import Link from "next/link";
import { notFound } from "next/navigation";

import { PhotoGrid } from "@/components/gallery/photo-grid";
import { Panel } from "@/components/ui/panel";
import { getAlbumBySlug } from "@/lib/albums/queries";
import { getPhotosByAlbumSlug } from "@/lib/photos/queries";

type AlbumPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { slug } = await params;
  const album = await getAlbumBySlug(slug);

  if (!album) {
    notFound();
  }

  const photos = await getPhotosByAlbumSlug(slug);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-6 pt-20 sm:px-8 lg:px-12">
      <Link href="/" className="text-sm text-stone-600 underline-offset-4 hover:underline">
        ← Back
      </Link>

      <section className="mt-6">
        <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">Album</p>
        <h1 className="mt-3 text-4xl font-semibold text-stone-900">{album.name}</h1>
        {album.description?.trim() ? (
          <p className="mt-4 max-w-2xl leading-8 text-stone-700">{album.description}</p>
        ) : null}
        <p className="mt-2 text-sm text-stone-500">{album.photoCount} photos</p>
      </section>

      <section className="mt-8">
        {photos.length > 0 ? (
          <PhotoGrid photos={photos} />
        ) : (
          <Panel>
            <p className="leading-7 text-stone-700">
              No photos in this album yet.
            </p>
          </Panel>
        )}
      </section>
    </main>
  );
}
