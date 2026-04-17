import "server-only";

import { getDataFilePath, readJsonArrayFile, writeJsonFile } from "@/lib/data/json-store";
import type {
  AnalyticsDailyMetricRecord,
  AnalyticsDailyVisitorRecord,
} from "@/types/analytics";

const metricsPath = getDataFilePath("analytics-daily-metrics.json");
const visitorsPath = getDataFilePath("analytics-daily-visitors.json");

export async function listManifestAnalyticsMetrics() {
  return readJsonArrayFile<AnalyticsDailyMetricRecord>(metricsPath);
}

export async function replaceManifestAnalyticsMetrics(
  records: AnalyticsDailyMetricRecord[],
) {
  await writeJsonFile(metricsPath, records);
}

export async function listManifestAnalyticsVisitors() {
  return readJsonArrayFile<AnalyticsDailyVisitorRecord>(visitorsPath);
}

export async function replaceManifestAnalyticsVisitors(
  records: AnalyticsDailyVisitorRecord[],
) {
  await writeJsonFile(visitorsPath, records);
}
