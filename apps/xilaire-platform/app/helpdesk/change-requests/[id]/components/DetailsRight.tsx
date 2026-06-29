"use client";

import { Calendar, User, ShieldAlert, Info } from "lucide-react";

interface DetailsRightProps {
  change: any;
  showAll?: boolean; // Used to expand the panel under "Change Info" tab
}

export default function DetailsRight({
  change,
  showAll = false,
}: DetailsRightProps) {
  const {
    risk_level,
    current_stage,
    approval_status,
    assignedToName,
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
    <div className="space-y-6">
      {/* RISK LEVEL */}
      <InfoCard
        title="Risk Level"
        icon={<ShieldAlert className="h-4 w-4 text-slate-400" />}
      >
        <span className="capitalize">{risk_level || "—"}</span>
      </InfoCard>

      {/* CURRENT STAGE */}
      <InfoCard
        title="Current Stage"
        icon={<Info className="h-4 w-4 text-slate-400" />}
      >
        <span className="capitalize">{current_stage || "—"}</span>
      </InfoCard>

      {/* APPROVAL STATUS */}
      <InfoCard
        title="Approval Status"
        icon={<Info className="h-4 w-4 text-slate-400" />}
      >
        <span className="capitalize">{approval_status || "—"}</span>
      </InfoCard>

      {/* ASSIGNED TO */}
      <InfoCard
        title="Assigned To"
        icon={<User className="h-4 w-4 text-slate-400" />}
      >
        <span>{assignedToName || "Unassigned"}</span>
      </InfoCard>

      {/* SCHEDULED START */}
      <InfoCard
        title="Scheduled Start"
        icon={<Calendar className="h-4 w-4 text-slate-400" />}
      >
        <span>{formatDate(scheduled_start)}</span>
      </InfoCard>

      {/* SCHEDULED END */}
      <InfoCard
        title="Scheduled End"
        icon={<Calendar className="h-4 w-4 text-slate-400" />}
      >
        <span>{formatDate(scheduled_end)}</span>
      </InfoCard>

      {/* SHOW EXTRA ONLY IN "CHANGE INFO" TAB */}
      {showAll && (
        <InfoCard title="Metadata">
          <pre className="text-xs text-slate-400">
            {JSON.stringify(change.approvals, null, 2)}
          </pre>
        </InfoCard>
      )}
    </div>
  );
}

/* --------------------------------------------------------
   REUSABLE RIGHT-COLUMN CARD COMPONENT
-------------------------------------------------------- */
function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="text-slate-300 text-sm">{children}</div>
    </div>
  );
}
