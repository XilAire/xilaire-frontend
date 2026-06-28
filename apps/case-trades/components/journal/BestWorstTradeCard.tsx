"use client";

export type BestWorstTrade = {
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

type BestWorstTradeCardProps = {
  title: string;
  trade: BestWorstTrade | null;
  type: "best" | "worst";
};

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

function InfoRow({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-4 py-3">
      <span className="text-slate-400">{label}</span>

      <span
        className={
          "font-medium " +
          (negative
            ? "text-red-400"
            : positive
              ? "text-emerald-400"
              : "text-slate-100")
        }
      >
        {value}
      </span>
    </div>
  );
}

export default function BestWorstTradeCard({
  title,
  trade,
  type,
}: BestWorstTradeCardProps) {
  const isBest = type === "best";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>

      {trade ? (
        <div className="mt-4 space-y-3 text-sm">
          <InfoRow label="Symbol" value={trade.symbol} />

          <InfoRow
            label="Type"
            value={`${trade.instrument_type} ${trade.side}`}
          />

          <InfoRow label="Strategy" value={trade.trade_style} />

          <InfoRow label="Quantity" value={String(trade.quantity)} />

          <InfoRow
            label="Entry"
            value={formatMoneyNoSign(trade.entry_price)}
          />

          <InfoRow label="Exit" value={formatMoneyNoSign(trade.exit_price)} />

          <InfoRow
            label="P/L"
            value={formatMoney(trade.profit_loss)}
            positive={isBest}
            negative={!isBest}
          />

          <InfoRow
            label="Return"
            value={formatPercent(trade.profit_loss_pct)}
            positive={Number(trade.profit_loss_pct ?? 0) > 0}
            negative={Number(trade.profit_loss_pct ?? 0) < 0}
          />
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-400">
          {isBest
            ? "No closed winning trades match the current filters."
            : "No closed losing trades match the current filters."}
        </p>
      )}
    </div>
  );
}