"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  LineChart,
  Lock,
  Send,
  Sparkles,
} from "lucide-react";
import { createSignal } from "./actions";
import TradingViewChart from "@/components/tradingview/TradingViewChart";
import { Form } from "@/components/ui/form";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Button } from "@/components/ui/button";

const DEFAULT_UNDERLYING = "QQQ";

export default function CreateSignalPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedUnderlying, setSelectedUnderlying] =
    useState(DEFAULT_UNDERLYING);
  const [underlyingEntryPrice, setUnderlyingEntryPrice] =
    useState<number | null>(null);
  const [lockedPrice, setLockedPrice] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const chartSymbol = useMemo(() => {
    const symbol = selectedUnderlying.trim().toUpperCase();
    return symbol || DEFAULT_UNDERLYING;
  }, [selectedUnderlying]);

  function handleUnderlyingChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedUnderlying(e.target.value);
    setUnderlyingEntryPrice(null);
    setLockedPrice(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const underlying = String(formData.get("underlying") ?? "")
      .trim()
      .toUpperCase();

    const entryPrice = Number(formData.get("entry_price"));
    const confidence = Number(formData.get("confidence"));

    const resolvedUnderlyingPrice =
      lockedPrice ?? underlyingEntryPrice ?? entryPrice;

    if (!underlying) {
      setFormError("Underlying ticker is required.");
      return;
    }

    if (!entryPrice || entryPrice <= 0) {
      setFormError("Entry price must be greater than 0.");
      return;
    }

    if (!resolvedUnderlyingPrice || resolvedUnderlyingPrice <= 0) {
      setFormError("Underlying market price is required.");
      return;
    }

    if (!confidence || confidence < 1 || confidence > 100) {
      setFormError("Confidence must be between 1 and 100.");
      return;
    }

    setLockedPrice(resolvedUnderlyingPrice);
    setFormError(null);

    startTransition(async () => {
      const result = await createSignal({
        action: formData.get("action") as "BUY" | "SELL",
        instrument_type: formData.get("instrument_type") as "OPTION" | "STOCK",
        underlying,
        entry_price: entryPrice,
        underlying_entry_price: resolvedUnderlyingPrice,
        option_type:
          (formData.get("option_type") as "CALL" | "PUT") || undefined,
        strike_price: formData.get("strike_price")
          ? Number(formData.get("strike_price"))
          : undefined,
        expiration_date:
          (formData.get("expiration_date") as string) || undefined,
        confidence,
        trade_style: formData.get("trade_style") as "scalp" | "swing" | "leap",
      });

      if (result.success) {
        router.push(`/dashboard/signals/${result.id}?created=1`);
        return;
      }

      setFormError(result.errors?._form ?? "Failed to create signal.");
    });
  }

  const displayPrice = lockedPrice ?? underlyingEntryPrice;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-100">
          <Sparkles className="h-6 w-6 text-emerald-400" />
          Create Signal
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Master-admin only. Create a premium CASE signal and automatically
          apply execution rules.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
        <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
              <LineChart className="h-5 w-5 text-emerald-400" />
              Underlying Price Snapshot
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              The live price is captured as the underlying entry reference for
              the signal.
            </p>
          </div>

          {lockedPrice !== null && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              <Lock className="h-3 w-3" />
              Locked at submit
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
          <TradingViewChart
            key={chartSymbol}
            symbol={chartSymbol}
            interval="5"
            onUnderlyingPrice={setUnderlyingEntryPrice}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Underlying
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {chartSymbol}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Live Price
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-400">
              {underlyingEntryPrice !== null
                ? `$${underlyingEntryPrice.toFixed(2)}`
                : "Loading…"}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Submit Price
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {displayPrice !== null ? `$${displayPrice.toFixed(2)}` : "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <Form
          onSubmit={handleSubmit}
          title="Signal Details"
          description="Choose the instrument, entry details, confidence, and execution style."
        >
          {formError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {formError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FormSelect label="Action" name="action" required>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </FormSelect>

            <FormSelect label="Instrument" name="instrument_type" required>
              <option value="OPTION">Option</option>
              <option value="STOCK">Stock</option>
            </FormSelect>
          </div>

          <FormSelect
            label="Execution Style"
            name="trade_style"
            required
            hint="Determines default stop-loss, take-profit, and management rules."
          >
            <option value="scalp">Scalp — tight SL, fast TP</option>
            <option value="swing">Swing — balanced risk/reward</option>
            <option value="leap">Leap — wide SL, long horizon</option>
          </FormSelect>

          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="Underlying"
              name="underlying"
              required
              placeholder={DEFAULT_UNDERLYING}
              defaultValue={DEFAULT_UNDERLYING}
              onChange={handleUnderlyingChange}
            />

            <FormInput
              label="Entry Price"
              name="entry_price"
              type="number"
              step="0.01"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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

            <FormInput label="Expiration" name="expiration_date" type="date" />
          </div>

          <FormInput
            label="Confidence"
            name="confidence"
            type="number"
            min={1}
            max={100}
            required
            placeholder="80"
          />

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <Activity className="mt-0.5 h-5 w-5 text-emerald-400" />
              <div>
                <p className="font-medium text-emerald-300">
                  Execution rules will be applied automatically.
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  The selected execution style controls the default stop-loss,
                  take-profit, and signal management rules.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              <span className="inline-flex items-center gap-2">
                {isPending ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Create Signal
                  </>
                )}
              </span>
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}