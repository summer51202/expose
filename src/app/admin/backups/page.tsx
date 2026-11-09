import { BackupNowButton } from "@/app/admin/backups/backup-now-button";
import { AdminShell } from "@/components/admin/admin-shell";
import { Panel } from "@/components/ui/panel";
import { requireAdminSession } from "@/lib/auth/session";
import { BACKUP_PREFIX, parseBackupKey, resolveBackupHourUtc } from "@/lib/backup/backup-plan.mjs";
import { getBackupStorage } from "@/lib/backup/backup-storage.mjs";
import { readBackupStatus } from "@/lib/backup/run-backup.mjs";

const triggerLabels: Record<string, string> = {
  admin: "後台手動",
  cli: "指令手動",
  "auto-startup": "啟動補做",
  "auto-scheduled": "每日排程",
};

function formatTime(value?: string | Date | null) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
}

function formatBytes(bytes?: number) {
  if (typeof bytes !== "number") {
    return "—";
  }
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

async function listRecentBackups() {
  try {
    const objects = await getBackupStorage().list(BACKUP_PREFIX);
    const backups = objects
      .map((object) => ({ ...object, date: parseBackupKey(object.key) }))
      .filter((object) => object.date !== null)
      .sort((left, right) => right.date!.getTime() - left.date!.getTime());
    return { backups, error: null };
  } catch (error) {
    return { backups: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export default async function AdminBackupsPage() {
  const session = await requireAdminSession();
  const [status, { backups, error: listError }] = await Promise.all([readBackupStatus(), listRecentBackups()]);
  const hourUtc = resolveBackupHourUtc(process.env.BACKUP_HOUR_UTC);
  const taipeiHour = (hourUtc + 8) % 24;
  const attempted = Boolean(status.lastAttemptAt);

  return (
    <AdminShell username={session.username}>
      <div className="grid gap-6">
        <Panel>
          <h2 className="text-2xl font-semibold text-stone-900">資料庫備份</h2>
          <p className="mt-3 leading-7 text-stone-700">
            每天台北時間 {String(taipeiHour).padStart(2, "0")}:00 後自動備份一次資料庫（相簿、照片資訊、留言、按讚、統計），
            啟動時如果超過 24 小時沒有成功的備份會補做。保留最近 14 份每日備份（每天只算最新的一份），加上 6 個月內每月最早的一份。
            圖片檔在 R2，不在這份備份裡。
          </p>

          <dl className="mt-6 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-stone-500">最近一次執行</dt>
            <dd className="text-stone-900">
              {attempted ? (
                <>
                  {formatTime(status.lastAttemptAt)}（{triggerLabels[status.lastTrigger ?? ""] ?? status.lastTrigger}）{" "}
                  {status.lastAttemptOk ? (
                    <span className="font-medium text-emerald-700">成功</span>
                  ) : (
                    <span className="font-medium text-rose-700">失敗</span>
                  )}
                </>
              ) : (
                "尚未執行過"
              )}
            </dd>
            {status.lastAttemptOk === false && status.lastError ? (
              <>
                <dt className="text-stone-500">錯誤訊息</dt>
                <dd className="break-all text-rose-700">{status.lastError}</dd>
              </>
            ) : null}
            <dt className="text-stone-500">最近一次成功</dt>
            <dd className="text-stone-900">{formatTime(status.lastSuccessAt)}</dd>
            <dt className="text-stone-500">備份檔</dt>
            <dd className="break-all text-stone-900">{status.lastKey ?? "—"}</dd>
            <dt className="text-stone-500">大小</dt>
            <dd className="text-stone-900">
              {formatBytes(status.lastSizeBytes)}
              {status.lastDbSizeBytes ? `（資料庫原始 ${formatBytes(status.lastDbSizeBytes)}）` : null}
            </dd>
            <dt className="text-stone-500">儲存位置</dt>
            <dd className="break-all text-stone-900">{status.storage ?? "—"}</dd>
          </dl>

          <div className="mt-6">
            <BackupNowButton />
          </div>
        </Panel>

        <Panel>
          <h3 className="text-xl font-semibold text-stone-900">目前保留的備份</h3>
          {listError ? (
            <p className="mt-3 text-sm break-all text-rose-700">無法讀取備份清單：{listError}</p>
          ) : backups.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">還沒有備份。</p>
          ) : (
            <ul className="mt-4 grid gap-2 text-sm">
              {backups.map((backup) => (
                <li
                  key={backup.key}
                  className="flex flex-wrap justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2"
                >
                  <span className="break-all text-stone-800">{backup.key}</span>
                  <span className="text-stone-500">
                    {formatTime(backup.date)} · {formatBytes(backup.size)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm leading-6 text-stone-600">
            還原不會自動進行，請依照 docs/runbooks/railway-runbook.md 的「資料庫備份與還原」手動操作。
          </p>
        </Panel>
      </div>
    </AdminShell>
  );
}
