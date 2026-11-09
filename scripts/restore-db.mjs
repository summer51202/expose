// Lists, downloads and verifies database backups. It NEVER replaces the live database:
// it writes the restored copy to --out, and swapping it in is a manual step
// (docs/runbooks/railway-runbook.md, "資料庫備份與還原").
//
//   npm run db:restore -- --list
//   npm run db:restore -- --latest --out /data/expose-restore.db
//   npm run db:restore -- --key backups/db/expose-20261109-190000.db.gz --out ./restore.db
//   add --compare <db file> to print row counts of both files side by side
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

import { PrismaClient } from "@prisma/client";

import { loadEnvFile } from "./lib/script-env.mjs";
import { BACKUP_PREFIX, parseBackupKey } from "../src/lib/backup/backup-plan.mjs";
import { getBackupStorage } from "../src/lib/backup/backup-storage.mjs";
import { checkSqliteIntegrity, resolveSqlitePath, toSqliteUrl } from "../src/lib/backup/run-backup.mjs";

const TABLES = ["Album", "Photo", "Comment", "PhotoLike", "AnalyticsDailyMetric", "AnalyticsDailyVisitor"];

export function parseArgs(argv) {
  const options = { list: false, latest: false, key: null, out: null, compare: null, force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`${arg} needs a value`);
      return value;
    };
    if (arg === "--list") options.list = true;
    else if (arg === "--latest") options.latest = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--key") options.key = next();
    else if (arg === "--out") options.out = next();
    else if (arg === "--compare") options.compare = next();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.list && !options.latest && !options.key) {
    throw new Error("Pass --list, --latest or --key <backup key>.");
  }
  if (options.latest && options.key) {
    throw new Error("Use either --latest or --key, not both.");
  }
  return options;
}

/**
 * Backups sorted newest first, ignoring objects that are not ours.
 * @param {{ key: string, size: number, lastModified: Date | null }[]} objects
 * @returns {{ key: string, size: number, lastModified: Date | null, date: Date }[]}
 */
export function sortBackups(objects) {
  return objects
    .map((object) => ({ ...object, date: parseBackupKey(object.key) }))
    .filter((object) => object.date)
    .sort((left, right) => right.date.getTime() - left.date.getTime());
}

/** Refuses to write over the live database or (without --force) any existing file. */
export function assertSafeOutput(outPath, liveDbPath, force) {
  const resolved = path.resolve(outPath);
  if (liveDbPath) {
    const live = path.resolve(liveDbPath);
    const same = process.platform === "win32" ? resolved.toLowerCase() === live.toLowerCase() : resolved === live;
    if (same || resolved.startsWith(`${live}-`)) {
      throw new Error(`Refusing to write to the live database (${live}). Pick another --out; replacing it is a manual step.`);
    }
  }
  if (!force && existsSync(resolved)) {
    throw new Error(`${resolved} already exists. Remove it or pass --force.`);
  }
  return resolved;
}

async function countRows(filePath) {
  const client = new PrismaClient({ datasourceUrl: toSqliteUrl(path.resolve(filePath)), log: ["error"] });
  try {
    const counts = {};
    for (const table of TABLES) {
      try {
        const rows = await client.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM "${table}"`);
        counts[table] = Number(rows[0].n);
      } catch {
        counts[table] = "(missing)";
      }
    }
    return counts;
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

const formatSize = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

async function main() {
  loadEnvFile();
  const options = parseArgs(process.argv.slice(2));
  const storage = getBackupStorage();
  const backups = sortBackups(await storage.list(BACKUP_PREFIX));

  if (options.list) {
    console.log(`Backups in ${storage.location}/${BACKUP_PREFIX} (newest first):`);
    for (const backup of backups) {
      console.log(`  ${backup.key}  ${formatSize(backup.size).padStart(10)}  ${backup.date.toISOString()}`);
    }
    if (backups.length === 0) console.log("  (none)");
    if (!options.latest && !options.key) return;
  }

  const key = options.latest ? backups[0]?.key : options.key;
  if (!key) {
    throw new Error("No backups found.");
  }
  if (!parseBackupKey(key)) {
    throw new Error(`Not a backup key: ${key} (expected ${BACKUP_PREFIX}expose-YYYYMMDD-HHmmss.db.gz)`);
  }

  const defaultOut = path.join(os.tmpdir(), path.basename(key).replace(/\.gz$/, ""));
  const outPath = assertSafeOutput(
    options.out ?? defaultOut,
    resolveSqlitePath(process.env.DATABASE_URL),
    options.force,
  );

  console.log(`Downloading ${storage.location}/${key} ...`);
  const compressed = await storage.get(key);
  if (!compressed) {
    throw new Error(`Backup not found: ${key}`);
  }
  const database = gunzipSync(compressed);
  await mkdir(path.dirname(outPath), { recursive: true });
  await rm(outPath, { force: true });
  await writeFile(outPath, database);
  console.log(`Wrote ${outPath} (${formatSize(database.length)}, ${formatSize(compressed.length)} compressed)`);

  const integrity = await checkSqliteIntegrity(outPath);
  console.log(`PRAGMA integrity_check: ${integrity}`);
  if (integrity !== "ok") {
    throw new Error("Integrity check failed. Do not use this file; try an older backup.");
  }

  const restoredCounts = await countRows(outPath);
  const compareCounts = options.compare ? await countRows(options.compare) : null;
  console.log(compareCounts ? `\nRow counts (restored vs ${options.compare}):` : "\nRow counts:");
  for (const table of TABLES) {
    const line = `  ${table.padEnd(22)} ${String(restoredCounts[table]).padStart(8)}`;
    console.log(compareCounts ? `${line}  ${String(compareCounts[table]).padStart(8)}` : line);
  }

  console.log(
    "\nThe live database was NOT changed. To use this copy, follow the manual steps in\n" +
      'docs/runbooks/railway-runbook.md ("資料庫備份與還原").',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[restore] ${error?.message ?? error}`);
    process.exit(1);
  });
}
