# Admin Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/admin/analytics` so the site owner can see whole-site daily page views and unique visitors, plus today/week/month/year totals.

**Architecture:** Track public page renders through a server-side analytics service that writes daily aggregate metrics and daily visitor buckets. Keep tracking resilient: admin sessions are skipped, analytics write failures never break public pages, and reporting counts distinct visitors across all paths so one person who opens many pages is counted once per whole-site period.

**Tech Stack:** Next.js 16 App Router, React 19 server components, Prisma 6 SQLite backend, existing JSON backend pattern, `node:test` with `tsx`, Tailwind utility classes already used by admin UI.

---

## Implementation Notes

Before touching code, read the local Next.js docs because this repository explicitly requires it:

- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-15.md`
- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`

Pay special attention to async `params`, async `searchParams`, async `cookies()`, and async `headers()` usage. Existing code already follows those patterns.

Use TDD. Do not write production code for a new unit before the failing test exists and has failed for the expected reason.

## File Structure

Create or modify these files:

- Create: `src/types/analytics.ts`  
  Shared analytics record and report types.

- Create: `src/lib/analytics/date.ts`  
  Timezone-aware date key and reporting range helpers.

- Create: `src/lib/analytics/date.test.ts`  
  Unit tests for date keys and report ranges.

- Create: `src/lib/analytics/manifest-repository.ts`  
  JSON file persistence for local-development analytics backend.

- Create: `src/lib/analytics/manifest-operations.ts`  
  Pure JSON-record update helper used by the JSON repository.

- Create: `src/lib/analytics/manifest-operations.test.ts`  
  Unit tests for JSON aggregate update behavior.

- Create: `src/lib/analytics/repository.ts`  
  Repository interface plus JSON and Prisma implementations.

- Create: `src/lib/analytics/tracker.ts`  
  Pure tracking service with dependency injection for tests.

- Create: `src/lib/analytics/server-tracker.ts`  
  Server-only public `trackPublicPageView()` wrapper for app pages.

- Create: `src/lib/analytics/tracker.test.ts`  
  Unit tests for view incrementing, unique visitor bucketing, admin bypass, and swallowed write failures.

- Create: `src/lib/analytics/queries.ts`  
  Pure reporting query with dependency injection for tests.

- Create: `src/lib/analytics/server-queries.ts`  
  Server-only public `getAdminAnalyticsReport()` wrapper for admin pages.

- Create: `src/lib/analytics/queries.test.ts`  
  Unit tests for whole-site aggregation and distinct visitor counting.

- Modify: `prisma/schema.prisma`  
  Add `AnalyticsDailyMetric` and `AnalyticsDailyVisitor`.

- Create: `prisma/migrations/<timestamp>_admin_analytics/migration.sql`  
  Add analytics tables and indexes.

- Modify: `src/app/(browse)/page.tsx`  
  Track home page views.

- Modify: `src/app/(browse)/albums/[slug]/page.tsx`  
  Track album page views after album existence is confirmed.

- Modify: `src/app/photos/[source]/[id]/page.tsx`  
  Track photo detail views after photo existence is confirmed.

- Create: `src/components/admin/analytics-summary.tsx`  
  Renders summary cards and the latest 30 daily rows.

- Create: `src/app/admin/analytics/page.tsx`  
  Protected analytics admin page.

- Modify: `src/components/admin/admin-shell.tsx`  
  Add the analytics navigation item.

- Modify: `docs/issue-tracker/user-feedback-backlog.md`  
  Add a note under Feedback 8 that first-release design and plan exist.

---

## Task 1: Analytics Types And Timezone Helpers

**Files:**
- Create: `src/types/analytics.ts`
- Create: `src/lib/analytics/date.ts`
- Test: `src/lib/analytics/date.test.ts`

- [ ] **Step 1: Write the failing date helper tests**

