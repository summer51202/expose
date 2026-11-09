// Pure helpers for database backups: object naming, retention and scheduling.
// Plain ESM (no TypeScript) so scripts/start.mjs and scripts/backup-db.mjs can run it
// with plain `node`; the Next app imports the same file. All dates are UTC.

export const BACKUP_PREFIX = "backups/db/";
export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

/** Default retention: newest backup of each of the last 14 days, plus one per month for 6 months. */
export const DEFAULT_RETENTION = { dailyCount: 14, monthlyCount: 6 };

const KEY_PATTERN = /^backups\/db\/expose-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.db\.gz$/;

const pad = (value, length = 2) => String(value).padStart(length, "0");

/** `backups/db/expose-YYYYMMDD-HHmmss.db.gz` for a date (UTC). */
export function formatBackupKey(date) {
  return (
    `${BACKUP_PREFIX}expose-` +
    `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}.db.gz`
  );
}

/** The backup time encoded in a key, or null when the key is not a backup made by this code. */
export function parseBackupKey(key) {
  const match = KEY_PATTERN.exec(key);
  if (!match) {
    return null;
  }

  const [year, month, day, hours, minutes, seconds] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

  // Reject impossible dates such as 20261341 (Date.UTC would roll them over).
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  return date;
}

const dayKey = (date) => date.toISOString().slice(0, 10);
const monthKey = (date) => date.toISOString().slice(0, 7);

/**
 * Splits backup keys into those to keep and those to delete.
 *
 * - Daily: the newest backup of each of the `dailyCount` most recent days that have one.
 * - Monthly: for each of the last `monthlyCount` calendar months (the current month counts),
 *   the earliest backup of that month, which is the 1st-of-month backup when one exists.
 * - Keys that do not look like our backups are never deleted.
 * - The newest backup is always kept.
 */
export function planRetention(keys, now, { dailyCount, monthlyCount } = DEFAULT_RETENTION) {
  const backups = [];
  const unknown = [];

  for (const key of keys) {
    const date = parseBackupKey(key);
    if (date) {
      backups.push({ key, date });
    } else {
      unknown.push(key);
    }
  }

  // Newest first.
  backups.sort((left, right) => right.date.getTime() - left.date.getTime() || right.key.localeCompare(left.key));

  const keep = new Set();

  if (backups.length > 0) {
    keep.add(backups[0].key);
  }

  const seenDays = new Set();
  for (const backup of backups) {
    const day = dayKey(backup.date);
    if (seenDays.has(day)) {
      continue;
    }
    if (seenDays.size >= dailyCount) {
      break;
    }
    seenDays.add(day);
    keep.add(backup.key);
  }

  const keptMonths = new Set();
  const nowMonthIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  for (const month of Array.from({ length: monthlyCount }, (_, index) => nowMonthIndex - index)) {
    keptMonths.add(`${Math.floor(month / 12)}-${pad((month % 12) + 1)}`);
  }

  const earliestPerMonth = new Map();
  for (const backup of backups) {
    // Iterating newest first, so the last write per month is the earliest backup.
    earliestPerMonth.set(monthKey(backup.date), backup);
  }
  for (const [month, backup] of earliestPerMonth) {
    if (keptMonths.has(month)) {
      keep.add(backup.key);
    }
  }

  return {
    keep: backups.filter((backup) => keep.has(backup.key)).map((backup) => backup.key),
    delete: backups.filter((backup) => !keep.has(backup.key)).map((backup) => backup.key),
    ignored: unknown,
  };
}

/** The most recent daily slot (hourUtc:00 UTC) at or before `now`. */
export function latestScheduledSlot(now, hourUtc) {
  const slot = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc));
  if (slot.getTime() > now.getTime()) {
    slot.setTime(slot.getTime() - DAY_MS);
  }
  return slot;
}

/**
 * Whether a backup should run now.
 *
 * - `startup`: run when there is no successful backup in the last `maxAgeMs` (24h).
 * - `scheduled`: run once per day, after the daily slot (`hourUtc`), if the last success
 *   is older than that slot.
 * Either way, after a failed attempt wait `retryAfterMs` before trying again.
 */
export function isBackupDue(
  { lastSuccessAt, lastAttemptAt, lastAttemptOk } = {},
  now,
  { mode = "scheduled", hourUtc = 19, maxAgeMs = DAY_MS, retryAfterMs = HOUR_MS } = {},
) {
  const lastSuccess = toDate(lastSuccessAt);
  const lastAttempt = toDate(lastAttemptAt);

  if (lastAttempt && lastAttemptOk === false && now.getTime() - lastAttempt.getTime() < retryAfterMs) {
    return false;
  }

  if (!lastSuccess) {
    return true;
  }

  if (mode === "startup") {
    return now.getTime() - lastSuccess.getTime() >= maxAgeMs;
  }

  return lastSuccess.getTime() < latestScheduledSlot(now, hourUtc).getTime();
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Parses BACKUP_HOUR_UTC (0-23); defaults to 19 UTC = 03:00 Asia/Taipei. */
export function resolveBackupHourUtc(value) {
  const hour = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 19;
}
