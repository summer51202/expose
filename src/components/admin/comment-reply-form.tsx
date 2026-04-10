"use client";

import { useActionState } from "react";

import {
  replyToCommentAction,
  type CommentReplyState,
} from "@/app/admin/engagement-actions";
import { Button } from "@/components/ui/button";

const initialState: CommentReplyState = {};

type CommentReplyFormProps = {
  commentId: number;
  photoId: number;
  photoSource: "uploaded" | "sample";
};

export function CommentReplyForm({ commentId, photoId, photoSource }: CommentReplyFormProps) {
  const action = replyToCommentAction.bind(null, commentId, photoSource, photoId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-4 grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-700">站長回覆</span>
        <textarea
          name="reply"
          rows={3}
          maxLength={500}
          placeholder="輸入你想公開回覆的內容..."
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-stone-400"
          required
        />
      </label>

      {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "回覆中..." : "送出回覆"}
        </Button>
      </div>
    </form>
  );
}
