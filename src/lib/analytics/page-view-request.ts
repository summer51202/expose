import type { AnalyticsPageType } from "@/types/analytics";

const analyticsPageTypes = new Set<AnalyticsPageType>(["home", "album", "photo", "other"]);
const MAX_ANALYTICS_PATH_LENGTH = 1024;

type AnalyticsPageViewRequest = {
  pageType: AnalyticsPageType;
  path: string;
};

export function parseAnalyticsPageViewRequest(input: unknown): AnalyticsPageViewRequest | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const { pageType, path } = input as Record<string, unknown>;
  if (
    typeof pageType !== "string" ||
    !analyticsPageTypes.has(pageType as AnalyticsPageType) ||
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.length > MAX_ANALYTICS_PATH_LENGTH
  ) {
    return null;
  }

  return {
    pageType: pageType as AnalyticsPageType,
    path,
  };
}
