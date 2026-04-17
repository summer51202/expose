# Admin Analytics Design

## Status

Approved design direction for the first admin traffic analytics release.

## Goal

Add an admin page that shows public-site traffic in a way that is useful for daily operation without introducing a full analytics platform.

The first release tracks:

- Total page views.
- Unique visitors.
- Daily totals for recent days.
- Summary totals for today, this week, this month, and this year.

The first release does not track per-photo popularity, per-album popularity, session paths, hourly trends, or bot classification.

## Product Scope

### Admin Experience

Add `/admin/analytics` and a navigation item labeled `瀏覽統計`.

The page shows:

1. Summary cards:
   - Today views and visitors.
   - This week views and visitors.
   - This month views and visitors.
   - This year views and visitors.
2. A daily traffic table:
   - Default range: latest 30 analytics days.
   - Sort order: newest date first.
   - Columns: date, views, visitors.
   - Values are whole-site totals for public pages.
3. A short note:
   - Stats use the configured site analytics timezone.
   - Admin page views are excluded.

Keep the full daily list on `/admin/analytics`. The first release does not need to add analytics cards to the existing `/admin` overview.

### Tracked Pages

Track public page requests for:

- `/` as `home`.
- `/albums/[slug]` as `album`.
- `/photos/[source]/[id]` as `photo`.
- Other public app pages as `other` if added later.

Do not track:

- `/admin`.
- `/admin/*`.
- Any request with a valid admin session.

## Data Design

Use daily aggregate tables for the first release.

### AnalyticsDailyMetric

Stores page-view totals by analytics date, page type, and path.

Fields:

- `id`
- `dateKey`: `YYYY-MM-DD`, calculated in the analytics timezone.
- `pageType`: `home | album | photo | other`
- `path`
- `views`
- `createdAt`
- `updatedAt`

Unique constraint:

- `dateKey`, `pageType`, `path`

### AnalyticsDailyVisitor

Stores one row per visitor per analytics date, page type, and path. This table supports privacy-safe unique visitor counting without storing raw page-view events.

Fields:

- `id`
- `dateKey`
- `visitorId`
- `pageType`
- `path`
- `createdAt`

Unique constraint:

- `dateKey`, `visitorId`, `pageType`, `path`

The visitor id should reuse the existing `expose_visitor_id` cookie pattern. It is an opaque random id, not an IP address or user-agent hash.

For whole-site reporting, do not sum visitor counts across paths. Count distinct `visitorId` values across `AnalyticsDailyVisitor` rows for the requested date range. This prevents one visitor who opens multiple public pages from being counted as multiple whole-site visitors.

## Tracking Flow

On each public page render:

1. Resolve the current admin session.
2. If an admin session exists, skip tracking.
3. Resolve `pageType` and `path`.
4. Resolve analytics date using `ANALYTICS_TIMEZONE`, defaulting to `Asia/Taipei`.
5. Get or create the visitor cookie.
6. Upsert `AnalyticsDailyMetric`.
7. Increment `views`.
8. Insert `AnalyticsDailyVisitor`.
9. If the visitor row already exists for that date, visitor, page type, and path, ignore the duplicate visitor insert.

Tracking failures should not break public page rendering. Log or swallow expected analytics write failures according to the repository's existing error-handling style.

## Reporting Flow

The admin analytics query reads both analytics tables:

- Sum `AnalyticsDailyMetric.views` across all `pageType` and `path` values.
- Count distinct `AnalyticsDailyVisitor.visitorId` values for the requested date range.

It returns:

- `today`: views and visitors for the current analytics date.
- `week`: views and visitors from the start of the current analytics week through today.
- `month`: views and visitors from the first day of the current analytics month through today.
- `year`: views and visitors from January 1 through today.
- `daily`: latest 30 days, newest first, with views and visitors.

All ranges use the same analytics timezone helper.

## Timezone Rules

Introduce `ANALYTICS_TIMEZONE`.

Default:

```text
Asia/Taipei
```

All date keys and reporting ranges use this timezone. The implementation should isolate timezone logic in a helper so tests can cover date boundaries.

## Storage Strategy

The first release supports the current data backend pattern:

- Prisma backend stores analytics in database tables.
- JSON backend stores analytics in `data/analytics-daily-metrics.json` and `data/analytics-daily-visitors.json`.

JSON support only needs to support local development scale.

## Known Limitations

This design intentionally chooses daily aggregate storage instead of raw event storage. That keeps the first release small and efficient, but it limits future analytics.

Natural future extensions:

- Daily totals by `pageType`.
- Daily totals by `path`.
- Daily unique visitors by `pageType` or `path`, using distinct visitor counts from `AnalyticsDailyVisitor`.
- Admin filters for page type.
- A line chart using the existing daily table.

Harder future extensions:

- Hourly trends.
- Session journey analysis.
- Accurate historical top albums or top photos if slugs or titles change.
- Recomputing history after bot-filtering rules change.
- Recomputing history after admin-exclusion rules change.
- Per-event debugging.

If the project later needs detailed analytics, add a raw event table and either:

- Start collecting raw events from that date forward, or
- Dual-write raw events and daily aggregates.

Historical data collected by this first release cannot fully reconstruct raw page-view events.

## Testing Plan

Add tests for:

- Analytics date-key generation in the configured timezone.
- Today, week, month, and year range calculation.
- Tracking increments `views` on every public visit.
- Tracking records one visitor row per visitor per date/path/page type.
- Admin sessions are skipped.
- Reporting aggregates all paths and page types into whole-site view totals.
- Reporting counts distinct visitors across all paths and page types, so one visitor who opens multiple pages is counted once for the whole-site period.
- Daily report returns newest dates first and defaults to the latest 30 days.

Build verification should include the new admin route.

## Acceptance Criteria

- `/admin/analytics` is protected by the existing admin session requirement.
- Admin navigation includes `瀏覽統計`.
- Public page views are counted for home, album, and photo pages.
- Valid admin sessions do not create analytics records.
- The analytics page shows today, week, month, year, and latest 30 daily totals.
- Unique visitor counts do not double count the same visitor across multiple pages in a whole-site period.
- All date grouping uses `ANALYTICS_TIMEZONE`, defaulting to `Asia/Taipei`.
- The spec's aggregate-storage limitations are documented for future feature planning.
