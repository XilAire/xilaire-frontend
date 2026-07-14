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
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Building2,
} from "lucide-react";

import { createSignal } from "./actions";
import TradingViewChart from "@/components/tradingview/TradingViewChart";
import {
  detectTradeStyle,
  type TradeStyleOptionLeg,
} from "@/lib/signals/detectTradeStyle";

const DEFAULT_UNDERLYING = "QQQ";
const DEFAULT_ORG_SLUG = "case-trades";

type InstrumentType = "OPTION" | "STOCK";

type ExecutionStyle =
  | "scalp"
  | "swing"
  | "leap";

type SignalCreateStatus =
  | "Active"
  | "Watching"
  | "Triggered"
  | "Closed"
  | "Expired";

type SignalOutcome = "WIN" | "LOSS" | "BREAKEVEN" | "";

type OpenAction = "BUY_TO_OPEN" | "SELL_TO_OPEN";

type OptionType = "CALL" | "PUT";

type OptionLegForm = {
  id: string;
  action: OpenAction;
  option_type: OptionType;
  strike_price: string;
  expiration_date: string;
  contracts: string;
  entry_price: string;
};

type StrategyEntryType =
  | "DEBIT"
  | "CREDIT"
  | "EVEN"
  | "INCOMPLETE";

type StrategyEntrySummary = {
  type: StrategyEntryType;
  complete: boolean;
  totalPaid: number;
  totalReceived: number;
  signedNetEntry: number | null;
  absoluteNetEntry: number | null;
};

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
    ? "Calculated automatically from every option leg: BUY_TO_OPEN premiums paid minus SELL_TO_OPEN premiums received."
    : "Stock share entry price. This is the execution/open price.";
}

function createOptionLeg(overrides?: Partial<OptionLegForm>): OptionLegForm {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    action: "BUY_TO_OPEN",
    option_type: "CALL",
    strike_price: "",
    expiration_date: "",
    contracts: "1",
    entry_price: "",
    ...overrides,
  };
}

function mapOptionLegsToDetectorLegs(
  optionLegs: OptionLegForm[],
): TradeStyleOptionLeg[] {
  return optionLegs
    .filter((leg) => {
      return (
        leg.action &&
        leg.option_type &&
        leg.strike_price &&
        leg.expiration_date
      );
    })
    .map((leg) => {
      return {
        action: leg.action,
        optionType: leg.option_type,
        strikePrice: leg.strike_price,
        expirationDate: leg.expiration_date,
        contracts: leg.contracts,
        entryPrice: leg.entry_price,
      };
    });
}

function getPrimaryOptionLeg(optionLegs: OptionLegForm[]) {
  return optionLegs.find((leg) => {
    return (
      leg.action &&
      leg.option_type &&
      leg.strike_price &&
      leg.expiration_date
    );
  });
}

