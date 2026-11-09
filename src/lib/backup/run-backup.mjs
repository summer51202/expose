// Takes a consistent SQLite snapshot (VACUUM INTO), gzips it, uploads it to backup
// storage, prunes old backups and records the result in a small status file.
//
// Used by scripts/backup-db.mjs (scheduled from scripts/start.mjs and `npm run db:backup`)
// and by the admin "立即備份" action. Never throws: failures come back as { ok: false }.
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, open, readFile, rename, rm, stat, statfs, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

import { PrismaClient } from "@prisma/client";

import { BACKUP_PREFIX, DEFAULT_RETENTION, formatBackupKey, planRetention } from "./backup-plan.mjs";
import { getBackupStorage } from "./backup-storage.mjs";

const LOCK_NAME = "expose-db-backup.lock";
const STALE_LOCK_MS = 30 * 60 * 1000;

/**
 * @typedef {Record<string, string | undefined>} Env
 * @typedef {{
 *   lastAttemptAt?: string,
 *   lastAttemptOk?: boolean,
 *   lastTrigger?: string,
 *   lastError?: string | null,
 *   lastSuccessAt?: string,
 *   lastKey?: string,
 *   lastSizeBytes?: number,
 *   lastDbSizeBytes?: number,
 *   lastDurationMs?: number,
 *   lastDeletedCount?: number,
 *   storage?: string,
 * }} BackupStatus
 */

/**
 * Path of the SQLite file behind a `file:` DATABASE_URL, or null for other URLs.
 * Relative paths resolve against the prisma/ folder, like Prisma does.
 */
export function resolveSqlitePath(databaseUrl, projectRoot = process.cwd()) {
  const value = databaseUrl?.trim().replace(/^"|"$/g, "");
  if (!value?.startsWith("file:")) {
    return null;
  }
  const filePath = value.slice("file:".length).split("?")[0];
  if (!filePath) {
    return null;
  }
  return path.isAbsolute(filePath) ? path.normalize(filePath) : path.resolve(projectRoot, "prisma", filePath);
}

/** `file:` URL Prisma accepts for an absolute path (forward slashes, also on Windows). */
export function toSqliteUrl(filePath) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

/**
 * Where the status JSON lives: BACKUP_STATUS_PATH, else next to the database file.
 * @param {Env} [env]
 * @param {string} [projectRoot]
 */
export function resolveStatusPath(env = process.env, projectRoot = process.cwd()) {
  if (env.BACKUP_STATUS_PATH?.trim()) {
    return path.resolve(env.BACKUP_STATUS_PATH.trim());
  }
  const dbPath = resolveSqlitePath(env.DATABASE_URL, projectRoot);
  return dbPath ? path.join(path.dirname(dbPath), "backup-status.json") : null;
}

/**
 * @param {Env} [env]
 * @param {string} [projectRoot]
 * @returns {Promise<BackupStatus>}
 */
export async function readBackupStatus(env = process.env, projectRoot = process.cwd()) {
  const statusPath = resolveStatusPath(env, projectRoot);
  if (!statusPath) {
    return {};
  }
  try {
    return JSON.parse(await readFile(statusPath, "utf8"));
  } catch {
    return {};
  }
}

async function writeBackupStatus(statusPath, status) {
  const temp = `${statusPath}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(status, null, 2)}\n`);
  await rename(temp, statusPath);
}

/**
 * Temp folder for the snapshot and its .gz. Defaults to the OS temp dir (/tmp on Railway):
 * the /data volume is only 500MB and also holds the live database, so filling it with a
 * snapshot could make the site's own writes fail.
 * @param {Env} [env]
 */
export function resolveTempDir(env = process.env) {
  return path.resolve(env.BACKUP_TMP_DIR?.trim() || os.tmpdir());
}

async function acquireLock(tempDir) {
  const lockPath = path.join(tempDir, LOCK_NAME);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      await handle.close();
      return async () => rm(lockPath, { force: true });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if (!(await isStaleLock(lockPath))) return null;
      await rm(lockPath, { force: true });
    }
  }
  return null;
}

async function isStaleLock(lockPath) {
  try {
    const { pid, at } = JSON.parse(await readFile(lockPath, "utf8"));
    if (Date.now() - new Date(at).getTime() > STALE_LOCK_MS) return true;
    try {
      process.kill(pid, 0);
      return false;
    } catch (error) {
      return error?.code === "ESRCH";
    }
  } catch {
    return true;
  }
}

async function freeBytes(directory) {
  try {
    const info = await statfs(directory);
    return Number(info.bavail) * Number(info.bsize);
  } catch {
    return null;
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new Error("Backup aborted (shutdown requested).");
  }
}

