"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Gauge,
  Hash,
  Info,
  LineChart,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Building2,
} from "lucide-react";

import { createSignal } from "./actions";
import TradingViewChart from "@/components/tradingview/TradingViewChart";

const DEFAULT_UNDERLYING = "QQQ";
const DEFAULT_ORG_SLUG = "case-trades";

type InstrumentType = "OPTION" | "STOCK";

type SignalCreateStatus =
  | "Active"
  | "Watching"
  | "Triggered"
  | "Closed"
  | "Expired";

type SignalOutcome = "WIN" | "LOSS" | "BREAKEVEN" | "";

type OpenAction = "BUY_TO_OPEN" | "SELL_TO_OPEN";

function withOrgQuery(href: string, organizationSlug?: string | null) {
  if (!organizationSlug) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}org=${encodeURIComponent(organizationSlug)}`;
}

function resolvePersistedStatus(status: SignalCreateStatus) {
  if (status === "Watching") return "Active";
  return status;
}

function isWatchingStatus(status: SignalCreateStatus) {
  return status === "Watching";
}

function isClosedStatus(status: SignalCreateStatus) {
  return status === "Closed" || status === "Expired";
}

function isActiveExecutionStatus(status: SignalCreateStatus) {
  return status === "Active" || status === "Watching" || status === "Triggered";
}

function getBrokerAction(action: OpenAction) {
  if (action === "SELL_TO_OPEN") return "SELL";
  return "BUY";
}

function getQuantityLabel(instrumentType: InstrumentType) {
  return instrumentType === "OPTION" ? "Contracts" : "Shares";
}

function getEntryPriceHint(instrumentType: InstrumentType) {
  return instrumentType === "OPTION"
    ? "Option contract entry price. This is the execution/open price."
    : "Stock share entry price. This is the execution/open price.";
}

export default function CreateSignalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedOrganizationSlug = searchParams.get("org") || DEFAULT_ORG_SLUG;

  const [selectedInstrumentType, setSelectedInstrumentType] =
    useState<InstrumentType>("OPTION");
  const [selectedTicker, setSelectedTicker] = useState(DEFAULT_UNDERLYING);
  const [selectedOptionType, setSelectedOptionType] = useState("CALL");
  const [selectedOpenAction, setSelectedOpenAction] =
    useState<OpenAction>("BUY_TO_OPEN");
  const [selectedStatus, setSelectedStatus] =
    useState<SignalCreateStatus>("Active");
  const [selectedOutcome, setSelectedOutcome] = useState<SignalOutcome>("");
  const [quantity, setQuantity] = useState("");
  const [returnPct, setReturnPct] = useState("");
  const [strikePrice, setStrikePrice] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [confidence, setConfidence] = useState("80");
  const [underlyingEntryPrice, setUnderlyingEntryPrice] =
    useState<number | null>(null);
  const [lockedPrice, setLockedPrice] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const chartSymbol = useMemo(() => {
    const symbol = selectedTicker.trim().toUpperCase();
    return symbol || DEFAULT_UNDERLYING;
  }, [selectedTicker]);

  const displayPrice = lockedPrice ?? underlyingEntryPrice;
  const shouldShowOutcomeFields = isClosedStatus(selectedStatus);
  const shouldRequireOpenExecution = isActiveExecutionStatus(selectedStatus);
  const quantityLabel = getQuantityLabel(selectedInstrumentType);

  function handleTickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = e.target.value.toUpperCase();

    setSelectedTicker(nextValue);
    setUnderlyingEntryPrice(null);
    setLockedPrice(null);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = e.target.value as SignalCreateStatus;

    setSelectedStatus(nextStatus);

    if (!isClosedStatus(nextStatus)) {
      setSelectedOutcome("");
      setReturnPct("");
    }
  }

  function handleInstrumentTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextInstrumentType = e.target.value as InstrumentType;

    setSelectedInstrumentType(nextInstrumentType);

    if (nextInstrumentType === "STOCK") {
      setSelectedOptionType("CALL");
      setStrikePrice("");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const ticker = String(formData.get("asset") ?? "")
      .trim()
      .toUpperCase();

    const nextInstrumentType = formData.get(
      "instrument_type"
    ) as InstrumentType;

    const nextEntryPrice = Number(formData.get("entry_price"));
    const nextConfidence = Number(formData.get("confidence"));
    const nextQuantity = Number(formData.get("quantity"));
    const nextStatus = formData.get("status") as SignalCreateStatus;
    const persistedStatus = resolvePersistedStatus(nextStatus);
    const nextWatching = isWatchingStatus(nextStatus);
    const nextOutcome = String(formData.get("outcome") ?? "") as SignalOutcome;
    const nextReturnPct = formData.get("return_pct")
      ? Number(formData.get("return_pct"))
      : null;

    const nextOpenAction = formData.get("open_action") as OpenAction;
    const nextAction = getBrokerAction(nextOpenAction);

    const resolvedUnderlyingPrice =
      lockedPrice ?? underlyingEntryPrice ?? nextEntryPrice;

    if (!selectedOrganizationSlug) {
      setFormError("Organization is required.");
      return;
    }

    if (!ticker) {
      setFormError("Ticker is required.");
      return;
    }

    if (!nextEntryPrice || nextEntryPrice <= 0) {
      setFormError("Entry/open price must be greater than 0.");
      return;
    }

    if (!resolvedUnderlyingPrice || resolvedUnderlyingPrice <= 0) {
      setFormError("Underlying market price is required.");
      return;
    }

    if (!nextConfidence || nextConfidence < 1 || nextConfidence > 100) {
      setFormError("Confidence must be between 1 and 100.");
      return;
    }

    if (shouldRequireOpenExecution) {
      if (!nextQuantity || nextQuantity <= 0) {
        setFormError(`${getQuantityLabel(nextInstrumentType)} must be greater than 0.`);
        return;
      }
    }

    if (nextInstrumentType === "OPTION") {
      const nextStrike = Number(formData.get("strike_price"));
      const expirationDate = String(formData.get("expiration_date") ?? "");

      if (!formData.get("option_type")) {
        setFormError("Option type is required for option signals.");
        return;
      }

      if (!nextStrike || nextStrike <= 0) {
        setFormError("Strike price is required for option signals.");
        return;
      }

      if (!expirationDate) {
        setFormError("Expiration date is required for option signals.");
        return;
      }
    }

    if (isClosedStatus(nextStatus)) {
      if (!nextOutcome) {
        setFormError("Closed or expired signals must have an outcome.");
        return;
      }

      if (nextReturnPct === null || !Number.isFinite(nextReturnPct)) {
        setFormError("Closed or expired signals must have a return percentage.");
        return;
      }
    }

    setLockedPrice(resolvedUnderlyingPrice);
    setFormError(null);

    startTransition(async () => {
      const result = await createSignal({
        organization_slug: selectedOrganizationSlug,

        asset: ticker,
        underlying: ticker,

        action: nextAction,
        open_action: nextOpenAction,

        instrument_type: nextInstrumentType,

        status: persistedStatus,
        watching: nextWatching,
        watched: nextWatching,

        outcome: isClosedStatus(nextStatus) ? nextOutcome : null,
        return_pct: isClosedStatus(nextStatus) ? nextReturnPct : null,

        quantity: shouldRequireOpenExecution ? nextQuantity : undefined,
        contracts:
          nextInstrumentType === "OPTION" && shouldRequireOpenExecution
            ? nextQuantity
            : undefined,
        shares:
          nextInstrumentType === "STOCK" && shouldRequireOpenExecution
            ? nextQuantity
            : undefined,

        entry_price: nextEntryPrice,
        open_price: nextEntryPrice,
        underlying_entry_price: resolvedUnderlyingPrice,
        opened_at: shouldRequireOpenExecution ? new Date().toISOString() : null,

        option_type:
          nextInstrumentType === "OPTION"
            ? ((formData.get("option_type") as "CALL" | "PUT") || undefined)
            : undefined,
        strike_price:
          nextInstrumentType === "OPTION" && formData.get("strike_price")
            ? Number(formData.get("strike_price"))
            : undefined,
        expiration_date:
          nextInstrumentType === "OPTION"
            ? ((formData.get("expiration_date") as string) || undefined)
            : undefined,

        confidence: nextConfidence,
        trade_style: formData.get("trade_style") as "scalp" | "swing" | "leap",
      } as any);

      if (result.success) {
        router.push(
          withOrgQuery(
            `/dashboard/signals/${result.id}?created=1`,
            selectedOrganizationSlug
          )
        );

        return;
      }

      setFormError(result.errors?._form ?? "Failed to create signal.");
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <Building2 className="h-4 w-4" />
            Organization: {selectedOrganizationSlug}
          </p>

          <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-100">
            <Sparkles className="h-7 w-7 text-emerald-400" />
            Create Signal
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Create a brokerage-style CASE trade signal with synced ticker and
            underlying, opening quantity, opening price, timestamps, and
            execution tracking.
          </p>
        </div>

        <Link
          href={withOrgQuery(
            "/dashboard/admin/signals",
            selectedOrganizationSlug
          )}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Signals
        </Link>
      </div>

      {formError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {formError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
            <div className="border-b border-white/10 p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                    <LineChart className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">
                      Market Price Snapshot
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      The TradingView price is captured as the market reference
                      for the signal. Ticker and underlying stay synced.
                    </p>
                  </div>
                </div>

                {lockedPrice !== null && (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <Lock className="h-3 w-3" />
                    Locked at submit
                  </span>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                <TradingViewChart
                  key={chartSymbol}
                  symbol={chartSymbol}
                  interval="5"
                  onUnderlyingPrice={setUnderlyingEntryPrice}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <SnapshotCard label="Ticker" value={chartSymbol} />

                <SnapshotCard
                  label="Live Price"
                  value={
                    underlyingEntryPrice !== null
                      ? `$${underlyingEntryPrice.toFixed(2)}`
                      : "Loading…"
                  }
                  highlighted
                />

                <SnapshotCard
                  label="Submit Price"
                  value={
                    displayPrice !== null ? `$${displayPrice.toFixed(2)}` : "—"
                  }
                />
              </div>
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80"
          >
            <input
              type="hidden"
              name="organization_slug"
              value={selectedOrganizationSlug}
            />

            <input type="hidden" name="underlying" value={selectedTicker} />

            <div className="border-b border-white/10 p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                  <Activity className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    Brokerage-Style Signal Details
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Choose the ticker, instrument, open action, quantity,
                    status, entry/open price, confidence, and execution style.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <SelectField
                label="Signal State"
                name="status"
                required
                value={selectedStatus}
                onChange={handleStatusChange}
                hint="If Active, Watching, or Triggered is selected, quantity and open price are required and an execution should be created by the server action."
                options={[
                  { label: "Active", value: "Active" },
                  { label: "Watching", value: "Watching" },
                  { label: "Triggered", value: "Triggered" },
                  { label: "Closed", value: "Closed" },
                  { label: "Expired", value: "Expired" },
                ]}
              />

              <SelectField
                label="Open Action"
                name="open_action"
                required
                value={selectedOpenAction}
                onChange={(e) =>
                  setSelectedOpenAction(e.target.value as OpenAction)
                }
                hint="Brokerage-style opening action."
                options={[
                  { label: "Buy to Open", value: "BUY_TO_OPEN" },
                  { label: "Sell to Open", value: "SELL_TO_OPEN" },
                ]}
              />

              <SelectField
                label="Instrument"
                name="instrument_type"
                required
                value={selectedInstrumentType}
                onChange={handleInstrumentTypeChange}
                hint="Options require contracts. Stocks require shares."
                options={[
                  { label: "Option", value: "OPTION" },
                  { label: "Stock", value: "STOCK" },
                ]}
              />

              <Field
                label="Ticker"
                name="asset"
                required
                value={selectedTicker}
                onChange={handleTickerChange}
                placeholder={DEFAULT_UNDERLYING}
                hint="Ticker and underlying are always the same in this flow."
              />

              <Field
                label="Underlying"
                name="underlying_display"
                required
                value={selectedTicker}
                onChange={handleTickerChange}
                placeholder={DEFAULT_UNDERLYING}
                hint="Locked to the ticker so the chart, signal, and execution stay synced."
              />

              <SelectField
                label="Execution Style"
                name="trade_style"
                required
                defaultValue="swing"
                hint="Determines default stop-loss, take-profit, and management rules."
                options={[
                  { label: "Scalp — tight SL, fast TP", value: "scalp" },
                  { label: "Swing — balanced risk/reward", value: "swing" },
                  { label: "Leap — wide SL, long horizon", value: "leap" },
                ]}
              />

              {selectedInstrumentType === "OPTION" && (
                <>
                  <SelectField
                    label="Option Type"
                    name="option_type"
                    required
                    value={selectedOptionType}
                    onChange={(e) => setSelectedOptionType(e.target.value)}
                    hint="Call or put contract."
                    options={[
                      { label: "CALL", value: "CALL" },
                      { label: "PUT", value: "PUT" },
                    ]}
                  />

                  <Field
                    label="Strike"
                    name="strike_price"
                    type="number"
                    step="0.01"
                    required
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(e.target.value)}
                    hint="Option strike price."
                  />

                  <Field
                    label="Expiration"
                    name="expiration_date"
                    type="date"
                    required
                    hint="Option expiration date."
                  />
                </>
              )}

              <Field
                label={quantityLabel}
                name="quantity"
                type="number"
                step="1"
                min={1}
                required={shouldRequireOpenExecution}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                hint={
                  selectedInstrumentType === "OPTION"
                    ? "Number of option contracts opened."
                    : "Number of stock shares opened."
                }
              />

              <Field
                label="Entry / Open Price"
                name="entry_price"
                type="number"
                step="0.01"
                required
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                hint={getEntryPriceHint(selectedInstrumentType)}
              />

              <Field
                label="Confidence (%)"
                name="confidence"
                type="number"
                min={1}
                max={100}
                required
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                placeholder="80"
                hint="Analyst confidence score from 1 to 100."
              />

              {shouldShowOutcomeFields && (
                <>
                  <SelectField
                    label="Outcome"
                    name="outcome"
                    required
                    value={selectedOutcome}
                    onChange={(e) =>
                      setSelectedOutcome(e.target.value as SignalOutcome)
                    }
                    hint="Required when creating a closed or expired signal."
                    options={[
                      { label: "Select outcome", value: "" },
                      { label: "WIN", value: "WIN" },
                      { label: "LOSS", value: "LOSS" },
                      { label: "BREAKEVEN", value: "BREAKEVEN" },
                    ]}
                  />

                  <Field
                    label="Return (%)"
                    name="return_pct"
                    type="number"
                    step="0.01"
                    required
                    value={returnPct}
                    onChange={(e) => setReturnPct(e.target.value)}
                    placeholder="12.5"
                    hint="Required when creating a closed or expired signal. Use negative values for losses."
                  />
                </>
              )}

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 md:col-span-2">
                <div className="flex items-start gap-3">
                  <Activity className="mt-0.5 h-5 w-5 text-emerald-400" />

                  <div>
                    <p className="font-medium text-emerald-300">
                      Signal and execution state will sync across the platform.
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      Active, Watching, and Triggered signals now require a
                      brokerage-style opening quantity and open price. Options
                      use contracts. Stocks use shares. Ticker and underlying
                      are saved as the same value to avoid mismatched charts,
                      executions, and performance records.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 p-6 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href={withOrgQuery(
                  "/dashboard/admin/signals",
                  selectedOrganizationSlug
                )}
                className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
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
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-sky-500/10 p-3 text-sky-300">
                <Info className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  Signal Preview
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Preview updates as you fill in the brokerage-style signal
                  details.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Signal
              </p>

              <p className="mt-2 text-xl font-bold text-emerald-300">
                {selectedOpenAction === "BUY_TO_OPEN"
                  ? "BUY TO OPEN"
                  : "SELL TO OPEN"}{" "}
                {selectedTicker || DEFAULT_UNDERLYING}{" "}
                {selectedInstrumentType === "OPTION" && strikePrice
                  ? `${strikePrice}`
                  : ""}
                {selectedInstrumentType === "OPTION" && selectedOptionType
                  ? ` ${selectedOptionType}`
                  : ""}
              </p>

              <div className="mt-5 grid gap-3">
                <Metric
                  icon={<Building2 />}
                  label="Organization"
                  value={selectedOrganizationSlug}
                />

                <Metric
                  icon={<Activity />}
                  label="State"
                  value={selectedStatus}
                />

                <Metric
                  icon={<Hash />}
                  label="Ticker"
                  value={selectedTicker || DEFAULT_UNDERLYING}
                />

                <Metric
                  icon={<Target />}
                  label="Underlying"
                  value={chartSymbol}
                />

                <Metric
                  icon={<ShieldCheck />}
                  label="Instrument"
                  value={selectedInstrumentType}
                />

                <Metric
                  icon={<Activity />}
                  label="Open Action"
                  value={
                    selectedOpenAction === "BUY_TO_OPEN"
                      ? "Buy to Open"
                      : "Sell to Open"
                  }
                />

                <Metric
                  icon={<Hash />}
                  label={quantityLabel}
                  value={quantity || "—"}
                />

                {selectedInstrumentType === "OPTION" && (
                  <>
                    <Metric
                      icon={<Hash />}
                      label="Strike"
                      value={strikePrice || "—"}
                    />

                    <Metric
                      icon={<CalendarDays />}
                      label="Expiration"
                      value="Selected in form"
                    />
                  </>
                )}

                <Metric
                  icon={<CircleDollarSign />}
                  label="Open Price"
                  value={entryPrice ? `$${Number(entryPrice).toFixed(2)}` : "—"}
                />

                <Metric
                  icon={<CalendarDays />}
                  label="Live Market"
                  value={
                    underlyingEntryPrice !== null
                      ? `$${underlyingEntryPrice.toFixed(2)}`
                      : "Loading…"
                  }
                />

                <Metric
                  icon={<Gauge />}
                  label="Confidence"
                  value={confidence ? `${confidence}%` : "—"}
                />

                <Metric
                  icon={<Clock />}
                  label="Open Timestamp"
                  value={
                    shouldRequireOpenExecution
                      ? "Saved on submit"
                      : "Not opened"
                  }
                />

                {shouldShowOutcomeFields && (
                  <>
                    <Metric
                      icon={<CheckCircle2 />}
                      label="Outcome"
                      value={selectedOutcome || "—"}
                    />

                    <Metric
                      icon={<LineChart />}
                      label="Return"
                      value={returnPct ? `${returnPct}%` : "—"}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  Admin Guardrails
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  This page creates signals for the selected organization only.
                  The server action will verify your admin role, resolve the
                  organization, save the normalized signal, and create the
                  opening execution when the signal is opened.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SnapshotCard({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>

      <p
        className={
          "mt-1 text-lg font-semibold " +
          (highlighted ? "text-emerald-400" : "text-slate-100")
        }
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  value,
  defaultValue,
  onChange,
  placeholder,
  hint,
  step,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  hint?: string;
  step?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-200">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>

      <input
        name={name}
        type={type}
        required={required}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
      />

      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SelectField({
  label,
  name,
  required = false,
  defaultValue,
  value,
  onChange,
  hint,
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  hint?: string;
  options: {
    label: string;
    value: string;
  }[];
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-200">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>

      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/50"
      >
        {options.map((option) => (
          <option
            key={option.value || option.label}
            value={option.value}
            className="bg-slate-950 text-slate-100"
          >
            {option.label}
          </option>
        ))}
      </select>

      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4">
      <div className="text-emerald-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>

      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-semibold text-slate-100">{value}</p>
      </div>
    </div>
  );
}