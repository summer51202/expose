"use client";

import { useState } from "react";
import { useActionState } from "react";

import {
  uploadPhotosAction,
  type UploadFormState,
} from "@/app/admin/upload-actions-secure";
import { Button } from "@/components/ui/button";

const initialState: UploadFormState = {};

type UploadFormProps = {
  albums: Array<{
    id: number;
    name: string;
  }>;
};

export function UploadForm({ albums }: UploadFormProps) {
  const [state, formAction, pending] = useActionState(uploadPhotosAction, initialState);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-700">放進哪一本相簿？</span>
        <select
          name="albumId"
          defaultValue=""
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-stone-400"
        >
          <option value="">暫時不分類</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>
      </label>

      <label
        htmlFor="photos"
        className="grid min-h-52 cursor-pointer place-items-center rounded-[1.75rem] border border-dashed border-stone-400/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,242,232,0.7))] p-6 text-center transition hover:border-stone-600 hover:bg-white"
      >
        <div className="space-y-3">
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">拖拉或點擊選擇檔案</p>
          <p className="text-2xl font-semibold text-stone-900">把照片放進來</p>
          <p className="mx-auto max-w-md text-sm leading-7 text-stone-600">
            支援多張批次上傳。每張圖片會自動建立原圖、中圖 1200px、縮圖 400px。
          </p>
          <div className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm text-stone-700">
            選擇照片
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
          setSelectedFiles(files.map((file) => file.name));
        }}
      />

      <div className="rounded-2xl border border-line bg-white/80 px-4 py-3">
        {selectedFiles.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-sm font-medium text-stone-900">
              已選擇 {selectedFiles.length} 張照片
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedFiles.slice(0, 6).map((fileName) => (
                <span
                  key={fileName}
                  className="rounded-full border border-line bg-stone-50 px-3 py-1 text-xs text-stone-700"
                >
                  {fileName}
                </span>
              ))}
              {selectedFiles.length > 6 ? (
                <span className="rounded-full border border-line bg-stone-50 px-3 py-1 text-xs text-stone-700">
                  還有 {selectedFiles.length - 6} 張
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-600">目前尚未選擇任何照片。</p>
        )}
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

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "處理照片中..." : "開始上傳"}
        </Button>
        <p className="text-sm leading-6 text-stone-600">
          小提醒：正式接上 Cloudflare R2 後，這些圖片會改存到雲端，不會只放在本機專案資料夾。
        </p>
      </div>
    </form>
  );
}
