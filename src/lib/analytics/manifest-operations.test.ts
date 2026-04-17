import assert from "node:assert/strict";
import test from "node:test";

import { applyAnalyticsPageViewToManifestRecords } from "./manifest-operations";
import type {
  AnalyticsDailyMetricRecord,
  AnalyticsDailyVisitorRecord,
} from "@/types/analytics";

test("applyAnalyticsPageViewToManifestRecords creates metric and visitor records", () => {
  const result = applyAnalyticsPageViewToManifestRecords({
    metrics: [],
    visitors: [],
    input: {
      dateKey: "2026-04-17",
      visitorId: "visitor-1",
      pageType: "home",
      path: "/",
      now: new Date("2026-04-17T03:00:00.000Z"),
    },
  });

  assert.equal(result.metrics.length, 1);
  assert.equal(result.visitors.length, 1);
  assert.equal(result.metrics[0].views, 1);
  assert.equal(result.visitors[0].visitorId, "visitor-1");
});

test("applyAnalyticsPageViewToManifestRecords increments views for repeat page views", () => {
  const metrics: AnalyticsDailyMetricRecord[] = [
    {
      id: 1,
      dateKey: "2026-04-17",
      pageType: "home",
      path: "/",
      views: 1,
      createdAt: "2026-04-17T01:00:00.000Z",
      updatedAt: "2026-04-17T01:00:00.000Z",
    },
  ];
  const visitors: AnalyticsDailyVisitorRecord[] = [
    {
      id: 1,
      dateKey: "2026-04-17",
      visitorId: "visitor-1",
      pageType: "home",
      path: "/",
      createdAt: "2026-04-17T01:00:00.000Z",
    },
  ];

  const result = applyAnalyticsPageViewToManifestRecords({
    metrics,
    visitors,
    input: {
      dateKey: "2026-04-17",
      visitorId: "visitor-1",
      pageType: "home",
      path: "/",
      now: new Date("2026-04-17T03:00:00.000Z"),
    },
  });

  assert.equal(result.metrics[0].views, 2);
  assert.equal(result.visitors.length, 1);
  assert.equal(result.metrics[0].updatedAt, "2026-04-17T03:00:00.000Z");
});
