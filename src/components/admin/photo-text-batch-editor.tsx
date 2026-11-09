"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { savePhotoTextAction } from "@/app/admin/photo-actions";
import { PhotoTextFields } from "@/components/admin/photo-text-fields";
import { useUnsavedChangesWarning } from "@/components/admin/use-unsaved-changes-warning";
import { Button } from "@/components/ui/button";
import {
  collectPhotoTextPatches,
  filterPhotosForTextEdit,
  getPhotoTextFieldErrors,
  getPhotoTextValues,
  looksLikeFilenameTitle,
  PHOTO_TEXT_MAX_BATCH,
  type PhotoTextField,
  type PhotoTextValues,
} from "@/lib/photos/photo-text";
import type { PhotoRecord } from "@/types/photo";

const PAGE_SIZE = 40;

type AlbumOption = {
  id: number;
  name: string;
};

type PhotoTextBatchEditorProps = {
  photos: PhotoRecord[];
  albums: AlbumOption[];
};

type SaveMessage = { kind: "success" | "error"; text: string } | null;

export function PhotoTextBatchEditor({ photos, albums }: PhotoTextBatchEditorProps) {
  const [albumFilter, setAlbumFilter] = useState("all");
  const [filenameOnly, setFilenameOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [drafts, setDrafts] = useState<Map<number, PhotoTextValues>>(() => new Map());
  const [message, setMessage] = useState<SaveMessage>(null);
  const [pending, startTransition] = useTransition();

  const originals = useMemo(
    () => new Map(photos.map((photo) => [photo.id, getPhotoTextValues(photo)])),
    [photos],
  );
  const filenameCount = useMemo(
    () => photos.filter((photo) => looksLikeFilenameTitle(photo.title)).length,
    [photos],
  );
  const filteredPhotos = useMemo(
    () => filterPhotosForTextEdit(photos, { album: albumFilter, filenameOnly }),
    [albumFilter, filenameOnly, photos],
  );
  const shownPhotos = filteredPhotos.slice(0, visibleCount);

  const patches = useMemo(() => collectPhotoTextPatches(originals, drafts), [drafts, originals]);
  const changedIds = new Set(patches.map((patch) => patch.id));
  const invalidCount = patches.filter(
    (patch) => Object.keys(getPhotoTextFieldErrors(drafts.get(patch.id)!)).length > 0,
  ).length;
  const tooMany = patches.length > PHOTO_TEXT_MAX_BATCH;

  useUnsavedChangesWarning(patches.length > 0);

  function updateDraft(photoId: number, field: PhotoTextField, value: string) {
    const original = originals.get(photoId);

    if (!original) {
      return;
    }

    setMessage(null);
    setDrafts((current) => {
      const next = new Map(current);
      next.set(photoId, { ...(current.get(photoId) ?? original), [field]: value });
      return next;
    });
  }

  function resetDraft(photoId: number) {
    setDrafts((current) => {
      const next = new Map(current);
      next.delete(photoId);
      return next;
    });
  }

  function discardAll() {
    if (window.confirm(`放棄 ${patches.length} 張照片尚未儲存的修改？`)) {
      setDrafts(new Map());
      setMessage(null);
    }
  }

  function changeFilter(update: () => void) {
    update();
    setVisibleCount(PAGE_SIZE);
  }

  function save() {
    if (patches.length === 0 || invalidCount > 0 || tooMany) {
      return;
    }

    const sent = patches;
    // Draft objects are replaced on every keystroke, so identity tells us
    // whether a row was edited again while the save was running.
    const sentDrafts = new Map(sent.map((patch) => [patch.id, drafts.get(patch.id)]));

    startTransition(async () => {
      const result = await savePhotoTextAction(sent);

      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }

      setDrafts((current) => {
        const next = new Map(current);

        for (const { id } of result.saved) {
          if (next.get(id) === sentDrafts.get(id)) {
            next.delete(id);
          }
        }

        return next;
      });
      setMessage({ kind: "success", text: result.message });
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-lg border border-line bg-white/85 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-stone-700">篩選相簿</span>
          <select
            value={albumFilter}
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none transition focus:border-stone-400"
            onChange={(event) => {
              const value = event.currentTarget.value;
              changeFilter(() => setAlbumFilter(value));
            }}
          >
            <option value="all">全部照片</option>
            <option value="unassigned">尚未分類</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={filenameOnly}
            className="h-5 w-5 rounded border-line text-stone-900"
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              changeFilter(() => setFilenameOnly(checked));
            }}
          />
          只顯示標題像檔名的照片（{filenameCount}）
        </label>
        <p className="text-sm text-stone-600 md:col-span-2">
          符合條件 {filteredPhotos.length} 張。標題會用在照片頁標題、分享預覽和搜尋結果，建議寫成看得懂的句子。
        </p>
      </div>

      {shownPhotos.length > 0 ? (
        <ul className="grid gap-3">
          {shownPhotos.map((photo) => {
            const original = originals.get(photo.id)!;
            const values = drafts.get(photo.id) ?? original;
            const changed = changedIds.has(photo.id);

            return (
              <li
                key={photo.id}
                className={
                  changed
                    ? "grid gap-3 rounded-lg border border-amber-300 bg-white p-3 sm:grid-cols-[88px_minmax(0,1fr)]"
                    : "grid gap-3 rounded-lg border border-line bg-white/85 p-3 sm:grid-cols-[88px_minmax(0,1fr)]"
                }
              >
                <div className="flex items-start gap-3 sm:flex-col">
                  <Link
                    href={`/photos/uploaded/${photo.id}`}
                    target="_blank"
                    className="relative block aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100 sm:w-full"
                    title="在新分頁查看照片"
                  >
                    <Image
                      src={photo.thumbnailUrl}
                      alt={original.title}
                      fill
                      sizes="88px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="min-w-0 text-xs text-stone-500">
                    <p className="truncate">{photo.albumName ?? "尚未分類"}</p>
                    <p className="sm:hidden">#{photo.id}</p>
                    {changed ? (
                      <button
                        type="button"
                        className="mt-1 text-stone-700 underline underline-offset-4"
                        onClick={() => resetDraft(photo.id)}
                      >
                        還原
                      </button>
                    ) : null}
                  </div>
                </div>
                <PhotoTextFields
                  idPrefix={`batch-${photo.id}`}
                  values={values}
                  original={original}
                  errors={changed ? getPhotoTextFieldErrors(values) : {}}
                  onChange={(field, value) => updateDraft(photo.id, field, value)}
                  compact
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-line bg-white/85 px-4 py-4 text-sm text-stone-600">
          這個篩選條件下沒有照片。
        </p>
      )}

      {filteredPhotos.length > shownPhotos.length ? (
        <Button
          variant="secondary"
          className="justify-self-center"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          再顯示 {Math.min(PAGE_SIZE, filteredPhotos.length - shownPhotos.length)} 張（還有{" "}
          {filteredPhotos.length - shownPhotos.length} 張）
        </Button>
      ) : null}

      <div
        className="sticky bottom-3 z-10 grid gap-2 rounded-lg border border-line bg-white/95 p-3 shadow-lg backdrop-blur sm:flex sm:items-center sm:justify-between"
        role="status"
        aria-live="polite"
      >
        <div className="text-sm">
          {message ? (
            <p className={message.kind === "success" ? "text-emerald-700" : "text-rose-700"}>
              {message.text}
            </p>
          ) : null}
          <p className="text-stone-700">
            {patches.length > 0 ? `${patches.length} 張照片有未儲存的修改` : "沒有未儲存的修改"}
            {invalidCount > 0 ? (
              <span className="text-rose-700">，其中 {invalidCount} 張需要修正</span>
            ) : null}
            {tooMany ? (
              <span className="text-rose-700">，一次最多 {PHOTO_TEXT_MAX_BATCH} 張</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            disabled={patches.length === 0 || pending}
            onClick={discardAll}
          >
            全部還原
          </Button>
          <Button
            disabled={patches.length === 0 || invalidCount > 0 || tooMany || pending}
            onClick={save}
          >
            {pending ? "儲存中..." : `儲存 ${patches.length} 張`}
          </Button>
        </div>
      </div>
    </div>
  );
}
