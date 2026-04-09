"use client";

import { useActionState } from "react";

import { togglePhotoLikeAction, type LikeActionState } from "@/app/photos/like-actions";
import { Button } from "@/components/ui/button";

const initialState: LikeActionState = {};

type LikeButtonProps = {
  photoId: number;
  photoSource: "uploaded" | "sample";
  likeCount: number;
  likedByCurrentVisitor: boolean;
};

export function LikeButton({
  photoId,
  photoSource,
  likeCount,
  likedByCurrentVisitor,
}: LikeButtonProps) {
  const action = togglePhotoLikeAction.bind(null, photoSource, photoId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      {state.error ? (
        <p className="mb-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        variant={likedByCurrentVisitor ? "secondary" : "primary"}
      >
        {pending ? "..." : likedByCurrentVisitor ? `♡ Unlike` : `♡ Like · ${likeCount}`}
      </Button>
    </form>
  );
}
