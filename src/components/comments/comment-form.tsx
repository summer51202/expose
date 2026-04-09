"use client";

import { useActionState } from "react";

import {
  createCommentAction,
  type CommentFormState,
} from "@/app/photos/comment-actions";
import { Button } from "@/components/ui/button";

const initialState: CommentFormState = {};

type CommentFormProps = {
  photoId: number;
  photoSource: "uploaded" | "sample";
};

export function CommentForm({ photoId, photoSource }: CommentFormProps) {
  const action = createCommentAction.bind(null, photoSource, photoId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium">Name</span>
        <input
          name="nickname"
          type="text"
          maxLength={24}
          placeholder="e.g. Edward, Traveller"
          className="rounded-2xl border border-line bg-white/8 px-4 py-3 outline-none transition focus:border-white/40"
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium">Comment</span>
        <textarea
          name="content"
          rows={4}
          maxLength={500}
          placeholder="Share your thoughts on this photo..."
          className="rounded-2xl border border-line bg-white/8 px-4 py-3 outline-none transition focus:border-white/40"
          required
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Posting..." : "Post Comment"}
      </Button>
    </form>
  );
}
