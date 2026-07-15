"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createSignal } from "./actions";

import TradingViewChart from "@/components/tradingview/TradingViewChart";
import {
  detectTradeStyle,
  type TradeStyleOptionLeg,
} from "@/lib/signals/detectTradeStyle";

import { Form } from "@/components/ui/form";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type InstrumentType = "OPTION" | "STOCK";

type SignalAction = "BUY" | "SELL";

type OptionType = "CALL" | "PUT";

type OptionLegAction =
  | "BUY_TO_OPEN"
  | "SELL_TO_OPEN";

type ExecutionStyle =
  | "scalp"
  | "swing"
  | "leap";

type StrategyEntryType =
  | "DEBIT"
  | "CREDIT"
  | "EVEN"
  | "INCOMPLETE";

type SignalOptionLegForm = {
  id: string;
  action: OptionLegAction;
  option_type: OptionType;
  strike_price: string;
  expiration_date: string;
  contracts: string;
  entry_price: string;
};

type CreateSignalOptionLegInput = {
  leg_order: number;
  action: OptionLegAction;
  option_type: OptionType;
  strike_price: number;
  expiration_date: string;
  contracts: number;
  entry_price: number;
};

type StrategyEntrySummary = {
  type: StrategyEntryType;
  complete: boolean;
  totalPaid: number;
  totalReceived: number;
  signedNetEntry: number | null;
  absoluteNetEntry: number | null;
};

type CreateSignalPayload = {
  action: SignalAction;
  instrument_type: InstrumentType;
  underlying: string;
  entry_price: number;
  underlying_entry_price: number;
  option_type?: OptionType;
  strike_price?: number;
  expiration_date?: string;
  confidence: number;

  /**
   * Execution timeframe used by the execution-rule template system.
   */
  trade_style: ExecutionStyle;

  /**
   * Detected option structure saved separately from execution style.
   * Examples: IRON_CONDOR, CALL_CREDIT_SPREAD, LONG_CALL, STOCK.
   */
  strategy_type?: string;

  option_legs?: CreateSignalOptionLegInput[];
  strategy_entry_type?: StrategyEntryType;
  signed_strategy_entry?: number | null;
  total_debit?: number;
  total_credit?: number;
};

type CreateSignalResult = {
  success?: boolean;
  id?: string;
  error?: string;
  errors?: Record<string, string>;
};

const createSignalWithOptionLegs =
  createSignal as unknown as (
    input: CreateSignalPayload,
  ) => Promise<CreateSignalResult>;

