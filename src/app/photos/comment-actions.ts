"use server";

import { revalidatePath } from "next/cache";

import { getVisitorHash } from "@/lib/comments/identity";
import { getCommentRepository } from "@/lib/comments/repository";
import { getPhotoBySourceAndId } from "@/lib/photos/queries";
import { getHashedRequestFingerprint } from "@/lib/security/request-fingerprint";
import { rateLimiter } from "@/lib/security/rate-limit";
import type { CommentRecord } from "@/types/comment";

export type CommentFormState = {
  error?: string;
  success?: string;
};

const COMMENT_RATE_LIMIT = {
  limit: 3,
  windowMs: 60 * 1000,
  blockMs: 2 * 60 * 1000,
};
const COMMENT_RATE_LIMIT_MESSAGE = "留言太頻繁了，請稍後再試。";

export async function createCommentAction(
  source: "uploaded" | "sample",
  photoId: number,
  _prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const nickname = String(formData.get("nickname") || "").trim();
  const content = String(formData.get("content") || "").trim();

  if (!nickname) {
    return {
      error: "請先填寫你的暱稱。",
    };
  }

  if (!content) {
    return {
      error: "請輸入留言內容。",
    };
  }

  if (nickname.length > 24) {
    return {
      error: "暱稱請控制在 24 個字以內。",
    };
  }

  if (content.length > 500) {
    return {
      error: "留言內容請控制在 500 個字以內。",
    };
  }

  const photo = await getPhotoBySourceAndId(source, photoId);
  if (!photo) {
    return {
      error: "找不到這張照片，請重新整理後再試一次。",
    };
  }

  const fingerprint = await getHashedRequestFingerprint();
  const limiterResult = rateLimiter.check(
    `comment:${source}:${photoId}:${fingerprint}`,
    COMMENT_RATE_LIMIT,
  );

  if (!limiterResult.allowed) {
    return {
      error: COMMENT_RATE_LIMIT_MESSAGE,
    };
  }

  const record: CommentRecord = {
    id: Date.now(),
    photoId,
    photoSource: source,
    nickname,
    content,
    ipHash: await getVisitorHash(),
    createdAt: new Date().toISOString(),
  };

  await getCommentRepository().appendComment(record);
  revalidatePath(`/photos/${source}/${photoId}`);

  return {
    success: "留言已送出，重新整理後會保留在這張照片下方。",
  };
}
