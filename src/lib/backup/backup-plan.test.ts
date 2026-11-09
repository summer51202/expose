import assert from "node:assert/strict";
import test from "node:test";

import {
  formatBackupKey,
  isBackupDue,
  latestScheduledSlot,
  parseBackupKey,
  planRetention,
  resolveBackupHourUtc,
} from "./backup-plan.mjs";

const at = (iso: string) => new Date(iso);
const keyAt = (iso: string) => formatBackupKey(at(iso));

test("backup keys use UTC and round-trip", () => {
  const date = at("2026-11-09T03:04:05.678Z");
  assert.equal(formatBackupKey(date), "backups/db/expose-20261109-030405.db.gz");
  assert.equal(parseBackupKey("backups/db/expose-20261109-030405.db.gz")?.toISOString(), "2026-11-09T03:04:05.000Z");
});

test("parseBackupKey rejects foreign or impossible keys", () => {
  for (const key of [
    "backups/db/expose-20261109-030405.db",
    "backups/db/other-20261109-030405.db.gz",
    "backups/expose-20261109-030405.db.gz",
    "backups/db/expose-20261341-030405.db.gz",
    "backups/db/expose-20260230-030405.db.gz",
    "backups/db/expose-20261109-250000.db.gz",
    "uploads/x.webp",
  ]) {
    assert.equal(parseBackupKey(key), null, key);
  }
});

test("retention keeps the newest backup of the last 14 days and deletes older dailies", () => {
  // One backup per day at 19:00 UTC from 2026-10-15 to 2026-11-09 (26 days).
  const keys: string[] = [];
  for (let day = 0; day < 26; day += 1) {
    keys.push(formatBackupKey(new Date(Date.UTC(2026, 9, 15 + day, 19))));
  }
  const plan = planRetention(keys, at("2026-11-09T19:30:00Z"));

  // 14 most recent days: 10-27 .. 11-09; plus monthly: earliest of October (10-15) and of November (11-01).
  const expectedKeep = [
    ...Array.from({ length: 14 }, (_, index) => formatBackupKey(new Date(Date.UTC(2026, 10, 9 - index, 19)))),
    keyAt("2026-10-15T19:00:00Z"),
  ];
  assert.deepEqual(new Set(plan.keep), new Set(expectedKeep));
  assert.equal(plan.keep.length, 15);
  assert.equal(plan.delete.length, 11);
  assert.ok(plan.delete.includes(keyAt("2026-10-16T19:00:00Z")));
  assert.ok(plan.delete.includes(keyAt("2026-10-26T19:00:00Z")));
});

test("retention keeps the 1st-of-month backup for 6 months and drops older months", () => {
  const keys = [
    keyAt("2026-04-01T19:00:00Z"),
    keyAt("2026-04-02T19:00:00Z"),
    keyAt("2026-05-01T19:00:00Z"),
    keyAt("2026-06-01T19:00:00Z"),
    keyAt("2026-07-01T19:00:00Z"),
    keyAt("2026-08-01T19:00:00Z"),
    keyAt("2026-09-01T19:00:00Z"),
    keyAt("2026-09-02T19:00:00Z"),
    keyAt("2026-10-01T19:00:00Z"),
    keyAt("2026-11-01T19:00:00Z"),
  ];
  // dailyCount 0 isolates the monthly rule (the newest backup is still always kept).
  const plan = planRetention(keys, at("2026-11-09T12:00:00Z"), { dailyCount: 0, monthlyCount: 6 });

  assert.deepEqual(plan.keep, [
    keyAt("2026-11-01T19:00:00Z"),
    keyAt("2026-10-01T19:00:00Z"),
    keyAt("2026-09-01T19:00:00Z"),
    keyAt("2026-08-01T19:00:00Z"),
    keyAt("2026-07-01T19:00:00Z"),
    keyAt("2026-06-01T19:00:00Z"),
  ]);
  assert.deepEqual(new Set(plan.delete), new Set([
    keyAt("2026-09-02T19:00:00Z"),
    keyAt("2026-05-01T19:00:00Z"),
    keyAt("2026-04-02T19:00:00Z"),
    keyAt("2026-04-01T19:00:00Z"),
  ]));
});

test("retention: monthly falls back to the month's earliest backup when the 1st was missed", () => {
  const keys = [keyAt("2026-10-03T19:00:00Z"), keyAt("2026-10-20T19:00:00Z"), keyAt("2026-11-09T19:00:00Z")];
  const plan = planRetention(keys, at("2026-11-09T20:00:00Z"), { dailyCount: 1, monthlyCount: 6 });
  assert.deepEqual(plan.keep, [keyAt("2026-11-09T19:00:00Z"), keyAt("2026-10-03T19:00:00Z")]);
  assert.deepEqual(plan.delete, [keyAt("2026-10-20T19:00:00Z")]);
});

