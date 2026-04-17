import "server-only";

import { getAnalyticsTimezone } from "@/lib/analytics/date";
import { getAnalyticsRepository } from "@/lib/analytics/repository";
import { trackAnalyticsPageView } from "@/lib/analytics/tracker";
import { getAdminSession } from "@/lib/auth/session";
import { getOrCreateVisitorId } from "@/lib/likes/identity";
import type { AnalyticsPageType } from "@/types/analytics";

type TrackPublicPageViewInput = {
  pageType: AnalyticsPageType;
  path: string;
};

export async function trackPublicPageView(input: TrackPublicPageViewInput) {
  await trackAnalyticsPageView(input, {
    now: new Date(),
    timezone: getAnalyticsTimezone(),
    repository: getAnalyticsRepository(),
    getVisitorId: getOrCreateVisitorId,
    getAdminSession,
  });
}
