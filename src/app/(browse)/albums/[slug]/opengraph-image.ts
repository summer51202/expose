import { siteConfig } from "@/config/site";
import { getAlbumPageData } from "@/lib/photos/queries";
import { pickAlbumCoverPhoto } from "@/lib/seo/metadata";
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, renderOgImage } from "@/lib/seo/og-image";

export const dynamic = "force-dynamic";

export const alt = `Album by ${siteConfig.photographerName}`;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

type ImageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const pageData = await getAlbumPageData(slug);

  if (!pageData) {
    return new Response(null, { status: 404 });
  }

  const cover = pickAlbumCoverPhoto(pageData.album, pageData.photos);

  return renderOgImage(cover?.mediumUrl);
}
