import { AdminShell } from "@/components/admin/admin-shell";
import { UploadForm } from "@/components/admin/upload-form";
import { Panel } from "@/components/ui/panel";
import { getAlbumOptions } from "@/lib/albums/queries";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminUploadPage() {
  const session = await requireAdminSession();
  const albumOptions = await getAlbumOptions();

  return (
    <AdminShell username={session.username}>
      <Panel>
        <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">上傳照片</p>
        <h2 className="mt-3 text-2xl font-semibold text-stone-900">新增照片到相簿</h2>
        <p className="mt-3 leading-7 text-stone-700">
          先選相簿，再選照片。上傳完成後，已選照片清單會自動清空。
        </p>
        <div className="mt-6">
          <UploadForm albums={albumOptions} />
        </div>
      </Panel>
    </AdminShell>
  );
}
