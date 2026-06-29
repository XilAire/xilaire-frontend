"use client";

import { useState } from "react";
import ActionPill from "@/components/ui/ActionPill";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------
   INLINE MODAL FOR CHANGING STATUS
------------------------------------------------------------------ */

function StatusModal({ open, onClose, onChangeStatus }) {
  if (!open) return null;

  const statuses = [
    { label: "Open", value: "open" },
    { label: "In Progress", value: "in_progress" },
    { label: "Waiting", value: "waiting" },
    { label: "Completed", value: "completed" },
    { label: "Closed", value: "closed" },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-80 shadow-xl">
        <h2 className="text-white font-semibold mb-4">Change Status</h2>

        <div className="space-y-2">
          {statuses.map((s) => (
            <button
              key={s.value}
              className="
                w-full px-3 py-2 text-left text-slate-200 rounded-lg
                hover:bg-slate-800 transition
              "
              onClick={() => {
                onChangeStatus(s.value);
                onClose();
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="
            mt-4 w-full px-3 py-2 rounded-lg text-sm
            bg-slate-700 hover:bg-slate-600 text-white
          "
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------------------ */

export default function ServiceRequestActions({
  requestId,
  updateStatus,
  deleteRequest,
}) {
  const router = useRouter();
  const [showStatusModal, setShowStatusModal] = useState(false);

  const options = [
    {
      label: "Create New",
      onClick: () => router.push("/helpdesk/service-requests/new"),
    },

    // Status now opens the modal instead of submenu
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
      label: "Delete Service Request",
      destructive: true,
      onClick: deleteRequest,
    },
  ];

  return (
    <>
      <ActionPill label="Actions" items={options} />

      <StatusModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onChangeStatus={(status) => updateStatus(status)}
      />
    </>
  );
}
