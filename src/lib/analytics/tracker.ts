import { getAnalyticsDateKey } from "@/lib/analytics/date";
import type { AnalyticsRepository } from "@/lib/analytics/repository";
import type { AdminSession } from "@/lib/auth/session";
import type { AnalyticsPageType } from "@/types/analytics";

type TrackAnalyticsPageViewInput = {
  pageType: AnalyticsPageType;
  path: string;
};

type TrackAnalyticsDeps = {
  now: Date;
  timezone: string;
  repository: AnalyticsRepository;
  getVisitorId: () => Promise<string>;
  getAdminSession: () => Promise<AdminSession | null>;
};

export async function trackAnalyticsPageView(
  input: TrackAnalyticsPageViewInput,
  deps: TrackAnalyticsDeps,
) {
  try {
    const adminSession = await deps.getAdminSession();
    if (adminSession) {
      return;
    }

    const visitorId = await deps.getVisitorId();
    await deps.repository.trackPageView({
      dateKey: getAnalyticsDateKey(deps.now, deps.timezone),
      visitorId,
      pageType: input.pageType,
      path: input.path,
      now: deps.now,
    });
  } catch {
    return;
  }
}
