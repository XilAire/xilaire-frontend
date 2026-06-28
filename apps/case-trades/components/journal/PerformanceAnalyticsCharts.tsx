"use client";

import { useMemo, useState } from "react";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";

export type ChartPerformanceRow = {
  label: string;
  trades: number;
  winners: number;
  losers: number;
  breakevens?: number;
  winRate: number;
  averagePnl?: number;
  averageWinner?: number;
  averageLoser?: number;
  profitFactor?: number;
  netPnl: number;
};

type ChartMetric = "netPnl" | "winRate" | "profitFactor" | "averagePnl";

type PerformanceAnalyticsChartsProps = {
  title?: string;
  description?: string;
  rows: ChartPerformanceRow[];
};

const METRIC_OPTIONS: { label: string; value: ChartMetric }[] = [
  { label: "Net P/L", value: "netPnl" },
  { label: "Win Rate", value: "winRate" },
  { label: "Profit Factor", value: "profitFactor" },
  { label: "Average P/L", value: "averagePnl" },
];

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);

  return `${prefix}$${absolute}`;
}

function formatMetricValue(metric: ChartMetric, row: ChartPerformanceRow) {
  if (metric === "netPnl") {
    return formatMoney(row.netPnl);
  }

  if (metric === "winRate") {
    return `${Number(row.winRate ?? 0).toFixed(0)}%`;
  }

  if (metric === "profitFactor") {
    return Number(row.profitFactor ?? 0).toFixed(2);
  }

  return formatMoney(row.averagePnl ?? 0);
}

function getMetricValue(metric: ChartMetric, row: ChartPerformanceRow) {
  if (metric === "netPnl") {
    return Number(row.netPnl ?? 0);
  }

  if (metric === "winRate") {
    return Number(row.winRate ?? 0);
  }

  if (metric === "profitFactor") {
    return Number(row.profitFactor ?? 0);
  }

  return Number(row.averagePnl ?? 0);
}

function getBarWidth(value: number, maxAbsoluteValue: number) {
  if (maxAbsoluteValue <= 0) {
    return 0;
  }

  return Math.max((Math.abs(value) / maxAbsoluteValue) * 100, 6);
}

export default function PerformanceAnalyticsCharts({
  title = "Performance Analytics Chart",
  description = "Visual performance breakdown for the selected analytics category.",
  rows,
}: PerformanceAnalyticsChartsProps) {
  const [metric, setMetric] = useState<ChartMetric>("netPnl");

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => getMetricValue(metric, b) - getMetricValue(metric, a));
  }, [metric, rows]);

  const maxAbsoluteValue = useMemo(() => {
    return Math.max(
      ...sortedRows.map((row) => Math.abs(getMetricValue(metric, row))),
      1
    );
  }, [metric, sortedRows]);

  const bestRow = sortedRows[0] ?? null;
  const worstRow = sortedRows[sortedRows.length - 1] ?? null;

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
            <BarChart3 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>

            <p className="text-sm text-slate-400">{description}</p>
          </div>
        </div>

        <div className="w-full lg:w-64">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Chart Metric
          </label>

          <select
            value={metric}
            onChange={(event) => setMetric(event.target.value as ChartMetric)}
            className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-emerald-500/50"
          >
            {METRIC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950 text-sm text-slate-500">
          No performance data available for the current filters.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
              <div className="mb-2 text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>

              <p className="text-xs uppercase tracking-wide text-slate-500">
                Top Performer
              </p>

              <p className="mt-1 text-lg font-semibold text-slate-100">
                {bestRow?.label ?? "—"}
              </p>

              <p className="mt-1 text-sm font-semibold text-emerald-400">
                {bestRow ? formatMetricValue(metric, bestRow) : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
              <div className="mb-2 text-red-400">
                <TrendingDown className="h-5 w-5" />
              </div>

              <p className="text-xs uppercase tracking-wide text-slate-500">
                Bottom Performer
              </p>

              <p className="mt-1 text-lg font-semibold text-slate-100">
                {worstRow?.label ?? "—"}
              </p>

              <p
                className={
                  "mt-1 text-sm font-semibold " +
                  (Number(worstRow ? getMetricValue(metric, worstRow) : 0) < 0
                    ? "text-red-400"
                    : "text-slate-300")
                }
              >
                {worstRow ? formatMetricValue(metric, worstRow) : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
              <div className="mb-2 text-slate-400">
                <BarChart3 className="h-5 w-5" />
              </div>

              <p className="text-xs uppercase tracking-wide text-slate-500">
                Categories
              </p>

              <p className="mt-1 text-lg font-semibold text-slate-100">
                {rows.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Sorted by {METRIC_OPTIONS.find((option) => option.value === metric)?.label}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950 p-4">
            {sortedRows.map((row) => {
              const value = getMetricValue(metric, row);
              const width = getBarWidth(value, maxAbsoluteValue);
              const positive = value > 0;
              const negative = value < 0;

              return (
                <div key={row.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-slate-100">{row.label}</p>
                      <p className="text-xs text-slate-500">
                        {row.trades} trade{row.trades === 1 ? "" : "s"} ·{" "}
                        {row.winners}W / {row.losers}L
                      </p>
                    </div>

                    <p
                      className={
                        "font-semibold " +
                        (positive
                          ? "text-emerald-400"
                          : negative
                            ? "text-red-400"
                            : "text-slate-300")
                      }
                    >
                      {formatMetricValue(metric, row)}
                    </p>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-900">
                    <div
                      className={
                        "h-full rounded-full " +
                        (positive
                          ? "bg-emerald-400"
                          : negative
                            ? "bg-red-400"
                            : "bg-slate-600")
                      }
                      style={{
                        width: `${width}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}