export type GalleryPhoto = {
  id: number;
  title: string;
  description?: string;
  location?: string;
  shotAt?: string;
  albumName?: string;
  albumSlug?: string;
  exifData?: Record<string, string | number | boolean | null> | null;
  createdAt: string;
  width: number;
  height: number;
  originalUrl: string;
  mediumUrl: string;
  /** Up to 2560px derivative for full-screen views; missing on photos uploaded before it existed. */
  largeUrl?: string;
  thumbnailUrl: string;
  blurDataUrl?: string;
  /** Picked by the owner in /admin/photos for the About page and home hero. Missing = false. */
  featured?: boolean;
  /** When the photo was last marked featured (ISO). Newest-featured comes first. */
  featuredAt?: string;
  source: "uploaded" | "sample";
};

export type PublicPhoto = Omit<GalleryPhoto, "originalUrl"> & {
  albumId?: number | null;
};

export type PhotoRecord = GalleryPhoto & {
  albumId?: number | null;
  originalKey?: string;
  mediumKey?: string;
  largeKey?: string;
  thumbnailKey?: string;
  storageProvider?: "local" | "r2";
};
