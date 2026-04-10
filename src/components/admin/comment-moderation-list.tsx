import Link from "next/link";

import { deleteCommentAction } from "@/app/admin/engagement-actions";
import { CommentReplyForm } from "@/components/admin/comment-reply-form";
import { Button } from "@/components/ui/button";

type CommentModerationListProps = {
  comments: Array<{
    id: number;
    nickname: string;
    content: string;
    createdAt: string;
    ownerReplyName?: string;
    ownerReplyContent?: string;
    ownerReplyCreatedAt?: string;
    photoId: number;
    photoSource: "uploaded" | "sample";
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
        const action = deleteCommentAction.bind(null, comment.id, comment.photoSource);

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

            {comment.ownerReplyContent ? (
              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="font-medium text-stone-900">{comment.ownerReplyName}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {comment.ownerReplyCreatedAt
                    ? new Date(comment.ownerReplyCreatedAt).toLocaleString("zh-TW")
                    : ""}
                </p>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-stone-700">
                  {comment.ownerReplyContent}
                </p>
              </div>
            ) : (
              <CommentReplyForm
                commentId={comment.id}
                photoId={comment.photoId}
                photoSource={comment.photoSource}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}
