import { AdminShell } from "@/components/admin/admin-shell";
import { LikeSummaryList } from "@/components/admin/like-summary-list";
import { Panel } from "@/components/ui/panel";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminLikeSummaries } from "@/lib/likes/queries";

export default async function AdminLikesPage() {
  const session = await requireAdminSession();
  const likeSummary = await getAdminLikeSummaries();

  return (
    <AdminShell username={session.username}>
      <Panel>
        <h2 className="text-2xl font-semibold text-stone-900">按讚統計</h2>
        <p className="mt-3 leading-7 text-stone-700">
          查看目前被按讚的照片，必要時重置單張照片的按讚資料。
        </p>
        <div className="mt-6">
          <LikeSummaryList summary={likeSummary} />
        </div>
      </Panel>
    </AdminShell>
  );
}
