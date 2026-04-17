import Link from "next/link";

import { AlbumEditorForm } from "@/components/admin/album-editor-form";
import { AlbumForm } from "@/components/admin/album-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { Panel } from "@/components/ui/panel";
import { getAlbums } from "@/lib/albums/queries";
import { getPhotoRepository } from "@/lib/photos/repository";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminAlbumsPage() {
  const session = await requireAdminSession();
  const [albums, allPhotos] = await Promise.all([
    getAlbums(),
    getPhotoRepository().listUploadedPhotos(),
  ]);

  return (
    <AdminShell username={session.username}>
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <h2 className="text-2xl font-semibold text-stone-900">建立相簿</h2>
          <p className="mt-3 leading-7 text-stone-700">
            建立新的主題相簿，之後可在上傳或照片管理頁把照片放進來。
          </p>
          <div className="mt-6">
            <AlbumForm />
          </div>
        </Panel>

        <Panel>
          <h2 className="text-2xl font-semibold text-stone-900">目前相簿</h2>
          <div className="mt-4 grid gap-3 text-stone-700">
            {albums.length > 0 ? (
              albums.map((album) => (
                <div
                  key={album.id}
                  className="rounded-lg border border-line bg-white/80 px-4 py-4"
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
                  <AlbumEditorForm
                    album={album}
                    photos={allPhotos
                      .filter((p) => p.albumId === album.id)
                      .map((p) => ({ id: p.id, title: p.title, thumbnailUrl: p.thumbnailUrl }))}
                  />
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-line bg-white/80 px-4 py-3 text-sm">
                目前還沒有相簿。
              </p>
            )}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
