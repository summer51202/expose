import test from "node:test";
import assert from "node:assert/strict";

import { resolveSwipeDirection, shouldIgnorePhotoNavigationKey } from "./photo-page-gestures";

test("swipe left goes to next, swipe right to previous", () => {
  assert.equal(resolveSwipeDirection(-80, 5), "next");
  assert.equal(resolveSwipeDirection(80, -5), "previous");
});

test("short horizontal moves are ignored", () => {
  assert.equal(resolveSwipeDirection(-49, 0), null);
  assert.equal(resolveSwipeDirection(30, 2), null);
});

test("mostly vertical moves (scrolling) are ignored", () => {
  assert.equal(resolveSwipeDirection(-60, 200), null);
  assert.equal(resolveSwipeDirection(70, -70), null);
});

test("keys are ignored while typing in form fields", () => {
  assert.equal(shouldIgnorePhotoNavigationKey({ target: { tagName: "INPUT" } }), true);
  assert.equal(shouldIgnorePhotoNavigationKey({ target: { tagName: "textarea" } }), true);
  assert.equal(shouldIgnorePhotoNavigationKey({ target: { tagName: "SELECT" } }), true);
  assert.equal(shouldIgnorePhotoNavigationKey({ target: { tagName: "DIV", isContentEditable: true } }), true);
});

test("keys with modifiers, IME composition or already handled are ignored", () => {
  assert.equal(shouldIgnorePhotoNavigationKey({ altKey: true }), true);
  assert.equal(shouldIgnorePhotoNavigationKey({ metaKey: true }), true);
  assert.equal(shouldIgnorePhotoNavigationKey({ ctrlKey: true }), true);
  assert.equal(shouldIgnorePhotoNavigationKey({ isComposing: true }), true);
  assert.equal(shouldIgnorePhotoNavigationKey({ defaultPrevented: true }), true);
});

test("plain keys on the page are handled", () => {
  assert.equal(shouldIgnorePhotoNavigationKey({ target: { tagName: "BODY" } }), false);
  assert.equal(shouldIgnorePhotoNavigationKey({ target: { tagName: "A" } }), false);
  assert.equal(shouldIgnorePhotoNavigationKey({}), false);
});