function getOptionLegQuantity(optionLegs: OptionLegForm[]) {
  const primaryLeg = getPrimaryOptionLeg(optionLegs);

  if (!primaryLeg?.contracts) {
    return 0;
  }

  const parsed = Number(primaryLeg.contracts);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function isCompleteOptionLegForPricing(leg: OptionLegForm) {
  const contracts = Number(leg.contracts);
  const entryPrice = Number(leg.entry_price);

  return Boolean(
    leg.action &&
      Number.isFinite(contracts) &&
      Number.isInteger(contracts) &&
      contracts > 0 &&
      Number.isFinite(entryPrice) &&
      entryPrice >= 0,
  );
}

function calculateStrategyEntry(
  optionLegs: OptionLegForm[],
): StrategyEntrySummary {
  if (
    optionLegs.length === 0 ||
    !optionLegs.every(isCompleteOptionLegForPricing)
  ) {
    return {
      type: "INCOMPLETE",
      complete: false,
      totalPaid: 0,
      totalReceived: 0,
      signedNetEntry: null,
      absoluteNetEntry: null,
    };
  }

  let totalPaid = 0;
  let totalReceived = 0;

  for (const leg of optionLegs) {
    const contracts = Number(leg.contracts);
    const entryPrice = Number(leg.entry_price);
    const legPremium = contracts * entryPrice;

    if (leg.action === "BUY_TO_OPEN") {
      totalPaid += legPremium;
    } else {
      totalReceived += legPremium;
    }
  }

  const signedNetEntry = totalPaid - totalReceived;
  const absoluteNetEntry = Math.abs(signedNetEntry);

  return {
    type:
      signedNetEntry > 0
        ? "DEBIT"
        : signedNetEntry < 0
          ? "CREDIT"
          : "EVEN",
    complete: true,
    totalPaid: Number(totalPaid.toFixed(4)),
    totalReceived: Number(totalReceived.toFixed(4)),
    signedNetEntry: Number(signedNetEntry.toFixed(4)),
    absoluteNetEntry: Number(absoluteNetEntry.toFixed(4)),
  };
}

function formatStrategyMoney(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `$${Math.abs(value).toFixed(2)}`;
}

function buildSignalOptionLegPayload(optionLegs: OptionLegForm[]) {
  return optionLegs.map((leg, index) => {
    return {
      leg_order: index + 1,
      action: leg.action,
      option_type: leg.option_type,
      strike_price: Number(leg.strike_price),
      expiration_date: leg.expiration_date,
      contracts: Number(leg.contracts),
      entry_price: leg.entry_price ? Number(leg.entry_price) : null,
    };
  });
}

export default function CreateSignalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedOrganizationSlug = searchParams.get("org") || DEFAULT_ORG_SLUG;

  const [selectedInstrumentType, setSelectedInstrumentType] =
    useState<InstrumentType>("OPTION");
  const [selectedExecutionStyle, setSelectedExecutionStyle] =
    useState<ExecutionStyle>("swing");
  const [selectedTicker, setSelectedTicker] = useState(DEFAULT_UNDERLYING);
  const [selectedOpenAction, setSelectedOpenAction] =
    useState<OpenAction>("BUY_TO_OPEN");
  const [selectedStatus, setSelectedStatus] =
    useState<SignalCreateStatus>("Active");
  const [selectedOutcome, setSelectedOutcome] = useState<SignalOutcome>("");
  const [quantity, setQuantity] = useState("");
  const [returnPct, setReturnPct] = useState("");
  const [stockEntryPrice, setStockEntryPrice] = useState("");
  const [confidence, setConfidence] = useState("80");
  const [optionLegs, setOptionLegs] = useState<OptionLegForm[]>([
    createOptionLeg(),
  ]);
  const [underlyingEntryPrice, setUnderlyingEntryPrice] =
    useState<number | null>(null);
  const [lockedPrice, setLockedPrice] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const chartSymbol = useMemo(() => {
    const symbol = selectedTicker.trim().toUpperCase();
    return symbol || DEFAULT_UNDERLYING;
  }, [selectedTicker]);

  const detectedTradeStyle = useMemo(() => {
    return detectTradeStyle({
      instrumentType: selectedInstrumentType,
      legs:
        selectedInstrumentType === "OPTION"
          ? mapOptionLegsToDetectorLegs(optionLegs)
          : [],
    });
  }, [selectedInstrumentType, optionLegs]);

  const strategyEntry = useMemo(() => {
    if (selectedInstrumentType !== "OPTION") {
      return {
        type: "INCOMPLETE",
        complete: false,
        totalPaid: 0,
        totalReceived: 0,
        signedNetEntry: null,
        absoluteNetEntry: null,
      } satisfies StrategyEntrySummary;
    }

    return calculateStrategyEntry(optionLegs);
  }, [selectedInstrumentType, optionLegs]);

  const calculatedEntryPrice =
    selectedInstrumentType === "OPTION"
      ? strategyEntry.absoluteNetEntry
      : Number(stockEntryPrice);

  const strategyEntryLabel =
    strategyEntry.type === "DEBIT"
      ? "Net Debit"
      : strategyEntry.type === "CREDIT"
        ? "Net Credit"
        : strategyEntry.type === "EVEN"
          ? "Net Even"
          : "Strategy Entry";

  const displayPrice = lockedPrice ?? underlyingEntryPrice;
  const shouldShowOutcomeFields = isClosedStatus(selectedStatus);
  const shouldRequireOpenExecution = isActiveExecutionStatus(selectedStatus);
  const quantityLabel = getQuantityLabel(selectedInstrumentType);
  const primaryOptionLeg = getPrimaryOptionLeg(optionLegs);

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
      setOptionLegs([createOptionLeg()]);
    } else {
      setStockEntryPrice("");
    }
  }

  function handleOptionLegChange(
    legId: string,
    field: keyof OptionLegForm,
    value: string,
  ) {
    setOptionLegs((currentLegs) => {
      return currentLegs.map((leg) => {
        if (leg.id !== legId) {
          return leg;
        }

        return {
          ...leg,
          [field]: value,
        };
      });
    });
  }

  function handleAddOptionLeg() {
    setOptionLegs((currentLegs) => {
      return [...currentLegs, createOptionLeg()];
    });
  }

  function handleRemoveOptionLeg(legId: string) {
    setOptionLegs((currentLegs) => {
      if (currentLegs.length <= 1) {
        return currentLegs;
      }

      return currentLegs.filter((leg) => leg.id !== legId);
    });
  }

  function validateOptionLegs() {
    if (selectedInstrumentType !== "OPTION") {
      return true;
    }

    if (optionLegs.length < 1) {
      setFormError("At least one option leg is required for option signals.");
      return false;
    }

    for (let index = 0; index < optionLegs.length; index += 1) {
      const leg = optionLegs[index];
      const legNumber = index + 1;

      if (!leg.action) {
        setFormError(`Leg ${legNumber} action is required.`);
        return false;
      }

      if (!leg.option_type) {
        setFormError(`Leg ${legNumber} option type is required.`);
        return false;
      }

      if (!leg.strike_price || Number(leg.strike_price) <= 0) {
        setFormError(`Leg ${legNumber} strike price is required.`);
        return false;
      }

      if (!leg.expiration_date) {
        setFormError(`Leg ${legNumber} expiration date is required.`);
        return false;
      }

      if (!leg.contracts || Number(leg.contracts) <= 0) {
        setFormError(`Leg ${legNumber} contracts must be greater than 0.`);
        return false;
      }

      if (
        leg.entry_price === "" ||
        !Number.isFinite(Number(leg.entry_price)) ||
        Number(leg.entry_price) < 0
      ) {
        setFormError(`Leg ${legNumber} entry price is required.`);
        return false;
      }
    }

    if (!strategyEntry.complete) {
      setFormError("Complete every option leg price before creating the signal.");
      return false;
    }

    if (
      strategyEntry.type === "EVEN" ||
      strategyEntry.absoluteNetEntry === null ||
      strategyEntry.absoluteNetEntry <= 0
    ) {
      setFormError(
        "The entered leg prices produce a zero-cost strategy. Enter a valid net debit or credit.",
      );
      return false;
    }

    return true;
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

    const nextEntryPrice =
      nextInstrumentType === "OPTION"
        ? strategyEntry.absoluteNetEntry ?? 0
        : Number(formData.get("entry_price"));

    const nextConfidence = Number(formData.get("confidence"));
    const nextQuantity =
      nextInstrumentType === "OPTION"
        ? getOptionLegQuantity(optionLegs)
        : Number(formData.get("quantity"));
    const nextStatus = formData.get("status") as SignalCreateStatus;
    const persistedStatus = resolvePersistedStatus(nextStatus);
    const nextWatching = isWatchingStatus(nextStatus);
    const nextOutcome = String(formData.get("outcome") ?? "") as SignalOutcome;
    const nextReturnPct = formData.get("return_pct")
      ? Number(formData.get("return_pct"))
      : null;

    const nextOpenAction =
      nextInstrumentType === "OPTION"
        ? primaryOptionLeg?.action ?? selectedOpenAction
        : (formData.get("open_action") as OpenAction);
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

    if (!validateOptionLegs()) {
      return;
    }

    if (shouldRequireOpenExecution) {
      if (!nextQuantity || nextQuantity <= 0) {
        setFormError(`${getQuantityLabel(nextInstrumentType)} must be greater than 0.`);
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
            ? primaryOptionLeg?.option_type ?? undefined
            : undefined,
        strike_price:
          nextInstrumentType === "OPTION" && primaryOptionLeg?.strike_price
            ? Number(primaryOptionLeg.strike_price)
            : undefined,
        expiration_date:
          nextInstrumentType === "OPTION"
            ? primaryOptionLeg?.expiration_date || undefined
            : undefined,

        confidence: nextConfidence,

        /**
         * Execution timeframe remains separate from the detected option
         * structure so execution-rule templates continue to use
         * scalp, swing, or leap.
         */
        trade_style: selectedExecutionStyle,

        /**
         * The detected option structure is persisted separately.
         * Examples: IRON_CONDOR, CALL_CREDIT_SPREAD, LONG_CALL.
         */
        strategy_type:
          nextInstrumentType === "OPTION"
            ? detectedTradeStyle.style
            : "STOCK",

        option_legs:
          nextInstrumentType === "OPTION"
            ? buildSignalOptionLegPayload(optionLegs)
            : [],

        strategy_entry_type:
          nextInstrumentType === "OPTION"
            ? strategyEntry.type
            : undefined,

        signed_strategy_entry:
          nextInstrumentType === "OPTION"
            ? strategyEntry.signedNetEntry
            : undefined,

        total_debit:
          nextInstrumentType === "OPTION"
            ? strategyEntry.totalPaid
            : undefined,

        total_credit:
          nextInstrumentType === "OPTION"
            ? strategyEntry.totalReceived
            : undefined,
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
            underlying, opening quantity, opening price, timestamps, strategy
            detection, multi-leg options, and execution tracking.
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

                <button
                  type="button"
                  onClick={() => setLockedPrice(underlyingEntryPrice)}
                  disabled={underlyingEntryPrice === null}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  Lock Price
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <TradingViewChart
                  symbol={chartSymbol}
                  interval="5"
                  onUnderlyingPrice={setUnderlyingEntryPrice}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
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

            <input
              type="hidden"
              name="strategy_type"
              value={
                selectedInstrumentType === "OPTION"
                  ? detectedTradeStyle.style
                  : "STOCK"
              }
            />

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
                    Choose the ticker, instrument, open action, status,
                    strategy legs, entry/open price, confidence, and execution
                    tracking details.
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
                hint={
                  selectedInstrumentType === "OPTION"
                    ? "For option signals, the first option leg becomes the primary opening action."
                    : "Brokerage-style opening action."
                }
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
                hint="Options support multi-leg strategies. Stocks require shares."
                options={[
                  { label: "Option", value: "OPTION" },
                  { label: "Stock", value: "STOCK" },
                ]}
              />

              <SelectField
                label="Execution Style"
                name="trade_style"
                required
                value={selectedExecutionStyle}
                onChange={(e) =>
                  setSelectedExecutionStyle(
                    e.target.value as ExecutionStyle,
                  )
                }
                hint="Controls the execution-rule template and timeframe. This is separate from the detected option strategy."
                options={[
                  { label: "Scalp", value: "scalp" },
                  { label: "Swing", value: "swing" },
                  { label: "LEAP", value: "leap" },
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

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 md:col-span-2">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-emerald-300" />

                  <div>
                    <p className="text-sm font-semibold text-emerald-200">
                      Auto-Detected Strategy
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                        {detectedTradeStyle.label}
                      </span>

                      <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-semibold text-slate-300">
                        Confidence: {detectedTradeStyle.confidence}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-300">
                      {detectedTradeStyle.reason}
                    </p>
                  </div>
                </div>
              </div>

              {selectedInstrumentType === "OPTION" && (
                <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-5 md:col-span-2">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        Option Legs
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Add legs for spreads, iron condors, butterflies,
                        straddles, strangles, jade lizards, calendars,
                        diagonals, and other strategies. CASE will detect the
                        option strategy automatically.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddOptionLeg}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      <Plus className="h-4 w-4" />
                      Add Leg
                    </button>
                  </div>

                  <div className="space-y-4">
                    {optionLegs.map((leg, index) => {
                      return (
                        <div
                          key={leg.id}
                          className="rounded-2xl border border-white/10 bg-slate-900/80 p-4"
                        >
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-100">
                                Leg {index + 1}
                              </p>

                              <p className="text-xs text-slate-500">
                                {leg.action === "BUY_TO_OPEN"
                                  ? "Buy to Open"
                                  : "Sell to Open"}{" "}
                                {leg.strike_price || "—"} {leg.option_type}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveOptionLeg(leg.id)}
                              disabled={optionLegs.length <= 1}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <SelectField
                              label="Leg Action"
                              name={`option_legs_${index}_action`}
                              required
                              value={leg.action}
                              onChange={(e) =>
                                handleOptionLegChange(
                                  leg.id,
                                  "action",
                                  e.target.value
                                )
                              }
                              options={[
                                {
                                  label: "Buy to Open",
                                  value: "BUY_TO_OPEN",
                                },
                                {
                                  label: "Sell to Open",
                                  value: "SELL_TO_OPEN",
                                },
                              ]}
                            />

                            <SelectField
                              label="Option Type"
                              name={`option_legs_${index}_option_type`}
                              required
                              value={leg.option_type}
                              onChange={(e) =>
                                handleOptionLegChange(
                                  leg.id,
                                  "option_type",
                                  e.target.value
                                )
                              }
                              options={[
                                { label: "CALL", value: "CALL" },
                                { label: "PUT", value: "PUT" },
                              ]}
                            />

                            <Field
                              label="Strike"
                              name={`option_legs_${index}_strike_price`}
                              type="number"
                              step="0.01"
                              required
                              value={leg.strike_price}
                              onChange={(e) =>
                                handleOptionLegChange(
                                  leg.id,
                                  "strike_price",
                                  e.target.value
                                )
                              }
                              hint="Option strike price."
                            />

                            <Field
                              label="Expiration"
                              name={`option_legs_${index}_expiration_date`}
                              type="date"
                              required
                              value={leg.expiration_date}
                              onChange={(e) =>
                                handleOptionLegChange(
                                  leg.id,
                                  "expiration_date",
                                  e.target.value
                                )
                              }
                              hint="Option expiration date."
                            />

                            <Field
                              label="Contracts"
                              name={`option_legs_${index}_contracts`}
                              type="number"
                              step="1"
                              min={1}
                              required
                              value={leg.contracts}
                              onChange={(e) =>
                                handleOptionLegChange(
                                  leg.id,
                                  "contracts",
                                  e.target.value
                                )
                              }
                              hint="Contracts for this leg."
                            />

                            <Field
                              label={
                                leg.action === "BUY_TO_OPEN"
                                  ? "Premium Paid"
                                  : "Premium Received"
                              }
                              name={`option_legs_${index}_entry_price`}
                              type="number"
                              step="0.01"
                              min={0}
                              required
                              value={leg.entry_price}
                              onChange={(e) =>
                                handleOptionLegChange(
                                  leg.id,
                                  "entry_price",
                                  e.target.value
                                )
                              }
                              hint={
                                leg.action === "BUY_TO_OPEN"
                                  ? "Premium paid per contract for this long leg."
                                  : "Premium received per contract for this short leg."
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className={
                      "rounded-2xl border p-5 " +
                      (strategyEntry.type === "CREDIT"
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : strategyEntry.type === "DEBIT"
                          ? "border-sky-500/30 bg-sky-500/10"
                          : "border-white/10 bg-slate-900/70")
                    }
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          Strategy Premium Summary
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Automatically calculated from every leg price and contract quantity.
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {strategyEntryLabel}
                        </p>

                        <p
                          className={
                            "mt-1 text-2xl font-bold " +
                            (strategyEntry.type === "CREDIT"
                              ? "text-emerald-300"
                              : strategyEntry.type === "DEBIT"
                                ? "text-sky-300"
                                : "text-slate-200")
                          }
                        >
                          {formatStrategyMoney(strategyEntry.absoluteNetEntry)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Premium Paid
                        </p>

                        <p className="mt-1 text-lg font-semibold text-sky-300">
                          {formatStrategyMoney(strategyEntry.totalPaid)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Premium Received
                        </p>

                        <p className="mt-1 text-lg font-semibold text-emerald-300">
                          {formatStrategyMoney(strategyEntry.totalReceived)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedInstrumentType === "STOCK" && (
                <Field
                  label={quantityLabel}
                  name="quantity"
                  type="number"
                  step="1"
                  min={1}
                  required={shouldRequireOpenExecution}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  hint="Number of stock shares opened."
                />
              )}

              <Field
                label={
                  selectedInstrumentType === "OPTION"
                    ? `Strategy Entry / Open Price (${strategyEntryLabel})`
                    : "Entry / Open Price"
                }
                name="entry_price"
                type="number"
                step="0.01"
                required
                readOnly={selectedInstrumentType === "OPTION"}
                value={
                  selectedInstrumentType === "OPTION"
                    ? strategyEntry.absoluteNetEntry !== null
                      ? String(strategyEntry.absoluteNetEntry)
                      : ""
                    : stockEntryPrice
                }
                onChange={
                  selectedInstrumentType === "STOCK"
                    ? (e) => setStockEntryPrice(e.target.value)
                    : undefined
                }
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
                      Signal, execution state, execution style, and detected
                      strategy will sync across the platform.
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      Active, Watching, and Triggered signals require an opening
                      quantity and open price. Options now support multiple
                      legs, and CASE automatically detects the strategy from the
                      selected legs.
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
                disabled={
                  isPending ||
                  (selectedInstrumentType === "OPTION" &&
                    (!strategyEntry.complete ||
                      strategyEntry.type === "EVEN" ||
                      strategyEntry.absoluteNetEntry === null ||
                      strategyEntry.absoluteNetEntry <= 0))
                }
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
                {selectedInstrumentType === "OPTION" && primaryOptionLeg
                  ? primaryOptionLeg.action === "BUY_TO_OPEN"
                    ? "BUY TO OPEN"
                    : "SELL TO OPEN"
                  : selectedOpenAction === "BUY_TO_OPEN"
                    ? "BUY TO OPEN"
                    : "SELL TO OPEN"}{" "}
                {selectedTicker || DEFAULT_UNDERLYING}{" "}
                {selectedInstrumentType === "OPTION" && primaryOptionLeg
                  ? `${primaryOptionLeg.strike_price || "—"} ${primaryOptionLeg.option_type}`
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
                  icon={<Clock />}
                  label="Execution Style"
                  value={
                    selectedExecutionStyle === "leap"
                      ? "LEAP"
                      : selectedExecutionStyle.charAt(0).toUpperCase() +
                        selectedExecutionStyle.slice(1)
                  }
                />

                <Metric
                  icon={<Sparkles />}
                  label="Detected Strategy"
                  value={detectedTradeStyle.label}
                />

                <Metric
                  icon={<Activity />}
                  label="Open Action"
                  value={
                    selectedInstrumentType === "OPTION" && primaryOptionLeg
                      ? primaryOptionLeg.action === "BUY_TO_OPEN"
                        ? "Buy to Open"
                        : "Sell to Open"
                      : selectedOpenAction === "BUY_TO_OPEN"
                        ? "Buy to Open"
                        : "Sell to Open"
                  }
                />

                <Metric
                  icon={<Hash />}
                  label={quantityLabel}
                  value={
                    selectedInstrumentType === "OPTION"
                      ? getOptionLegQuantity(optionLegs) || "—"
                      : quantity || "—"
                  }
                />

                {selectedInstrumentType === "OPTION" && (
                  <>
                    <Metric
                      icon={<Hash />}
                      label="Legs"
                      value={optionLegs.length}
                    />

                    <Metric
                      icon={<Hash />}
                      label="Primary Strike"
                      value={primaryOptionLeg?.strike_price || "—"}
                    />

                    <Metric
                      icon={<CalendarDays />}
                      label="Primary Expiration"
                      value={primaryOptionLeg?.expiration_date || "—"}
                    />
                  </>
                )}

                <Metric
                  icon={<CircleDollarSign />}
                  label={
                    selectedInstrumentType === "OPTION"
                      ? strategyEntryLabel
                      : "Open Price"
                  }
                  value={
                    selectedInstrumentType === "OPTION"
                      ? formatStrategyMoney(strategyEntry.absoluteNetEntry)
                      : stockEntryPrice
                        ? `$${Number(stockEntryPrice).toFixed(2)}`
                        : "—"
                  }
                />

                {selectedInstrumentType === "OPTION" && (
                  <>
                    <Metric
                      icon={<CircleDollarSign />}
                      label="Premium Paid"
                      value={formatStrategyMoney(strategyEntry.totalPaid)}
                    />

                    <Metric
                      icon={<CircleDollarSign />}
                      label="Premium Received"
                      value={formatStrategyMoney(strategyEntry.totalReceived)}
                    />
                  </>
                )}

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

          {selectedInstrumentType === "OPTION" && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-100">
                    Leg Preview
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    CASE uses these legs to detect and save the strategy.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {optionLegs.map((leg, index) => (
                  <div
                    key={leg.id}
                    className="rounded-xl border border-white/10 bg-slate-950 p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Leg {index + 1}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {leg.action === "BUY_TO_OPEN" ? "BTO" : "STO"}{" "}
                      {leg.strike_price || "—"} {leg.option_type}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Exp: {leg.expiration_date || "—"} • Contracts:{" "}
                      {leg.contracts || "—"} • Price:{" "}
                      {leg.entry_price ? `$${leg.entry_price}` : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  organization, save the execution style and detected strategy
                  separately, create the opening execution when the signal is
                  opened, and save every option leg.
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
  readOnly = false,
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
  readOnly?: boolean;
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
        readOnly={readOnly}
        className={
          "mt-2 w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50 " +
          (readOnly
            ? "cursor-not-allowed bg-slate-900/70 text-emerald-300"
            : "bg-slate-950")
        }
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