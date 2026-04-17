"use client";

import { useActionState, useState } from "react";

import { type AlbumFormState, deleteAlbumAction, updateAlbumAction } from "@/app/admin/album-actions";
import { Button } from "@/components/ui/button";

const initialState: AlbumFormState = {};

type AlbumEditorFormProps = {
  album: {
    id: number;
    name: string;
    description?: string;
    slug: string;
    photoCount: number;
    coverPhotoId?: number | null;
  };
  photos: { id: number; title: string; thumbnailUrl: string }[];
};

export function AlbumEditorForm({ album, photos }: AlbumEditorFormProps) {
  const action = updateAlbumAction.bind(null, album.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [deleteState, deleteFormAction, deletepending] = useActionState(
    async (_prev: AlbumFormState) => deleteAlbumAction(album.id),
    initialState,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

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

      {photos.length > 0 ? (
        <div className="grid gap-2">
          <span className="text-sm font-medium text-stone-700">封面照片</span>
          <div className="flex flex-wrap gap-2">
            <label className="relative cursor-pointer">
              <input
                type="radio"
                name="coverPhotoId"
                value=""
                defaultChecked={!album.coverPhotoId}
                className="peer sr-only"
              />
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-line bg-stone-100 text-xs text-stone-400 peer-checked:border-stone-600">
                無
              </div>
            </label>
            {photos.map((photo) => (
              <label key={photo.id} className="relative cursor-pointer" title={photo.title}>
                <input
                  type="radio"
                  name="coverPhotoId"
                  value={String(photo.id)}
                  defaultChecked={album.coverPhotoId === photo.id}
                  className="peer sr-only"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.title}
                  className="h-16 w-16 rounded-lg border-2 border-line object-cover peer-checked:border-stone-600"
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}

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

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button type="submit" disabled={pending} variant="secondary" className="sm:w-auto">
          {pending ? "更新中..." : "儲存相簿設定"}
        </Button>

        {confirmDelete ? (
          <form action={deleteFormAction} className="flex items-center gap-2">
            <span className="text-sm text-rose-700">確定刪除？相簿內照片將變為未分類。</span>
            <Button
              type="submit"
              disabled={deletepending}
              variant="secondary"
              className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 sm:w-auto"
            >
              {deletepending ? "刪除中..." : "確認刪除"}
            </Button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-sm text-stone-500 underline-offset-4 hover:underline"
            >
              取消
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-rose-600 underline-offset-4 hover:underline"
          >
            刪除相簿
          </button>
        )}
      </div>

      {deleteState.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {deleteState.error}
        </p>
      ) : null}
    </form>
  );
}
