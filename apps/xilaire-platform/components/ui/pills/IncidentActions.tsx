"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionPill, { ActionItem } from "@/components/ui/ActionPill";

/* ------------------------------------------------------------
   STATUS MODAL
------------------------------------------------------------- */
function StatusModal({
  open,
  onClose,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  if (!open) return null;

  const statuses = [
    { label: "Open", value: "open" },
    { label: "Investigating", value: "investigating" },
    { label: "Resolved", value: "resolved" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-80 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white font-semibold mb-4">Change Status</h2>

        <div className="space-y-2">
          {statuses.map((s) => (
            <button
              key={s.value}
              className="w-full px-3 py-2 text-left text-slate-200 rounded-lg hover:bg-slate-800 transition"
              onClick={() => {
                onChange(s.value);
                onClose();
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   INCIDENT ACTIONS
------------------------------------------------------------- */
export default function IncidentActions({
  incidentId,
  deleteIncident,
  updateStatus,
}: {
  incidentId: string;
  deleteIncident: () => void;
  updateStatus: (status: string) => void;
}) {
  const router = useRouter();
  const [showStatusModal, setShowStatusModal] = useState(false);

  /* ------------------------------------------------------------
     🚀 Correctly typed using ActionPill.ActionItem
  ------------------------------------------------------------- */
  const options: ActionItem[] = [
    {
      label: "Create New",
      onClick: () => router.push("/helpdesk/incidents/new"),
    },

    {
      label: "Change Status",
      onClick: () => setShowStatusModal(true),
    },

    {
      label: "Add Comment",
      onClick: () =>
        document.getElementById("comment-box")?.scrollIntoView({
          behavior: "smooth",
        }),
    },

    { divider: true },

    {
      label: "Delete Incident",
      destructive: true,
      onClick: () => deleteIncident(),
    },
  ];

  return (
    <>
      <ActionPill label="Actions" items={options} />

      <StatusModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onChange={(value) => updateStatus(value)}
      />
    </>
  );
}