Create `src/lib/analytics/date.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  getAnalyticsDateKey,
  getAnalyticsPeriodRanges,
  getLatestAnalyticsDateKeys,
} from "./date";

test("getAnalyticsDateKey formats the date in the configured timezone", () => {
  assert.equal(
    getAnalyticsDateKey(new Date("2026-04-16T16:30:00.000Z"), "Asia/Taipei"),
    "2026-04-17",
  );
});

test("getAnalyticsPeriodRanges returns today, week, month, and year keys", () => {
  const ranges = getAnalyticsPeriodRanges(
    new Date("2026-04-17T03:00:00.000Z"),
    "Asia/Taipei",
  );

  assert.deepEqual(ranges.today, ["2026-04-17"]);
  assert.deepEqual(ranges.week, [
    "2026-04-13",
    "2026-04-14",
    "2026-04-15",
    "2026-04-16",
    "2026-04-17",
  ]);
  assert.equal(ranges.month[0], "2026-04-01");
  assert.equal(ranges.month.at(-1), "2026-04-17");
  assert.equal(ranges.year[0], "2026-01-01");
  assert.equal(ranges.year.at(-1), "2026-04-17");
});

test("getLatestAnalyticsDateKeys returns newest dates first", () => {
  assert.deepEqual(
    getLatestAnalyticsDateKeys(new Date("2026-04-17T03:00:00.000Z"), "Asia/Taipei", 3),
    ["2026-04-17", "2026-04-16", "2026-04-15"],
  );
});
```

- [ ] **Step 2: Run the date tests and verify RED**

Run:

```bash
node --import tsx --test src/lib/analytics/date.test.ts
```

Expected: FAIL because `src/lib/analytics/date.ts` does not exist.

- [ ] **Step 3: Add shared analytics types**

Create `src/types/analytics.ts`:

```ts
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
```

- [ ] **Step 4: Add timezone helper implementation**

Create `src/lib/analytics/date.ts`:

```ts
const DEFAULT_ANALYTICS_TIMEZONE = "Asia/Taipei";
const ISO_DATE_LENGTH = 10;

export function getAnalyticsTimezone() {
  return process.env.ANALYTICS_TIMEZONE || DEFAULT_ANALYTICS_TIMEZONE;
}

export function getAnalyticsDateKey(date = new Date(), timezone = getAnalyticsTimezone()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function parseDateKeyAsUtcNoon(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

function addDays(dateKey: string, days: number) {
  const date = parseDateKeyAsUtcNoon(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
}

function getDateKeyParts(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

function listDateKeys(startKey: string, endKey: string) {
  const keys: string[] = [];
  for (let key = startKey; key <= endKey; key = addDays(key, 1)) {
    keys.push(key);
  }
  return keys;
}

function getMondayStartKey(dateKey: string) {
  const date = parseDateKeyAsUtcNoon(dateKey);
  const day = date.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return addDays(dateKey, -daysSinceMonday);
}

export function getAnalyticsPeriodRanges(
  date = new Date(),
  timezone = getAnalyticsTimezone(),
) {
  const todayKey = getAnalyticsDateKey(date, timezone);
  const { year, month } = getDateKeyParts(todayKey);
  const monthStartKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const yearStartKey = `${year}-01-01`;
  const weekStartKey = getMondayStartKey(todayKey);

  return {
    today: [todayKey],
    week: listDateKeys(weekStartKey, todayKey),
    month: listDateKeys(monthStartKey, todayKey),
    year: listDateKeys(yearStartKey, todayKey),
  };
}

export function getLatestAnalyticsDateKeys(
  date = new Date(),
  timezone = getAnalyticsTimezone(),
  limit = 30,
) {
  const keys: string[] = [];
  let currentKey = getAnalyticsDateKey(date, timezone);

  for (let index = 0; index < limit; index += 1) {
    keys.push(currentKey);
    currentKey = addDays(currentKey, -1);
  }

  return keys;
}
```

- [ ] **Step 5: Run the date tests and verify GREEN**

Run:

```bash
node --import tsx --test src/lib/analytics/date.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add src/types/analytics.ts src/lib/analytics/date.ts src/lib/analytics/date.test.ts
git commit -m "feat: add analytics date helpers"
```

---

## Task 2: Repository Interface, JSON Store, And Prisma Schema

