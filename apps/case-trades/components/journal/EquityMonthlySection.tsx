"use client";

import EquityCurveChart from "@/components/journal/EquityCurveChart";
import MonthlyPnLChart from "@/components/journal/MonthlyPnLChart";

export type EquityCurvePoint = {
  label: string;
  date: string;
  pnl: number;
  cumulativePnl: number;
};

export type MonthlyPnlPoint = {
  label: string;
  monthKey: string;
  trades: number;
  winners: number;
  losers: number;
  netPnl: number;
};

type EquityMonthlySectionProps = {
  equityCurve: EquityCurvePoint[];
  monthlyPnl: MonthlyPnlPoint[];
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);

  return `${prefix}$${absolute}`;
}

export default function EquityMonthlySection({
  equityCurve,
  monthlyPnl,
}: EquityMonthlySectionProps) {
  const lastPoint = equityCurve[equityCurve.length - 1] ?? null;
  const endingPnl = Number(lastPoint?.cumulativePnl ?? 0);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Equity Curve
            </h2>

            <p className="text-sm text-slate-400">
              Cumulative closed-trade P/L based on the current filters.
            </p>
          </div>

          <div
            className={
              "rounded-full border px-3 py-1 text-sm font-semibold " +
              (endingPnl > 0
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : endingPnl < 0
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-white/10 bg-slate-950 text-slate-300")
            }
          >
            {formatMoney(endingPnl)}
          </div>
        </div>

        <EquityCurveChart points={equityCurve} />
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-100">Monthly P/L</h2>

          <p className="text-sm text-slate-400">
            Net realized P/L grouped by closed month.
          </p>
        </div>

        <MonthlyPnLChart months={monthlyPnl} />
      </div>
    </div>
  );
}