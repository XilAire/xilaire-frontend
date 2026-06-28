"use client";

type MonthlyPnlPoint = {
  label: string;
  monthKey: string;
  trades: number;
  winners: number;
  losers: number;
  netPnl: number;
};

type MonthlyPnLChartProps = {
  months: MonthlyPnlPoint[];
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${prefix}$${Math.abs(amount).toFixed(2)}`;
}

function getMonthlyBarHeight(month: MonthlyPnlPoint, months: MonthlyPnlPoint[]) {
  const maxAbsolutePnl = Math.max(
    ...months.map((item) => Math.abs(item.netPnl)),
    1
  );

  return Math.max((Math.abs(month.netPnl) / maxAbsolutePnl) * 100, 8);
}

export default function MonthlyPnLChart({ months }: MonthlyPnLChartProps) {
  if (months.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950 text-sm text-slate-500">
        No closed trades available for monthly reporting.
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-64 items-end gap-3 rounded-xl border border-white/10 bg-slate-950 p-4">
        {months.map((month) => (
          <div
            key={month.monthKey}
            className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
          >
            <div
              title={`${month.label}: ${formatMoney(month.netPnl)}`}
              className={
                "w-full rounded-t-md " +
                (month.netPnl > 0
                  ? "bg-emerald-400/80"
                  : month.netPnl < 0
                    ? "bg-red-400/80"
                    : "bg-slate-600")
              }
              style={{
                height: `${getMonthlyBarHeight(month, months)}%`,
              }}
            />

            <p className="truncate text-center text-[11px] text-slate-500">
              {month.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Trades</th>
              <th className="px-4 py-3">Winners</th>
              <th className="px-4 py-3">Losers</th>
              <th className="px-4 py-3">Net P/L</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {months.map((month) => (
              <tr key={month.monthKey}>
                <td className="px-4 py-3 font-medium text-slate-100">
                  {month.label}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {month.trades}
                </td>
                <td className="px-4 py-3 text-emerald-300">
                  {month.winners}
                </td>
                <td className="px-4 py-3 text-red-300">{month.losers}</td>
                <td
                  className={
                    "px-4 py-3 font-medium " +
                    (month.netPnl > 0
                      ? "text-emerald-400"
                      : month.netPnl < 0
                        ? "text-red-400"
                        : "text-slate-300")
                  }
                >
                  {formatMoney(month.netPnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}