**Files:**
- Create: `src/lib/analytics/manifest-operations.ts`
- Test: `src/lib/analytics/manifest-operations.test.ts`
- Create: `src/lib/analytics/manifest-repository.ts`
- Create: `src/lib/analytics/repository.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_admin_analytics/migration.sql`

- [ ] **Step 1: Write the failing manifest operation tests**

Create `src/lib/analytics/manifest-operations.test.ts`:

```ts
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
```

- [ ] **Step 2: Run manifest operation tests and verify RED**

Run:

```bash
node --import tsx --test src/lib/analytics/manifest-operations.test.ts
```

Expected: FAIL because `src/lib/analytics/manifest-operations.ts` does not exist.

- [ ] **Step 3: Add manifest operation implementation**

Create `src/lib/analytics/manifest-operations.ts`:

```ts
import type {
  AnalyticsDailyMetricRecord,
  AnalyticsTrackInput,
  AnalyticsDailyVisitorRecord,
} from "@/types/analytics";

type ApplyAnalyticsPageViewInput = {
  metrics: AnalyticsDailyMetricRecord[];
  visitors: AnalyticsDailyVisitorRecord[];
  input: AnalyticsTrackInput;
};

function nextManifestId(records: Array<{ id: number }>) {
  return records.reduce((max, record) => Math.max(max, record.id), 0) + 1;
}

function isSameMetric(
  record: AnalyticsDailyMetricRecord,
  input: Pick<AnalyticsTrackInput, "dateKey" | "pageType" | "path">,
) {
  return (
    record.dateKey === input.dateKey &&
    record.pageType === input.pageType &&
    record.path === input.path
  );
}

function isSameVisitor(record: AnalyticsDailyVisitorRecord, input: AnalyticsTrackInput) {
  return (
    record.dateKey === input.dateKey &&
    record.visitorId === input.visitorId &&
    record.pageType === input.pageType &&
    record.path === input.path
  );
}

export function applyAnalyticsPageViewToManifestRecords({
  metrics,
  visitors,
  input,
}: ApplyAnalyticsPageViewInput) {
  const nextMetrics = metrics.map((metric) => ({ ...metric }));
  const nextVisitors = visitors.map((visitor) => ({ ...visitor }));
  const existingMetric = nextMetrics.find((metric) => isSameMetric(metric, input));
  const nowIso = input.now.toISOString();

  if (existingMetric) {
    existingMetric.views += 1;
    existingMetric.updatedAt = nowIso;
  } else {
    nextMetrics.push({
      id: nextManifestId(nextMetrics),
      dateKey: input.dateKey,
      pageType: input.pageType,
      path: input.path,
      views: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  if (!nextVisitors.some((visitor) => isSameVisitor(visitor, input))) {
    nextVisitors.push({
      id: nextManifestId(nextVisitors),
      dateKey: input.dateKey,
      visitorId: input.visitorId,
      pageType: input.pageType,
      path: input.path,
      createdAt: nowIso,
    });
  }

  return {
    metrics: nextMetrics,
    visitors: nextVisitors,
  };
}
```

- [ ] **Step 4: Run manifest operation tests and verify GREEN**

Run:

```bash
node --import tsx --test src/lib/analytics/manifest-operations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add Prisma models**

Modify `prisma/schema.prisma` by appending:

```prisma
model AnalyticsDailyMetric {
  id        Int      @id @default(autoincrement())
  dateKey   String
  pageType  String
  path      String
  views     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([dateKey, pageType, path])
  @@index([dateKey])
}

