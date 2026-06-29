"use client";

import { useState } from "react";
import { createChangeRequest } from "../../actions";

export default function CreateChangeRequestModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <form
        action={async (formData) => {
          try {
            setLoading(true);
            await createChangeRequest(formData);
            // redirect happens server-side
          } catch (err) {
            console.error("Failed to create change request", err);
            alert("Unable to create change request. Please try again.");
            setLoading(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl
        w-full max-w-lg p-6 space-y-4"
      >
        {/* HEADER */}
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          New Change Request
        </h2>

        {/* TITLE */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Title
          </label>
          <input
            name="title"
            required
            disabled={loading}
            placeholder="Brief summary of the change"
            className="mt-1 w-full rounded border px-3 py-2 text-sm
            bg-white dark:bg-slate-800
            border-slate-300 dark:border-slate-700
            disabled:opacity-60"
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            disabled={loading}
            placeholder="Detailed description of the change"
            className="mt-1 w-full rounded border px-3 py-2 text-sm
            bg-white dark:bg-slate-800
            border-slate-300 dark:border-slate-700
            disabled:opacity-60"
          />
        </div>

        {/* RISK */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Risk Level
          </label>
          <select
            name="risk"
            defaultValue="medium"
            disabled={loading}
            className="mt-1 w-full rounded border px-3 py-2 text-sm
            bg-white dark:bg-slate-800
            border-slate-300 dark:border-slate-700
            disabled:opacity-60"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded
              bg-slate-200 dark:bg-slate-700
              text-slate-800 dark:text-slate-200
              disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm rounded
              bg-blue-600 text-white
              hover:bg-blue-700
              disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
