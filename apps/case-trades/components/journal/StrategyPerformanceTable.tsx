"use client";

export type StrategyPerformance = {
  strategy: string;
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

type StrategyPerformanceTableProps = {
  strategies: StrategyPerformance[];
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);

  return `${prefix}$${absolute}`;
}

export default function StrategyPerformanceTable({
  strategies,
}: StrategyPerformanceTableProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-100">
          Performance by Strategy
        </h2>

        <p className="text-sm text-slate-400">
          Closed-trade performance grouped by trade style.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Strategy</th>
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
            {strategies.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No closed trades available for strategy reporting with the
                  current filters.
                </td>
              </tr>
            )}

            {strategies.map((strategy) => (
              <tr
                key={strategy.strategy}
                className="transition hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3 font-semibold text-slate-100">
                  {strategy.strategy}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {strategy.trades}
                </td>

                <td className="px-4 py-3 text-emerald-300">
                  {strategy.winners}
                </td>

                <td className="px-4 py-3 text-red-300">
                  {strategy.losers}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {strategy.breakevens}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {strategy.winRate.toFixed(0)}%
                </td>

                <td className="px-4 py-3 text-emerald-300">
                  {formatMoney(strategy.averageWinner)}
                </td>

                <td className="px-4 py-3 text-red-300">
                  {formatMoney(-strategy.averageLoser)}
                </td>

                <td
                  className={
                    "px-4 py-3 font-medium " +
                    (strategy.profitFactor >= 1
                      ? "text-emerald-400"
                      : "text-red-400")
                  }
                >
                  {strategy.profitFactor.toFixed(2)}
                </td>

                <td
                  className={
                    "px-4 py-3 font-medium " +
                    (strategy.netPnl > 0
                      ? "text-emerald-400"
                      : strategy.netPnl < 0
                        ? "text-red-400"
                        : "text-slate-300")
                  }
                >
                  {formatMoney(strategy.netPnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}