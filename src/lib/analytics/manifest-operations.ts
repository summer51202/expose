import type {
  AnalyticsDailyMetricRecord,
  AnalyticsDailyVisitorRecord,
  AnalyticsTrackInput,
} from "@/types/analytics";

type ApplyAnalyticsPageViewInput = {
  metrics: AnalyticsDailyMetricRecord[];
  visitors: AnalyticsDailyVisitorRecord[];
  input: AnalyticsTrackInput;
};

function nextManifestId(records: Array<{ id: number }>) {
  return records.reduce((max, record) => Math.max(max, record.id), 0) + 1;
}

function isSameMetric(
  record: AnalyticsDailyMetricRecord,
  input: Pick<AnalyticsTrackInput, "dateKey" | "pageType" | "path">,
) {
  return (
    record.dateKey === input.dateKey &&
    record.pageType === input.pageType &&
    record.path === input.path
  );
}

function isSameVisitor(record: AnalyticsDailyVisitorRecord, input: AnalyticsTrackInput) {
  return (
    record.dateKey === input.dateKey &&
    record.visitorId === input.visitorId &&
    record.pageType === input.pageType &&
    record.path === input.path
  );
}

export function applyAnalyticsPageViewToManifestRecords({
  metrics,
  visitors,
  input,
}: ApplyAnalyticsPageViewInput) {
  const nextMetrics = metrics.map((metric) => ({ ...metric }));
  const nextVisitors = visitors.map((visitor) => ({ ...visitor }));
  const existingMetric = nextMetrics.find((metric) => isSameMetric(metric, input));
  const nowIso = input.now.toISOString();

  if (existingMetric) {
    existingMetric.views += 1;
    existingMetric.updatedAt = nowIso;
  } else {
    nextMetrics.push({
      id: nextManifestId(nextMetrics),
      dateKey: input.dateKey,
      pageType: input.pageType,
      path: input.path,
      views: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  if (!nextVisitors.some((visitor) => isSameVisitor(visitor, input))) {
    nextVisitors.push({
      id: nextManifestId(nextVisitors),
      dateKey: input.dateKey,
      visitorId: input.visitorId,
      pageType: input.pageType,
      path: input.path,
      createdAt: nowIso,
    });
  }

  return {
    metrics: nextMetrics,
    visitors: nextVisitors,
  };
}
