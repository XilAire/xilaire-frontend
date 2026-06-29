"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Trash2, Pencil, RefreshCcw } from "lucide-react";
import { updateTaskStatus } from "../../../../actions";
import {
  TASK_STATUS_TRANSITIONS,
  TASK_STATUS_LABELS,
} from "./taskStatusConfig";

export default function TaskActionPill({
  task,
  userId,
}: {
  task: {
    id: string;
    parent_id: string;
    status: string;
    requires_approval?: boolean;
    approval_status?: string | null;
  };
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allowedNext = TASK_STATUS_TRANSITIONS[task.status] || [];

  /* ----------------------------------------
     DELETE (CONFIRM ONLY — ACTION LATER)
  ---------------------------------------- */
  const handleDelete = () => {
    const ok = confirm(
      "Are you sure you want to delete this task?\n\nThis action cannot be undone."
    );
    if (!ok) return;

    // 🔒 Actual delete will be wired later
    alert("Delete action will be wired next.");
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* EDIT TASK */}
      <Link
        href={`?tab=details&mode=edit`}
        className="inline-flex items-center gap-2
          px-3 py-1 rounded border border-slate-600
          text-sm text-slate-200 hover:bg-slate-800"
      >
        <Pencil size={14} />
        Edit
      </Link>

      {/* STATUS DROPDOWN */}
      {allowedNext.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2
              px-3 py-1 rounded border border-slate-600
              text-sm text-slate-200 hover:bg-slate-800"
          >
            <RefreshCcw size={14} />
            Status
          </button>

          {open && (
            <div
              className="absolute right-0 mt-2 w-44
                rounded-md border border-slate-700
                bg-slate-900 shadow-lg z-50"
            >
              {allowedNext.map((next) => (
                <button
                  key={next}
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await updateTaskStatus(
                        task.id,
                        next as any,
                        userId
                      );
                      setOpen(false);
                    })
                  }
                  className="block w-full text-left px-3 py-2 text-sm
                    text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  {TASK_STATUS_LABELS[next]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DELETE */}
      <button
        onClick={handleDelete}
        className="inline-flex items-center gap-2
          px-3 py-1 rounded border border-red-600
          text-sm text-red-400 hover:bg-red-900/30"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}
