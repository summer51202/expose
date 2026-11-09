import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { resolveDeletableLocalPath, resolvePrivateLocalPath } from "./local-driver";

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

const privateRoot = path.resolve(path.sep, "site", "storage", "private");

test("resolvePrivateLocalPath keeps originals under storage/private, outside public/", () => {
  const resolved = resolvePrivateLocalPath("uploads/a-original.webp", privateRoot);
  assert.equal(resolved, path.join(privateRoot, "uploads", "a-original.webp"));
  assert.equal(resolvePrivateLocalPath("/uploads/a-original.webp", privateRoot), resolved);
  assert.equal(resolved?.split(path.sep).includes("public"), false);
});

test("resolvePrivateLocalPath rejects traversal out of storage/private", () => {
  assert.equal(resolvePrivateLocalPath("../../public/uploads/a.webp", privateRoot), null);
  assert.equal(resolvePrivateLocalPath("uploads/../../x", privateRoot), null);
  assert.equal(resolvePrivateLocalPath("", privateRoot), null);
});
