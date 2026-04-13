"use client";

import { useActionState, useState } from "react";

import {
  movePhotoToAlbumAction,
  type PhotoMoveState,
} from "@/app/admin/photo-actions";
import { Button } from "@/components/ui/button";
import {
  canSubmitPhotoAlbumChange,
  getPhotoAlbumChangeError,
} from "@/lib/photos/photo-album-change";

const initialState: PhotoMoveState = {};

type PhotoAlbumManagerProps = {
  photos: Array<{
    id: number;
    title: string;
    albumId?: number | null;
    albumName?: string;
    width: number;
    height: number;
  }>;
  albums: Array<{
    id: number;
    name: string;
  }>;
};

type PhotoAlbumRowProps = {
  photo: PhotoAlbumManagerProps["photos"][number];
  albums: PhotoAlbumManagerProps["albums"];
};

function PhotoAlbumRow({ photo, albums }: PhotoAlbumRowProps) {
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const action = movePhotoToAlbumAction.bind(null, photo.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const validationError = getPhotoAlbumChangeError({
    photoId: photo.id,
    albumId: selectedAlbumId,
  });
  const canSubmit = canSubmitPhotoAlbumChange({
    photoId: photo.id,
    albumId: selectedAlbumId,
  });

  return (
    <form action={formAction} className="rounded-2xl border border-line bg-white/80 px-4 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-medium text-stone-900">{photo.title}</p>
          <p className="mt-1 text-sm text-stone-600">
            目前相簿：{photo.albumName ?? "未分類"}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            尺寸 {photo.width} x {photo.height}
          </p>
        </div>

        <div className="grid gap-2 lg:min-w-72">
          <select
            name="albumId"
            value={selectedAlbumId}
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-400"
            onChange={(event) => {
              setSelectedAlbumId(event.currentTarget.value);
            }}
          >
            <option value="">選擇新相簿</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name}
              </option>
            ))}
          </select>

          {validationError === "Please choose a destination album." ? (
            <p className="text-sm text-amber-700">請先選擇要搬移到哪一本相簿。</p>
          ) : null}

          {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

          <div className="flex justify-start">
            <Button type="submit" variant="secondary" disabled={pending || !canSubmit}>
              {pending ? "搬移中..." : "搬移到新相簿"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

export function PhotoAlbumManager({ photos, albums }: PhotoAlbumManagerProps) {
  if (photos.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white/80 px-4 py-4 text-sm text-stone-600">
        目前還沒有可搬移的照片。完成上傳後，這裡會列出最近的照片供你重新指派相簿。
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {photos.map((photo) => (
        <PhotoAlbumRow key={photo.id} photo={photo} albums={albums} />
      ))}
    </div>
  );
}
