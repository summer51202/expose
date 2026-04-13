"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  movePhotoToAlbumAction,
  moveSelectedPhotosToAlbumAction,
  type PhotoMoveState,
} from "@/app/admin/photo-actions";
import { Button } from "@/components/ui/button";
import type { PhotoRecord } from "@/types/photo";

const initialMoveState: PhotoMoveState = {};

type AlbumOption = {
  id: number;
  name: string;
  slug: string;
  photoCount: number;
};

type PhotoManagerProps = {
  photos: PhotoRecord[];
  albums: AlbumOption[];
};

function PhotoMoveRow({
  photo,
  albums,
  checked,
  onCheckedChange,
}: {
  photo: PhotoRecord;
  albums: AlbumOption[];
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    movePhotoToAlbumAction.bind(null, photo.id),
    initialMoveState,
  );

  return (
    <article className="grid gap-4 rounded-lg border border-line bg-white/85 p-3 md:grid-cols-[auto_96px_1fr]">
      <div className="flex items-start">
        <input
          type="checkbox"
          checked={checked}
          className="mt-2 h-5 w-5 rounded border-line text-stone-900"
          aria-label={`選擇 ${photo.title}`}
          onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        />
      </div>

      <Link
        href={`/photos/uploaded/${photo.id}`}
        className="relative aspect-square overflow-hidden rounded-lg bg-stone-100"
      >
        <Image
          src={photo.thumbnailUrl}
          alt={photo.title}
          fill
          sizes="96px"
          className="object-cover"
        />
      </Link>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-stone-900">{photo.title}</h3>
            <p className="mt-1 text-sm text-stone-600">
              目前相簿：{photo.albumName ?? "尚未分類"}
            </p>
          </div>
          <Link
            href={`/photos/uploaded/${photo.id}`}
            className="text-sm text-stone-700 underline-offset-4 hover:underline"
          >
            查看照片
          </Link>
        </div>

        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <select
            name="albumId"
            defaultValue={photo.albumId ?? ""}
            required
            className="min-w-48 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-stone-400"
          >
            <option value="">選擇相簿</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "移動中..." : "移動"}
          </Button>
        </form>

        {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
      </div>
    </article>
  );
}

export function PhotoManager({ photos, albums }: PhotoManagerProps) {
  const [filterAlbumId, setFilterAlbumId] = useState("all");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  const [selectedAfterBulkResetKey, setSelectedAfterBulkResetKey] = useState("");
  const [bulkState, bulkFormAction, bulkPending] = useActionState(
    moveSelectedPhotosToAlbumAction,
    initialMoveState,
  );
  const currentBulkResetKey = bulkState.resetKey ?? "";
  const visibleSelectedPhotoIds =
    selectedAfterBulkResetKey === currentBulkResetKey ? selectedPhotoIds : [];

  const filteredPhotos = useMemo(() => {
    if (filterAlbumId === "all") {
      return photos;
    }

    if (filterAlbumId === "unassigned") {
      return photos.filter((photo) => !photo.albumId);
    }

    const albumId = Number(filterAlbumId);
    return photos.filter((photo) => photo.albumId === albumId);
  }, [filterAlbumId, photos]);

  const visiblePhotoIds = filteredPhotos.map((photo) => photo.id);
  const visibleSelectedCount = visiblePhotoIds.filter((id) =>
    visibleSelectedPhotoIds.includes(id),
  ).length;
  const allVisibleSelected =
    visiblePhotoIds.length > 0 && visibleSelectedCount === visiblePhotoIds.length;

  function togglePhoto(photoId: number, checked: boolean) {
    setSelectedAfterBulkResetKey(currentBulkResetKey);
    setSelectedPhotoIds((current) =>
      checked
        ? Array.from(new Set([...current, photoId]))
        : current.filter((id) => id !== photoId),
    );
  }

  function toggleVisiblePhotos(checked: boolean) {
    setSelectedAfterBulkResetKey(currentBulkResetKey);
    setSelectedPhotoIds((current) => {
      if (!checked) {
        return current.filter((id) => !visiblePhotoIds.includes(id));
      }

      return Array.from(new Set([...current, ...visiblePhotoIds]));
    });
  }

  if (photos.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-white/85 px-4 py-4 text-sm text-stone-600">
        目前還沒有上傳照片。先到上傳照片頁新增作品，這裡就會出現完整管理清單。
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-lg border border-line bg-white/85 p-4 xl:grid-cols-[1fr_1.4fr]">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-stone-700">篩選相簿</span>
          <select
            value={filterAlbumId}
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none transition focus:border-stone-400"
            onChange={(event) => setFilterAlbumId(event.currentTarget.value)}
          >
            <option value="all">全部照片</option>
            <option value="unassigned">尚未分類</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name}（{album.photoCount}）
              </option>
            ))}
          </select>
        </label>

        <form action={bulkFormAction} className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                className="h-5 w-5 rounded border-line text-stone-900"
                onChange={(event) => toggleVisiblePhotos(event.currentTarget.checked)}
              />
              選取目前列表
            </label>
            <span className="text-sm text-stone-600">
              已選 {visibleSelectedPhotoIds.length} 張
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {visibleSelectedPhotoIds.map((photoId) => (
              <input key={photoId} type="hidden" name="photoIds" value={photoId} />
            ))}
            <select
              name="albumId"
              defaultValue=""
              required
              className="min-w-48 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-stone-400"
            >
              <option value="">批次移動到...</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.name}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={visibleSelectedPhotoIds.length === 0 || bulkPending}>
              {bulkPending ? "批次移動中..." : "批次移動"}
            </Button>
          </div>

          {bulkState.error ? <p className="text-sm text-rose-700">{bulkState.error}</p> : null}
          {bulkState.success ? (
            <p className="text-sm text-emerald-700">{bulkState.success}</p>
          ) : null}
        </form>
      </div>

      <div className="grid gap-3">
        {filteredPhotos.length > 0 ? (
          filteredPhotos.map((photo) => (
            <PhotoMoveRow
              key={photo.id}
              photo={photo}
              albums={albums}
              checked={visibleSelectedPhotoIds.includes(photo.id)}
              onCheckedChange={(checked) => togglePhoto(photo.id, checked)}
            />
          ))
        ) : (
          <p className="rounded-lg border border-line bg-white/85 px-4 py-4 text-sm text-stone-600">
            這個篩選條件下沒有照片。
          </p>
        )}
      </div>
    </div>
  );
}
