import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAlbums } from "@/lib/albums/queries";
import { PageViewBeacon } from "@/components/analytics/page-view-beacon";
import { AlbumStripSection } from "@/components/home/album-strip-section";
import { HeroSection } from "@/components/home/hero-section";
import { PhotoWallSection } from "@/components/home/photo-wall-section";
import { selectHeroPhotos } from "@/lib/photos/hero-photos";
import {
  buildFeedPageHref,
  getNumberedFeedPage,
  parsePageParam,
  toGridPhoto,
  toHeroPhoto,
  toSlimPhotos,
} from "@/lib/photos/photo-feed";
import { getFeedPhotos } from "@/lib/photos/queries";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  const page = parsePageParam((await searchParams).page);

  // Later pages of the wall are their own canonical URLs (each lists different
  // photos); page 1, a malformed ?page= and other params collapse to "/".
  if (page && page > 1) {
    return {
      title: `Latest Work — Page ${page}`,
      alternates: { canonical: buildFeedPageHref(page) },
    };
  }

  return { alternates: { canonical: "/" } };
}

export default async function Home({ searchParams }: HomeProps) {
  // A malformed ?page= renders page 1 (canonical "/"), like any unknown param.
  const page = parsePageParam((await searchParams).page) ?? 1;
  const [photos, albums] = await Promise.all([
    getFeedPhotos(),
    page === 1 ? getAlbums() : Promise.resolve([]),
  ]);

  const feedPage = getNumberedFeedPage(photos, page);
  if (!feedPage) {
    notFound();
  }

  const wall = (
    <PhotoWallSection
      photos={toSlimPhotos(feedPage.items, toGridPhoto)}
      nextCursor={feedPage.nextCursor}
      page={feedPage.page}
      totalPages={feedPage.totalPages}
    />
  );

  if (page > 1) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-12 pt-20 sm:px-8 lg:px-12">
        {wall}
      </main>
    );
  }

  return (
    <>
      <PageViewBeacon pageType="home" path="/" />
      {/* Only the first slide shows the blur preview (see HeroSection). */}
      <HeroSection photos={toSlimPhotos(selectHeroPhotos(photos, { limit: 6 }), toHeroPhoto, 1)} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-12 pt-8 sm:px-8 lg:px-12">
        <AlbumStripSection albums={albums} />
        {wall}
      </main>
    </>
  );
}