model AnalyticsDailyVisitor {
  id        Int      @id @default(autoincrement())
  dateKey   String
  visitorId String
  pageType  String
  path      String
  createdAt DateTime @default(now())

  @@unique([dateKey, visitorId, pageType, path])
  @@index([dateKey])
  @@index([visitorId])
}
```

- [ ] **Step 6: Create migration**

Run:

```bash
npx prisma migrate dev --name admin-analytics
```

Expected: a new migration directory is created and Prisma Client is regenerated.

If migration prompts are blocked by the current environment, create a migration folder under `prisma/migrations/` with this SQL:

```sql
CREATE TABLE "AnalyticsDailyMetric" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dateKey" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AnalyticsDailyVisitor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dateKey" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "AnalyticsDailyMetric_dateKey_pageType_path_key" ON "AnalyticsDailyMetric"("dateKey", "pageType", "path");
CREATE INDEX "AnalyticsDailyMetric_dateKey_idx" ON "AnalyticsDailyMetric"("dateKey");
CREATE UNIQUE INDEX "AnalyticsDailyVisitor_dateKey_visitorId_pageType_path_key" ON "AnalyticsDailyVisitor"("dateKey", "visitorId", "pageType", "path");
CREATE INDEX "AnalyticsDailyVisitor_dateKey_idx" ON "AnalyticsDailyVisitor"("dateKey");
CREATE INDEX "AnalyticsDailyVisitor_visitorId_idx" ON "AnalyticsDailyVisitor"("visitorId");
```

Then run:

```bash
npx prisma generate
```

- [ ] **Step 7: Add JSON manifest repository**

Create `src/lib/analytics/manifest-repository.ts`:

```ts
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
```

- [ ] **Step 8: Add repository interface and implementations**

Create `src/lib/analytics/repository.ts`:

```ts
import "server-only";

import { getDataBackend } from "@/lib/data/backend";
import { prisma } from "@/lib/prisma";
import { applyAnalyticsPageViewToManifestRecords } from "@/lib/analytics/manifest-operations";
import {
  listManifestAnalyticsMetrics,
  listManifestAnalyticsVisitors,
  replaceManifestAnalyticsMetrics,
  replaceManifestAnalyticsVisitors,
} from "@/lib/analytics/manifest-repository";
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
```

- [ ] **Step 9: Type-check repository changes**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS. If Prisma types are missing, run `npx prisma generate`, then rerun type check.

- [ ] **Step 10: Commit Task 2**

Run:

```bash
git add prisma/schema.prisma prisma/migrations src/lib/analytics/manifest-operations.ts src/lib/analytics/manifest-operations.test.ts src/lib/analytics/manifest-repository.ts src/lib/analytics/repository.ts
git commit -m "feat: add analytics storage"
```

---

## Task 3: Tracking Service

**Files:**
- Create: `src/lib/analytics/tracker.ts`
- Create: `src/lib/analytics/server-tracker.ts`
- Test: `src/lib/analytics/tracker.test.ts`

- [ ] **Step 1: Write the failing tracking tests**

Create `src/lib/analytics/tracker.test.ts`:

```ts
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
        issuedAt: Date.now(),
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
```

- [ ] **Step 2: Run the tracking tests and verify RED**

Run:

```bash
node --import tsx --test src/lib/analytics/tracker.test.ts
```

Expected: FAIL because `src/lib/analytics/tracker.ts` does not exist.

- [ ] **Step 3: Add tracking service implementation**

Create `src/lib/analytics/tracker.ts`:

```ts
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
```

- [ ] **Step 4: Add server-only public tracking wrapper**

Create `src/lib/analytics/server-tracker.ts`:

```ts
import "server-only";

import { getAdminSession } from "@/lib/auth/session";
import { getAnalyticsRepository } from "@/lib/analytics/repository";
import { getAnalyticsTimezone } from "@/lib/analytics/date";
import { trackAnalyticsPageView } from "@/lib/analytics/tracker";
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
```

- [ ] **Step 5: Run the tracking tests and verify GREEN**

Run:

```bash
node --import tsx --test src/lib/analytics/tracker.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

Run:

```bash
git add src/lib/analytics/tracker.ts src/lib/analytics/server-tracker.ts src/lib/analytics/tracker.test.ts
git commit -m "feat: add analytics tracking service"
```

---

## Task 4: Admin Analytics Reporting Query

**Files:**
- Create: `src/lib/analytics/queries.ts`
- Create: `src/lib/analytics/server-queries.ts`
- Test: `src/lib/analytics/queries.test.ts`

