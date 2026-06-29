"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { supabasePlatform } from "@/lib/supabasePlatformClient";

type Profile = {
  id: string;
  full_name: string;
};

export default function EditChangeModal({
  open,
  onClose,
  change,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  change: any;
  onUpdated?: () => void;
}) {
  /* ------------------------------------------------------------------ */
  /* STATE */
  /* ------------------------------------------------------------------ */
  const [title, setTitle] = useState(change.title);
  const [summary, setSummary] = useState(change.summary ?? "");
  const [description, setDescription] = useState(change.description ?? "");

  const [requestedBy, setRequestedBy] = useState<string | null>(
    change.created_by ?? null
  );
  const [assignedTo, setAssignedTo] = useState<string | null>(
    change.assigned_to ?? null
  );

  const [status, setStatus] = useState(change.status ?? "planning");
  const [riskLevel, setRiskLevel] = useState(change.risk_level ?? "");

  const [scheduledStart, setScheduledStart] = useState<Date | null>(
    change.scheduled_start ? new Date(change.scheduled_start) : null
  );
  const [scheduledEnd, setScheduledEnd] = useState<Date | null>(
    change.scheduled_end ? new Date(change.scheduled_end) : null
  );

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);

  /* ------------------------------------------------------------------ */
  /* LOAD USERS */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!open) return;

    supabasePlatform
      .from("profiles")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => setProfiles(data ?? []));
  }, [open]);

  if (!open) return null;

  /* ------------------------------------------------------------------ */
  /* SAVE */
  /* ------------------------------------------------------------------ */
  async function handleSave() {
    setSaving(true);

    const { error } = await supabasePlatform
      .from("change_requests")
      .update({
        title,
        summary,
        description,
        created_by: requestedBy,
        assigned_to: assignedTo,
        status,
        risk_level: riskLevel || null,
        scheduled_start: scheduledStart
          ? scheduledStart.toISOString()
          : null,
        scheduled_end: scheduledEnd
          ? scheduledEnd.toISOString()
          : null,
      })
      .eq("id", change.id);

    setSaving(false);

    if (!error) {
      onUpdated?.();
      onClose();
    }
  }

  /* ------------------------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------------------------ */
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-3xl shadow-xl p-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Edit Change Request</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* FORM */}
        <div className="space-y-5">
          {/* TITLE */}
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded border dark:bg-slate-800"
            />
          </div>

          {/* SUMMARY */}
          <div>
            <label className="text-sm font-medium">Summary</label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded border dark:bg-slate-800"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full mt-1 px-3 py-2 rounded border dark:bg-slate-800"
            />
          </div>

          {/* GRID: USERS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Requested By</label>
              <select
                value={requestedBy ?? ""}
                onChange={(e) => setRequestedBy(e.target.value || null)}
                className="w-full mt-1 px-3 py-2 rounded border dark:bg-slate-800"
              >
                <option value="">—</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Assigned To</label>
              <select
                value={assignedTo ?? ""}
                onChange={(e) => setAssignedTo(e.target.value || null)}
                className="w-full mt-1 px-3 py-2 rounded border dark:bg-slate-800"
              >
                <option value="">—</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GRID: STATUS / RISK */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded border dark:bg-slate-800"
              >
                <option value="planning">Planning</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Risk Level</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded border dark:bg-slate-800"
              >
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* GRID: DATES (FIXED ALIGNMENT) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Scheduled Start</label>
              <DatePicker
                selected={scheduledStart}
                onChange={setScheduledStart}
                showTimeSelect
                dateFormat="Pp"
                className="w-full mt-1 px-3 py-2 rounded border dark:bg-slate-800"
                popperClassName="z-[60]"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Scheduled End</label>
              <DatePicker
                selected={scheduledEnd}
                onChange={setScheduledEnd}
                showTimeSelect
                dateFormat="Pp"
                className="w-full mt-1 px-3 py-2 rounded border dark:bg-slate-800"
                popperClassName="z-[60]"
              />
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
