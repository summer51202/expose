import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getAlbums } from "@/lib/albums/queries";
import { getPhotoRepository } from "@/lib/photos/repository";
import { buildAlbumPath, buildPhotoPath } from "@/lib/seo/metadata";
import { resolveSiteUrl, toAbsoluteUrl } from "@/lib/seo/site-url";

// Reads the data store, so render on request instead of at build time.
export const dynamic = "force-dynamic";

function latestDate(dates: string[]) {
  const timestamps = dates.map((value) => new Date(value).getTime()).filter(Number.isFinite);
  return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = resolveSiteUrl();
  const [albums, photos] = await Promise.all([
    getAlbums(),
    getPhotoRepository().listUploadedPhotos(),
  ]);

  const home: MetadataRoute.Sitemap[number] = {
    url: toAbsoluteUrl("/", siteUrl),
    lastModified: latestDate(photos.map((photo) => photo.createdAt)),
    changeFrequency: "weekly",
    priority: 1,
  };

  const about: MetadataRoute.Sitemap[number] = {
    url: toAbsoluteUrl(siteConfig.aboutPath, siteUrl),
    changeFrequency: "monthly",
    priority: 0.5,
  };

  const albumEntries: MetadataRoute.Sitemap = albums
    .filter((album) => album.photoCount > 0)
    .map((album) => ({
      url: toAbsoluteUrl(buildAlbumPath(album), siteUrl),
      lastModified: latestDate(
        photos.filter((photo) => photo.albumId === album.id).map((photo) => photo.createdAt),
      ),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const photoEntries: MetadataRoute.Sitemap = photos.map((photo) => ({
    url: toAbsoluteUrl(buildPhotoPath(photo), siteUrl),
    lastModified: latestDate([photo.createdAt]),
    changeFrequency: "monthly",
    priority: 0.6,
    images: photo.mediumUrl ? [toAbsoluteUrl(photo.mediumUrl, siteUrl)] : undefined,
  }));

  return [home, about, ...albumEntries, ...photoEntries];
}
