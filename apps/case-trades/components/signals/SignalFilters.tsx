"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilters(nextRange: string, nextStatus: string) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("range", nextRange);
    params.set("status", nextStatus);

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950 p-4">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Board Filters
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-400">
            Active signals always show. Older signals are filtered by range.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
          <div className="relative min-w-0">
            <select
              value={range}
              onChange={(e) => updateFilters(e.target.value, status)}
              className="w-full appearance-none rounded-full border border-white/10 bg-slate-900 px-4 py-2 pr-9 text-sm font-medium text-slate-200 outline-none transition hover:bg-slate-800 focus:ring-2 focus:ring-emerald-500 lg:w-auto lg:min-w-36"
            >
              {ranges.map((option) => (
                <option key={option.value} value={option.value}>
                  Range: {option.label}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative min-w-0">
            <select
              value={status}
              onChange={(e) => updateFilters(range, e.target.value)}
              className="w-full appearance-none rounded-full border border-white/10 bg-slate-900 px-4 py-2 pr-9 text-sm font-medium text-slate-200 outline-none transition hover:bg-slate-800 focus:ring-2 focus:ring-emerald-500 lg:w-auto lg:min-w-44"
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
    </div>
  );
}