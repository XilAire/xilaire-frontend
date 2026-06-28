"use client";

export type ReportTrade = {
  id: string;
  signal_id: string;
  symbol: string;
  instrument_type: string;
  side: string;
  trade_style: string;
  quantity: number;
  entry_price: number | null;
  exit_price: number | null;
  opened_at: string | null;
  closed_at: string | null;
  duration_minutes: number | null;
  profit_loss: number | null;
  profit_loss_pct: number | null;
  status: string;
  outcome: "WIN" | "LOSS" | "BREAKEVEN" | null;
};

type ClosedTradesTableProps = {
  trades: ReportTrade[];
};

function getClosedTradeDate(trade: ReportTrade) {
  const timestamp = trade.closed_at ?? trade.opened_at;

  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date;
}

function formatDuration(minutes: number | null) {
  if (minutes === null) {
    return "—";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);

  return `${prefix}$${absolute}`;
}

function formatMoneyNoSign(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return `$${Number(value).toFixed(2)}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  const amount = Number(value);
  const prefix = amount > 0 ? "+" : "";

  return `${prefix}${amount.toFixed(2)}%`;
}

export default function ClosedTradesTable({ trades }: ClosedTradesTableProps) {
  const sortedTrades = [...trades].sort((a, b) => {
    const aTime = getClosedTradeDate(a)?.getTime() ?? 0;
    const bTime = getClosedTradeDate(b)?.getTime() ?? 0;

    return bTime - aTime;
  });

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-100">
          Closed Trades
        </h2>

        <p className="text-sm text-slate-400">
          Detailed realized trade list for the current report filters.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Closed</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Strategy</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Exit</th>
              <th className="px-4 py-3">P/L</th>
              <th className="px-4 py-3">Return</th>
              <th className="px-4 py-3">Hold</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {sortedTrades.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No closed trades match the current filters.
                </td>
              </tr>
            )}

            {sortedTrades.map((trade) => {
              const closedDate = getClosedTradeDate(trade);
              const pnl = Number(trade.profit_loss ?? 0);

              return (
                <tr key={trade.id} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-slate-400">
                    {closedDate
                      ? closedDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </td>

                  <td className="px-4 py-3 font-semibold text-slate-100">
                    {trade.symbol}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {trade.instrument_type}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {trade.trade_style}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {trade.quantity}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {formatMoneyNoSign(trade.entry_price)}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {formatMoneyNoSign(trade.exit_price)}
                  </td>

                  <td
                    className={
                      "px-4 py-3 font-medium " +
                      (pnl > 0
                        ? "text-emerald-400"
                        : pnl < 0
                          ? "text-red-400"
                          : "text-slate-300")
                    }
                  >
                    {formatMoney(trade.profit_loss)}
                  </td>

                  <td
                    className={
                      "px-4 py-3 font-medium " +
                      (Number(trade.profit_loss_pct ?? 0) > 0
                        ? "text-emerald-400"
                        : Number(trade.profit_loss_pct ?? 0) < 0
                          ? "text-red-400"
                          : "text-slate-300")
                    }
                  >
                    {formatPercent(trade.profit_loss_pct)}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {formatDuration(trade.duration_minutes)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}