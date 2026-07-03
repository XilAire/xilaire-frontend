"use client";

import type { ReactNode } from "react";

type ReportStatCardProps = {
  title: string;
  value: string;
  icon: ReactNode;
  positive?: boolean;
  negative?: boolean;
};

export default function ReportStatCard({
  title,
  value,
  icon,
  positive = false,
  negative = false,
}: ReportStatCardProps) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
      <div
        className={
          "mb-3 shrink-0 [&>svg]:h-5 [&>svg]:w-5 " +
          (negative
            ? "text-red-400"
            : positive
              ? "text-emerald-400"
              : "text-emerald-400")
        }
      >
        {icon}
      </div>

      <p className="min-w-0 truncate text-sm text-slate-400">{title}</p>

      <p
        className={
          "mt-1 min-w-0 break-words text-xl font-semibold sm:text-2xl " +
          (negative
            ? "text-red-400"
            : positive
              ? "text-emerald-400"
              : "text-slate-100")
        }
      >
        {value}
      </p>
    </div>
  );
}