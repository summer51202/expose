const DEFAULT_ANALYTICS_TIMEZONE = "Asia/Taipei";
const ISO_DATE_LENGTH = 10;

export function getAnalyticsTimezone() {
  return process.env.ANALYTICS_TIMEZONE || DEFAULT_ANALYTICS_TIMEZONE;
}

export function getAnalyticsDateKey(date = new Date(), timezone = getAnalyticsTimezone()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function parseDateKeyAsUtcNoon(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

function addDays(dateKey: string, days: number) {
  const date = parseDateKeyAsUtcNoon(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
}

function getDateKeyParts(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

function listDateKeys(startKey: string, endKey: string) {
  const keys: string[] = [];
  for (let key = startKey; key <= endKey; key = addDays(key, 1)) {
    keys.push(key);
  }
  return keys;
}

function getMondayStartKey(dateKey: string) {
  const date = parseDateKeyAsUtcNoon(dateKey);
  const day = date.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return addDays(dateKey, -daysSinceMonday);
}

export function getAnalyticsPeriodRanges(
  date = new Date(),
  timezone = getAnalyticsTimezone(),
) {
  const todayKey = getAnalyticsDateKey(date, timezone);
  const { year, month } = getDateKeyParts(todayKey);
  const monthStartKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const yearStartKey = `${year}-01-01`;
  const weekStartKey = getMondayStartKey(todayKey);

  return {
    today: [todayKey],
    week: listDateKeys(weekStartKey, todayKey),
    month: listDateKeys(monthStartKey, todayKey),
    year: listDateKeys(yearStartKey, todayKey),
  };
}

export function getLatestAnalyticsDateKeys(
  date = new Date(),
  timezone = getAnalyticsTimezone(),
  limit = 30,
) {
  const keys: string[] = [];
  let currentKey = getAnalyticsDateKey(date, timezone);

  for (let index = 0; index < limit; index += 1) {
    keys.push(currentKey);
    currentKey = addDays(currentKey, -1);
  }

  return keys;
}
