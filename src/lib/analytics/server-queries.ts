import "server-only";

import { getAnalyticsTimezone } from "@/lib/analytics/date";
import { getAdminAnalyticsReport } from "@/lib/analytics/queries";
import { getAnalyticsRepository } from "@/lib/analytics/repository";

export async function getServerAdminAnalyticsReport() {
  return getAdminAnalyticsReport({
    now: new Date(),
    timezone: getAnalyticsTimezone(),
    repository: getAnalyticsRepository(),
    dailyLimit: 30,
  });
}