- [ ] **Step 1: Write the failing reporting tests**

Create `src/lib/analytics/queries.test.ts`:

```ts
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
```

- [ ] **Step 2: Run reporting tests and verify RED**

Run:

```bash
node --import tsx --test src/lib/analytics/queries.test.ts
```

Expected: FAIL because `src/lib/analytics/queries.ts` does not exist.

- [ ] **Step 3: Add reporting query implementation**

Create `src/lib/analytics/queries.ts`:

```ts
import {
  getAnalyticsPeriodRanges,
  getLatestAnalyticsDateKeys,
} from "@/lib/analytics/date";
import type { AnalyticsRepository } from "@/lib/analytics/repository";
import type {
  AdminAnalyticsReport,
  AnalyticsDailyMetricRecord,
  AnalyticsDailyVisitorRecord,
} from "@/types/analytics";

type AdminAnalyticsReportDeps = {
  now: Date;
  timezone: string;
  repository: AnalyticsRepository;
  dailyLimit: number;
};

function uniqueDateKeys(dateKeys: string[]) {
  return [...new Set(dateKeys)];
}

function summarize(
  dateKeys: string[],
  metrics: AnalyticsDailyMetricRecord[],
  visitors: AnalyticsDailyVisitorRecord[],
) {
  const dateKeySet = new Set(dateKeys);
  const views = metrics
    .filter((metric) => dateKeySet.has(metric.dateKey))
    .reduce((total, metric) => total + metric.views, 0);
  const visitorIds = new Set(
    visitors
      .filter((visitor) => dateKeySet.has(visitor.dateKey))
      .map((visitor) => visitor.visitorId),
  );

  return {
    views,
    visitors: visitorIds.size,
  };
}

export async function getAdminAnalyticsReport(
  deps: AdminAnalyticsReportDeps,
): Promise<AdminAnalyticsReport> {
  const ranges = getAnalyticsPeriodRanges(deps.now, deps.timezone);
  const dailyDateKeys = getLatestAnalyticsDateKeys(
    deps.now,
    deps.timezone,
    deps.dailyLimit,
  );
  const allDateKeys = uniqueDateKeys([
    ...ranges.year,
    ...dailyDateKeys,
  ]);
  const [metrics, visitors] = await Promise.all([
    deps.repository.listMetricsByDateKeys(allDateKeys),
    deps.repository.listVisitorsByDateKeys(allDateKeys),
  ]);

  return {
    today: summarize(ranges.today, metrics, visitors),
    week: summarize(ranges.week, metrics, visitors),
    month: summarize(ranges.month, metrics, visitors),
    year: summarize(ranges.year, metrics, visitors),
    daily: dailyDateKeys.map((dateKey) => ({
      dateKey,
      ...summarize([dateKey], metrics, visitors),
    })),
  };
}
```

- [ ] **Step 4: Add server-only public reporting wrapper**

Create `src/lib/analytics/server-queries.ts`:

```ts
import "server-only";

import { getAnalyticsRepository } from "@/lib/analytics/repository";
import { getAnalyticsTimezone } from "@/lib/analytics/date";
import { getAdminAnalyticsReport } from "@/lib/analytics/queries";

export async function getServerAdminAnalyticsReport() {
  return getAdminAnalyticsReport({
    now: new Date(),
    timezone: getAnalyticsTimezone(),
    repository: getAnalyticsRepository(),
    dailyLimit: 30,
  });
}
```

- [ ] **Step 5: Run reporting tests and verify GREEN**

Run:

```bash
node --import tsx --test src/lib/analytics/queries.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

Run:

```bash
git add src/lib/analytics/queries.ts src/lib/analytics/server-queries.ts src/lib/analytics/queries.test.ts
git commit -m "feat: add admin analytics report query"
```

---

## Task 5: Wire Tracking Into Public Pages

**Files:**
- Modify: `src/app/(browse)/page.tsx`
- Modify: `src/app/(browse)/albums/[slug]/page.tsx`
- Modify: `src/app/photos/[source]/[id]/page.tsx`

- [ ] **Step 1: Modify home page tracking**

In `src/app/(browse)/page.tsx`, add:

```ts
import { trackPublicPageView } from "@/lib/analytics/server-tracker";
```

Inside `Home`, after loading `photos` and `albums`, add:

```ts
  await trackPublicPageView({
    pageType: "home",
    path: "/",
  });
