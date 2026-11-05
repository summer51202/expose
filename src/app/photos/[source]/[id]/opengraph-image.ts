import { siteConfig } from "@/config/site";
import { getPhotoBySourceAndId } from "@/lib/photos/queries";
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, renderOgImage } from "@/lib/seo/og-image";

export const dynamic = "force-dynamic";

export const alt = `Photo by ${siteConfig.photographerName}`;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

type ImageProps = {
  params: Promise<{ source: string; id: string }>;
};

export default async function Image({ params }: ImageProps) {
  const { source, id } = await params;
  const photo = await getPhotoBySourceAndId(source, Number(id));

  if (!photo) {
    return new Response(null, { status: 404 });
  }

  return renderOgImage(photo.mediumUrl);
}
