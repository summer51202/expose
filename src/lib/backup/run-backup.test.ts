import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import { PrismaClient } from "@prisma/client";

import { formatBackupKey } from "./backup-plan.mjs";
import { assertSafeKey, createLocalBackupStorage, parseListObjectsXml } from "./backup-storage.mjs";
import {
  checkSqliteIntegrity,
  readBackupStatus,
  resolveSqlitePath,
  resolveStatusPath,
  runDbBackup,
  toSqliteUrl,
} from "./run-backup.mjs";

test("resolveSqlitePath handles absolute, relative and non-file URLs", () => {
  assert.equal(resolveSqlitePath("file:/data/expose.db", "/app"), path.normalize("/data/expose.db"));
  assert.equal(resolveSqlitePath('"file:/data/expose.db?connection_limit=1"', "/app"), path.normalize("/data/expose.db"));
  assert.equal(resolveSqlitePath("file:./dev.db", "/app"), path.resolve("/app", "prisma", "dev.db"));
  assert.equal(resolveSqlitePath("postgresql://x", "/app"), null);
  assert.equal(resolveSqlitePath(undefined, "/app"), null);
});

test("status file defaults to the database's folder (/data on Railway)", () => {
  assert.equal(
    resolveStatusPath({ DATABASE_URL: "file:/data/expose.db" }, "/app"),
    path.join(path.normalize("/data"), "backup-status.json"),
  );
  assert.equal(resolveStatusPath({ DATABASE_URL: "file:/data/expose.db", BACKUP_STATUS_PATH: "/tmp/s.json" }), path.resolve("/tmp/s.json"));
  assert.equal(resolveStatusPath({}), null);
});

test("backup keys cannot escape the storage root", () => {
  assert.equal(assertSafeKey("backups/db/expose-20261109-030405.db.gz"), "backups/db/expose-20261109-030405.db.gz");
  for (const key of ["", "/etc/passwd", "backups/../../x", "backups//x", "backups\\x", "./x"]) {
    assert.throws(() => assertSafeKey(key), /Invalid backup key/, key);
  }
});

test("parseListObjectsXml reads keys, sizes and continuation", () => {
  const xml = `<?xml version="1.0"?><ListBucketResult>
    <IsTruncated>true</IsTruncated>
    <Contents><Key>backups/db/expose-20261109-030405.db.gz</Key><LastModified>2026-11-09T03:04:06.000Z</LastModified><Size>1234</Size></Contents>
    <Contents><Key>backups/db/a&amp;b.txt</Key><Size>5</Size></Contents>
    <NextContinuationToken>abc&amp;def</NextContinuationToken></ListBucketResult>`;
  const page = parseListObjectsXml(xml);
  assert.equal(page.isTruncated, true);
  assert.equal(page.nextContinuationToken, "abc&def");
  assert.deepEqual(
    page.objects.map((object) => [object.key, object.size]),
    [["backups/db/expose-20261109-030405.db.gz", 1234], ["backups/db/a&b.txt", 5]],
  );
  assert.equal(page.objects[0].lastModified?.toISOString(), "2026-11-09T03:04:06.000Z");
});

async function createSampleDatabase(filePath: string) {
  const client = new PrismaClient({ datasourceUrl: toSqliteUrl(filePath) });
  try {
    await client.$executeRawUnsafe('CREATE TABLE "Album" (id INTEGER PRIMARY KEY, title TEXT NOT NULL)');
    for (let index = 1; index <= 50; index += 1) {
      await client.$executeRawUnsafe(`INSERT INTO "Album" (id, title) VALUES (${index}, 'album ${index} 相簿')`);
    }
  } finally {
    await client.$disconnect();
  }
}

