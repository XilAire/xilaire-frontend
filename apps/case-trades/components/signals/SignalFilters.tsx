"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

type FilterOption = {
  label: string;
  value: string;
};

type SignalFiltersProps = {
  range: string;
  status: string;
  ranges: FilterOption[];
  statuses: FilterOption[];
};

export default function SignalFilters({
  range,
  status,
  ranges,
  statuses,
}: SignalFiltersProps) {
  const router = useRouter();

  function updateFilters(nextRange: string, nextStatus: string) {
    const params = new URLSearchParams();

    params.set("range", nextRange);
    params.set("status", nextStatus);

    router.push(`/dashboard/signals?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Board Filters
        </p>
        <p className="text-sm text-slate-400">
          Active signals always show. Older signals are filtered by range.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={range}
            onChange={(e) => updateFilters(e.target.value, status)}
            className="appearance-none rounded-full border border-white/10 bg-slate-900 px-4 py-2 pr-9 text-sm font-medium text-slate-200 outline-none transition hover:bg-slate-800 focus:ring-2 focus:ring-emerald-500"
          >
            {ranges.map((option) => (
              <option key={option.value} value={option.value}>
                Range: {option.label}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={status}
            onChange={(e) => updateFilters(range, e.target.value)}
            className="appearance-none rounded-full border border-white/10 bg-slate-900 px-4 py-2 pr-9 text-sm font-medium text-slate-200 outline-none transition hover:bg-slate-800 focus:ring-2 focus:ring-emerald-500"
          >
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                Status: {option.label}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
    </div>
  );
}