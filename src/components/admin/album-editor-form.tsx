"use client";

import { useActionState } from "react";

import { type AlbumFormState, updateAlbumAction } from "@/app/admin/album-actions";
import { Button } from "@/components/ui/button";

const initialState: AlbumFormState = {};

type AlbumEditorFormProps = {
  album: {
    id: number;
    name: string;
    description?: string;
    slug: string;
    photoCount: number;
  };
};

export function AlbumEditorForm({ album }: AlbumEditorFormProps) {
  const action = updateAlbumAction.bind(null, album.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-700">相簿名稱</span>
        <input
          name="name"
          type="text"
          defaultValue={album.name}
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-stone-400"
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-700">相簿描述</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={album.description ?? ""}
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-stone-400"
        />
      </label>

      <div className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-stone-600">
        目前有 {album.photoCount} 張照片，網址代號為 /albums/{album.slug}
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-full sm:w-auto">
        {pending ? "更新中..." : "儲存相簿設定"}
      </Button>
    </form>
  );
}
