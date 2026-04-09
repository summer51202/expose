export type CommentRecord = {
  id: number;
  photoId: number;
  photoSource: "uploaded" | "sample";
  nickname: string;
  content: string;
  ipHash: string;
  createdAt: string;
};
