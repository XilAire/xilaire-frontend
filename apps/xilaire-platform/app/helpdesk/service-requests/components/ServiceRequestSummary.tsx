"use client";

interface ServiceRequestSummaryProps {
  label: string;
  count: number;
}

export default function ServiceRequestSummary({
  label,
  count,
}: ServiceRequestSummaryProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">
        {count}
      </p>
    </div>
  );
}
