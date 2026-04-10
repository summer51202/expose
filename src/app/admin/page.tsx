import Link from "next/link";

import { logoutAction } from "@/app/admin/login/actions";
import { AlbumEditorForm } from "@/components/admin/album-editor-form";
import { AlbumForm } from "@/components/admin/album-form";
import { CommentModerationList } from "@/components/admin/comment-moderation-list";
import { LikeSummaryList } from "@/components/admin/like-summary-list";
import { PhotoAlbumManager } from "@/components/admin/photo-album-manager";
import { UploadForm } from "@/components/admin/upload-form";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { siteConfig } from "@/config/site";
import { getAlbums, getAlbumOptions } from "@/lib/albums/queries";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminComments } from "@/lib/comments/queries";
import { getAdminLikeSummaries } from "@/lib/likes/queries";
import { getRecentUploads } from "@/lib/photos/queries";

export default async function AdminPage() {
  const session = await requireAdminSession();
  const [recentUploads, albums, albumOptions, adminComments, likeSummary] = await Promise.all([
    getRecentUploads(12),
    getAlbums(),
    getAlbumOptions(),
    getAdminComments(),
    getAdminLikeSummaries(),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">管理後台</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">你好，{session.username}</h1>
        </div>
        <form action={logoutAction}>
          <Button variant="secondary" type="submit">
            登出
          </Button>
        </form>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">照片上傳</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-900">上傳照片並指定目的相簿</h2>
          <p className="mt-3 leading-7 text-stone-700">
            先選擇正確相簿，再上傳照片。系統會自動產生適合前台使用的多尺寸版本。
          </p>
          <div className="mt-6">
            <UploadForm albums={albumOptions} />
          </div>
        </Panel>

        <Panel>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">相簿設定</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-900">建立與整理相簿</h2>
          <p className="mt-3 leading-7 text-stone-700">
            建立主題相簿，並直接修改既有相簿名稱與描述，保持前台分類清楚一致。
          </p>
          <div className="mt-6">
            <AlbumForm />
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">照片搬移</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-900">修正照片所在相簿</h2>
          <p className="mt-3 leading-7 text-stone-700">
            若照片上傳到錯誤相簿，可以直接在這裡改到正確位置，不需要重新上傳。
          </p>
          <div className="mt-6">
            <PhotoAlbumManager photos={recentUploads} albums={albumOptions} />
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold text-stone-900">目前相簿</h2>
          <div className="mt-4 grid gap-3 text-stone-700">
            {albums.length > 0 ? (
              albums.map((album) => (
                <div
                  key={album.id}
                  className="rounded-2xl border border-line bg-white/80 px-4 py-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-900">{album.name}</p>
                      <p className="mt-1 text-sm text-stone-600">{album.photoCount} 張照片</p>
                    </div>
                    <Link
                      href={`/albums/${encodeURIComponent(album.slug)}`}
                      className="text-sm text-stone-700 underline-offset-4 hover:underline"
                    >
                      查看相簿
                    </Link>
                  </div>
                  <AlbumEditorForm album={album} />
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm">
                目前還沒有相簿。你可以先建立幾本主題相簿，再上傳照片進去。
              </p>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel>
          <h2 className="text-xl font-semibold text-stone-900">目前入口</h2>
          <div className="mt-3 grid gap-2 text-stone-700">
            <Link className="underline-offset-4 hover:underline" href="/">
              前往首頁
            </Link>
            <Link className="underline-offset-4 hover:underline" href={siteConfig.loginPath}>
              回登入頁
            </Link>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">留言管理</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-900">管理訪客留言</h2>
          <p className="mt-3 leading-7 text-stone-700">
            這裡會列出最新留言。看到不適合公開的內容時，可以直接刪除。
          </p>
          <div className="mt-6">
            <CommentModerationList comments={adminComments} />
          </div>
        </Panel>

        <Panel>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">按讚管理</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-900">查看按讚統計</h2>
          <p className="mt-3 leading-7 text-stone-700">
            這裡會顯示目前哪些照片最受歡迎。若你想重置某張照片的按讚，也可以直接在下方清空。
          </p>
          <div className="mt-6">
            <LikeSummaryList summary={likeSummary} />
          </div>
        </Panel>
      </div>
    </main>
  );
}
