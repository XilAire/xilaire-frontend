"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";

export type ReportRange = "7d" | "30d" | "3m" | "6m" | "1y" | "all";
export type ReportStatus =
  | "all"
  | "open"
  | "closed"
  | "winners"
  | "losers"
  | "breakeven";
export type ReportInstrument = "all" | "options" | "stocks";

type ReportFiltersProps = {
  range: ReportRange;
  status: ReportStatus;
  instrument: ReportInstrument;
  symbol: string;
};

const RANGE_OPTIONS: { label: string; value: ReportRange }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "1Y", value: "1y" },
  { label: "All", value: "all" },
];

const STATUS_OPTIONS: { label: string; value: ReportStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
  { label: "Winners", value: "winners" },
  { label: "Losers", value: "losers" },
  { label: "Breakeven", value: "breakeven" },
];

const INSTRUMENT_OPTIONS: { label: string; value: ReportInstrument }[] = [
  { label: "All", value: "all" },
  { label: "Options", value: "options" },
  { label: "Stocks", value: "stocks" },
];

function createFilterHref({
  range,
  status,
  instrument,
  symbol,
  next,
}: {
  range: ReportRange;
  status: ReportStatus;
  instrument: ReportInstrument;
  symbol: string;
  next: Partial<{
    range: ReportRange;
    status: ReportStatus;
    instrument: ReportInstrument;
    symbol: string;
  }>;
}) {
  const params = new URLSearchParams();

  params.set("range", next.range ?? range);
  params.set("status", next.status ?? status);
  params.set("instrument", next.instrument ?? instrument);

  const nextSymbol = next.symbol ?? symbol;

  if (nextSymbol) {
    params.set("symbol", nextSymbol);
  }

  return `/dashboard/journal/reports?${params.toString()}`;
}

export default function ReportFilters({
  range,
  status,
  instrument,
  symbol,
}: ReportFiltersProps) {
  const hasActiveFilters =
    range !== "30d" ||
    status !== "all" ||
    instrument !== "all" ||
    symbol.length > 0;

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/80 p-4">
      <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-100">Filters</h2>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Refine reports by range, status, type, and symbol.
          </p>
        </div>

        <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Range
            </label>

            <select
              name="range"
              value={range}
              form="journal-report-filter-form"
              className="h-10 w-full min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-emerald-500/50"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Status
            </label>

            <select
              name="status"
              value={status}
              form="journal-report-filter-form"
              className="h-10 w-full min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-emerald-500/50"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Instrument
            </label>

            <select
              name="instrument"
              value={instrument}
              form="journal-report-filter-form"
              className="h-10 w-full min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-emerald-500/50"
            >
              {INSTRUMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <form
            id="journal-report-filter-form"
            action="/dashboard/journal/reports"
            className="w-full min-w-0"
          >
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Symbol
            </label>

            <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3">
                <Search className="h-4 w-4 shrink-0 text-slate-500" />

                <input
                  name="symbol"
                  defaultValue={symbol}
                  placeholder="Search ticker"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 sm:w-auto"
              >
                Apply
              </button>
            </div>
          </form>
        </div>

        <div className="flex min-w-0 items-end justify-start xl:justify-end">
          {hasActiveFilters ? (
            <Link
              href="/dashboard/journal/reports"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/5 sm:w-auto"
            >
              <X className="h-4 w-4 shrink-0" />
              Reset
            </Link>
          ) : (
            <div className="hidden h-10 xl:block" />
          )}
        </div>
      </div>

      <div className="mt-3 flex w-full min-w-0 max-w-full flex-wrap gap-2 overflow-hidden">
        {[...RANGE_OPTIONS, ...STATUS_OPTIONS, ...INSTRUMENT_OPTIONS].map(
          (option) => {
            const isRange = RANGE_OPTIONS.some(
              (rangeOption) => rangeOption.value === option.value
            );
            const isStatus = STATUS_OPTIONS.some(
              (statusOption) => statusOption.value === option.value
            );
            const isInstrument = INSTRUMENT_OPTIONS.some(
              (instrumentOption) => instrumentOption.value === option.value
            );

            const active =
              (isRange && range === option.value) ||
              (isStatus && status === option.value) ||
              (isInstrument && instrument === option.value);

            return (
              <Link
                key={`${option.label}-${option.value}`}
                href={createFilterHref({
                  range,
                  status,
                  instrument,
                  symbol,
                  next: {
                    ...(isRange ? { range: option.value as ReportRange } : {}),
                    ...(isStatus
                      ? { status: option.value as ReportStatus }
                      : {}),
                    ...(isInstrument
                      ? { instrument: option.value as ReportInstrument }
                      : {}),
                  },
                })}
                className={
                  "max-w-full rounded-full border px-3 py-1 text-xs font-semibold transition " +
                  (active
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : "border-white/10 bg-slate-950 text-slate-400 hover:bg-white/5")
                }
              >
                {option.label}
              </Link>
            );
          }
        )}
      </div>
    </section>
  );
}