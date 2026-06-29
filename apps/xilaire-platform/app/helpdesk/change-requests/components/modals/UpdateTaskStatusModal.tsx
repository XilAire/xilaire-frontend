"use client";

import { useState } from "react";
import { updateTaskStatus } from "../../actions";
import StatusPill from "../../[id]/components/StatusPill";

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */
export type TaskStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "completed";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

/* ---------------------------------------------------------
   COMPONENT
--------------------------------------------------------- */
export default function UpdateTaskStatusModal({
  open,
  task,
  onClose,
  onUpdated,
}: {
  open: boolean;
  task: Task;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await updateTaskStatus(task.id, status);
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error("Failed to update task status", err);
      alert("Unable to update task status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl
        w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Update Task Status
        </h2>

        <p className="text-sm text-slate-500 mb-4">
          {task.title}
        </p>

        {/* STATUS OPTIONS */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(
            ["open", "in_progress", "blocked", "completed"] as TaskStatus[]
          ).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded text-xs border transition
                ${
                  status === s
                    ? "border-blue-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
            >
              <StatusPill status={s} />
            </button>
          ))}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded
              bg-slate-200 dark:bg-slate-700
              text-slate-800 dark:text-slate-200"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUpdate}
            disabled={loading}
            className="px-4 py-2 text-sm rounded
              bg-blue-600 text-white
              hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
