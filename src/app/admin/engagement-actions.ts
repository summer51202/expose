"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import { getCommentRepository } from "@/lib/comments/repository";
import { getLikeRepository } from "@/lib/likes/repository";

export async function deleteCommentAction(commentId: number) {
  await requireAdminSession();
  await getCommentRepository().deleteComment(commentId);
  revalidatePath("/admin");
}

export async function clearPhotoLikesAction(
  photoSource: "uploaded" | "sample",
  photoId: number,
) {
  await requireAdminSession();
  await getLikeRepository().clearLikesByPhoto(photoSource, photoId);
  revalidatePath("/admin");
  revalidatePath(`/photos/${photoSource}/${photoId}`);
}
