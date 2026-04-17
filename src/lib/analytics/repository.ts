import "server-only";

import { applyAnalyticsPageViewToManifestRecords } from "@/lib/analytics/manifest-operations";
import {
  listManifestAnalyticsMetrics,
  listManifestAnalyticsVisitors,
  replaceManifestAnalyticsMetrics,
  replaceManifestAnalyticsVisitors,
} from "@/lib/analytics/manifest-repository";
import { getDataBackend } from "@/lib/data/backend";
import { prisma } from "@/lib/prisma";
import type {
  AnalyticsDailyMetricRecord,
  AnalyticsDailyVisitorRecord,
  AnalyticsPageType,
  AnalyticsTrackInput,
} from "@/types/analytics";

export interface AnalyticsRepository {
  trackPageView(input: AnalyticsTrackInput): Promise<void>;
  listMetricsByDateKeys(dateKeys: string[]): Promise<AnalyticsDailyMetricRecord[]>;
  listVisitorsByDateKeys(dateKeys: string[]): Promise<AnalyticsDailyVisitorRecord[]>;
}

const jsonAnalyticsRepository: AnalyticsRepository = {
  async trackPageView(input) {
    const [metrics, visitors] = await Promise.all([
      listManifestAnalyticsMetrics(),
      listManifestAnalyticsVisitors(),
    ]);
    const nextRecords = applyAnalyticsPageViewToManifestRecords({
      metrics,
      visitors,
      input,
    });

    await Promise.all([
      replaceManifestAnalyticsMetrics(nextRecords.metrics),
      replaceManifestAnalyticsVisitors(nextRecords.visitors),
    ]);
  },
  async listMetricsByDateKeys(dateKeys) {
    const dateKeySet = new Set(dateKeys);
    const metrics = await listManifestAnalyticsMetrics();
    return metrics.filter((metric) => dateKeySet.has(metric.dateKey));
  },
  async listVisitorsByDateKeys(dateKeys) {
    const dateKeySet = new Set(dateKeys);
    const visitors = await listManifestAnalyticsVisitors();
    return visitors.filter((visitor) => dateKeySet.has(visitor.dateKey));
  },
};

const prismaAnalyticsRepository: AnalyticsRepository = {
  async trackPageView(input) {
    await prisma.$transaction(async (tx) => {
      await tx.analyticsDailyMetric.upsert({
        where: {
          dateKey_pageType_path: {
            dateKey: input.dateKey,
            pageType: input.pageType,
            path: input.path,
          },
        },
        create: {
          dateKey: input.dateKey,
          pageType: input.pageType,
          path: input.path,
          views: 1,
          createdAt: input.now,
          updatedAt: input.now,
        },
        update: {
          views: {
            increment: 1,
          },
          updatedAt: input.now,
        },
      });

      await tx.analyticsDailyVisitor.upsert({
        where: {
          dateKey_visitorId_pageType_path: {
            dateKey: input.dateKey,
            visitorId: input.visitorId,
            pageType: input.pageType,
            path: input.path,
          },
        },
        create: {
          dateKey: input.dateKey,
          visitorId: input.visitorId,
          pageType: input.pageType,
          path: input.path,
          createdAt: input.now,
        },
        update: {},
      });
    });
  },
  async listMetricsByDateKeys(dateKeys) {
    const metrics = await prisma.analyticsDailyMetric.findMany({
      where: {
        dateKey: {
          in: dateKeys,
        },
      },
      orderBy: {
        dateKey: "desc",
      },
    });

    return metrics.map((metric) => ({
      id: metric.id,
      dateKey: metric.dateKey,
      pageType: metric.pageType as AnalyticsPageType,
      path: metric.path,
      views: metric.views,
      createdAt: metric.createdAt.toISOString(),
      updatedAt: metric.updatedAt.toISOString(),
    }));
  },
  async listVisitorsByDateKeys(dateKeys) {
    const visitors = await prisma.analyticsDailyVisitor.findMany({
      where: {
        dateKey: {
          in: dateKeys,
        },
      },
      orderBy: {
        dateKey: "desc",
      },
    });

    return visitors.map((visitor) => ({
      id: visitor.id,
      dateKey: visitor.dateKey,
      visitorId: visitor.visitorId,
      pageType: visitor.pageType as AnalyticsPageType,
      path: visitor.path,
      createdAt: visitor.createdAt.toISOString(),
    }));
  },
};

export function getAnalyticsRepository(): AnalyticsRepository {
  return getDataBackend() === "prisma"
    ? prismaAnalyticsRepository
    : jsonAnalyticsRepository;
}
