import { getVisitorId } from "@/lib/likes/identity";
import { getLikeRepository } from "@/lib/likes/repository";
import { getPhotoBySourceAndId } from "@/lib/photos/queries";

export async function getLikeSummaryByPhoto(source: string, photoId: number) {
  const [likes, visitorId] = await Promise.all([
    getLikeRepository().listLikes(),
    getVisitorId(),
  ]);
  const photoLikes = likes.filter(
    (like) => like.photoSource === source && like.photoId === photoId,
  );

  return {
    likeCount: photoLikes.length,
    likedByCurrentVisitor: visitorId
      ? photoLikes.some((like) => like.visitorId === visitorId)
      : false,
  };
}

export async function getAdminLikeSummaries(limit = 8) {
  const likes = await getLikeRepository().listLikes();
  const buckets = new Map<
    string,
    {
      photoId: number;
      photoSource: "uploaded" | "sample";
      likeCount: number;
      lastLikedAt: string;
    }
  >();

  for (const like of likes) {
    const key = `${like.photoSource}:${like.photoId}`;
    const current = buckets.get(key);

    if (!current) {
      buckets.set(key, {
        photoId: like.photoId,
        photoSource: like.photoSource,
        likeCount: 1,
        lastLikedAt: like.createdAt,
      });
      continue;
    }

    current.likeCount += 1;
    if (new Date(like.createdAt).getTime() > new Date(current.lastLikedAt).getTime()) {
      current.lastLikedAt = like.createdAt;
    }
  }

  const ranked = [...buckets.values()]
    .sort(
      (a, b) =>
        b.likeCount - a.likeCount ||
        new Date(b.lastLikedAt).getTime() - new Date(a.lastLikedAt).getTime(),
    )
    .slice(0, limit);

  const items = await Promise.all(
    ranked.map(async (item) => {
      const photo = await getPhotoBySourceAndId(item.photoSource, item.photoId);

      return {
        ...item,
        photoTitle: photo?.title ?? "找不到對應照片",
        photoHref: photo ? `/photos/${item.photoSource}/${item.photoId}` : null,
      };
    }),
  );

  return {
    totalLikes: likes.length,
    totalPhotosWithLikes: buckets.size,
    items,
  };
}
