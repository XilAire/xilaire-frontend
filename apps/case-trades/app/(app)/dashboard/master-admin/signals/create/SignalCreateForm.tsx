"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Lock, Send, TrendingUp } from "lucide-react";
import TradingViewChart from "@/components/tradingview/TradingViewChart";
import { createSignal } from "./actions";

export default function SignalCreateForm() {
  const [isPending, startTransition] = useTransition();

  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [lockedPrice, setLockedPrice] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleUnderlyingPrice = (price: number) => {
    if (lockedPrice !== null) return;
    setLivePrice(price);
  };

  const handleSubmit = () => {
    const priceToUse = lockedPrice ?? livePrice;

    if (!priceToUse) {
      setMessage("Waiting for market price before creating signal.");
      return;
    }

    setLockedPrice(priceToUse);
    setMessage(null);

    startTransition(async () => {
      const result = await createSignal({
        action: "BUY",
        instrument_type: "OPTION",
        underlying: "META",
        entry_price: 3.25,
        underlying_entry_price: priceToUse,
        confidence: 80,
        trade_style: "scalp",
      });

      if (result?.success) {
        setMessage("Signal created and sent successfully.");
      } else {
        setMessage(result?.errors?._form ?? "Failed to create signal.");
      }
    });
  };

  const displayPrice = lockedPrice ?? livePrice;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Live Underlying Chart
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              The market price is captured and locked when the signal is created.
            </p>
          </div>

          {lockedPrice !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </div>

        <TradingViewChart
          symbol="META"
          interval="5"
          onUnderlyingPrice={handleUnderlyingPrice}
        />

        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950 p-4">
          <p className="text-sm text-slate-400">Underlying price</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-400">
            {displayPrice ? `$${displayPrice.toFixed(2)}` : "Loading…"}
          </p>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!displayPrice || isPending}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {isPending ? "Creating…" : "Create Signal"}
      </button>
    </div>
  );
}