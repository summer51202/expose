import Link from "next/link";

import { logoutAction } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "總覽" },
  { href: "/admin/upload", label: "上傳照片" },
  { href: "/admin/photos", label: "管理照片" },
  { href: "/admin/albums", label: "管理相簿" },
  { href: "/admin/comments", label: "留言管理" },
  { href: "/admin/likes", label: "按讚統計" },
  { href: "/admin/analytics", label: "瀏覽量統計" },
];

type AdminShellProps = {
  children: React.ReactNode;
  username?: string;
};

export function AdminShell({ children, username }: AdminShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">管理後台</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">
            {username ? `你好，${username}` : "內容管理"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="text-sm text-stone-700 underline-offset-4 hover:underline">
            前往網站
          </Link>
          <form action={logoutAction}>
            <Button variant="secondary" type="submit">
              登出
            </Button>
          </form>
        </div>
      </header>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Admin navigation">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">{children}</div>
    </main>
  );
}
