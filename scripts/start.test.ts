import assert from "node:assert/strict";
import test from "node:test";

import { resolveExitCode } from "./start.mjs";

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
