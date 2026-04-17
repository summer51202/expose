export type AnalyticsPageType = "home" | "album" | "photo" | "other";

export type AnalyticsDailyMetricRecord = {
  id: number;
  dateKey: string;
  pageType: AnalyticsPageType;
  path: string;
  views: number;
  createdAt: string;
  updatedAt: string;
};

export type AnalyticsDailyVisitorRecord = {
  id: number;
  dateKey: string;
  visitorId: string;
  pageType: AnalyticsPageType;
  path: string;
  createdAt: string;
};

export type AnalyticsTrackInput = {
  dateKey: string;
  visitorId: string;
  pageType: AnalyticsPageType;
  path: string;
  now: Date;
};

export type AnalyticsPeriodSummary = {
  views: number;
  visitors: number;
};

export type AnalyticsDailySummary = AnalyticsPeriodSummary & {
  dateKey: string;
};

export type AdminAnalyticsReport = {
  today: AnalyticsPeriodSummary;
  week: AnalyticsPeriodSummary;
  month: AnalyticsPeriodSummary;
  year: AnalyticsPeriodSummary;
  daily: AnalyticsDailySummary[];
};
