"use client";

export type HourOfDayPerformance = {
  hour: number;
  label: string;
  trades: number;
  winners: number;
  losers: number;
  breakevens: number;
  winRate: number;
  averagePnl: number;
  netPnl: number;
};

type HourOfDayPerformanceTableProps = {
  hours: HourOfDayPerformance[];
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);

  return `${prefix}$${absolute}`;
}

export default function HourOfDayPerformanceTable({
  hours,
}: HourOfDayPerformanceTableProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-100">
          Performance by Hour of Day
        </h2>

        <p className="text-sm text-slate-400">
          Closed-trade performance grouped by the hour each trade closed.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Hour</th>
              <th className="px-4 py-3">Trades</th>
              <th className="px-4 py-3">Winners</th>
              <th className="px-4 py-3">Losers</th>
              <th className="px-4 py-3">Breakeven</th>
              <th className="px-4 py-3">Win Rate</th>
              <th className="px-4 py-3">Avg P/L</th>
              <th className="px-4 py-3">Net P/L</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {hours.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No closed trades available for hour-of-day reporting with the
                  current filters.
                </td>
              </tr>
            )}

            {hours.map((hour) => (
              <tr key={hour.hour} className="transition hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-semibold text-slate-100">
                  {hour.label}
                </td>

                <td className="px-4 py-3 text-slate-300">{hour.trades}</td>

                <td className="px-4 py-3 text-emerald-300">
                  {hour.winners}
                </td>

                <td className="px-4 py-3 text-red-300">{hour.losers}</td>

                <td className="px-4 py-3 text-slate-300">
                  {hour.breakevens}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {hour.winRate.toFixed(0)}%
                </td>

                <td
                  className={
                    "px-4 py-3 font-medium " +
                    (hour.averagePnl > 0
                      ? "text-emerald-400"
                      : hour.averagePnl < 0
                        ? "text-red-400"
                        : "text-slate-300")
                  }
                >
                  {formatMoney(hour.averagePnl)}
                </td>

                <td
                  className={
                    "px-4 py-3 font-medium " +
                    (hour.netPnl > 0
                      ? "text-emerald-400"
                      : hour.netPnl < 0
                        ? "text-red-400"
                        : "text-slate-300")
                  }
                >
                  {formatMoney(hour.netPnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}