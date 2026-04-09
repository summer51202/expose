"use server";

import { revalidatePath } from "next/cache";

import { getOrCreateVisitorId } from "@/lib/likes/identity";
import { getLikeRepository } from "@/lib/likes/repository";
import { getPhotoBySourceAndId } from "@/lib/photos/queries";
import type { PhotoLikeRecord } from "@/types/like";

export type LikeActionState = {
  error?: string;
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
