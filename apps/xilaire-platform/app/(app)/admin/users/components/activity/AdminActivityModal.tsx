"use client";

import { X } from "lucide-react";

import type { AdminActivity } from "./adminActivity.types";
import AdminActivityTimeline from "./AdminActivityTimeline";

interface Props {
  open: boolean;
  onClose: () => void;
  activities: AdminActivity[];
  loading: boolean;
}

export default function AdminActivityModal({
  open,
  onClose,
  activities,
  loading,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl rounded-xl
                   bg-white text-slate-900
                   shadow-2xl ring-1 ring-black/10"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between
                     border-b border-slate-200
                     px-6 py-4"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            User Activity
          </h2>

          <button
            onClick={onClose}
            className="rounded-md p-1
                       text-slate-500
                       hover:bg-slate-100
                       hover:text-slate-800
                       focus:outline-none
                       focus:ring-2 focus:ring-slate-400"
            aria-label="Close activity timeline"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-sm text-slate-500">
              Loading activity…
            </p>
          ) : (
            <AdminActivityTimeline activities={activities} />
          )}
        </div>
      </div>
    </div>
  );
}
