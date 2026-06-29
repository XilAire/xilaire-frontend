"use client";

import {
  CheckCircle,
  Clock,
  XCircle,
  Loader,
  AlertTriangle,
} from "lucide-react";
import { CHANGE_STATUS_MAP } from "@/lib/changeStatus";

interface StatusPillProps {
  status: string;
}

/**
 * Icon + color mapping stays UI-only.
 * Status meaning comes from CHANGE_STATUS_MAP (canonical).
 */
const STATUS_ICON_MAP: Record<string, any> = {
  draft: Clock,
  planned: Clock,
  pending_approval: Clock,
  approved: CheckCircle,
  scheduled: Clock,
  in_progress: Loader,
  completed: CheckCircle,
  cancelled: XCircle,
};

const STATUS_COLOR_MAP: Record<string, string> = {
  draft: "text-slate-300 border-slate-600 bg-slate-800/40",
  planned: "text-blue-300 border-blue-700 bg-blue-500/10",
  pending_approval: "text-yellow-300 border-yellow-700 bg-yellow-500/10",
  approved: "text-green-300 border-green-700 bg-green-500/10",
  scheduled: "text-purple-300 border-purple-700 bg-purple-500/10",
  in_progress: "text-cyan-300 border-cyan-700 bg-cyan-500/10",
  completed: "text-emerald-300 border-emerald-700 bg-emerald-500/10",
  cancelled: "text-red-300 border-red-700 bg-red-500/10",
};

export default function StatusPill({ status }: StatusPillProps) {
  const meta = CHANGE_STATUS_MAP[status] ?? {
    label: status,
    color: "gray",
  };

  const Icon =
    STATUS_ICON_MAP[status] ??
    AlertTriangle;

  const colorClasses =
    STATUS_COLOR_MAP[status] ??
    "text-slate-300 border-slate-600 bg-slate-800/40";

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium ${colorClasses}`}
    >
      <Icon className="h-4 w-4" />
      {meta.label}
    </div>
  );
}
