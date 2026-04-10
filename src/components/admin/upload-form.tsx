"use client";

import { useActionState, useState } from "react";

import { uploadPhotosAction, type UploadFormState } from "@/app/admin/upload-actions";
import { Button } from "@/components/ui/button";
import {
  UPLOAD_MAX_FILE_SIZE,
  UPLOAD_MAX_FILES,
  UPLOAD_MAX_TOTAL_BYTES,
  formatUploadBytes,
  getUploadBatchError,
} from "@/lib/uploads/upload-batch";
import {
  canSubmitUploadSelection,
  getUploadSelectionError,
} from "@/lib/uploads/upload-selection";

const initialState: UploadFormState = {};

type UploadFormProps = {
  albums: Array<{
    id: number;
    name: string;
  }>;
};

type SelectedFile = {
  name: string;
  size: number;
  type: string;
};

function getUploadBatchMessage(error: string): string {
  switch (error) {
    case "File type is not supported.":
      return "有檔案格式不支援，目前只接受 JPG、PNG、WebP、AVIF。";
    case "A file is larger than the per-file upload limit.":
      return `單張照片不可超過 ${formatUploadBytes(UPLOAD_MAX_FILE_SIZE)}。`;
    case "Too many files were selected for one upload batch.":
      return `單次最多可上傳 ${UPLOAD_MAX_FILES} 張照片。`;
    case "The selected batch is larger than the total upload size limit.":
      return `本次上傳總大小不可超過 ${formatUploadBytes(UPLOAD_MAX_TOTAL_BYTES)}。`;
    default:
      return error;
  }
}

export function UploadForm({ albums }: UploadFormProps) {
  const [state, formAction, pending] = useActionState(uploadPhotosAction, initialState);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");

  const selectionError = getUploadSelectionError({
    albumId: selectedAlbumId,
    fileCount: selectedFiles.length,
  });
  const batchError = getUploadBatchError(selectedFiles);
  const canSubmit = canSubmitUploadSelection({
    albumId: selectedAlbumId,
    fileCount: selectedFiles.length,
  }) && !batchError;
  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-700">上傳到相簿</span>
        <select
          name="albumId"
          value={selectedAlbumId}
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-stone-400"
          onChange={(event) => {
            setSelectedAlbumId(event.currentTarget.value);
          }}
        >
          <option value="">請先選擇上傳相簿</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>
      </label>

      {selectionError === "Please choose an album before uploading photos." ? (
        <p className="text-sm text-amber-700">請先選擇要上傳到哪一本相簿。</p>
      ) : null}

      <label
        htmlFor="photos"
        className="grid min-h-52 cursor-pointer place-items-center rounded-[1.75rem] border border-dashed border-stone-400/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,242,232,0.7))] p-6 text-center transition hover:border-stone-600 hover:bg-white"
      >
        <div className="space-y-3">
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">Upload Photos</p>
          <p className="text-2xl font-semibold text-stone-900">選擇要上傳的照片</p>
          <p className="mx-auto max-w-md text-sm leading-7 text-stone-600">
            系統會自動產生原圖、中圖 1200px 與縮圖 400px，方便前台載入與瀏覽。
          </p>
          <div className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm text-stone-700">
            挑選圖片
          </div>
        </div>
      </label>

      <input
        id="photos"
        name="photos"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          setSelectedFiles(
            files.map((file) => ({
              name: file.name,
              size: file.size,
              type: file.type,
            })),
          );
        }}
      />

      <div className="rounded-2xl border border-line bg-white/80 px-4 py-3">
        <div className="flex flex-wrap gap-4 text-sm text-stone-600">
          <span>已選擇 {selectedFiles.length} 張</span>
          <span>總大小 {formatUploadBytes(totalBytes)}</span>
          <span>單次上限 {UPLOAD_MAX_FILES} 張</span>
          <span>總量上限 {formatUploadBytes(UPLOAD_MAX_TOTAL_BYTES)}</span>
          <span>單張上限 {formatUploadBytes(UPLOAD_MAX_FILE_SIZE)}</span>
        </div>

        {selectedFiles.length > 0 ? (
          <div className="mt-3 grid gap-2">
            <div className="flex flex-wrap gap-2">
              {selectedFiles.slice(0, 6).map((file) => (
                <span
                  key={file.name}
                  className="rounded-full border border-line bg-stone-50 px-3 py-1 text-xs text-stone-700"
                >
                  {file.name}
                </span>
              ))}
              {selectedFiles.length > 6 ? (
                <span className="rounded-full border border-line bg-stone-50 px-3 py-1 text-xs text-stone-700">
                  另有 {selectedFiles.length - 6} 張
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-600">目前尚未選擇任何照片。</p>
        )}
      </div>

      {batchError ? <p className="text-sm text-amber-700">{getUploadBatchMessage(batchError)}</p> : null}

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

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? "上傳中..." : "開始上傳"}
        </Button>
        <p className="text-sm leading-6 text-stone-600">
          若本次超過 12 張、總大小超過 40MB，或有單張超過 20MB，請分批上傳。
        </p>
      </div>
    </form>
  );
}
