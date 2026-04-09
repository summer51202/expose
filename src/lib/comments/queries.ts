import { getCommentRepository } from "@/lib/comments/repository";
import { getPhotoBySourceAndId } from "@/lib/photos/queries";

export async function getCommentsByPhoto(source: string, photoId: number) {
  const comments = await getCommentRepository().listComments();

  return comments.filter(
    (comment) => comment.photoSource === source && comment.photoId === photoId,
  );
}

export async function getAdminComments(limit = 12) {
  const comments = await getCommentRepository().listComments();
  const sliced = comments.slice(0, limit);

  return Promise.all(
    sliced.map(async (comment) => {
      const photo = await getPhotoBySourceAndId(comment.photoSource, comment.photoId);

      return {
        ...comment,
        photoTitle: photo?.title ?? "找不到對應照片",
        photoHref: photo ? `/photos/${comment.photoSource}/${comment.photoId}` : null,
      };
    }),
  );
}
