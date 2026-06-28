"use client";

import { useState } from "react";
import TradingViewChart from "@/components/tradingview/TradingViewChart";
import { createSignal } from "./actions";

export default function SignalCreateForm() {
  /** LIVE STREAMED PRICE */
  const [livePrice, setLivePrice] = useState<number | null>(null);

  /** 🔒 LOCKED PRICE (AUTHORITATIVE ON SUBMIT) */
  const [lockedPrice, setLockedPrice] = useState<number | null>(null);

  /** ---------------------------------------------
   *  HANDLE PRICE UPDATES
   *  - Ignore updates once locked
   * --------------------------------------------- */
  const handleUnderlyingPrice = (price: number) => {
    if (lockedPrice !== null) return;
    setLivePrice(price);
  };

  /** ---------------------------------------------
   *  SUBMIT
   * --------------------------------------------- */
  const handleSubmit = async () => {
    const priceToUse = lockedPrice ?? livePrice;

    if (!priceToUse) {
      alert("Waiting for market price…");
      return;
    }

    // 🔒 LOCK PRICE AT CLICK TIME
    setLockedPrice(priceToUse);

    await createSignal({
      action: "BUY",
      instrument_type: "OPTION",
      underlying: "META",
      entry_price: 3.25, // option premium
      underlying_entry_price: priceToUse,
      confidence: 80,
      trade_style: "scalp",
    });
  };

  const displayPrice = lockedPrice ?? livePrice;

  return (
    <div className="space-y-6">
      <TradingViewChart
        symbol="META"
        interval="5"
        onUnderlyingPrice={handleUnderlyingPrice}
      />

      <div className="text-sm text-muted-foreground">
        Underlying price:{" "}
        {displayPrice
          ? `$${displayPrice.toFixed(2)}`
          : "Loading…"}
        {lockedPrice && (
          <span className="ml-2 text-green-500">
            (locked)
          </span>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!displayPrice}
        className="btn-primary"
      >
        Create Signal
      </button>
    </div>
  );
}
