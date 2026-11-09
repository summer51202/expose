"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import { runDbBackup } from "@/lib/backup/run-backup.mjs";

export type BackupNowState = {
  error?: string;
  success?: string;
};

export async function backupNowAction(): Promise<BackupNowState> {
  await requireAdminSession();

  const result = await runDbBackup({ trigger: "admin" });
  revalidatePath("/admin/backups");

  if (result.ok) {
    return { success: `備份完成：${result.key}` };
  }

  return { error: `備份失敗：${result.error ?? "未知錯誤"}` };
}
