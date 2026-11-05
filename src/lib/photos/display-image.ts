import type { GalleryPhoto } from "@/types/photo";

export type DisplayImageVariant = "large" | "medium";

/**
 * Picks the stored derivative to feed next/image. `large` falls back to `medium`
 * for photos uploaded before the large derivative existed (or not yet backfilled).
 */
export function getDisplayImageUrl(
  photo: Pick<GalleryPhoto, "mediumUrl" | "largeUrl">,
  variant: DisplayImageVariant,
): string {
  if (variant === "large" && photo.largeUrl) {
    return photo.largeUrl;
  }

  return photo.mediumUrl;
}
