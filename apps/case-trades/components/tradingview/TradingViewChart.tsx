"use client";

import { useEffect, useRef } from "react";

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

interface TradingViewChartProps {
  symbol: string;
  interval: string;

  /** OPTIONAL LINES (DETAIL PAGE) */
  entryPrice?: number;
  showEntry?: boolean;
  showSL?: boolean;
  showTP?: boolean;
  levels?: PriceLevel[];

  /** 🔒 ONE-WAY UNDERLYING PRICE SNAPSHOT */
  onUnderlyingPrice?: (price: number) => void;
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
  onUnderlyingPrice,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /** 🔒 PREVENT RE-EMIT */
  const priceEmittedRef = useRef(false);

  const containerId = `tv_${symbol}_${interval}`;

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
      const widget = new window.TradingView.widget({
        autosize: true,
        symbol,
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
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = renderWidget;
      document.body.appendChild(script);
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
    symbol,
    interval,
    entryPrice,
    showEntry,
    showSL,
    showTP,
    levels,
    onUnderlyingPrice,
  ]);

  return (
    <div
      id={containerId}
      ref={containerRef}
      className="h-[420px] w-full rounded-md overflow-hidden"
    />
  );
}
