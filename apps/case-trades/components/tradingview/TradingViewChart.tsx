"use client";

import { useEffect, useMemo, useRef } from "react";

declare global {
  interface Window {
    TradingView: any;
  }
}

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
export type PriceLevel = {
  type: "STOP_LOSS" | "TAKE_PROFIT";
  price: number;
};

export type ChartOptionLeg = {
  id?: string | null;
  leg_order?: number | null;
  action?: string | null;
  option_type?: "CALL" | "PUT" | string | null;
  strike_price?: number | string | null;
  expiration_date?: string | null;
  contracts?: number | string | null;
  entry_price?: number | string | null;
};

interface TradingViewChartProps {
  symbol: string;
  interval: string;

  /** OPTIONAL LINES (DETAIL PAGE) */
  entryPrice?: number;
  showEntry?: boolean;
  showSL?: boolean;
  showTP?: boolean;
  levels?: PriceLevel[];

  /** MULTI-LEG STRATEGY DISPLAY */
  optionLegs?: ChartOptionLeg[];
  strategyLabel?: string | null;
  netEntry?: number | null;
  debitCredit?: "DEBIT" | "CREDIT" | "EVEN" | "UNKNOWN" | string | null;

  /** 🔒 ONE-WAY UNDERLYING PRICE SNAPSHOT */
  onUnderlyingPrice?: (price: number) => void;
}

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
function normalizeNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function formatMoney(value: number | string | null | undefined) {
  const parsed = normalizeNumber(value);

  if (parsed === null) {
    return "—";
  }

  return `$${parsed.toFixed(2)}`;
}

function formatStrike(value: number | string | null | undefined) {
  const parsed = normalizeNumber(value);

  if (parsed === null) {
    return "—";
  }

  if (Number.isInteger(parsed)) {
    return String(parsed);
  }

  return parsed.toFixed(2);
}

function formatAction(value: string | null | undefined) {
  const normalized = String(value ?? "").toUpperCase();

  if (normalized === "BUY_TO_OPEN") return "BTO";
  if (normalized === "SELL_TO_OPEN") return "STO";
  if (normalized === "BUY_TO_CLOSE") return "BTC";
  if (normalized === "SELL_TO_CLOSE") return "STC";

  return normalized || "—";
}

function formatDebitCredit(value: TradingViewChartProps["debitCredit"]) {
  if (value === "DEBIT") return "Debit";
  if (value === "CREDIT") return "Credit";
  if (value === "EVEN") return "Even";
  if (value === "UNKNOWN") return "Unknown";

  return value ?? "Unknown";
}

function getLegTone(action: string | null | undefined) {
  const normalized = String(action ?? "").toUpperCase();

  if (
    normalized === "SELL_TO_OPEN" ||
    normalized === "STO" ||
    normalized === "SELL" ||
    normalized === "SHORT"
  ) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  return "border-sky-500/30 bg-sky-500/10 text-sky-200";
}

