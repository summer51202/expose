export type AlbumRecord = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  coverPhotoId?: number | null;
  sortOrder: number;
  createdAt: string;
};

export type AlbumSummary = AlbumRecord & {
  photoCount: number;
};
