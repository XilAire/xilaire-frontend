"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUniversityAccountSuspensionAction } from "@/app/actions/university-admin-users";

export default function AdminUserSuspensionManager({userId, suspended, reason: previousReason, canManage}: {
  userId: string; suspended: boolean; reason: string | null; canManage: boolean;
}) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return <div className="mt-5 rounded-xl border border-[var(--border-default)] p-4 space-y-3">
    <p className="font-bold text-[var(--text-primary)]">CASE University access: {suspended ? "Suspended" : "Not suspended"}</p>
    {previousReason && <p className="text-sm text-[var(--text-secondary)]">Last recorded reason: {previousReason}</p>}
    {!canManage ? <p className="text-sm text-[var(--text-muted)]">Read-only: insufficient permissions to change account security.</p> : <>
      <label htmlFor="university-suspension-reason" className="block text-sm font-semibold">Reason for {suspended ? "restoration" : "suspension"} (10–1000 characters)</label>
      <textarea id="university-suspension-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={3} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] p-3 text-[var(--text-primary)]" />
      <button type="button" disabled={pending || reason.trim().length < 10} className="rounded-lg bg-[var(--primary)] px-4 py-2 font-bold text-white disabled:opacity-50" onClick={() => {
        const action = suspended ? "restore" : "suspend";
        if (!window.confirm(`Confirm ${action} of this user's CASE University access?`)) return;
        startTransition(async () => {
          const result = await updateUniversityAccountSuspensionAction({userId, suspend: !suspended, reason});
          setMessage(result.message);
          if (result.success) {setReason(""); router.refresh();}
        });
      }}>{pending ? "Saving..." : suspended ? "Restore University Access" : "Suspend University Access"}</button>
    </>}
    {message && <p role="status" className="text-sm text-[var(--text-secondary)]">{message}</p>}
  </div>;
}
