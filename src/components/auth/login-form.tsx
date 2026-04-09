"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";

const initialState = {
  error: "",
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-700">管理員帳號</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          placeholder="輸入管理員帳號"
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-stone-400"
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-700">管理員密碼</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="輸入管理員密碼"
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-stone-400"
          required
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="mt-2 w-full" disabled={pending}>
        {pending ? "登入中..." : "登入管理後台"}
      </Button>
    </form>
  );
}
