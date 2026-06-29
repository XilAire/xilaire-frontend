"use client";

import {
  CheckCircle,
  XCircle,
  Trash2,
  UserPlus,
} from "lucide-react";

interface Props {
  selectedCount: number;
  onResolve: () => void;
  onClose: () => void;
  onDelete: () => void;
  onAssign: () => void;
}

export default function ServiceRequestBulkBar({
  selectedCount,
  onResolve,
  onClose,
  onDelete,
  onAssign,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2
      bg-slate-900 border border-slate-700 rounded-xl
      shadow-xl px-4 py-3 flex items-center gap-3 z-50">

      <span className="text-sm text-slate-300">
        {selectedCount} selected
      </span>

      <button
        onClick={onResolve}
        className="flex items-center gap-1 px-3 py-1.5
          rounded bg-emerald-600/20 text-emerald-400 text-sm"
      >
        <CheckCircle size={14} />
        Resolve
      </button>

      <button
        onClick={onClose}
        className="flex items-center gap-1 px-3 py-1.5
          rounded bg-slate-600/20 text-slate-300 text-sm"
      >
        <XCircle size={14} />
        Close
      </button>

      <button
        onClick={onAssign}
        className="flex items-center gap-1 px-3 py-1.5
          rounded bg-blue-600/20 text-blue-400 text-sm"
      >
        <UserPlus size={14} />
        Assign
      </button>

      <button
        onClick={onDelete}
        className="flex items-center gap-1 px-3 py-1.5
          rounded bg-red-900/40 text-red-400 text-sm"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}
