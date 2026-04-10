export type AlbumRecord = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  coverPhotoId?: number | null;
  sortOrder: number;
  createdAt: string;
};

export type AlbumSlideshowPhoto = {
  id: number;
  title: string;
  mediumUrl: string;
  thumbnailUrl: string;
  blurDataUrl?: string;
};

export type AlbumSummary = AlbumRecord & {
  photoCount: number;
  slideshowPhotos?: AlbumSlideshowPhoto[];
};
