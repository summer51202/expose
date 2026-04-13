"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import { getCommentReplyError } from "@/lib/comments/comment-reply";
import { getCommentRepository } from "@/lib/comments/repository";
import { getLikeRepository } from "@/lib/likes/repository";
import { siteConfig } from "@/config/site";

export type CommentReplyState = {
  error?: string;
  success?: string;
};

export async function deleteCommentAction(
  commentId: number,
  photoSource: "uploaded" | "sample",
) {
  await requireAdminSession();
  await getCommentRepository().deleteComment(commentId, photoSource);
  revalidatePath("/admin");
  revalidatePath("/admin/comments");
}

export async function replyToCommentAction(
  commentId: number,
  photoSource: "uploaded" | "sample",
  photoId: number,
  _prevState: CommentReplyState,
  formData: FormData,
): Promise<CommentReplyState> {
  await requireAdminSession();

  const content = String(formData.get("reply") || "");
  const validationError = getCommentReplyError(content);

  if (validationError) {
    return {
      error:
        validationError === "Please enter a reply."
          ? "請輸入回覆內容。"
          : "回覆內容請控制在 500 個字以內。",
    };
  }

  await getCommentRepository().replyToComment(commentId, photoSource, {
    ownerReplyName: siteConfig.ownerReplyName,
    ownerReplyContent: content.trim(),
    ownerReplyCreatedAt: new Date().toISOString(),
  });

  revalidatePath("/admin");
  revalidatePath(`/photos/${photoSource}/${photoId}`);

  return {
    success: "已送出回覆。",
  };
}

export async function clearPhotoLikesAction(
  photoSource: "uploaded" | "sample",
  photoId: number,
) {
  await requireAdminSession();
  await getLikeRepository().clearLikesByPhoto(photoSource, photoId);
  revalidatePath("/admin");
  revalidatePath("/admin/likes");
  revalidatePath(`/photos/${photoSource}/${photoId}`);
}
