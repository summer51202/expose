import assert from "node:assert/strict";
import test from "node:test";

import { getAdminAnalyticsReport } from "./queries";
import type { AnalyticsRepository } from "./repository";
import type {
  AnalyticsDailyMetricRecord,
  AnalyticsDailyVisitorRecord,
} from "@/types/analytics";

const metricBase = {
  id: 1,
  createdAt: "2026-04-17T00:00:00.000Z",
  updatedAt: "2026-04-17T00:00:00.000Z",
} satisfies Pick<AnalyticsDailyMetricRecord, "id" | "createdAt" | "updatedAt">;

const visitorBase = {
  id: 1,
  createdAt: "2026-04-17T00:00:00.000Z",
} satisfies Pick<AnalyticsDailyVisitorRecord, "id" | "createdAt">;

test("getAdminAnalyticsReport sums views and counts distinct visitors", async () => {
  const metrics: AnalyticsDailyMetricRecord[] = [
    { ...metricBase, id: 1, dateKey: "2026-04-17", pageType: "home", path: "/", views: 2 },
    {
      ...metricBase,
      id: 2,
      dateKey: "2026-04-17",
      pageType: "album",
      path: "/albums/travel",
      views: 3,
    },
  ];
  const visitors: AnalyticsDailyVisitorRecord[] = [
    {
      ...visitorBase,
      id: 1,
      dateKey: "2026-04-17",
      visitorId: "same-visitor",
      pageType: "home",
      path: "/",
    },
    {
      ...visitorBase,
      id: 2,
      dateKey: "2026-04-17",
      visitorId: "same-visitor",
      pageType: "album",
      path: "/albums/travel",
    },
    {
      ...visitorBase,
      id: 3,
      dateKey: "2026-04-17",
      visitorId: "other-visitor",
      pageType: "album",
      path: "/albums/travel",
    },
  ];
  const repository: AnalyticsRepository = {
    async trackPageView() {},
    async listMetricsByDateKeys() {
      return metrics;
    },
    async listVisitorsByDateKeys() {
      return visitors;
    },
  };

  const report = await getAdminAnalyticsReport({
    now: new Date("2026-04-17T03:00:00.000Z"),
    timezone: "Asia/Taipei",
    repository,
    dailyLimit: 3,
  });

  assert.deepEqual(report.today, { views: 5, visitors: 2 });
  assert.deepEqual(report.daily[0], {
    dateKey: "2026-04-17",
    views: 5,
    visitors: 2,
  });
});

test("getAdminAnalyticsReport returns latest daily rows newest first", async () => {
  const repository: AnalyticsRepository = {
    async trackPageView() {},
    async listMetricsByDateKeys() {
      return [
        { ...metricBase, id: 1, dateKey: "2026-04-15", pageType: "home", path: "/", views: 1 },
        { ...metricBase, id: 2, dateKey: "2026-04-17", pageType: "home", path: "/", views: 3 },
      ];
    },
    async listVisitorsByDateKeys() {
      return [
        {
          ...visitorBase,
          id: 1,
          dateKey: "2026-04-17",
          visitorId: "visitor-1",
          pageType: "home",
          path: "/",
        },
      ];
    },
  };

  const report = await getAdminAnalyticsReport({
    now: new Date("2026-04-17T03:00:00.000Z"),
    timezone: "Asia/Taipei",
    repository,
    dailyLimit: 3,
  });

  assert.deepEqual(report.daily, [
    { dateKey: "2026-04-17", views: 3, visitors: 1 },
    { dateKey: "2026-04-16", views: 0, visitors: 0 },
    { dateKey: "2026-04-15", views: 1, visitors: 0 },
  ]);
});