/* -------------------------------------------------
   OPTION LEG HELPERS
------------------------------------------------- */
function createDefaultOptionLeg(
  overrides: Partial<SignalOptionLegForm> = {},
): SignalOptionLegForm {
  return {
    id:
      typeof crypto !== "undefined" &&
      "randomUUID" in crypto
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

function mapSignalLegsToDetectorLegs(
  legs: SignalOptionLegForm[],
): TradeStyleOptionLeg[] {
  return legs
    .filter((leg) => {
      return (
        leg.option_type &&
        leg.action &&
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

function isCompleteOptionLeg(
  leg: SignalOptionLegForm,
) {
  const strikePrice = Number(
    leg.strike_price,
  );

  const contracts = Number(
    leg.contracts,
  );

  const entryPrice = Number(
    leg.entry_price,
  );

  return Boolean(
    leg.action &&
      leg.option_type &&
      leg.expiration_date &&
      Number.isFinite(strikePrice) &&
      strikePrice > 0 &&
      Number.isFinite(contracts) &&
      Number.isInteger(contracts) &&
      contracts > 0 &&
      Number.isFinite(entryPrice) &&
      entryPrice >= 0,
  );
}

function getPrimaryLeg(
  legs: SignalOptionLegForm[],
) {
  return legs.find(
    isCompleteOptionLeg,
  );
}

function normalizeOptionLegs(
  legs: SignalOptionLegForm[],
): CreateSignalOptionLegInput[] {
  return legs.map((leg, index) => {
    return {
      leg_order: index + 1,
      action: leg.action,
      option_type: leg.option_type,
      strike_price: Number(
        leg.strike_price,
      ),
      expiration_date:
        leg.expiration_date,
      contracts: Number(
        leg.contracts,
      ),
      entry_price: Number(
        leg.entry_price,
      ),
    };
  });
}

/* -------------------------------------------------
   STRATEGY ENTRY CALCULATION
------------------------------------------------- */
function calculateStrategyEntry(
  legs: SignalOptionLegForm[],
): StrategyEntrySummary {
  if (
    legs.length === 0 ||
    !legs.every(isCompleteOptionLeg)
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

  for (const leg of legs) {
    const contracts = Number(
      leg.contracts,
    );

    const entryPrice = Number(
      leg.entry_price,
    );

    const legPremium =
      contracts * entryPrice;

    if (
      leg.action === "BUY_TO_OPEN"
    ) {
      totalPaid += legPremium;
    } else {
      totalReceived += legPremium;
    }
  }

  const signedNetEntry =
    totalPaid - totalReceived;

  const absoluteNetEntry =
    Math.abs(signedNetEntry);

  const type: StrategyEntryType =
    signedNetEntry > 0
      ? "DEBIT"
      : signedNetEntry < 0
        ? "CREDIT"
        : "EVEN";

  return {
    type,
    complete: true,
    totalPaid: Number(
      totalPaid.toFixed(4),
    ),
    totalReceived: Number(
      totalReceived.toFixed(4),
    ),
    signedNetEntry: Number(
      signedNetEntry.toFixed(4),
    ),
    absoluteNetEntry: Number(
      absoluteNetEntry.toFixed(4),
    ),
  };
}

/* -------------------------------------------------
   FORMAT HELPERS
------------------------------------------------- */
function formatMoney(
  value: number | null,
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `$${Math.abs(value).toFixed(2)}`;
}

function getStrategyEntryLabel(
  type: StrategyEntryType,
) {
  if (type === "DEBIT") {
    return "Net Debit";
  }

  if (type === "CREDIT") {
    return "Net Credit";
  }

  if (type === "EVEN") {
    return "Net Even";
  }

  return "Strategy Entry";
}

function getStrategyEntryTone(
  type: StrategyEntryType,
) {
  if (type === "CREDIT") {
    return {
      border:
        "border-emerald-500/30",
      background:
        "bg-emerald-500/10",
      text:
        "text-emerald-300",
    };
  }

  if (type === "DEBIT") {
    return {
      border:
        "border-sky-500/30",
      background:
        "bg-sky-500/10",
      text:
        "text-sky-300",
    };
  }

  if (type === "EVEN") {
    return {
      border:
        "border-amber-500/30",
      background:
        "bg-amber-500/10",
      text:
        "text-amber-300",
    };
  }

  return {
    border:
      "border-border",
    background:
      "bg-muted/20",
    text:
      "text-muted-foreground",
  };
}

/* -------------------------------------------------
   PAGE: CREATE SIGNAL
------------------------------------------------- */
export default function CreateSignalPage() {
  const router = useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const [
    underlyingEntryPrice,
    setUnderlyingEntryPrice,
  ] = useState<number | null>(null);

  const [
    underlying,
    setUnderlying,
  ] = useState("QQQ");

  const [
    instrumentType,
    setInstrumentType,
  ] = useState<InstrumentType>(
    "OPTION",
  );

  const [
    stockEntryPrice,
    setStockEntryPrice,
  ] = useState("");

  const [
    executionStyle,
    setExecutionStyle,
  ] = useState<ExecutionStyle>(
    "swing",
  );

  const [
    optionLegs,
    setOptionLegs,
  ] = useState<
    SignalOptionLegForm[]
  >([
    createDefaultOptionLeg(),
  ]);

  const detectedTradeStyle =
    useMemo(() => {
      return detectTradeStyle({
        instrumentType,
        legs:
          instrumentType === "OPTION"
            ? mapSignalLegsToDetectorLegs(
                optionLegs,
              )
            : [],
      });
    }, [
      instrumentType,
      optionLegs,
    ]);

  const strategyEntry =
    useMemo(() => {
      if (
        instrumentType !== "OPTION"
      ) {
        return {
          type: "INCOMPLETE",
          complete: false,
          totalPaid: 0,
          totalReceived: 0,
          signedNetEntry: null,
          absoluteNetEntry: null,
        } satisfies StrategyEntrySummary;
      }

      return calculateStrategyEntry(
        optionLegs,
      );
    }, [
      instrumentType,
      optionLegs,
    ]);

  const strategyEntryLabel =
    getStrategyEntryLabel(
      strategyEntry.type,
    );

  const strategyEntryTone =
    getStrategyEntryTone(
      strategyEntry.type,
    );

  function updateOptionLeg(
    legId: string,
    field:
      keyof SignalOptionLegForm,
    value: string,
  ) {
    setOptionLegs(
      (currentLegs) => {
        return currentLegs.map(
          (leg) => {
            if (leg.id !== legId) {
              return leg;
            }

            return {
              ...leg,
              [field]: value,
            };
          },
        );
      },
    );
  }

  function addOptionLeg() {
    setOptionLegs(
      (currentLegs) => {
        const previousLeg =
          currentLegs[
            currentLegs.length - 1
          ];

        return [
          ...currentLegs,
          createDefaultOptionLeg({
            expiration_date:
              previousLeg
                ?.expiration_date ??
              "",
            contracts:
              previousLeg
                ?.contracts ??
              "1",
          }),
        ];
      },
    );
  }

  function removeOptionLeg(
    legId: string,
  ) {
    setOptionLegs(
      (currentLegs) => {
        if (
          currentLegs.length <= 1
        ) {
          return currentLegs;
        }

        return currentLegs.filter(
          (leg) =>
            leg.id !== legId,
        );
      },
    );
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage(null);

    const formData =
      new FormData(
        event.currentTarget,
      );

    const normalizedUnderlying =
      underlying
        .trim()
        .toUpperCase();

    const confidence = Number(
      formData.get("confidence"),
    );

    const signalAction =
      formData.get(
        "action",
      ) as SignalAction;

    if (!normalizedUnderlying) {
      setErrorMessage(
        "Enter an underlying ticker.",
      );

      return;
    }

    if (
      !Number.isFinite(confidence) ||
      confidence < 1 ||
      confidence > 100
    ) {
      setErrorMessage(
        "Confidence must be between 1 and 100.",
      );

      return;
    }

    let resolvedEntryPrice = 0;

    let normalizedLegs:
      | CreateSignalOptionLegInput[]
      | undefined;

    let primaryLeg:
      | SignalOptionLegForm
      | undefined;

    if (
      instrumentType === "OPTION"
    ) {
      if (
        optionLegs.length === 0 ||
        !optionLegs.every(
          isCompleteOptionLeg,
        )
      ) {
        setErrorMessage(
          "Complete every option leg, including action, option type, strike, expiration, contracts, and entry premium.",
        );

        return;
      }

      if (
        !strategyEntry.complete ||
        strategyEntry.absoluteNetEntry ===
          null
      ) {
        setErrorMessage(
          "Unable to calculate the strategy entry.",
        );

        return;
      }

      if (
        strategyEntry.type ===
          "EVEN" ||
        strategyEntry.absoluteNetEntry <=
          0
      ) {
        setErrorMessage(
          "The entered leg premiums produce a zero-cost strategy. Enter a valid net debit or credit.",
        );

        return;
      }

      resolvedEntryPrice =
        strategyEntry.absoluteNetEntry;

      normalizedLegs =
        normalizeOptionLegs(
          optionLegs,
        );

      primaryLeg =
        getPrimaryLeg(
          optionLegs,
        );
    } else {
      const parsedStockEntry =
        Number(
          stockEntryPrice,
        );

      if (
        !Number.isFinite(
          parsedStockEntry,
        ) ||
        parsedStockEntry <= 0
      ) {
        setErrorMessage(
          "Enter a valid stock entry price.",
        );

        return;
      }

      resolvedEntryPrice =
        parsedStockEntry;
    }

    const resolvedUnderlyingPrice =
      underlyingEntryPrice ??
      (instrumentType === "STOCK"
        ? resolvedEntryPrice
        : 0);

    if (
      !Number.isFinite(
        resolvedUnderlyingPrice,
      ) ||
      resolvedUnderlyingPrice <= 0
    ) {
      setErrorMessage(
        "The underlying market price has not loaded. Wait for the chart snapshot or refresh the page.",
      );

      return;
    }
console.log("Normalized Legs", normalizedLegs);

console.log(
  "Strategy Entry",
  strategyEntry,
);
    startTransition(async () => {
      try {
        const result =
          await createSignalWithOptionLegs(
            {
              action:
                signalAction,

              instrument_type:
                instrumentType,

              underlying:
                normalizedUnderlying,

              entry_price:
                resolvedEntryPrice,

              underlying_entry_price:
                resolvedUnderlyingPrice,

              option_type:
                instrumentType ===
                  "OPTION"
                  ? primaryLeg
                      ?.option_type
                  : undefined,

              strike_price:
                instrumentType ===
                  "OPTION" &&
                primaryLeg
                  ?.strike_price
                  ? Number(
                      primaryLeg.strike_price,
                    )
                  : undefined,

              expiration_date:
                instrumentType ===
                  "OPTION"
                  ? primaryLeg
                      ?.expiration_date
                  : undefined,

              confidence,

              /**
               * Execution style remains scalp, swing, or leap so the
               * execution-rule template system continues to work.
               */
              trade_style:
                executionStyle,

              /**
               * Strategy type is the detected option structure and is saved
               * separately from execution style.
               */
              strategy_type:
                instrumentType ===
                  "OPTION"
                  ? detectedTradeStyle.style
                  : "STOCK",

              option_legs:
                normalizedLegs,

              strategy_entry_type:
                instrumentType ===
                  "OPTION"
                  ? strategyEntry.type
                  : undefined,

              signed_strategy_entry:
                instrumentType ===
                  "OPTION"
                  ? strategyEntry.signedNetEntry
                  : undefined,

              total_debit:
                instrumentType ===
                  "OPTION"
                  ? strategyEntry.totalPaid
                  : undefined,

              total_credit:
                instrumentType ===
                  "OPTION"
                  ? strategyEntry.totalReceived
                  : undefined,
            },
          );

        if (
          result?.success &&
          result.id
        ) {
          router.push(
            `/dashboard/signals/${result.id}?created=1`,
          );

          return;
        }

        setErrorMessage(
          result?.error ??
            result?.errors?._form ??
            "Failed to create signal.",
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to create signal.",
        );
      }
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* LIVE UNDERLYING PRICE SOURCE */}
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="mb-2 text-sm font-medium text-muted-foreground">
          Underlying Price Snapshot
        </div>

        <TradingViewChart
          symbol={
            underlying
              .trim()
              .toUpperCase() ||
            "QQQ"
          }
          interval="5"
          onUnderlyingPrice={
            setUnderlyingEntryPrice
          }
        />

        <div className="mt-2 text-sm text-muted-foreground">
          Underlying price:&nbsp;

          {underlyingEntryPrice !==
          null ? (
            <span className="text-green-400">
              $
              {underlyingEntryPrice.toFixed(
                2,
              )}
            </span>
          ) : (
            "Waiting for chart price"
          )}
        </div>
      </div>

      {/* FORM */}
      <div className="rounded-xl border border-border bg-background p-6">
        <Form
          onSubmit={handleSubmit}
          title="Create Signal"
          description="Enter every option leg. CASE automatically calculates whether the strategy opens for a debit or credit."
        >
          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormSelect
              label="Signal Action"
              name="action"
              required
            >
              <option value="BUY">
                BUY
              </option>

              <option value="SELL">
                SELL
              </option>
            </FormSelect>

            <FormSelect
              label="Instrument"
              name="instrument_type"
              required
              value={instrumentType}
              onChange={(event) => {
                const nextInstrument =
                  event.target
                    .value as InstrumentType;

                setInstrumentType(
                  nextInstrument,
                );

                if (
                  nextInstrument ===
                  "STOCK"
                ) {
                  setOptionLegs([
                    createDefaultOptionLeg(),
                  ]);
                } else {
                  setStockEntryPrice(
                    "",
                  );
                }
              }}
            >
              <option value="OPTION">
                Option
              </option>

              <option value="STOCK">
                Stock
              </option>
            </FormSelect>

            <FormSelect
              label="Execution Style"
              name="trade_style"
              required
              value={executionStyle}
              onChange={(event) => {
                setExecutionStyle(
                  event.target
                    .value as ExecutionStyle,
                );
              }}
            >
              <option value="scalp">
                Scalp
              </option>

              <option value="swing">
                Swing
              </option>

              <option value="leap">
                LEAP
              </option>
            </FormSelect>
          </div>

          <FormInput
            label="Underlying"
            name="underlying"
            required
            placeholder="QQQ"
            value={underlying}
            onChange={(event) => {
              setUnderlying(
                event.target.value,
              );

              setUnderlyingEntryPrice(
                null,
              );
            }}
          />

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Auto-Detected Strategy
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-400">
                {
                  detectedTradeStyle.label
                }
              </span>

              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                Confidence:{" "}
                {
                  detectedTradeStyle.confidence
                }
              </span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {
                detectedTradeStyle.reason
              }
            </p>
          </div>

          {instrumentType ===
          "STOCK" ? (
            <FormInput
              label="Stock Entry Price"
              name="stock_entry_price"
              type="number"
              step="0.01"
              min={0.01}
              required
              value={
                stockEntryPrice
              }
              onChange={(event) => {
                setStockEntryPrice(
                  event.target.value,
                );
              }}
            />
          ) : null}

          {instrumentType ===
          "OPTION" ? (
            <>
              <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Option Legs
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Add every option leg and enter the premium paid or received for each contract.
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={
                      addOptionLeg
                    }
                  >
                    Add Leg
                  </Button>
                </div>

                <div className="space-y-4">
                  {optionLegs.map(
                    (leg, index) => {
                      const isDebitLeg =
                        leg.action ===
                        "BUY_TO_OPEN";

                      return (
                        <div
                          key={leg.id}
                          className={
                            "rounded-lg border bg-background p-4 " +
                            (isDebitLeg
                              ? "border-sky-500/20"
                              : "border-emerald-500/20")
                          }
                        >
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold">
                                Leg{" "}
                                {index +
                                  1}
                              </div>

                              <div
                                className={
                                  "mt-1 text-xs " +
                                  (isDebitLeg
                                    ? "text-sky-300"
                                    : "text-emerald-300")
                                }
                              >
                                {isDebitLeg
                                  ? "Premium paid"
                                  : "Premium received"}
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="secondary"
                              disabled={
                                optionLegs.length <=
                                1
                              }
                              onClick={() =>
                                removeOptionLeg(
                                  leg.id,
                                )
                              }
                            >
                              Remove
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <FormSelect
                              label="Leg Action"
                              name={`option_legs.${index}.action`}
                              required
                              value={
                                leg.action
                              }
                              onChange={(
                                event,
                              ) => {
                                updateOptionLeg(
                                  leg.id,
                                  "action",
                                  event
                                    .target
                                    .value,
                                );
                              }}
                            >
                              <option value="BUY_TO_OPEN">
                                Buy to Open
                                (Debit)
                              </option>

                              <option value="SELL_TO_OPEN">
                                Sell to Open
                                (Credit)
                              </option>
                            </FormSelect>

                            <FormSelect
                              label="Option Type"
                              name={`option_legs.${index}.option_type`}
                              required
                              value={
                                leg.option_type
                              }
                              onChange={(
                                event,
                              ) => {
                                updateOptionLeg(
                                  leg.id,
                                  "option_type",
                                  event
                                    .target
                                    .value,
                                );
                              }}
                            >
                              <option value="CALL">
                                CALL
                              </option>

                              <option value="PUT">
                                PUT
                              </option>
                            </FormSelect>

                            <FormInput
                              label="Strike"
                              name={`option_legs.${index}.strike_price`}
                              type="number"
                              step="0.01"
                              min={0.01}
                              required
                              value={
                                leg.strike_price
                              }
                              onChange={(
                                event,
                              ) => {
                                updateOptionLeg(
                                  leg.id,
                                  "strike_price",
                                  event
                                    .target
                                    .value,
                                );
                              }}
                            />

                            <FormInput
                              label="Expiration"
                              name={`option_legs.${index}.expiration_date`}
                              type="date"
                              required
                              value={
                                leg.expiration_date
                              }
                              onChange={(
                                event,
                              ) => {
                                updateOptionLeg(
                                  leg.id,
                                  "expiration_date",
                                  event
                                    .target
                                    .value,
                                );
                              }}
                            />

                            <FormInput
                              label="Contracts"
                              name={`option_legs.${index}.contracts`}
                              type="number"
                              step="1"
                              min={1}
                              required
                              value={
                                leg.contracts
                              }
                              onChange={(
                                event,
                              ) => {
                                updateOptionLeg(
                                  leg.id,
                                  "contracts",
                                  event
                                    .target
                                    .value,
                                );
                              }}
                            />

                            <FormInput
                              label={
                                isDebitLeg
                                  ? "Premium Paid"
                                  : "Premium Received"
                              }
                              name={`option_legs.${index}.entry_price`}
                              type="number"
                              step="0.01"
                              min={0}
                              required
                              value={
                                leg.entry_price
                              }
                              onChange={(
                                event,
                              ) => {
                                updateOptionLeg(
                                  leg.id,
                                  "entry_price",
                                  event
                                    .target
                                    .value,
                                );
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 ${strategyEntryTone.border} ${strategyEntryTone.background}`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Strategy Entry / Open Price
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Calculated automatically from every leg premium and contract quantity.
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <div
                      className={`text-xl font-bold ${strategyEntryTone.text}`}
                    >
                      {strategyEntry.type ===
                      "INCOMPLETE"
                        ? "Complete all legs"
                        : strategyEntry.type ===
                            "EVEN"
                          ? "$0.00 Even"
                          : `${formatMoney(
                              strategyEntry.absoluteNetEntry,
                            )} ${
                              strategyEntry.type
                            }`}
                    </div>

                    {strategyEntry.complete && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Paid:{" "}
                        {formatMoney(
                          strategyEntry.totalPaid,
                        )}{" "}
                        · Received:{" "}
                        {formatMoney(
                          strategyEntry.totalReceived,
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <input
                  type="hidden"
                  name="entry_price"
                  value={
                    strategyEntry.absoluteNetEntry ??
                    ""
                  }
                />

                {strategyEntry.type ===
                  "DEBIT" && (
                  <p className="mt-3 text-xs text-sky-200">
                    You are paying a net debit to open this strategy.
                  </p>
                )}

                {strategyEntry.type ===
                  "CREDIT" && (
                  <p className="mt-3 text-xs text-emerald-200">
                    You are receiving a net credit to open this strategy.
                  </p>
                )}
              </div>
            </>
          ) : null}

          <FormInput
            label="Confidence (1–100)"
            name="confidence"
            type="number"
            min={1}
            max={100}
            required
            defaultValue="80"
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                isPending ||
                (instrumentType ===
                  "OPTION" &&
                  (!strategyEntry.complete ||
                    strategyEntry.type ===
                      "EVEN" ||
                    strategyEntry.absoluteNetEntry ===
                      null ||
                    strategyEntry.absoluteNetEntry <=
                      0))
              }
            >
              {isPending
                ? "Creating…"
                : instrumentType ===
                      "OPTION" &&
                    strategyEntry.type !==
                      "INCOMPLETE"
                  ? `Create ${strategyEntry.type} Signal`
                  : "Create Signal"}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
