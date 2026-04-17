import { AdminShell } from "@/components/admin/admin-shell";
import { AnalyticsSummary } from "@/components/admin/analytics-summary";
import { Panel } from "@/components/ui/panel";
import { getAnalyticsTimezone } from "@/lib/analytics/date";
import { getServerAdminAnalyticsReport } from "@/lib/analytics/server-queries";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminAnalyticsPage() {
  const session = await requireAdminSession();
  const [report, timezone] = await Promise.all([
    getServerAdminAnalyticsReport(),
    Promise.resolve(getAnalyticsTimezone()),
  ]);

  return (
    <AdminShell username={session.username}>
      <Panel>
        <div className="flex flex-col gap-3">
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">Analytics</p>
          <h2 className="text-2xl font-semibold text-stone-900">瀏覽量統計</h2>
          <p className="max-w-3xl leading-7 text-stone-700">
            查看公開頁面的全站瀏覽量與不重複訪客數。統計區間依 {timezone} 計算，後台登入狀態的瀏覽不會列入。
          </p>
        </div>

        <div className="mt-6">
          <AnalyticsSummary report={report} />
        </div>
      </Panel>
    </AdminShell>
  );
}
