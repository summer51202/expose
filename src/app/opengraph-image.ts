import { siteConfig } from "@/config/site";
import { getGalleryPhotos } from "@/lib/photos/queries";
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, renderOgImage } from "@/lib/seo/og-image";

// Reads the data store, so render on request instead of at build time.
export const dynamic = "force-dynamic";

export const alt = `${siteConfig.name} — ${siteConfig.photographerName} ${siteConfig.tagline}`;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default async function Image() {
  const photos = await getGalleryPhotos().catch(() => []);
  const latest = photos.find((photo) => photo.source === "uploaded");

  return renderOgImage(latest?.mediumUrl);
}
