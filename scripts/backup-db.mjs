// Backs up the SQLite database to private backup storage.
//
//   npm run db:backup                     run a backup now
//   node scripts/backup-db.mjs --if-due=startup     only if no success in the last 24h
//   node scripts/backup-db.mjs --if-due=scheduled   only if today's daily slot was missed
//
// scripts/start.mjs runs this as a child process so a crash here cannot take the site down.
// On Railway the database is on the /data volume, so run it there:
//   railway ssh --service expose -- npm run db:backup
import { pathToFileURL } from "node:url";

import { loadEnvFile } from "./lib/script-env.mjs";
import { isBackupDue, resolveBackupHourUtc } from "../src/lib/backup/backup-plan.mjs";
import { readBackupStatus, runDbBackup } from "../src/lib/backup/run-backup.mjs";

export function parseArgs(argv) {
  const ifDue = argv.find((arg) => arg.startsWith("--if-due"))?.split("=")[1];
  if (ifDue !== undefined && ifDue !== "startup" && ifDue !== "scheduled") {
    throw new Error(`--if-due must be "startup" or "scheduled", got "${ifDue}"`);
  }
  return { ifDue };
}

async function main() {
  loadEnvFile();
  const { ifDue } = parseArgs(process.argv.slice(2));

  if (ifDue) {
    const status = await readBackupStatus();
    const due = isBackupDue(status, new Date(), {
      mode: ifDue,
      hourUtc: resolveBackupHourUtc(process.env.BACKUP_HOUR_UTC),
    });
    if (!due) {
      return 0;
    }
  }

  const controller = new AbortController();
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => {
      console.log(`[backup] ${signal} received, aborting`);
      controller.abort();
      // runDbBackup cleans up at the next step; do not hold up the container's shutdown.
      setTimeout(() => process.exit(1), 5000).unref();
    });
  }

  const result = await runDbBackup({
    trigger: ifDue ? `auto-${ifDue}` : "cli",
    signal: controller.signal,
  });
  return result.ok || result.skipped ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`[backup] failed: ${error?.stack ?? error}`);
      process.exit(1);
    },
  );
}