test("runDbBackup snapshots, gzips, uploads to local storage, prunes and records status", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "expose-backup-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dbPath = path.join(root, "data", "expose.db");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(path.dirname(dbPath), { recursive: true }));
  await createSampleDatabase(dbPath);

  const tempDir = path.join(root, "tmp");
  const env = {
    DATA_BACKEND: "prisma",
    DATABASE_URL: toSqliteUrl(dbPath),
    STORAGE_BACKEND: "local",
    BACKUP_TMP_DIR: tempDir,
  };

  // An expired daily backup that retention should remove, and a foreign file it must keep.
  const storage = createLocalBackupStorage(path.join(root, "storage", "private"));
  const oldKey = formatBackupKey(new Date("2026-04-15T19:00:00Z"));
  await storage.put(oldKey, Buffer.from("old"));
  await storage.put("backups/db/README.txt", Buffer.from("keep me"));

  const now = new Date("2026-11-09T19:00:00Z");
  const logs: string[] = [];
  // Daily retention counts backups, not calendar days, so keep only 1 daily here to make the old one expire.
  const result = await runDbBackup({
    env,
    projectRoot: root,
    trigger: "test",
    now: () => now,
    log: (m) => logs.push(m),
    retention: { dailyCount: 1, monthlyCount: 6 },
  });

  assert.equal(result.ok, true, logs.join("\n"));
  assert.equal(result.key, "backups/db/expose-20261109-190000.db.gz");
  assert.equal(result.deleted, 1);
  assert.ok(logs.some((line) => line.startsWith("[backup] ok (test)")));

  const stored = await storage.get(result.key!);
  assert.ok(stored);
  const restoredPath = path.join(root, "restored.db");
  await writeFile(restoredPath, gunzipSync(stored));
  assert.equal(await checkSqliteIntegrity(restoredPath), "ok");
  const client = new PrismaClient({ datasourceUrl: toSqliteUrl(restoredPath) });
  try {
    const rows = await client.$queryRawUnsafe<{ n: bigint }[]>('SELECT COUNT(*) AS n FROM "Album"');
    assert.equal(Number(rows[0].n), 50);
  } finally {
    await client.$disconnect();
  }

  assert.equal(await storage.head(oldKey), null);
  assert.equal((await storage.get("backups/db/README.txt"))?.toString(), "keep me");
  // Temp snapshot and lock are cleaned up.
  assert.deepEqual(await readdir(tempDir), []);

  const status = await readBackupStatus(env, root);
  assert.equal(status.lastAttemptOk, true);
  assert.equal(status.lastSuccessAt, now.toISOString());
  assert.equal(status.lastKey, result.key);
  assert.equal(status.lastSizeBytes, stored.length);
  assert.ok(existsSync(path.join(root, "data", "backup-status.json")));
});

test("runDbBackup reports failures without throwing and keeps the last success", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "expose-backup-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const statusPath = path.join(root, "status.json");
  await writeFile(statusPath, JSON.stringify({ lastSuccessAt: "2026-11-08T19:00:00.000Z", lastKey: "k" }));
  const env = {
    DATA_BACKEND: "prisma",
    DATABASE_URL: toSqliteUrl(path.join(root, "missing.db")),
    STORAGE_BACKEND: "local",
    BACKUP_TMP_DIR: path.join(root, "tmp"),
    BACKUP_STATUS_PATH: statusPath,
  };

  const result = await runDbBackup({ env, projectRoot: root, log: () => {} });
  assert.equal(result.ok, false);
  assert.match(result.error!, /ENOENT/);

  const status = JSON.parse(await readFile(statusPath, "utf8"));
  assert.equal(status.lastAttemptOk, false);
  assert.equal(status.lastSuccessAt, "2026-11-08T19:00:00.000Z");
  assert.equal(status.lastKey, "k");
  assert.deepEqual(await readdir(path.join(root, "tmp")), []);
});

test("runDbBackup skips non-SQLite setups and concurrent runs", async (t) => {
  const skipped = await runDbBackup({ env: { DATA_BACKEND: "json" }, log: () => {} });
  assert.equal(skipped.skipped, true);

  const root = await mkdtemp(path.join(os.tmpdir(), "expose-backup-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tempDir = path.join(root, "tmp");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(tempDir, { recursive: true }));
  await writeFile(
    path.join(tempDir, "expose-db-backup.lock"),
    JSON.stringify({ pid: process.pid, at: new Date().toISOString() }),
  );
  const env = {
    DATA_BACKEND: "prisma",
    DATABASE_URL: toSqliteUrl(path.join(root, "x.db")),
    BACKUP_TMP_DIR: tempDir,
  };
  const busy = await runDbBackup({ env, projectRoot: root, log: () => {} });
  assert.equal(busy.skipped, true);
  assert.match(busy.error!, /正在執行/);
});
