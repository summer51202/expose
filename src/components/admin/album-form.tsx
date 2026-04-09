"use client";

import { useActionState } from "react";

import { createAlbumAction, type AlbumFormState } from "@/app/admin/album-actions";
import { Button } from "@/components/ui/button";

const initialState: AlbumFormState = {};

export function AlbumForm() {
  const [state, formAction, pending] = useActionState(createAlbumAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-700">相簿名稱</span>
        <input
          name="name"
          type="text"
          placeholder="例如：東京街拍、海邊日落、黑白人像"
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-stone-400"
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-700">相簿描述</span>
        <textarea
          name="description"
          rows={3}
          placeholder="簡單描述這本相簿在拍什麼、想呈現什麼氣氛。"
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-stone-400"
        />
      </label>

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

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "建立中..." : "建立新相簿"}
      </Button>
    </form>
  );
}