```

Use this final function body:

```ts
export default async function Home() {
  const [photos, albums] = await Promise.all([getGalleryPhotos(), getAlbums()]);

  await trackPublicPageView({
    pageType: "home",
    path: "/",
  });

  return (
    <>
      <HeroSection photos={photos} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-12 pt-8 sm:px-8 lg:px-12">
        <AlbumStripSection albums={albums} />
        <PhotoWallSection photos={photos} />
      </main>
    </>
  );
}
```

- [ ] **Step 2: Modify album page tracking**

In `src/app/(browse)/albums/[slug]/page.tsx`, add:

```ts
import { trackPublicPageView } from "@/lib/analytics/server-tracker";
```

After `const { album, photos } = pageData;`, add:

```ts
  await trackPublicPageView({
    pageType: "album",
    path: `/albums/${album.slug}`,
  });
```

This must happen after `notFound()` handling so missing albums are not counted.

- [ ] **Step 3: Modify photo page tracking**

In `src/app/photos/[source]/[id]/page.tsx`, add:

```ts
import { trackPublicPageView } from "@/lib/analytics/server-tracker";
```

After the `if (!photo) { notFound(); }` block and before the expensive `Promise.all`, add:

```ts
  await trackPublicPageView({
    pageType: "photo",
    path: `/photos/${photo.source}/${photo.id}`,
  });
```

This must happen after `notFound()` handling so missing photos are not counted.

- [ ] **Step 4: Type-check public page tracking**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

Run:

```bash
git add 'src/app/(browse)/page.tsx' 'src/app/(browse)/albums/[slug]/page.tsx' 'src/app/photos/[source]/[id]/page.tsx'
git commit -m "feat: track public page views"
```

---

## Task 6: Admin Analytics Page And Navigation

**Files:**
- Create: `src/components/admin/analytics-summary.tsx`
- Create: `src/app/admin/analytics/page.tsx`
- Modify: `src/components/admin/admin-shell.tsx`

- [ ] **Step 1: Add analytics summary component**

Create `src/components/admin/analytics-summary.tsx`:

```tsx
import type { AdminAnalyticsReport } from "@/types/analytics";

const summaryCards = [
  ["today", "今日"],
  ["week", "本週"],
  ["month", "本月"],
  ["year", "本年"],
] as const;

type AnalyticsSummaryProps = {
  report: AdminAnalyticsReport;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-TW").format(value);
}

