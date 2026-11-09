import assert from "node:assert/strict";
import test from "node:test";

import { createBackupScheduler, resolveExitCode, shouldScheduleBackups } from "./start.mjs";

function fakeTimers() {
  const timeouts: Array<() => void> = [];
  const intervals: Array<() => void> = [];
  return {
    timeouts,
    intervals,
    timers: {
      setTimeout: (fn: () => void) => (timeouts.push(fn), timeouts.length),
      clearTimeout: (id: number | null) => {
        if (id) timeouts[id - 1] = () => {};
      },
      setInterval: (fn: () => void) => (intervals.push(fn), intervals.length),
      clearInterval: (id: number | null) => {
        if (id) intervals[id - 1] = () => {};
      },
    },
  };
}

test("backups are scheduled only for the prisma backend and can be turned off", () => {
  assert.equal(shouldScheduleBackups({ DATA_BACKEND: "prisma" }), true);
  assert.equal(shouldScheduleBackups({ DATA_BACKEND: "json" }), false);
  assert.equal(shouldScheduleBackups({ DATA_BACKEND: "prisma", BACKUP_DISABLED: "1" }), false);
  assert.equal(shouldScheduleBackups({ DATA_BACKEND: "prisma", EXPOSE_MAINTENANCE: "1" }), false);
});

test("the scheduler runs a startup check, then periodic checks, one at a time", async () => {
  const { timeouts, intervals, timers } = fakeTimers();
  const modes: string[] = [];
  let finish = () => {};
  const scheduler = createBackupScheduler({
    timers: timers as never,
    log: () => {},
    runBackup: (mode: string) => {
      modes.push(mode);
      return { done: new Promise<void>((resolve) => (finish = resolve)), cancel: () => {} };
    },
  });

  scheduler.start();
  timeouts[0]();
  assert.deepEqual(modes, ["startup"]);
  intervals[0](); // still running: skipped
  assert.deepEqual(modes, ["startup"]);

  finish();
  await new Promise((resolve) => setImmediate(resolve));
  intervals[0]();
  assert.deepEqual(modes, ["startup", "scheduled"]);
});

test("stop() cancels the running backup and prevents further runs", () => {
  const { timeouts, intervals, timers } = fakeTimers();
  let cancelled = 0;
  let runs = 0;
  const scheduler = createBackupScheduler({
    timers: timers as never,
    log: () => {},
    runBackup: () => {
      runs += 1;
      return { done: new Promise<void>(() => {}), cancel: () => (cancelled += 1) };
    },
  });

  scheduler.start();
  timeouts[0]();
  scheduler.stop();
  assert.equal(cancelled, 1);
  intervals[0]();
  timeouts[0]();
  assert.equal(runs, 1);
});

test("a backup that fails to start does not throw into the server", () => {
  const { timeouts, timers } = fakeTimers();
  const logs: string[] = [];
  const scheduler = createBackupScheduler({
    timers: timers as never,
    log: (message: string) => logs.push(message),
    runBackup: () => {
      throw new Error("spawn EAGAIN");
    },
  });
  scheduler.start();
  assert.doesNotThrow(() => timeouts[0]());
  assert.equal(scheduler.isRunning, false);
  assert.match(logs[0], /spawn EAGAIN/);
});

test("a platform-requested shutdown exits 0 even though Next exits 143", () => {
  assert.equal(resolveExitCode({ shutdownRequested: true, code: 143, signal: null }), 0);
  assert.equal(resolveExitCode({ shutdownRequested: true, code: null, signal: "SIGTERM" }), 0);
});

test("an unrequested crash keeps its non-zero exit code", () => {
  assert.equal(resolveExitCode({ shutdownRequested: false, code: 1, signal: null }), 1);
  assert.equal(resolveExitCode({ shutdownRequested: false, code: 143, signal: null }), 143);
  assert.equal(resolveExitCode({ shutdownRequested: false, code: null, signal: "SIGKILL" }), 1);
});

test("a clean exit stays 0", () => {
  assert.equal(resolveExitCode({ shutdownRequested: false, code: 0, signal: null }), 0);
});
