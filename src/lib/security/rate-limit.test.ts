import assert from "node:assert/strict";

import {
  createMemoryRateLimiter,
  hashLimiterIdentity,
} from "./rate-limit.ts";

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("allows requests under the configured limit", () => {
  const limiter = createMemoryRateLimiter({
    now: () => 1_000,
  });

  const first = limiter.check("login:ip:test", {
    limit: 2,
    windowMs: 10_000,
    blockMs: 30_000,
  });
  const second = limiter.check("login:ip:test", {
    limit: 2,
    windowMs: 10_000,
    blockMs: 30_000,
  });

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
});

runTest("blocks when the threshold is exceeded inside the window", () => {
  const limiter = createMemoryRateLimiter({
    now: () => 1_000,
  });

  limiter.check("login:ip:test", {
    limit: 1,
    windowMs: 10_000,
    blockMs: 30_000,
  });

  const blocked = limiter.check("login:ip:test", {
    limit: 1,
    windowMs: 10_000,
    blockMs: 30_000,
  });

  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 30_000);
});

runTest("resets after the window expires", () => {
  let now = 1_000;
  const limiter = createMemoryRateLimiter({
    now: () => now,
  });

  limiter.check("comment:test", {
    limit: 1,
    windowMs: 5_000,
    blockMs: 10_000,
  });
  limiter.check("comment:test", {
    limit: 1,
    windowMs: 5_000,
    blockMs: 10_000,
  });

  now = 12_000;

  const reset = limiter.check("comment:test", {
    limit: 1,
    windowMs: 5_000,
    blockMs: 10_000,
  });

  assert.equal(reset.allowed, true);
  assert.equal(reset.remaining, 0);
});

runTest("tracks independent keys separately", () => {
  const limiter = createMemoryRateLimiter({
    now: () => 1_000,
  });

  limiter.check("comment:first", {
    limit: 1,
    windowMs: 10_000,
    blockMs: 10_000,
  });

  const secondKey = limiter.check("comment:second", {
    limit: 1,
    windowMs: 10_000,
    blockMs: 10_000,
  });

  assert.equal(secondKey.allowed, true);
  assert.equal(secondKey.remaining, 0);
});

runTest("reset clears limiter state for a successful login", () => {
  const limiter = createMemoryRateLimiter({
    now: () => 1_000,
  });

  limiter.check("login:test", {
    limit: 1,
    windowMs: 10_000,
    blockMs: 30_000,
  });
  limiter.reset("login:test");

  const nextAttempt = limiter.check("login:test", {
    limit: 1,
    windowMs: 10_000,
    blockMs: 30_000,
  });

  assert.equal(nextAttempt.allowed, true);
  assert.equal(nextAttempt.remaining, 0);
});

runTest("hashLimiterIdentity does not expose raw header values", () => {
  const hashed = hashLimiterIdentity("203.0.113.4|Mozilla/5.0");

  assert.notEqual(hashed, "203.0.113.4|Mozilla/5.0");
  assert.match(hashed, /^[a-f0-9]{64}$/);
});
