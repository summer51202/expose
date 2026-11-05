import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { resolveDeletableLocalPath } from "./local-driver";

const uploadsRoot = path.resolve(path.sep, "site", "public", "uploads");

test("resolveDeletableLocalPath accepts keys inside public/uploads", () => {
  assert.equal(
    resolveDeletableLocalPath("uploads/a-large.webp", uploadsRoot),
    path.join(uploadsRoot, "a-large.webp"),
  );
  assert.equal(
    resolveDeletableLocalPath("/uploads/a-large.webp", uploadsRoot),
    path.join(uploadsRoot, "a-large.webp"),
  );
});

test("resolveDeletableLocalPath rejects traversal and paths outside uploads", () => {
  assert.equal(resolveDeletableLocalPath("uploads/../favicon.ico", uploadsRoot), null);
  assert.equal(resolveDeletableLocalPath("../.env", uploadsRoot), null);
  assert.equal(resolveDeletableLocalPath("uploads", uploadsRoot), null);
  assert.equal(resolveDeletableLocalPath("images/logo.png", uploadsRoot), null);
});
