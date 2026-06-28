"use client";

export type OptionTypePerformance = {
  optionType: string;
  trades: number;
  winners: number;
  losers: number;
  breakevens: number;
  winRate: number;
  averageWinner: number;
  averageLoser: number;
  profitFactor: number;
  netPnl: number;
};

type OptionTypePerformanceTableProps = {
  optionTypes: OptionTypePerformance[];
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);

  return `${prefix}$${absolute}`;
}

export default function OptionTypePerformanceTable({
  optionTypes,
}: OptionTypePerformanceTableProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-100">
          Performance by Option Type
        </h2>

        <p className="text-sm text-slate-400">
          Closed option-trade performance grouped by CALL and PUT contracts.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Option Type</th>
              <th className="px-4 py-3">Trades</th>
              <th className="px-4 py-3">Winners</th>
              <th className="px-4 py-3">Losers</th>
              <th className="px-4 py-3">Breakeven</th>
              <th className="px-4 py-3">Win Rate</th>
              <th className="px-4 py-3">Avg Winner</th>
              <th className="px-4 py-3">Avg Loser</th>
              <th className="px-4 py-3">Profit Factor</th>
              <th className="px-4 py-3">Net P/L</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {optionTypes.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No closed option trades available for option-type reporting
                  with the current filters.
                </td>
              </tr>
            )}

            {optionTypes.map((optionType) => (
              <tr
                key={optionType.optionType}
                className="transition hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3 font-semibold text-slate-100">
                  {optionType.optionType}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {optionType.trades}
                </td>

                <td className="px-4 py-3 text-emerald-300">
                  {optionType.winners}
                </td>

                <td className="px-4 py-3 text-red-300">
                  {optionType.losers}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {optionType.breakevens}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {optionType.winRate.toFixed(0)}%
                </td>

                <td className="px-4 py-3 text-emerald-300">
                  {formatMoney(optionType.averageWinner)}
                </td>

                <td className="px-4 py-3 text-red-300">
                  {formatMoney(-optionType.averageLoser)}
                </td>

                <td
                  className={
                    "px-4 py-3 font-medium " +
                    (optionType.profitFactor >= 1
                      ? "text-emerald-400"
                      : "text-red-400")
                  }
                >
                  {optionType.profitFactor.toFixed(2)}
                </td>

                <td
                  className={
                    "px-4 py-3 font-medium " +
                    (optionType.netPnl > 0
                      ? "text-emerald-400"
                      : optionType.netPnl < 0
                        ? "text-red-400"
                        : "text-slate-300")
                  }
                >
                  {formatMoney(optionType.netPnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}