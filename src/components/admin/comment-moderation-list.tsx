import Link from "next/link";

import { deleteCommentAction } from "@/app/admin/engagement-actions";
import { Button } from "@/components/ui/button";

type CommentModerationListProps = {
  comments: Array<{
    id: number;
    nickname: string;
    content: string;
    createdAt: string;
    photoTitle: string;
    photoHref: string | null;
  }>;
};

export function CommentModerationList({ comments }: CommentModerationListProps) {
  if (comments.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white/80 px-4 py-4 text-sm text-stone-600">
        目前還沒有訪客留言。等有人留言後，這裡會出現可管理的清單。
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {comments.map((comment) => {
        const action = deleteCommentAction.bind(null, comment.id);

        return (
          <article
            key={comment.id}
            className="rounded-2xl border border-line bg-white/80 px-4 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900">{comment.nickname}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {new Date(comment.createdAt).toLocaleString("zh-TW")}
                </p>
              </div>
              <form action={action}>
                <Button type="submit" variant="secondary">
                  刪除此留言
                </Button>
              </form>
            </div>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-stone-700">{comment.content}</p>
            <div className="mt-3 text-sm text-stone-600">
              對應照片：
              {comment.photoHref ? (
                <Link href={comment.photoHref} className="underline-offset-4 hover:underline">
                  {comment.photoTitle}
                </Link>
              ) : (
                <span>{comment.photoTitle}</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
