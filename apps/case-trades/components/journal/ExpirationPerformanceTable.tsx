"use client";

export type ExpirationPerformance = {
  bucket: string;
  minDays: number;
  maxDays: number | null;
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

type ExpirationPerformanceTableProps = {
  expirationBuckets: ExpirationPerformance[];
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);

  return `${prefix}$${absolute}`;
}

function formatExpirationRange(bucket: ExpirationPerformance) {
  if (bucket.maxDays === null) {
    return `${bucket.minDays}+ days`;
  }

  if (bucket.minDays === bucket.maxDays) {
    return `${bucket.minDays} days`;
  }

  return `${bucket.minDays}-${bucket.maxDays} days`;
}

export default function ExpirationPerformanceTable({
  expirationBuckets,
}: ExpirationPerformanceTableProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-100">
          Performance by Expiration
        </h2>

        <p className="text-sm text-slate-400">
          Closed option-trade performance grouped by expiration window.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Expiration Bucket</th>
              <th className="px-4 py-3">Range</th>
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
            {expirationBuckets.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No closed option trades available for expiration reporting
                  with the current filters.
                </td>
              </tr>
            )}

            {expirationBuckets.map((bucket) => (
              <tr
                key={bucket.bucket}
                className="transition hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3 font-semibold text-slate-100">
                  {bucket.bucket}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {formatExpirationRange(bucket)}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {bucket.trades}
                </td>

                <td className="px-4 py-3 text-emerald-300">
                  {bucket.winners}
                </td>

                <td className="px-4 py-3 text-red-300">
                  {bucket.losers}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {bucket.breakevens}
                </td>

                <td className="px-4 py-3 text-slate-300">
                  {bucket.winRate.toFixed(0)}%
                </td>

                <td className="px-4 py-3 text-emerald-300">
                  {formatMoney(bucket.averageWinner)}
                </td>

                <td className="px-4 py-3 text-red-300">
                  {formatMoney(-bucket.averageLoser)}
                </td>

                <td
                  className={
                    "px-4 py-3 font-medium " +
                    (bucket.profitFactor >= 1
                      ? "text-emerald-400"
                      : "text-red-400")
                  }
                >
                  {bucket.profitFactor.toFixed(2)}
                </td>

                <td
                  className={
                    "px-4 py-3 font-medium " +
                    (bucket.netPnl > 0
                      ? "text-emerald-400"
                      : bucket.netPnl < 0
                        ? "text-red-400"
                        : "text-slate-300")
                  }
                >
                  {formatMoney(bucket.netPnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}