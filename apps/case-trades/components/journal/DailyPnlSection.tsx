"use client";

import DailyAnalyticsCards from "@/components/journal/DailyAnalyticsCards";
import DailyPnLHeatmap from "@/components/journal/DailyPnLHeatmap";

export type DailyPnlPoint = {
  dateKey: string;
  label: string;
  trades: number;
  winners: number;
  losers: number;
  breakevens: number;
  netPnl: number;
};

type DailyPnlSectionProps = {
  days: DailyPnlPoint[];
  bestDay: DailyPnlPoint | null;
  worstDay: DailyPnlPoint | null;
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);

  return `${prefix}$${absolute}`;
}

export default function DailyPnlSection({
  days,
  bestDay,
  worstDay,
}: DailyPnlSectionProps) {
  return (
    <div className="space-y-6">
      <DailyAnalyticsCards days={days} />

      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Daily P/L Heatmap
            </h2>

            <p className="text-sm text-slate-400">
              Daily realized P/L grouped from closed trades.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm">
              <span className="text-slate-400">Best Day</span>{" "}
              <span className="font-semibold text-emerald-400">
                {bestDay
                  ? `${bestDay.label} · ${formatMoney(bestDay.netPnl)}`
                  : "—"}
              </span>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm">
              <span className="text-slate-400">Worst Day</span>{" "}
              <span
                className={
                  "font-semibold " +
                  (Number(worstDay?.netPnl ?? 0) < 0
                    ? "text-red-400"
                    : "text-slate-100")
                }
              >
                {worstDay
                  ? `${worstDay.label} · ${formatMoney(worstDay.netPnl)}`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <DailyPnLHeatmap days={days} />
      </div>
    </div>
  );
}