import type { CommentRecord } from "@/types/comment";

type CommentListProps = {
  comments: CommentRecord[];
};

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-panel px-4 py-4 text-sm leading-6 text-foreground/50">
        No comments yet. Be the first to leave a thought.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {comments.map((comment) => (
        <article
          key={comment.id}
          className="rounded-2xl border border-line bg-panel px-4 py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-foreground">{comment.nickname}</p>
            <p className="text-sm text-foreground/45">
              {new Date(comment.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-foreground/80">{comment.content}</p>
        </article>
      ))}
    </div>
  );
}
