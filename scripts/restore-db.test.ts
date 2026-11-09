import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { parseArgs as parseBackupArgs } from "./backup-db.mjs";
import { assertSafeOutput, parseArgs, sortBackups } from "./restore-db.mjs";

test("restore needs --list, --latest or --key", () => {
  assert.throws(() => parseArgs([]), /--list, --latest or --key/);
  assert.throws(() => parseArgs(["--latest", "--key", "k"]), /either --latest or --key/);
  assert.throws(() => parseArgs(["--key"]), /needs a value/);
  assert.throws(() => parseArgs(["--apply"]), /Unknown argument/);
  assert.deepEqual(parseArgs(["--latest", "--out", "x.db"]), {
    list: false,
    latest: true,
    key: null,
    out: "x.db",
    compare: null,
    force: false,
  });
});

test("restore refuses to write over the live database or its journal files", () => {
  const live = path.resolve("/data/expose.db");
  assert.throws(() => assertSafeOutput("/data/expose.db", live, true), /live database/);
  assert.throws(() => assertSafeOutput("/data/expose.db-journal", live, true), /live database/);
  assert.equal(assertSafeOutput("/data/expose-restore.db", live, true), path.resolve("/data/expose-restore.db"));
});

test("sortBackups keeps only backup keys, newest first", () => {
  const sorted = sortBackups([
    { key: "backups/db/expose-20261101-190000.db.gz", size: 1, lastModified: null },
    { key: "backups/db/README.txt", size: 1, lastModified: null },
    { key: "backups/db/expose-20261109-190000.db.gz", size: 1, lastModified: null },
  ]);
  assert.deepEqual(sorted.map((backup) => backup.key), [
    "backups/db/expose-20261109-190000.db.gz",
    "backups/db/expose-20261101-190000.db.gz",
  ]);
});

test("backup-db --if-due accepts only startup or scheduled", () => {
  assert.deepEqual(parseBackupArgs([]), { ifDue: undefined });
  assert.deepEqual(parseBackupArgs(["--if-due=startup"]), { ifDue: "startup" });
  assert.throws(() => parseBackupArgs(["--if-due=hourly"]), /--if-due/);
});
