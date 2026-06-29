"use client";

import { Trash2, X } from "lucide-react";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClear: () => void;
}

export default function BulkActionsBar({
  selectedIds,
  onClear,
}: BulkActionsBarProps) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4
                    rounded-xl border border-slate-800
                    bg-slate-900/60 px-4 py-3">
      {/* LEFT */}
      <div className="text-sm text-slate-300">
        {selectedIds.length} selected
      </div>

      {/* RIGHT ACTIONS */}
      <div className="flex items-center gap-2">
        {/* CLEAR */}
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1
                     rounded-md px-3 py-1.5 text-xs
                     bg-slate-700/40 text-slate-300
                     hover:bg-slate-700/60"
        >
          <X size={14} />
          Clear
        </button>

        {/* DELETE (stub for now) */}
        <button
          onClick={() => {
            alert("Bulk delete coming next phase");
          }}
          className="inline-flex items-center gap-1
                     rounded-md px-3 py-1.5 text-xs
                     bg-red-600/20 text-red-400
                     hover:bg-red-600/30"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}
