"use client";

import { Calendar, User, ShieldAlert } from "lucide-react";
import StatusPill from "./StatusPill";

interface CRHeaderProps {
  change: any;
}

export default function CRHeader({ change }: CRHeaderProps) {
  const {
    id,
    title,
    created_at,
    requestorName,
    assignedToName,
    risk_level,
    scheduled_start,
    scheduled_end,
  } = change;

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      {/* TITLE + ID */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-slate-400 mt-1">
          Change Request #{id}
        </p>
      </div>

      {/* STATUS ONLY (NO DUPLICATE APPROVAL BADGE) */}
      <div className="flex items-center gap-3 mb-6">
        <StatusPill status={change.status} />
      </div>

      {/* 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="space-y-3 text-slate-300">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400 w-32">Requested By:</span>
            <span>{requestorName}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400 w-32">Created:</span>
            <span>{formatDate(created_at)}</span>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400 w-32">Assigned To:</span>
            <span>{assignedToName || "Unassigned"}</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-3 text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400 w-32">Risk Level:</span>
            <span className="capitalize">{risk_level || "—"}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400 w-32">Scheduled Start:</span>
            <span>{formatDate(scheduled_start)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400 w-32">Scheduled End:</span>
            <span>{formatDate(scheduled_end)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