async function withClient(url, run) {
  const client = new PrismaClient({ datasourceUrl: url, log: ["error"] });
  try {
    return await run(client);
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

/** Runs `PRAGMA integrity_check` (or quick_check) on a SQLite file; returns the joined result ("ok" when healthy). */
export async function checkSqliteIntegrity(filePath, { quick = false } = {}) {
  return withClient(toSqliteUrl(path.resolve(filePath)), async (client) => {
    const rows = await client.$queryRawUnsafe(quick ? "PRAGMA quick_check" : "PRAGMA integrity_check");
    return rows.map((row) => Object.values(row)[0]).join("; ");
  });
}

const formatBytes = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;

/**
 * Runs one backup. Resolves to { ok, skipped?, key?, sizeBytes?, error? }; never rejects.
 * @param {{ env?: Env, projectRoot?: string, trigger?: string, now?: () => Date,
 *           signal?: AbortSignal, log?: (message: string) => void, retention?: typeof DEFAULT_RETENTION }} [options]
 */
export async function runDbBackup({
  env = process.env,
  projectRoot = process.cwd(),
  trigger = "manual",
  now = () => new Date(),
  signal,
  log = (message) => console.log(message),
  retention = DEFAULT_RETENTION,
} = {}) {
  const dbPath = resolveSqlitePath(env.DATABASE_URL, projectRoot);
  if (env.DATA_BACKEND !== "prisma" || !dbPath) {
    const reason = "Database backups need DATA_BACKEND=prisma and a file: DATABASE_URL (SQLite).";
    log(`[backup] skipped: ${reason}`);
    return { ok: false, skipped: true, error: reason };
  }

  const statusPath = resolveStatusPath(env, projectRoot);
  const tempDir = resolveTempDir(env);
  await mkdir(tempDir, { recursive: true }).catch(() => {});

  let release;
  try {
    release = await acquireLock(tempDir);
  } catch (error) {
    log(`[backup] failed: cannot create lock in ${tempDir}: ${error.message}`);
    return { ok: false, error: `Cannot create lock: ${error.message}` };
  }
  if (!release) {
    log("[backup] skipped: another backup is already running");
    return { ok: false, skipped: true, error: "另一個備份正在執行中。" };
  }

  const startedAt = now();
  const key = formatBackupKey(startedAt);
  const stamp = `${startedAt.getTime()}-${process.pid}`;
  const snapshotPath = path.join(tempDir, `expose-snapshot-${stamp}.db`);
  const gzipPath = `${snapshotPath}.gz`;
  const previous = await readBackupStatus(env, projectRoot);
  /** @type {BackupStatus} */
  const status = { ...previous, lastAttemptAt: startedAt.toISOString(), lastTrigger: trigger };

  let result;
  try {
    const storage = getBackupStorage(env, projectRoot);
    status.storage = storage.location;

    const dbSize = (await stat(/*turbopackIgnore: true*/ dbPath)).size;
    const available = await freeBytes(tempDir);
    // Snapshot (<= db size) plus its gzip (smaller), with some headroom.
    if (available !== null && available < dbSize * 2.2) {
      throw new Error(`Not enough free space in ${tempDir}: ${formatBytes(available)} free, need about ${formatBytes(dbSize * 2.2)}.`);
    }
    throwIfAborted(signal);

    // VACUUM INTO writes a transactionally consistent copy while the site keeps running.
    await withClient(toSqliteUrl(dbPath), (client) =>
      client.$executeRawUnsafe(`VACUUM INTO '${snapshotPath.replace(/\\/g, "/").replace(/'/g, "''")}'`),
    );
    throwIfAborted(signal);

    const check = await checkSqliteIntegrity(snapshotPath, { quick: true });
    if (check !== "ok") {
      throw new Error(`Snapshot failed quick_check: ${check}`);
    }

    await pipeline(createReadStream(snapshotPath), createGzip({ level: 9 }), createWriteStream(gzipPath));
    const body = await readFile(gzipPath);
    throwIfAborted(signal);

    await storage.put(key, body);
    const storedSize = await storage.head(key);
    if (storedSize !== body.length) {
      throw new Error(`Uploaded size mismatch for ${key}: expected ${body.length}, got ${storedSize}.`);
    }

    let deleted = 0;
    try {
      const objects = await storage.list(BACKUP_PREFIX);
      const plan = planRetention(
        objects.map((object) => object.key),
        startedAt,
        retention,
      );
      for (const oldKey of plan.delete) {
        await storage.delete(oldKey);
        deleted += 1;
      }
    } catch (error) {
      log(`[backup] warning: retention cleanup failed (backup itself is fine): ${error.message}`);
    }

    const durationMs = now().getTime() - startedAt.getTime();
    Object.assign(status, {
      lastAttemptOk: true,
      lastError: null,
      lastSuccessAt: startedAt.toISOString(),
      lastKey: key,
      lastSizeBytes: body.length,
      lastDbSizeBytes: dbSize,
      lastDurationMs: durationMs,
      lastDeletedCount: deleted,
    });
    log(
      `[backup] ok (${trigger}): ${storage.location}/${key} ` +
        `${formatBytes(body.length)} gz from ${formatBytes(dbSize)} db in ${(durationMs / 1000).toFixed(1)}s; ` +
        `retention removed ${deleted}`,
    );
    result = { ok: true, key, sizeBytes: body.length, dbSizeBytes: dbSize, deleted };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Object.assign(status, { lastAttemptOk: false, lastError: message });
    log(`[backup] failed (${trigger}): ${message}`);
    result = { ok: false, error: message };
  } finally {
    await rm(snapshotPath, { force: true }).catch(() => {});
    await rm(gzipPath, { force: true }).catch(() => {});
    if (statusPath) {
      await writeBackupStatus(statusPath, status).catch((error) =>
        log(`[backup] warning: could not write status file ${statusPath}: ${error.message}`),
      );
    }
    await release().catch(() => {});
  }

  return result;
}
