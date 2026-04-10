import test from "node:test";
import assert from "node:assert/strict";

import { getCommentReplyError } from "./comment-reply";

test("getCommentReplyError rejects empty replies", () => {
  assert.equal(getCommentReplyError("   "), "Please enter a reply.");
});

test("getCommentReplyError rejects replies over 500 characters", () => {
  assert.equal(getCommentReplyError("a".repeat(501)), "Reply must be 500 characters or fewer.");
});

test("getCommentReplyError returns null for valid replies", () => {
  assert.equal(getCommentReplyError("Thanks for visiting."), null);
});
