import { siteConfig } from "@/config/site";
import { getGalleryPhotos, getPhotoBySourceAndId } from "@/lib/photos/queries";
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, renderOgImage } from "@/lib/seo/og-image";

// Reads the data store, so render on request instead of at build time.
export const dynamic = "force-dynamic";

export const alt = `About ${siteConfig.photographerName}`;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

/** Portrait when one is configured, otherwise the newest upload (same as the home page). */
async function resolveSourceUrl() {
  const portrait = siteConfig.about.portrait;

  if (portrait?.kind === "static") {
    return portrait.src;
  }

  if (portrait?.kind === "photo") {
    const photo = await getPhotoBySourceAndId("uploaded", portrait.photoId);

    if (photo) {
      return photo.mediumUrl;
    }
  }

  const photos = await getGalleryPhotos();
  return photos.find((photo) => photo.source === "uploaded")?.mediumUrl;
}

export default async function Image() {
  return renderOgImage(await resolveSourceUrl().catch(() => undefined));
}
