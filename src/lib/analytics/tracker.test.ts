import assert from "node:assert/strict";
import test from "node:test";

import { trackAnalyticsPageView } from "./tracker";
import type { AnalyticsRepository } from "./repository";
import type { AnalyticsTrackInput } from "@/types/analytics";

function createRepository() {
  const calls: AnalyticsTrackInput[] = [];
  const repository: AnalyticsRepository = {
    async trackPageView(input) {
      calls.push(input);
    },
    async listMetricsByDateKeys() {
      return [];
    },
    async listVisitorsByDateKeys() {
      return [];
    },
  };

  return { calls, repository };
}

test("trackAnalyticsPageView writes a public page view", async () => {
  const { calls, repository } = createRepository();

  await trackAnalyticsPageView(
    {
      pageType: "home",
      path: "/",
    },
    {
      now: new Date("2026-04-17T03:00:00.000Z"),
      timezone: "Asia/Taipei",
      repository,
      getVisitorId: async () => "visitor-1",
      getAdminSession: async () => null,
    },
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    dateKey: "2026-04-17",
    visitorId: "visitor-1",
    pageType: "home",
    path: "/",
    now: new Date("2026-04-17T03:00:00.000Z"),
  });
});

test("trackAnalyticsPageView skips admin sessions", async () => {
  const { calls, repository } = createRepository();

  await trackAnalyticsPageView(
    {
      pageType: "photo",
      path: "/photos/uploaded/1",
    },
    {
      now: new Date("2026-04-17T03:00:00.000Z"),
      timezone: "Asia/Taipei",
      repository,
      getVisitorId: async () => "visitor-1",
      getAdminSession: async () => ({
        username: "admin",
        role: "admin",
        expiresAt: Date.now() + 1000,
      }),
    },
  );

  assert.equal(calls.length, 0);
});

test("trackAnalyticsPageView swallows analytics write failures", async () => {
  await assert.doesNotReject(
    trackAnalyticsPageView(
      {
        pageType: "album",
        path: "/albums/travel",
      },
      {
        now: new Date("2026-04-17T03:00:00.000Z"),
        timezone: "Asia/Taipei",
        repository: {
          async trackPageView() {
            throw new Error("database unavailable");
          },
          async listMetricsByDateKeys() {
            return [];
          },
          async listVisitorsByDateKeys() {
            return [];
          },
        },
        getVisitorId: async () => "visitor-1",
        getAdminSession: async () => null,
      },
    ),
  );
});
