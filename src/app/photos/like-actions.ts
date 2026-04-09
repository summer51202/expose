"use server";

import { revalidatePath } from "next/cache";

import { getOrCreateVisitorId } from "@/lib/likes/identity";
import { getLikeRepository } from "@/lib/likes/repository";
import { getPhotoBySourceAndId } from "@/lib/photos/queries";
import { getHashedRequestFingerprint } from "@/lib/security/request-fingerprint";
import { rateLimiter } from "@/lib/security/rate-limit";
import type { PhotoLikeRecord } from "@/types/like";

export type LikeActionState = {
  error?: string;
};

const LIKE_RATE_LIMIT = {
  limit: 4,
  windowMs: 15 * 1000,
  blockMs: 60 * 1000,
};

export async function togglePhotoLikeAction(
  source: "uploaded" | "sample",
  photoId: number,
  prevState: LikeActionState,
): Promise<LikeActionState> {
  void prevState;

  const photo = await getPhotoBySourceAndId(source, photoId);
  if (!photo) {
    return {
      error: "找不到這張照片，請重新整理後再試一次。",
    };
  }

  const visitorId = await getOrCreateVisitorId();
  const fingerprint = await getHashedRequestFingerprint();
  const limiterResult = rateLimiter.check(
    `like:${source}:${photoId}:${visitorId}:${fingerprint}`,
    LIKE_RATE_LIMIT,
  );

  if (!limiterResult.allowed) {
    return {
      error: "操作太頻繁了，請稍後再試。",
    };
  }

  const likes = await getLikeRepository().listLikes();
  const alreadyLiked = likes.find(
    (like) =>
      like.photoSource === source &&
      like.photoId === photoId &&
      like.visitorId === visitorId,
  );

  if (alreadyLiked) {
    await getLikeRepository().deleteLike(alreadyLiked.id);
  } else {
    const record: PhotoLikeRecord = {
      id: Date.now(),
      photoId,
      photoSource: source,
      visitorId,
      createdAt: new Date().toISOString(),
    };

    await getLikeRepository().appendLike(record);
  }

  revalidatePath(`/photos/${source}/${photoId}`);

  return {};
}
