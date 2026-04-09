import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Panel } from "@/components/ui/panel";
import { siteConfig } from "@/config/site";
import { getAuthConfig } from "@/lib/auth/config";
import { getAdminSession } from "@/lib/auth/session";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect(siteConfig.adminPath);
  }

  const authConfig = getAuthConfig();
  const isUsingFallbackCredentials =
    authConfig.isUsingDefaultUsername || authConfig.isUsingDefaultPassword;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-10 sm:px-8 lg:px-12">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel className="flex flex-col justify-between bg-panel">
          <div>
            <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">
              Phase 1 / 管理員驗證
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-900">
              先保護好後台，
              <span className="block text-amber-800">再讓照片上傳功能進來</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-stone-700">
              這個頁面是給網站管理員使用的。未來你要上傳照片、整理相簿、刪除留言，都會先從這裡登入。
            </p>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-stone-700">
            <div className="rounded-2xl border border-line bg-white/75 px-4 py-3">
              帳號密碼會從 `.env` 讀取，不會直接寫死在畫面裡。
            </div>
            <div className="rounded-2xl border border-line bg-white/75 px-4 py-3">
              登入成功後，系統會發一張安全 cookie，讓網站知道你是管理員。
            </div>
            <div className="rounded-2xl border border-line bg-white/75 px-4 py-3">
              之後要換 UI 風格，可以改元件外觀，不需要改登入邏輯。
            </div>
          </div>
        </Panel>

        <Panel className="self-center">
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">管理員登入</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-900">進入後台</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            後台帳密會從 `.env` 讀取，登入成功後會建立 httpOnly session cookie。
          </p>

          {isUsingFallbackCredentials ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              目前仍在使用開發預設帳密 `admin / change-me`。正式上線前請先設定
              `ADMIN_USERNAME`、`ADMIN_PASSWORD` 與 `AUTH_SECRET`。
            </div>
          ) : null}

          <div className="mt-6">
            <LoginForm />
          </div>

          <div className="mt-6 text-sm text-stone-600">
            <Link className="underline-offset-4 hover:underline" href="/">
              回到首頁預覽
            </Link>
          </div>
        </Panel>
      </div>
    </main>
  );
}
