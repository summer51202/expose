import {
  getAnalyticsPeriodRanges,
  getLatestAnalyticsDateKeys,
} from "@/lib/analytics/date";
import type { AnalyticsRepository } from "@/lib/analytics/repository";
import type {
  AdminAnalyticsReport,
  AnalyticsDailyMetricRecord,
  AnalyticsDailyVisitorRecord,
} from "@/types/analytics";

type AdminAnalyticsReportDeps = {
  now: Date;
  timezone: string;
  repository: AnalyticsRepository;
  dailyLimit: number;
};

function uniqueDateKeys(dateKeys: string[]) {
  return [...new Set(dateKeys)];
}

function summarize(
  dateKeys: string[],
  metrics: AnalyticsDailyMetricRecord[],
  visitors: AnalyticsDailyVisitorRecord[],
) {
  const dateKeySet = new Set(dateKeys);
  const views = metrics
    .filter((metric) => dateKeySet.has(metric.dateKey))
    .reduce((total, metric) => total + metric.views, 0);
  const visitorIds = new Set(
    visitors
      .filter((visitor) => dateKeySet.has(visitor.dateKey))
      .map((visitor) => visitor.visitorId),
  );

  return {
    views,
    visitors: visitorIds.size,
  };
}

export async function getAdminAnalyticsReport(
  deps: AdminAnalyticsReportDeps,
): Promise<AdminAnalyticsReport> {
  const ranges = getAnalyticsPeriodRanges(deps.now, deps.timezone);
  const dailyDateKeys = getLatestAnalyticsDateKeys(
    deps.now,
    deps.timezone,
    deps.dailyLimit,
  );
  const allDateKeys = uniqueDateKeys([
    ...ranges.year,
    ...dailyDateKeys,
  ]);
  const [metrics, visitors] = await Promise.all([
    deps.repository.listMetricsByDateKeys(allDateKeys),
    deps.repository.listVisitorsByDateKeys(allDateKeys),
  ]);

  return {
    today: summarize(ranges.today, metrics, visitors),
    week: summarize(ranges.week, metrics, visitors),
    month: summarize(ranges.month, metrics, visitors),
    year: summarize(ranges.year, metrics, visitors),
    daily: dailyDateKeys.map((dateKey) => ({
      dateKey,
      ...summarize([dateKey], metrics, visitors),
    })),
  };
}