/* -------------------------------------------------
   COMPONENT
------------------------------------------------- */
export default function TradingViewChart({
  symbol,
  interval,
  entryPrice,
  showEntry = true,
  showSL = true,
  showTP = true,
  levels = [],
  optionLegs = [],
  strategyLabel,
  netEntry,
  debitCredit,
  onUnderlyingPrice,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /** 🔒 PREVENT RE-EMIT */
  const priceEmittedRef = useRef(false);

  const normalizedSymbol = symbol.trim().toUpperCase();
  const containerId = `tv_${normalizedSymbol}_${interval}`;

  const sortedOptionLegs = useMemo(() => {
    return [...optionLegs].sort((a, b) => {
      const aOrder = normalizeNumber(a.leg_order) ?? 999;
      const bOrder = normalizeNumber(b.leg_order) ?? 999;

      return aOrder - bOrder;
    });
  }, [optionLegs]);

  const hasOptionLegs = sortedOptionLegs.length > 0;

  useEffect(() => {
    if (!containerRef.current) return;

    priceEmittedRef.current = false;

    /* -------------------------------------------------
       🔑 EMIT UNDERLYING PRICE (SAFE + SUPPORTED)
    ------------------------------------------------- */
    const tryEmitPrice = () => {
      const widget = widgetRef.current;
      if (!widget) return;

      const chart = widget.chart?.();
      if (!chart) return;

      const price = chart.symbol?.()?.last_price;

      if (
        typeof price === "number" &&
        !Number.isNaN(price) &&
        !priceEmittedRef.current
      ) {
        priceEmittedRef.current = true;
        onUnderlyingPrice?.(price);

        // 🛑 STOP POLLING ONCE LOCKED
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    };

    /* -------------------------------------------------
       RENDER TRADINGVIEW
    ------------------------------------------------- */
    const renderWidget = () => {
      if (!containerRef.current) return;

      containerRef.current.innerHTML = "";

      const widget = new window.TradingView.widget({
        autosize: true,
        symbol: normalizedSymbol,
        interval,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        container_id: containerId,
      });

      widgetRef.current = widget;

      // ✅ Preferred path (if available)
      if (typeof widget.onChartReady === "function") {
        widget.onChartReady(() => {
          tryEmitPrice();
        });
      }

      // ⏱ Fallback polling (tv.js reality)
      pollRef.current = setInterval(() => {
        tryEmitPrice();
      }, 200);
    };

    if (!window.TradingView) {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://s3.tradingview.com/tv.js"]',
      );

      if (existingScript) {
        existingScript.addEventListener("load", renderWidget, { once: true });
      } else {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = renderWidget;
        document.body.appendChild(script);
      }
    } else {
      renderWidget();
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }

      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch {}
      }

      widgetRef.current = null;
    };
  }, [
    normalizedSymbol,
    interval,
    containerId,
    entryPrice,
    showEntry,
    showSL,
    showTP,
    levels,
    onUnderlyingPrice,
  ]);

  return (
    <div className="space-y-3">
      <div
        id={containerId}
        ref={containerRef}
        className="h-[420px] w-full overflow-hidden rounded-md"
      />

      {(showEntry && entryPrice) || hasOptionLegs ? (
        <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Strategy Overlay
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-100">
                {strategyLabel || "Signal Levels"}
              </p>

              {hasOptionLegs ? (
                <p className="mt-1 text-xs text-slate-400">
                  Showing all saved option legs for this strategy. TradingView
                  displays the underlying chart while CASE displays the option
                  structure below it.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2 md:text-right">
              {showEntry && entryPrice ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Underlying Entry
                  </p>
                  <p className="font-semibold text-slate-100">
                    {formatMoney(entryPrice)}
                  </p>
                </div>
              ) : null}

              {netEntry !== null && netEntry !== undefined ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Net Entry
                  </p>
                  <p className="font-semibold text-emerald-300">
                    {formatMoney(Math.abs(Number(netEntry)))}{" "}
                    {formatDebitCredit(debitCredit)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {levels.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {levels
                .filter((level) => {
                  if (level.type === "STOP_LOSS") return showSL;
                  if (level.type === "TAKE_PROFIT") return showTP;
                  return true;
                })
                .map((level) => (
                  <div
                    key={`${level.type}-${level.price}`}
                    className={
                      "rounded-lg border px-3 py-2 text-sm " +
                      (level.type === "STOP_LOSS"
                        ? "border-red-500/30 bg-red-500/10 text-red-200"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200")
                    }
                  >
                    <span className="font-semibold">
                      {level.type === "STOP_LOSS" ? "Stop Loss" : "Take Profit"}
                    </span>
                    <span className="ml-2">{formatMoney(level.price)}</span>
                  </div>
                ))}
            </div>
          ) : null}

          {hasOptionLegs ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {sortedOptionLegs.map((leg, index) => {
                const action = formatAction(leg.action);
                const contracts = normalizeNumber(leg.contracts) ?? 1;
                const optionType = String(leg.option_type ?? "").toUpperCase();

                return (
                  <div
                    key={leg.id ?? `${index}-${leg.strike_price}-${leg.option_type}`}
                    className={`rounded-xl border px-4 py-3 ${getLegTone(
                      leg.action,
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide opacity-70">
                          Leg {leg.leg_order ?? index + 1}
                        </p>

                        <p className="mt-1 font-semibold">
                          {action} {contracts} {normalizedSymbol}{" "}
                          {formatStrike(leg.strike_price)} {optionType || "—"}
                        </p>
                      </div>

                      <div className="text-right text-xs opacity-80">
                        <p>Exp: {leg.expiration_date ?? "—"}</p>
                        <p>Entry: {formatMoney(leg.entry_price)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}