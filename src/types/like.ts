export type PhotoLikeRecord = {
  id: number;
  photoId: number;
  photoSource: "uploaded" | "sample";
  visitorId: string;
  createdAt: string;
};
