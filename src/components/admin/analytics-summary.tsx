import type { AdminAnalyticsReport } from "@/types/analytics";

const summaryCards = [
  { key: "today", label: "今日" },
  { key: "week", label: "本週" },
  { key: "month", label: "本月" },
  { key: "year", label: "今年" },
] as const;

type AnalyticsSummaryProps = {
  report: AdminAnalyticsReport;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-TW").format(value);
}

export function AnalyticsSummary({ report }: AnalyticsSummaryProps) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ key, label }) => {
          const summary = report[key];

          return (
            <article key={key} className="rounded-2xl border border-line bg-white/80 px-4 py-4">
              <p className="text-sm text-stone-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">
                {formatNumber(summary.views)}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {formatNumber(summary.visitors)} 位訪客
              </p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-white/80">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-lg font-semibold text-stone-900">每日瀏覽量</h3>
          <p className="mt-1 text-sm text-stone-500">
            最近 30 天的全站瀏覽量與不重複訪客數。
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">日期</th>
                <th className="px-4 py-3 font-medium">瀏覽量</th>
                <th className="px-4 py-3 font-medium">訪客</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.daily.map((day) => (
                <tr key={day.dateKey}>
                  <td className="px-4 py-3 font-medium text-stone-900">{day.dateKey}</td>
                  <td className="px-4 py-3 text-stone-700">{formatNumber(day.views)}</td>
                  <td className="px-4 py-3 text-stone-700">{formatNumber(day.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
