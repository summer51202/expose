import Link from "next/link";

import { clearPhotoLikesAction } from "@/app/admin/engagement-actions";
import { Button } from "@/components/ui/button";

type LikeSummaryListProps = {
  summary: {
    totalLikes: number;
    totalPhotosWithLikes: number;
    items: Array<{
      photoId: number;
      photoSource: "uploaded" | "sample";
      likeCount: number;
      lastLikedAt: string;
      photoTitle: string;
      photoHref: string | null;
    }>;
  };
};

export function LikeSummaryList({ summary }: LikeSummaryListProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white/80 px-4 py-4">
          <p className="text-sm text-stone-500">總按讚數</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">{summary.totalLikes}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white/80 px-4 py-4">
          <p className="text-sm text-stone-500">被按過讚的照片</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {summary.totalPhotosWithLikes}
          </p>
        </div>
      </div>

      {summary.items.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white/80 px-4 py-4 text-sm text-stone-600">
          目前還沒有按讚資料。等訪客開始互動後，這裡會顯示熱門照片和管理按鈕。
        </p>
      ) : (
        <div className="grid gap-3">
          {summary.items.map((item) => {
            const action = clearPhotoLikesAction.bind(null, item.photoSource, item.photoId);

            return (
              <article
                key={`${item.photoSource}-${item.photoId}`}
                className="rounded-2xl border border-line bg-white/80 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-900">
                      {item.photoHref ? (
                        <Link href={item.photoHref} className="underline-offset-4 hover:underline">
                          {item.photoTitle}
                        </Link>
                      ) : (
                        item.photoTitle
                      )}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      最近按讚時間：{new Date(item.lastLikedAt).toLocaleString("zh-TW")}
                    </p>
                  </div>
                  <form action={action}>
                    <Button type="submit" variant="secondary">
                      清空這張照片的讚
                    </Button>
                  </form>
                </div>
                <p className="mt-3 text-lg font-semibold text-stone-900">{item.likeCount} 個讚</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
