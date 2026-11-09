"use client";

import { useActionState } from "react";

import { backupNowAction, type BackupNowState } from "@/app/admin/backups/actions";
import { Button } from "@/components/ui/button";

const initialState: BackupNowState = {};

export function BackupNowButton() {
  const [state, formAction, pending] = useActionState(backupNowAction, initialState);

  return (
    <form action={formAction} className="grid gap-3">
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "備份中..." : "立即備份"}
        </Button>
      </div>
      {state.error ? <p className="text-sm break-all text-rose-700">{state.error}</p> : null}
      {state.success ? <p className="text-sm break-all text-emerald-700">{state.success}</p> : null}
    </form>
  );
}
