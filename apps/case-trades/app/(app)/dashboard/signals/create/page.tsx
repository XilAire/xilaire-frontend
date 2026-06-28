"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSignal } from "./actions";

import TradingViewChart from "@/components/tradingview/TradingViewChart";

import { Form } from "@/components/ui/form";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------
   PAGE: CREATE SIGNAL (MASTER ADMIN)
   🔐 Access enforced by middleware ONLY
------------------------------------------------- */
export default function CreateSignalPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /** 🔒 OPTIONAL UNDERLYING PRICE SNAPSHOT */
  const [underlyingEntryPrice, setUnderlyingEntryPrice] =
    useState<number | null>(null);

  function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const entryPrice = Number(
        formData.get("entry_price")
      );

      const resolvedUnderlyingPrice =
        underlyingEntryPrice ?? entryPrice;

      const result = await createSignal({
        action: formData.get("action") as "BUY" | "SELL",

        instrument_type: formData.get("instrument_type") as
          | "OPTION"
          | "STOCK",

        underlying: String(formData.get("underlying")),

        entry_price: entryPrice,

        /** 🟡 BEST-EFFORT SNAPSHOT */
        underlying_entry_price: resolvedUnderlyingPrice,

        option_type:
          (formData.get("option_type") as "CALL" | "PUT") ||
          undefined,

        strike_price: formData.get("strike_price")
          ? Number(formData.get("strike_price"))
          : undefined,

        expiration_date:
          (formData.get("expiration_date") as string) ||
          undefined,

        confidence: Number(formData.get("confidence")),

        trade_style: formData.get("trade_style") as
          | "scalp"
          | "swing"
          | "leap",
      });

      if (result?.success && result.id) {
        router.push(
          `/dashboard/signals/${result.id}?created=1`
        );
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* 🔒 LIVE UNDERLYING PRICE SOURCE */}
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="mb-2 text-sm font-medium text-muted-foreground">
          Underlying Price (best-effort snapshot)
        </div>

        <TradingViewChart
          symbol="QQQ"
          interval="5"
          onUnderlyingPrice={setUnderlyingEntryPrice}
        />

        <div className="mt-2 text-sm text-muted-foreground">
          Underlying price:&nbsp;
          {underlyingEntryPrice !== null ? (
            <span className="text-green-400">
              ${underlyingEntryPrice.toFixed(2)}
            </span>
          ) : (
            "Not locked (will fallback)"
          )}
        </div>
      </div>

      {/* 🧾 FORM */}
      <div className="rounded-xl border border-border bg-background p-6">
        <Form
          onSubmit={handleSubmit}
          title="Create Signal"
          description="Master-admin only. Execution rules are applied automatically."
        >
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Action" name="action" required>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </FormSelect>

            <FormSelect
              label="Instrument"
              name="instrument_type"
              required
            >
              <option value="OPTION">Option</option>
              <option value="STOCK">Stock</option>
            </FormSelect>
          </div>

          <FormSelect
            label="Execution Style"
            name="trade_style"
            required
            hint="Determines default SL / TP / management rules."
          >
            <option value="scalp">
              Scalp — tight SL, fast TP
            </option>
            <option value="swing">
              Swing — balanced risk/reward
            </option>
            <option value="leap">
              Leap — wide SL, long horizon
            </option>
          </FormSelect>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Underlying"
              name="underlying"
              required
              placeholder="QQQ"
            />

            <FormInput
              label="Entry Price (Option / Stock)"
              name="entry_price"
              type="number"
              step="0.01"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormSelect label="Option Type" name="option_type">
              <option value="">—</option>
              <option value="CALL">CALL</option>
              <option value="PUT">PUT</option>
            </FormSelect>

            <FormInput
              label="Strike"
              name="strike_price"
              type="number"
              step="0.01"
            />

            <FormInput
              label="Expiration"
              name="expiration_date"
              type="date"
            />
          </div>

          <FormInput
            label="Confidence (1–100)"
            name="confidence"
            type="number"
            min={1}
            max={100}
            required
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create Signal"}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
