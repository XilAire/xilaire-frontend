"use client";

export type SymbolPerformance = {
  symbol: string;
  trades: number;
  winners: number;
  losers: number;
  netPnl: number;
  winRate: number;
};

type SymbolPerformanceTableProps = {
  symbols: SymbolPerformance[];
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);

  return `${prefix}$${absolute}`;
}

export default function SymbolPerformanceTable({
  symbols,
}: SymbolPerformanceTableProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-100">
          Performance by Symbol
        </h2>

        <p className="text-sm text-slate-400">
          Closed-trade performance grouped by ticker.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Trades</th>
              <th className="px-4 py-3">Winners</th>
              <th className="px-4 py-3">Losers</th>
              <th className="px-4 py-3">Win Rate</th>
              <th className="px-4 py-3">Net P/L</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {symbols.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No closed trades available for symbol reporting with the
                  current filters.
                </td>
              </tr>
            )}

            {symbols.map((symbol) => (
              <tr key={symbol.symbol} className="transition hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-semibold text-slate-100">
                  {symbol.symbol}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {symbol.trades}
                </td>

                <td className="px-4 py-3 text-emerald-300">
                  {symbol.winners}
                </td>

                <td className="px-4 py-3 text-red-300">
                  {symbol.losers}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {symbol.winRate.toFixed(0)}%
                </td>

                <td
                  className={
                    "px-4 py-3 font-medium " +
                    (symbol.netPnl > 0
                      ? "text-emerald-400"
                      : symbol.netPnl < 0
                        ? "text-red-400"
                        : "text-slate-300")
                  }
                >
                  {formatMoney(symbol.netPnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}