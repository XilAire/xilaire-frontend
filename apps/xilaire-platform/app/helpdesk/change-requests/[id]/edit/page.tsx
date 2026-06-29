"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import StatusPill from "../components/StatusPill";

type User = {
  id: string;
  full_name: string;
};

type Approval = {
  id: string;
  status: string;
};

type StatusOption = {
  key: string;
  label: string;
};

type ChangeRequest = {
  id: string;
  title: string;
  summary?: string;
  description?: string;
  requested_by?: string | null;
  assigned_to?: string | null;
  status?: string;
  risk_level?: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
};

export default function EditChangeRequestPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [change, setChange] = useState<ChangeRequest | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [statuses, setStatuses] = useState<StatusOption[]>([]);

  /* ------------------------------------------------
     LOAD DATA
  ------------------------------------------------ */
  useEffect(() => {
    async function load() {
      const [
        { data: change },
        { data: users },
        { data: approval },
        { data: statuses },
      ] = await Promise.all([
        supabasePlatform
          .from("change_requests")
          .select("*")
          .eq("id", id)
          .single(),

        supabasePlatform
          .from("profiles")
          .select("id, full_name")
          .order("full_name"),

        supabasePlatform
          .from("change_request_approvals")
          .select("*")
          .eq("change_request_id", id)
          .order("step", { ascending: true })
          .limit(1)
          .single(),

        supabasePlatform
          .from("change_request_statuses")
          .select("key, label")
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      if (!change) return;

      setChange(change);
      setUsers(users ?? []);
      setApproval(approval ?? null);
      setStatuses(statuses ?? []);
      setLoading(false);
    }

    load();
  }, [id]);

  /* ------------------------------------------------
     SAVE (ERROR VISIBILITY ENABLED)
  ------------------------------------------------ */
  async function handleSave() {
    if (!change) return;

    setSaving(true);

    const { error } = await supabasePlatform
      .from("change_requests")
      .update({
        title: change.title,
        summary: change.summary,
        description: change.description,
        requested_by: change.requested_by,
        assigned_to: change.assigned_to,
        status: change.status,
        risk_level: change.risk_level,
        scheduled_start: change.scheduled_start,
        scheduled_end: change.scheduled_end,
      })
      .eq("id", change.id);

    setSaving(false);

    if (error) {
      console.error("❌ Save failed:", error);
      alert(`Save failed: ${error.message}`);
      return;
    }

    router.push(`/helpdesk/change-requests/${change.id}`);
  }

  /* ------------------------------------------------
     APPROVAL ACTIONS
  ------------------------------------------------ */
  async function updateApproval(status: "approved" | "rejected") {
    if (!approval) return;

    const { error: approvalError } = await supabasePlatform
      .from("change_request_approvals")
      .update({ status })
      .eq("id", approval.id);

    if (approvalError) {
      alert(`Approval update failed: ${approvalError.message}`);
      return;
    }

    await supabasePlatform
      .from("change_requests")
      .update({
        status: status === "approved" ? "scheduled" : "rejected",
      })
      .eq("id", id);

    router.refresh();
  }

  if (loading || !change) {
    return (
      <div className="p-6 text-slate-400">
        Loading change request…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Edit Change Request
          </h1>
          <p className="text-sm text-slate-400">ID: {change.id}</p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/helpdesk/change-requests/${change.id}`}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Link>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* APPROVAL */}
      {approval && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">
            Approval
          </h3>

          <div className="flex items-center gap-4">
            <StatusPill status={approval.status} />

            <button
              onClick={() => updateApproval("approved")}
              className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs"
            >
              Approve
            </button>

            <button
              onClick={() => updateApproval("rejected")}
              className="px-3 py-1.5 rounded bg-rose-600 text-white text-xs"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* FORM */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6">
        <input
          value={change.title}
          onChange={(e) =>
            setChange({ ...change, title: e.target.value })
          }
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        />

        <textarea
          rows={5}
          value={change.description ?? ""}
          onChange={(e) =>
            setChange({ ...change, description: e.target.value })
          }
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* REQUESTED BY */}
          <select
            value={change.requested_by ?? ""}
            onChange={(e) =>
              setChange({ ...change, requested_by: e.target.value })
            }
            className="rounded-lg bg-slate-800 px-3 py-2"
          >
            <option value="">Requested By…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>

          {/* ASSIGNED TO */}
          <select
            value={change.assigned_to ?? ""}
            onChange={(e) =>
              setChange({ ...change, assigned_to: e.target.value })
            }
            className="rounded-lg bg-slate-800 px-3 py-2"
          >
            <option value="">Assigned To…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>

          {/* STATUS — DB DRIVEN */}
          <select
            value={change.status ?? ""}
            onChange={(e) =>
              setChange({ ...change, status: e.target.value })
            }
            className="rounded-lg bg-slate-800 px-3 py-2"
          >
            <option value="" disabled>
              Select status…
            </option>
            {statuses.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          {/* RISK */}
          <select
            value={change.risk_level ?? ""}
            onChange={(e) =>
              setChange({ ...change, risk_level: e.target.value })
            }
            className="rounded-lg bg-slate-800 px-3 py-2"
          >
            <option value="">Risk Level…</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <input
            type="datetime-local"
            value={change.scheduled_start ?? ""}
            onChange={(e) =>
              setChange({
                ...change,
                scheduled_start: e.target.value,
              })
            }
            className="rounded-lg bg-slate-800 px-3 py-2"
          />

          <input
            type="datetime-local"
            value={change.scheduled_end ?? ""}
            onChange={(e) =>
              setChange({
                ...change,
                scheduled_end: e.target.value,
              })
            }
            className="rounded-lg bg-slate-800 px-3 py-2"
          />
        </div>
      </div>
    </div>
  );
}
