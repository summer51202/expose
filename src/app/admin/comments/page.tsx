import { AdminShell } from "@/components/admin/admin-shell";
import { CommentModerationList } from "@/components/admin/comment-moderation-list";
import { Panel } from "@/components/ui/panel";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminComments } from "@/lib/comments/queries";

export default async function AdminCommentsPage() {
  const session = await requireAdminSession();
  const comments = await getAdminComments();

  return (
    <AdminShell username={session.username}>
      <Panel>
        <h2 className="text-2xl font-semibold text-stone-900">留言管理</h2>
        <p className="mt-3 leading-7 text-stone-700">
          檢查最新留言，刪除不適合公開的內容。
        </p>
        <div className="mt-6">
          <CommentModerationList comments={comments} />
        </div>
      </Panel>
    </AdminShell>
  );
}
