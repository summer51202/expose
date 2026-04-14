"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";

import {
  deletePhotoAction,
  deleteSelectedPhotosAction,
  movePhotoToAlbumAction,
  moveSelectedPhotosToAlbumAction,
  type PhotoDeleteState,
  type PhotoMoveState,
} from "@/app/admin/photo-actions";
import { Button } from "@/components/ui/button";
import { removePhotoIdsFromSelection } from "@/lib/photos/photo-selection";
import type { PhotoRecord } from "@/types/photo";

const initialMoveState: PhotoMoveState = {};
const initialDeleteState: PhotoDeleteState = {};

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
  onMoved,
  onDeleted,
}: {
  photo: PhotoRecord;
  albums: AlbumOption[];
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onMoved: (photoId: number) => void;
  onDeleted: (photoId: number) => void;
}) {
  const [state, formAction, pending] = useActionState(
    movePhotoToAlbumAction.bind(null, photo.id),
    initialMoveState,
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deletePhotoAction.bind(null, photo.id),
    initialDeleteState,
  );

  useEffect(() => {
    if (state.resetKey) {
      onMoved(photo.id);
    }
  }, [onMoved, photo.id, state.resetKey]);

  useEffect(() => {
    if (deleteState.resetKey) {
      onDeleted(photo.id);
    }
  }, [deleteState.resetKey, onDeleted, photo.id]);

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

        <div className="flex flex-wrap items-center gap-2">
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
          <form
            action={deleteFormAction}
            onSubmit={(event) => {
              if (!window.confirm(`確定要刪除「${photo.title}」嗎？這個動作無法復原。`)) {
                event.preventDefault();
              }
            }}
          >
            <Button
              type="submit"
              variant="secondary"
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
              disabled={deletePending}
            >
              {deletePending ? "刪除中..." : "刪除"}
            </Button>
          </form>
        </div>

        {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
        {deleteState.error ? <p className="text-sm text-rose-700">{deleteState.error}</p> : null}
        {deleteState.success ? (
          <p className="text-sm text-emerald-700">{deleteState.success}</p>
        ) : null}
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
  const [bulkDeleteState, bulkDeleteFormAction, bulkDeletePending] = useActionState(
    deleteSelectedPhotosAction,
    initialDeleteState,
  );
  const currentBulkResetKey = `${bulkState.resetKey ?? ""}:${bulkDeleteState.resetKey ?? ""}`;
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

  const removeSelectedPhotoIds = useCallback((photoIds: number[]) => {
    setSelectedPhotoIds((current) =>
      removePhotoIdsFromSelection(
        selectedAfterBulkResetKey === currentBulkResetKey ? current : [],
        photoIds,
      ),
    );
    setSelectedAfterBulkResetKey(currentBulkResetKey);
  }, [currentBulkResetKey, selectedAfterBulkResetKey]);
  const removeSingleSelectedPhotoId = useCallback(
    (photoId: number) => removeSelectedPhotoIds([photoId]),
    [removeSelectedPhotoIds],
  );

  function togglePhoto(photoId: number, checked: boolean) {
    setSelectedAfterBulkResetKey(currentBulkResetKey);
    setSelectedPhotoIds((current) =>
      checked
        ? Array.from(
            new Set([
              ...(selectedAfterBulkResetKey === currentBulkResetKey ? current : []),
              photoId,
            ]),
          )
        : removePhotoIdsFromSelection(
            selectedAfterBulkResetKey === currentBulkResetKey ? current : [],
            [photoId],
          ),
    );
  }

  function toggleVisiblePhotos(checked: boolean) {
    setSelectedAfterBulkResetKey(currentBulkResetKey);
    setSelectedPhotoIds((current) => {
      const currentSelection =
        selectedAfterBulkResetKey === currentBulkResetKey ? current : [];

      if (!checked) {
        return removePhotoIdsFromSelection(currentSelection, visiblePhotoIds);
      }

      return Array.from(new Set([...currentSelection, ...visiblePhotoIds]));
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

        <div className="grid gap-3">
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

          <form action={bulkFormAction} className="flex flex-wrap items-center gap-2">
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
          </form>

          <form
            action={bulkDeleteFormAction}
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `確定要刪除 ${visibleSelectedPhotoIds.length} 張照片嗎？這個動作無法復原。`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            {visibleSelectedPhotoIds.map((photoId) => (
              <input key={photoId} type="hidden" name="photoIds" value={photoId} />
            ))}
            <Button
              type="submit"
              variant="secondary"
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
              disabled={visibleSelectedPhotoIds.length === 0 || bulkDeletePending}
            >
              {bulkDeletePending ? "批次刪除中..." : "批次刪除"}
            </Button>
          </form>

          {bulkState.error ? <p className="text-sm text-rose-700">{bulkState.error}</p> : null}
          {bulkState.success ? (
            <p className="text-sm text-emerald-700">{bulkState.success}</p>
          ) : null}
          {bulkDeleteState.error ? (
            <p className="text-sm text-rose-700">{bulkDeleteState.error}</p>
          ) : null}
          {bulkDeleteState.success ? (
            <p className="text-sm text-emerald-700">{bulkDeleteState.success}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3">
        {filteredPhotos.length > 0 ? (
          filteredPhotos.map((photo) => (
            <PhotoMoveRow
              key={`${photo.id}-${photo.albumId ?? "unassigned"}`}
              photo={photo}
              albums={albums}
              checked={visibleSelectedPhotoIds.includes(photo.id)}
              onCheckedChange={(checked) => togglePhoto(photo.id, checked)}
              onMoved={removeSingleSelectedPhotoId}
              onDeleted={removeSingleSelectedPhotoId}
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
