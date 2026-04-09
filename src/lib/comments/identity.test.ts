import assert from "node:assert/strict";

import { hashCommentIdentity } from "./identity-hash.ts";

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("hashCommentIdentity is stable for the same secret and input", () => {
  const first = hashCommentIdentity({
    forwardedFor: "203.0.113.10",
    realIp: "",
    userAgent: "Mozilla/5.0",
    secret: "comment-secret-1234567890-comment-secret",
  });
  const second = hashCommentIdentity({
    forwardedFor: "203.0.113.10",
    realIp: "",
    userAgent: "Mozilla/5.0",
    secret: "comment-secret-1234567890-comment-secret",
  });

  assert.equal(first, second);
});

runTest("hashCommentIdentity changes when the secret changes", () => {
  const first = hashCommentIdentity({
    forwardedFor: "203.0.113.10",
    realIp: "",
    userAgent: "Mozilla/5.0",
    secret: "comment-secret-1234567890-comment-secret",
  });
  const second = hashCommentIdentity({
    forwardedFor: "203.0.113.10",
    realIp: "",
    userAgent: "Mozilla/5.0",
    secret: "different-comment-secret-1234567890",
  });

  assert.notEqual(first, second);
});

runTest("hashCommentIdentity handles blank inputs deterministically", () => {
  const hashed = hashCommentIdentity({
    forwardedFor: "",
    realIp: "",
    userAgent: "",
    secret: "comment-secret-1234567890-comment-secret",
  });

  assert.match(hashed, /^[a-f0-9]{64}$/);
});

runTest("hashCommentIdentity does not return raw IP values", () => {
  const hashed = hashCommentIdentity({
    forwardedFor: "203.0.113.10",
    realIp: "",
    userAgent: "Mozilla/5.0",
    secret: "comment-secret-1234567890-comment-secret",
  });

  assert.ok(!hashed.includes("203.0.113.10"));
});
