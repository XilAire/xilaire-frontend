"use client";

type DailyPnlPoint = {
  dateKey: string;
  label: string;
  trades: number;
  winners: number;
  losers: number;
  breakevens: number;
  netPnl: number;
};

type DailyPnLHeatmapProps = {
  days: DailyPnlPoint[];
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${prefix}$${Math.abs(amount).toFixed(2)}`;
}

function getIntensityClass(day: DailyPnlPoint, maxAbsolutePnl: number) {
  if (day.trades === 0 || day.netPnl === 0) {
    return "border-white/10 bg-slate-950 text-slate-500";
  }

  const intensity = Math.abs(day.netPnl) / Math.max(maxAbsolutePnl, 1);

  if (day.netPnl > 0) {
    if (intensity >= 0.75) {
      return "border-emerald-400/40 bg-emerald-400/30 text-emerald-100";
    }

    if (intensity >= 0.4) {
      return "border-emerald-400/30 bg-emerald-400/20 text-emerald-100";
    }

    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (intensity >= 0.75) {
    return "border-red-400/40 bg-red-400/30 text-red-100";
  }

  if (intensity >= 0.4) {
    return "border-red-400/30 bg-red-400/20 text-red-100";
  }

  return "border-red-400/20 bg-red-400/10 text-red-200";
}

export default function DailyPnLHeatmap({ days }: DailyPnLHeatmapProps) {
  const maxAbsolutePnl = Math.max(
    ...days.map((day) => Math.abs(day.netPnl)),
    1
  );

  if (days.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950 text-sm text-slate-500">
        No closed trades available for daily P/L reporting.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7 xl:grid-cols-10">
        {days.map((day) => (
          <div
            key={day.dateKey}
            title={`${day.label}: ${formatMoney(day.netPnl)} across ${
              day.trades
            } trade${day.trades === 1 ? "" : "s"}`}
            className={
              "rounded-xl border p-3 transition hover:scale-[1.02] " +
              getIntensityClass(day, maxAbsolutePnl)
            }
          >
            <p className="text-xs font-medium opacity-80">{day.label}</p>

            <p className="mt-2 text-sm font-semibold">
              {formatMoney(day.netPnl)}
            </p>

            <p className="mt-1 text-[11px] opacity-70">
              {day.trades} trade{day.trades === 1 ? "" : "s"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-red-400/30 bg-red-400/20" />
          Red day
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-white/10 bg-slate-950" />
          Flat / no P/L
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-emerald-400/30 bg-emerald-400/20" />
          Green day
        </div>
      </div>
    </div>
  );
}