import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { Panel } from "@/components/ui/panel";
import { getAlbums } from "@/lib/albums/queries";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminComments } from "@/lib/comments/queries";
import { getAdminLikeSummaries } from "@/lib/likes/queries";
import { getPhotoRepository } from "@/lib/photos/repository";

const workflowCards = [
  {
    href: "/admin/upload",
    title: "上傳照片",
    description: "新增照片到指定相簿。",
  },
  {
    href: "/admin/photos",
    title: "管理照片",
    description: "查看全部照片並修正相簿歸類。",
  },
  {
    href: "/admin/albums",
    title: "管理相簿",
    description: "建立相簿，編輯名稱與描述。",
  },
  {
    href: "/admin/comments",
    title: "留言管理",
    description: "檢查並刪除不適合公開的留言。",
  },
  {
    href: "/admin/likes",
    title: "按讚統計",
    description: "查看熱門照片與重置按讚資料。",
  },
];

export default async function AdminPage() {
  const session = await requireAdminSession();
  const [photos, albums, comments, likeSummary] = await Promise.all([
    getPhotoRepository().listUploadedPhotos(),
    getAlbums(),
    getAdminComments(),
    getAdminLikeSummaries(),
  ]);
  const recentUploads = photos.slice(0, 5);

  return (
    <AdminShell username={session.username}>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel>
          <p className="text-sm text-stone-500">照片</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">{photos.length}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-stone-500">相簿</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">{albums.length}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-stone-500">留言</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">{comments.length}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-stone-500">被按讚照片</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {likeSummary.totalPhotosWithLikes}
          </p>
        </Panel>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold text-stone-900">主要工作</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflowCards.map((card) => (
            <Link key={card.href} href={card.href} className="block">
              <Panel className="h-full transition hover:border-stone-400">
                <h3 className="text-xl font-semibold text-stone-900">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">{card.description}</p>
              </Panel>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <Panel>
          <h2 className="text-xl font-semibold text-stone-900">最近上傳</h2>
          <div className="mt-4 grid gap-3">
            {recentUploads.length > 0 ? (
              recentUploads.map((photo) => (
                <Link
                  key={photo.id}
                  href={`/photos/${photo.source}/${photo.id}`}
                  className="rounded-lg border border-line bg-white/80 px-4 py-3 text-sm text-stone-700 transition hover:border-stone-400"
                >
                  <span className="font-medium text-stone-900">{photo.title}</span>
                  <span className="ml-2 text-stone-500">
                    {photo.albumName ?? "未分類"} · {photo.width} x {photo.height}
                  </span>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-line bg-white/80 px-4 py-3 text-sm text-stone-600">
                目前還沒有上傳的照片。
              </p>
            )}
          </div>
        </Panel>
      </section>
    </AdminShell>
  );
}
