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
  thumbnailUrl: string;
  blurDataUrl?: string;
  source: "uploaded" | "sample";
};

export type PublicPhoto = Omit<GalleryPhoto, "originalUrl"> & {
  albumId?: number | null;
};

export type PhotoRecord = GalleryPhoto & {
  albumId?: number | null;
  originalKey?: string;
  mediumKey?: string;
  thumbnailKey?: string;
  storageProvider?: "local" | "r2";
};
