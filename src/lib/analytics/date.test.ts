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
