// Production entrypoint (Railway start command, see .railway/railway.ts): runs `next start` and turns a
// platform-requested shutdown into a clean exit.
//
// Next 16 exits with 143 (128 + SIGTERM) after a graceful shutdown, and `npm start`
// reports that as "npm error signal SIGTERM". Railway sends SIGTERM to the old
// container on every redeploy, so both made each deploy show "Deployment crashed".
// Here SIGTERM/SIGINT are forwarded to Next, and once Next stops we exit 0.
// A crash that was not requested keeps its non-zero exit code.
//
// It also schedules database backups (scripts/backup-db.mjs) in a child process: the
// SQLite file lives on the /data volume, which only this service can mount. A backup
// failure is only logged; it never stops the site, and shutdown stops any running backup.
//
// EXPOSE_MAINTENANCE=1 starts neither Next nor backups and just stays up, so the
// database can be swapped over `railway ssh` while nothing writes to it (restore runbook).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BACKUP_SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "backup-db.mjs");

/** Exit code for this wrapper once the Next child process has exited. */
export function resolveExitCode({ shutdownRequested, code, signal }) {
  if (shutdownRequested) {
    return 0;
  }
  if (typeof code === "number") {
    return code;
  }
  return signal ? 1 : 0;
}

/** Automatic backups run for the SQLite (prisma) backend unless BACKUP_DISABLED=1. */
export function shouldScheduleBackups(env) {
  return env.DATA_BACKEND === "prisma" && env.BACKUP_DISABLED !== "1" && env.EXPOSE_MAINTENANCE !== "1";
}

/**
 * Runs `runBackup(mode)` once after `startupDelayMs` ("startup") and then every
 * `intervalMs` ("scheduled"); the backup script decides whether one is actually due.
 * Never runs two at once. `stop()` cancels the timers and the running backup.
 */
export function createBackupScheduler({
  runBackup,
  startupDelayMs = 60_000,
  intervalMs = 10 * 60_000,
  timers = { setTimeout, clearTimeout, setInterval, clearInterval },
  log = (message) => console.log(message),
}) {
  let running = null;
  let stopped = false;
  let startupTimer = null;
  let intervalTimer = null;

  const trigger = (mode) => {
    if (stopped || running) {
      return;
    }
    try {
      running = runBackup(mode);
    } catch (error) {
      log(`[start] could not start backup: ${error?.message ?? error}`);
      running = null;
      return;
    }
    Promise.resolve(running.done)
      .catch((error) => log(`[start] backup process error: ${error?.message ?? error}`))
      .finally(() => {
        running = null;
      });
  };

  return {
    start() {
      startupTimer = timers.setTimeout(() => trigger("startup"), startupDelayMs);
      intervalTimer = timers.setInterval(() => trigger("scheduled"), intervalMs);
      startupTimer?.unref?.();
      intervalTimer?.unref?.();
    },
    stop() {
      stopped = true;
      timers.clearTimeout(startupTimer);
      timers.clearInterval(intervalTimer);
      running?.cancel();
    },
    get isRunning() {
      return running !== null;
    },
  };
}

function spawnBackup(mode) {
  const child = spawn(process.execPath, [BACKUP_SCRIPT, `--if-due=${mode}`], {
    stdio: "inherit",
    env: process.env,
  });
  const done = new Promise((resolve) => {
    child.on("error", (error) => {
      console.log(`[start] backup process error: ${error.message}`);
      resolve();
    });
    child.on("exit", (code, signal) => {
      if (code !== 0) {
        console.log(`[start] backup process exited with ${code ?? signal} (site keeps running)`);
      }
      resolve();
    });
  });
  return {
    done,
    cancel: () => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    },
  };
}

function runMaintenance() {
  console.log("[start] EXPOSE_MAINTENANCE=1: not starting the site or backups; waiting for `railway ssh`.");
  const keepAlive = setInterval(() => {}, 60 * 60_000);
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => {
      clearInterval(keepAlive);
      process.exit(0);
    });
  }
}

function main() {
  if (process.env.EXPOSE_MAINTENANCE === "1") {
    runMaintenance();
    return;
  }

  const require = createRequire(import.meta.url);
  const nextBin = require.resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "start", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env,
  });
  let shutdownRequested = false;

  const scheduler = shouldScheduleBackups(process.env) ? createBackupScheduler({ runBackup: spawnBackup }) : null;
  scheduler?.start();

  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => {
      shutdownRequested = true;
      scheduler?.stop();
      child.kill(signal);
    });
  }

  child.on("exit", (code, signal) => {
    scheduler?.stop();
    if (shutdownRequested) {
      console.log(`[start] next stopped after shutdown request (code ${code ?? signal}); exiting 0`);
    }
    process.exit(resolveExitCode({ shutdownRequested, code, signal }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
