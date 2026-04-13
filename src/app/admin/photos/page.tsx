import { AdminShell } from "@/components/admin/admin-shell";
import { PhotoManager } from "@/components/admin/photo-manager";
import { Panel } from "@/components/ui/panel";
import { getAlbums } from "@/lib/albums/queries";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminUploadedPhotos } from "@/lib/photos/queries";

export default async function AdminPhotosPage() {
  const session = await requireAdminSession();
  const [photos, albums] = await Promise.all([
    getAdminUploadedPhotos(),
    getAlbums(),
  ]);

  return (
    <AdminShell username={session.username}>
      <Panel>
        <div className="mb-6 max-w-3xl">
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">Photo Manager</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950">管理照片</h1>
          <p className="mt-3 leading-7 text-stone-700">
            所有上傳照片都可以在這裡篩選、單張移動或批次移動到其他相簿。
          </p>
        </div>

        <PhotoManager photos={photos} albums={albums} />
      </Panel>
    </AdminShell>
  );
}
