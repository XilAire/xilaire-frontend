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
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div
        className={
          "mb-3 [&>svg]:h-5 [&>svg]:w-5 " +
          (negative
            ? "text-red-400"
            : positive
              ? "text-emerald-400"
              : "text-emerald-400")
        }
      >
        {icon}
      </div>

      <p className="text-sm text-slate-400">{title}</p>

      <p
        className={
          "mt-1 text-2xl font-semibold " +
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