export function AnalyticsSummary({ report }: AnalyticsSummaryProps) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([key, label]) => {
          const summary = report[key];

          return (
            <article key={key} className="rounded-2xl border border-line bg-white/80 px-4 py-4">
              <p className="text-sm text-stone-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">
                {formatNumber(summary.views)}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {formatNumber(summary.visitors)} 位訪客
              </p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-white/80">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-lg font-semibold text-stone-900">每日瀏覽量</h3>
          <p className="mt-1 text-sm text-stone-500">最近 30 天，全站公開頁面加總。</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">日期</th>
                <th className="px-4 py-3 font-medium">瀏覽量</th>
                <th className="px-4 py-3 font-medium">訪客</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.daily.map((day) => (
                <tr key={day.dateKey}>
                  <td className="px-4 py-3 font-medium text-stone-900">{day.dateKey}</td>
                  <td className="px-4 py-3 text-stone-700">{formatNumber(day.views)}</td>
                  <td className="px-4 py-3 text-stone-700">{formatNumber(day.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Add admin analytics page**

Create `src/app/admin/analytics/page.tsx`:

```tsx
import { AdminShell } from "@/components/admin/admin-shell";
import { AnalyticsSummary } from "@/components/admin/analytics-summary";
import { Panel } from "@/components/ui/panel";
import { getAnalyticsTimezone } from "@/lib/analytics/date";
import { getServerAdminAnalyticsReport } from "@/lib/analytics/server-queries";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminAnalyticsPage() {
  const session = await requireAdminSession();
  const [report, timezone] = await Promise.all([
    getServerAdminAnalyticsReport(),
    Promise.resolve(getAnalyticsTimezone()),
  ]);

  return (
    <AdminShell username={session.username}>
      <Panel>
        <div className="flex flex-col gap-3">
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">Analytics</p>
          <h2 className="text-2xl font-semibold text-stone-900">瀏覽統計</h2>
          <p className="max-w-3xl leading-7 text-stone-700">
            查看公開網站的每日瀏覽量與不重複訪客。統計依 {timezone} 計算，管理員瀏覽不列入。
          </p>
        </div>

        <div className="mt-6">
          <AnalyticsSummary report={report} />
        </div>
      </Panel>
    </AdminShell>
  );
}
```

- [ ] **Step 3: Add navigation item**

Modify `src/components/admin/admin-shell.tsx`. Add this object to `navItems` after likes or before likes:

```ts
  { href: "/admin/analytics", label: "瀏覽統計" },
```

Do not refactor unrelated mojibake text in this task unless the user explicitly asks for that cleanup.

- [ ] **Step 4: Build-check admin route**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit Task 6**

Run:

```bash
git add src/components/admin/analytics-summary.tsx src/app/admin/analytics/page.tsx src/components/admin/admin-shell.tsx
git commit -m "feat: add admin analytics page"
```

---

## Task 7: Backlog Note And Full Verification

**Files:**
- Modify: `docs/issue-tracker/user-feedback-backlog.md`

- [ ] **Step 1: Update Feedback 8 with implementation note**

Under `## Feedback 8: Add admin traffic and view-count analytics`, add this note near the current status or suggested follow-up:

```md
### First-release implementation note

The first implementation is scoped to whole-site daily aggregate analytics:

- `/admin/analytics` shows today, week, month, year, and latest 30 daily totals.
- Metrics include page views and distinct visitors.
- Admin traffic is excluded.
- Daily aggregate storage is intentional; future detailed analytics requires raw event storage.
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
node --import tsx --test src/lib/analytics/date.test.ts src/lib/analytics/tracker.test.ts src/lib/analytics/queries.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run Prisma generation if schema changed**

Run:

```bash
npx prisma generate
```

Expected: Prisma Client generated successfully.

- [ ] **Step 4: Run full session verification**

Run:

```bash
.\.session\verify.ps1
```

Expected: lint, type check, and build pass.

- [ ] **Step 5: Confirm git status**

Run:

```bash
git status -sb
```

Expected: only intended files are modified before the final commit.

- [ ] **Step 6: Commit Task 7**

Run:

```bash
git add docs/issue-tracker/user-feedback-backlog.md
git commit -m "docs: update analytics backlog note"
```

---

## Review Checklist

After all tasks are complete, review:

- `/admin/analytics` uses `requireAdminSession()`.
- Tracking uses `getAdminSession()` and never `requireAdminSession()` on public pages.
- Missing albums/photos are not tracked.
- Admin sessions are excluded before visitor cookies are created.
- `views` are summed from `AnalyticsDailyMetric`.
- whole-site `visitors` are distinct visitor ids from `AnalyticsDailyVisitor`, not summed per path.
- Tracking errors are swallowed so public pages keep rendering.
- `ANALYTICS_TIMEZONE` defaults to `Asia/Taipei`.
- JSON backend files are created only under `data/`.
- No `.superpowers/` files are left in git status.
- No implementation commits landed on `master`; all commits are on `feat/admin-analytics`.

## Final Verification Commands

Run:

```bash
node --import tsx --test src/lib/analytics/date.test.ts src/lib/analytics/tracker.test.ts src/lib/analytics/queries.test.ts
npx prisma generate
.\.session\verify.ps1
git status -sb
```

Expected:

- Focused analytics tests pass.
- Prisma Client generation succeeds.
- Session verification passes.
- Working tree is clean after the final commit.