test("retention keeps only the newest of several backups on one day", () => {
  const keys = [keyAt("2026-11-09T01:00:00Z"), keyAt("2026-11-09T19:00:00Z"), keyAt("2026-11-09T21:15:00Z")];
  const plan = planRetention(keys, at("2026-11-09T22:00:00Z"), { dailyCount: 14, monthlyCount: 0 });
  assert.deepEqual(plan.keep, [keyAt("2026-11-09T21:15:00Z")]);
  assert.deepEqual(new Set(plan.delete), new Set([keyAt("2026-11-09T01:00:00Z"), keyAt("2026-11-09T19:00:00Z")]));
});

test("retention never deletes unknown keys and always keeps the newest backup", () => {
  const keys = ["backups/db/notes.txt", keyAt("2025-01-01T00:00:00Z")];
  const plan = planRetention(keys, at("2026-11-09T00:00:00Z"), { dailyCount: 0, monthlyCount: 0 });
  assert.deepEqual(plan.keep, [keyAt("2025-01-01T00:00:00Z")]);
  assert.deepEqual(plan.delete, []);
  assert.deepEqual(plan.ignored, ["backups/db/notes.txt"]);
  assert.deepEqual(planRetention([], at("2026-11-09T00:00:00Z")), { keep: [], delete: [], ignored: [] });
});

test("latestScheduledSlot is today's slot once it has passed, otherwise yesterday's", () => {
  assert.equal(latestScheduledSlot(at("2026-11-09T19:00:00Z"), 19).toISOString(), "2026-11-09T19:00:00.000Z");
  assert.equal(latestScheduledSlot(at("2026-11-09T18:59:59Z"), 19).toISOString(), "2026-11-08T19:00:00.000Z");
  assert.equal(latestScheduledSlot(at("2026-11-01T00:30:00Z"), 19).toISOString(), "2026-10-31T19:00:00.000Z");
});

test("startup: back up only when the last success is 24h old or there is none", () => {
  const now = at("2026-11-09T12:00:00Z");
  assert.equal(isBackupDue({}, now, { mode: "startup" }), true);
  assert.equal(isBackupDue({ lastSuccessAt: "2026-11-08T12:00:01Z" }, now, { mode: "startup" }), false);
  assert.equal(isBackupDue({ lastSuccessAt: "2026-11-08T12:00:00Z" }, now, { mode: "startup" }), true);
  assert.equal(isBackupDue({ lastSuccessAt: "2026-11-01T00:00:00Z" }, now, { mode: "startup" }), true);
  assert.equal(isBackupDue({ lastSuccessAt: "not a date" }, now, { mode: "startup" }), true);
});

test("scheduled: back up once per day after the slot", () => {
  const options = { mode: "scheduled", hourUtc: 19 } as const;
  // Before today's slot, yesterday's slot was covered.
  assert.equal(isBackupDue({ lastSuccessAt: "2026-11-08T19:05:00Z" }, at("2026-11-09T18:50:00Z"), options), false);
  // Just after the slot: due.
  assert.equal(isBackupDue({ lastSuccessAt: "2026-11-08T19:05:00Z" }, at("2026-11-09T19:00:00Z"), options), true);
  // After today's backup: not due again until tomorrow.
  assert.equal(isBackupDue({ lastSuccessAt: "2026-11-09T19:00:30Z" }, at("2026-11-09T23:00:00Z"), options), false);
  // A manual backup before the slot does not replace the daily one.
  assert.equal(isBackupDue({ lastSuccessAt: "2026-11-09T10:00:00Z" }, at("2026-11-09T19:10:00Z"), options), true);
});

test("after a failed attempt, wait an hour before retrying", () => {
  const status = { lastSuccessAt: "2026-11-07T19:00:00Z", lastAttemptAt: "2026-11-09T19:00:00Z", lastAttemptOk: false };
  assert.equal(isBackupDue(status, at("2026-11-09T19:30:00Z"), { mode: "scheduled", hourUtc: 19 }), false);
  assert.equal(isBackupDue(status, at("2026-11-09T19:30:00Z"), { mode: "startup" }), false);
  assert.equal(isBackupDue(status, at("2026-11-09T20:00:00Z"), { mode: "scheduled", hourUtc: 19 }), true);
});

test("BACKUP_HOUR_UTC defaults to 19 (03:00 Asia/Taipei)", () => {
  assert.equal(resolveBackupHourUtc(undefined), 19);
  assert.equal(resolveBackupHourUtc(""), 19);
  assert.equal(resolveBackupHourUtc("24"), 19);
  assert.equal(resolveBackupHourUtc("abc"), 19);
  assert.equal(resolveBackupHourUtc("0"), 0);
  assert.equal(resolveBackupHourUtc("23"), 23);
});
