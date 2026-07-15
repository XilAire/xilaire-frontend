"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { closeExecution } from "@/lib/executions/closeExecution";
import { openExecution } from "@/lib/executions/openExecution";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type ExecutionStatus = "OPEN" | "PARTIAL" | "CLOSED";

type ExecutionFillSide = "OPEN" | "CLOSE";

type ExecutionFill = {
  id: string;
  execution_id: string;
  signal_option_leg_id: string | null;
  side: ExecutionFillSide;
  contracts: number;
  price: number;
  created_at: string;
};

type ExecutionOptionLeg = {
  id: string;
  signal_id: string;
  leg_order: number;
  action: string;
  option_type: string;
  strike_price: number | null;
  expiration_date: string | null;
  contracts: number;
  entry_price: number | null;
  exit_price: number | null;
  opened_contracts: number;
  closed_contracts: number;
  remaining_contracts: number;
  average_open_price: number | null;
  average_close_price: number | null;
  fills: ExecutionFill[];
};

type Execution = {
  id: string;
  signal_id?: string;
  status: ExecutionStatus;
  contracts: number;
  entry_price: number;
  exit_price?: number | null;
  entry_cost?: number | null;
  exit_value?: number | null;
  pnl?: number | null;
  pnl_pct?: number | null;
  opened_at?: string;
  closed_at?: string | null;
  remaining_contracts?: number;
  opened_contracts?: number;
  closed_contracts?: number;
  option_legs?: ExecutionOptionLeg[];
  fills?: ExecutionFill[];
};

type ExecutionPanelProps = {
  signalId: string;
  execution: Execution | null;
};

type LegExitPriceState = Record<string, number | null>;

type LegCloseInput = {
  signalOptionLegId: string;
  contracts: number;
  price: number;
};

type CloseExecutionRequest = {
  executionId: string;
  contracts: number;
  price: number;
  legCloses?: LegCloseInput[];
};

type ClosePreviewLeg = {
  id: string;
  legOrder: number;
  action: string;
  optionType: string;
  strikePrice: number | null;
  contractsToClose: number;
  entryPrice: number;
  exitPrice: number;
  openingCashFlow: number;
  closingCashFlow: number;
  pnl: number;
};

type ClosePreview = {
  legs: ClosePreviewLeg[];
  openingCashFlow: number;
  closingCashFlow: number;
  realizedPnl: number;
  returnPct: number | null;
  aggregateClosePrice: number;
  closeType: "DEBIT" | "CREDIT" | "EVEN";
};

/*
 * closeExecution.ts is updated immediately after this component. This local
 * contract keeps the component strongly typed while supporting both the
 * existing strategy-level fields and the new optional legCloses payload.
 */
type CloseExecutionResponse = {
  lifecycle_warning?: {message:string;error:string}|null;
};

const submitCloseExecution = closeExecution as unknown as (
  input: CloseExecutionRequest,
) => Promise<CloseExecutionResponse>;

/* -------------------------------------------------
   NUMBER HELPERS
------------------------------------------------- */
function toNumber(
  value: number | string | null | undefined,
  fallback = 0,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function roundPercent(value: number) {
  return Number(value.toFixed(2));
}

/* -------------------------------------------------
   ACTION HELPERS
------------------------------------------------- */
function normalizeAction(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function isLongOpeningAction(action: string | null | undefined) {
  const normalized = normalizeAction(action);

  return (
    normalized === "BUY_TO_OPEN" ||
    normalized === "BTO" ||
    normalized === "BUY" ||
    normalized === "LONG"
  );
}

function isShortOpeningAction(action: string | null | undefined) {
  const normalized = normalizeAction(action);

  return (
    normalized === "SELL_TO_OPEN" ||
    normalized === "STO" ||
    normalized === "SELL" ||
    normalized === "SHORT"
  );
}

function formatAction(action: string | null | undefined) {
  const normalized = normalizeAction(action);

  if (normalized === "BUY_TO_OPEN") return "BTO";
  if (normalized === "SELL_TO_OPEN") return "STO";
  if (normalized === "BUY_TO_CLOSE") return "BTC";
  if (normalized === "SELL_TO_CLOSE") return "STC";

  return normalized || "—";
}

function getClosingAction(action: string | null | undefined) {
  if (isLongOpeningAction(action)) {
    return "STC";
  }

  if (isShortOpeningAction(action)) {
    return "BTC";
  }

  return "CLOSE";
}

function getLegTone(action: string | null | undefined) {
  if (isShortOpeningAction(action)) {
    return "border-emerald-500/30 bg-emerald-500/10";
  }

  return "border-sky-500/30 bg-sky-500/10";
}

/* -------------------------------------------------
   DISPLAY HELPERS
------------------------------------------------- */
function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  const prefix = value < 0 ? "-" : "";

  return `${prefix}$${Math.abs(value).toFixed(2)}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  const prefix = value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(2)}%`;
}

function formatStrike(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString();
}

function getCloseType(value: number): ClosePreview["closeType"] {
  if (value > 0) {
    return "CREDIT";
  }

  if (value < 0) {
    return "DEBIT";
  }

  return "EVEN";
}

/* -------------------------------------------------
   LEG CALCULATION HELPERS
------------------------------------------------- */
function getLegRatio({
  leg,
  strategyContracts,
}: {
  leg: ExecutionOptionLeg;
  strategyContracts: number;
}) {
  if (strategyContracts <= 0) {
    return Math.max(leg.contracts, 1);
  }

  const openedContracts =
    leg.opened_contracts > 0 ? leg.opened_contracts : leg.contracts;

  return Math.max(openedContracts / strategyContracts, 1);
}

function getLegContractsToClose({
  leg,
  strategyContractsToClose,
  totalStrategyContracts,
}: {
  leg: ExecutionOptionLeg;
  strategyContractsToClose: number;
  totalStrategyContracts: number;
}) {
  const ratio = getLegRatio({
    leg,
    strategyContracts: totalStrategyContracts,
  });

  return Math.round(strategyContractsToClose * ratio);
}

function getOpeningCashFlow({
  action,
  contracts,
  price,
}: {
  action: string;
  contracts: number;
  price: number;
}) {
  const value = contracts * price;

  if (isShortOpeningAction(action)) {
    return value;
  }

  return -value;
}

function getClosingCashFlow({
  action,
  contracts,
  price,
}: {
  action: string;
  contracts: number;
  price: number;
}) {
  const value = contracts * price;

  if (isShortOpeningAction(action)) {
    return -value;
  }

  return value;
}

/* -------------------------------------------------
   COMPONENT
------------------------------------------------- */
export default function ExecutionPanel({
  signalId,
  execution,
}: ExecutionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /* OPEN POSITION */
  const [contracts, setContracts] = useState<number | null>(null);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);

  /* CLOSE POSITION */
  const [closeQty, setCloseQty] = useState<number | null>(null);
  const [closePrice, setClosePrice] = useState<number | null>(null);
  const [legExitPrices, setLegExitPrices] = useState<LegExitPriceState>({});

  const optionLegs = useMemo(() => {
    return [...(execution?.option_legs ?? [])].sort(
      (firstLeg, secondLeg) =>
        firstLeg.leg_order - secondLeg.leg_order,
    );
  }, [execution?.option_legs]);

  const isLegAwareExecution = optionLegs.length > 0;

  const remainingStrategyContracts =
    execution?.remaining_contracts ?? execution?.contracts ?? 0;

  useEffect(() => {
    setCloseQty(null);
    setClosePrice(null);

    const nextLegExitPrices: LegExitPriceState = {};

    for (const leg of optionLegs) {
      nextLegExitPrices[leg.id] = null;
    }

    setLegExitPrices(nextLegExitPrices);
  }, [execution?.id, execution?.status, optionLegs]);

  const canOpen =
    typeof contracts === "number" &&
    Number.isInteger(contracts) &&
    typeof entryPrice === "number" &&
    Number.isFinite(entryPrice) &&
    contracts > 0 &&
    entryPrice > 0;

  const strategyCloseQuantityIsValid =
    typeof closeQty === "number" &&
    Number.isInteger(closeQty) &&
    closeQty > 0 &&
    closeQty <= remainingStrategyContracts;

  const legacyClosePreview = useMemo(() => {
    if (
      !execution ||
      isLegAwareExecution ||
      !strategyCloseQuantityIsValid ||
      closePrice === null ||
      !Number.isFinite(closePrice) ||
      closePrice <= 0
    ) {
      return null;
    }

    const entryValue = execution.entry_price * closeQty!;
    const exitValue = closePrice * closeQty!;
    const pnl = exitValue - entryValue;
    const returnPct =
      entryValue > 0 ? (pnl / Math.abs(entryValue)) * 100 : null;

    return {
      entryValue: roundMoney(entryValue),
      exitValue: roundMoney(exitValue),
      pnl: roundMoney(pnl),
      returnPct:
        returnPct === null ? null : roundPercent(returnPct),
    };
  }, [
    execution,
    isLegAwareExecution,
    strategyCloseQuantityIsValid,
    closeQty,
    closePrice,
  ]);

  const multiLegClosePreview = useMemo<ClosePreview | null>(() => {
    if (
      !execution ||
      !isLegAwareExecution ||
      !strategyCloseQuantityIsValid ||
      closeQty === null
    ) {
      return null;
    }

    const previewLegs: ClosePreviewLeg[] = [];

    for (const leg of optionLegs) {
      const exitPrice = legExitPrices[leg.id];
      const entryPriceForLeg =
        leg.average_open_price ?? leg.entry_price;

      if (
        exitPrice === null ||
        exitPrice === undefined ||
        !Number.isFinite(exitPrice) ||
        exitPrice < 0 ||
        entryPriceForLeg === null ||
        entryPriceForLeg === undefined ||
        !Number.isFinite(entryPriceForLeg)
      ) {
        return null;
      }

      const contractsToClose = getLegContractsToClose({
        leg,
        strategyContractsToClose: closeQty,
        totalStrategyContracts: execution.contracts,
      });

      if (
        contractsToClose <= 0 ||
        contractsToClose > leg.remaining_contracts
      ) {
        return null;
      }

      const openingCashFlow = getOpeningCashFlow({
        action: leg.action,
        contracts: contractsToClose,
        price: entryPriceForLeg,
      });

      const closingCashFlow = getClosingCashFlow({
        action: leg.action,
        contracts: contractsToClose,
        price: exitPrice,
      });

      previewLegs.push({
        id: leg.id,
        legOrder: leg.leg_order,
        action: leg.action,
        optionType: leg.option_type,
        strikePrice: leg.strike_price,
        contractsToClose,
        entryPrice: entryPriceForLeg,
        exitPrice,
        openingCashFlow,
        closingCashFlow,
        pnl: openingCashFlow + closingCashFlow,
      });
    }

    const openingCashFlow = previewLegs.reduce(
      (sum, leg) => sum + leg.openingCashFlow,
      0,
    );

    const closingCashFlow = previewLegs.reduce(
      (sum, leg) => sum + leg.closingCashFlow,
      0,
    );

    const realizedPnl = openingCashFlow + closingCashFlow;
    const entryBasis = Math.abs(openingCashFlow);

    const returnPct =
      entryBasis > 0 ? (realizedPnl / entryBasis) * 100 : null;

    const aggregateClosePrice =
      closeQty > 0 ? Math.abs(closingCashFlow) / closeQty : 0;

    return {
      legs: previewLegs.map((leg) => ({
        ...leg,
        openingCashFlow: roundMoney(leg.openingCashFlow),
        closingCashFlow: roundMoney(leg.closingCashFlow),
        pnl: roundMoney(leg.pnl),
      })),
      openingCashFlow: roundMoney(openingCashFlow),
      closingCashFlow: roundMoney(closingCashFlow),
      realizedPnl: roundMoney(realizedPnl),
      returnPct:
        returnPct === null ? null : roundPercent(returnPct),
      aggregateClosePrice: roundMoney(aggregateClosePrice),
      closeType: getCloseType(closingCashFlow),
    };
  }, [
    execution,
    isLegAwareExecution,
    strategyCloseQuantityIsValid,
    closeQty,
    optionLegs,
    legExitPrices,
  ]);

  const canCloseLegacy =
    !isLegAwareExecution &&
    strategyCloseQuantityIsValid &&
    typeof closePrice === "number" &&
    Number.isFinite(closePrice) &&
    closePrice > 0;

  const canCloseMultiLeg =
    isLegAwareExecution &&
    strategyCloseQuantityIsValid &&
    multiLegClosePreview !== null;

  const canClose = canCloseLegacy || canCloseMultiLeg;

  const isFinalClose =
    typeof closeQty === "number" &&
    closeQty === remainingStrategyContracts;

  function updateLegExitPrice(legId: string, value: string) {
    setLegExitPrices((current) => ({
      ...current,
      [legId]: value === "" ? null : Number(value),
    }));
  }

  function clearMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleOpenExecution() {
    if (!canOpen || contracts === null || entryPrice === null) {
      return;
    }

    clearMessages();

    startTransition(async () => {
      try {
        await openExecution({
          signalId,
          contracts,
          entryPrice,
        });

        setContracts(null);
        setEntryPrice(null);
        setSuccessMessage(
          isLegAwareExecution
            ? "Multi-leg execution opened successfully."
            : "Execution opened successfully.",
        );

        router.refresh();
      } catch (error) {
        setErrorMessage(
          getErrorMessage(error, "Failed to open execution."),
        );
      }
    });
  }

  function handleCloseExecution() {
    if (
      !execution ||
      !canClose ||
      closeQty === null ||
      closeQty <= 0
    ) {
      return;
    }

    clearMessages();

    startTransition(async () => {
      try {
        const legCloses: LegCloseInput[] | undefined =
          multiLegClosePreview?.legs.map((leg) => ({
            signalOptionLegId: leg.id,
            contracts: leg.contractsToClose,
            price: leg.exitPrice,
          }));

        const aggregatePrice =
          multiLegClosePreview?.aggregateClosePrice ??
          closePrice ??
          0;

        const result = await submitCloseExecution({
          executionId: execution.id,
          contracts: closeQty,
          price: aggregatePrice,
          legCloses,
        });

        setCloseQty(null);
        setClosePrice(null);

        setLegExitPrices(
          Object.fromEntries(
            optionLegs.map((leg) => [leg.id, null]),
          ),
        );

        setSuccessMessage(
          result?.lifecycle_warning
            ? `${result.lifecycle_warning.message} The execution itself was saved successfully.`
            : isFinalClose
              ? "Execution fully closed and signal performance updated."
              : isLegAwareExecution
                ? "Multi-leg partial close recorded and performance recalculated."
                : "Partial close recorded and performance recalculated.",
        );

        router.refresh();
      } catch (error) {
        setErrorMessage(
          getErrorMessage(error, "Failed to close execution."),
        );
      }
    });
  }

  const messageBlock =
    errorMessage || successMessage ? (
      <div
        className={
          "rounded-lg border px-3 py-2 text-sm " +
          (errorMessage
            ? "border-red-500/30 bg-red-500/10 text-red-300"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300")
        }
      >
        {errorMessage ?? successMessage}
      </div>
    ) : null;

  /* -------------------------------------------------
     NO EXECUTION — OPEN POSITION
  ------------------------------------------------- */
  if (!execution) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-background p-4">
        <div>
          <h3 className="text-lg font-semibold">Execution</h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Enter the number of strategy contracts and the net entry price.
            For multi-leg options, CASE creates one linked opening fill per
            saved leg.
          </p>
        </div>

        {messageBlock}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormInput
            label="Strategy Contracts"
            type="number"
            min={1}
            step={1}
            value={contracts ?? ""}
            onChange={(event) =>
              setContracts(
                event.target.value === ""
                  ? null
                  : Number(event.target.value),
              )
            }
            hint="Number of complete strategy units."
          />

          <FormInput
            label="Net Entry Price"
            type="number"
            step="0.01"
            min={0.01}
            value={entryPrice ?? ""}
            onChange={(event) =>
              setEntryPrice(
                event.target.value === ""
                  ? null
                  : Number(event.target.value),
              )
            }
            hint="Net debit, credit, stock price, or legacy option price."
          />
        </div>

        <Button
          variant="primary"
          disabled={isPending || !canOpen}
          onClick={handleOpenExecution}
        >
          {isPending ? "Opening..." : "Open Position"}
        </Button>
      </div>
    );
  }

  /* -------------------------------------------------
     OPEN / PARTIAL EXECUTION — CLOSE POSITION
  ------------------------------------------------- */
  if (
    execution.status === "OPEN" ||
    execution.status === "PARTIAL"
  ) {
    return (
      <div className="space-y-5 rounded-xl border border-border bg-background p-4">
        <div>
          <h3 className="text-lg font-semibold">
            Execution ({execution.status})
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {isLegAwareExecution
              ? "Enter an exit price for every option leg, then close complete strategy units."
              : "Enter an exit price and choose how many contracts to close."}
          </p>
        </div>

        {messageBlock}

        <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <ExecutionMetric
            label="Original"
            value={`${execution.contracts} ${
              isLegAwareExecution
                ? "strategy contract"
                : "contract"
            }${execution.contracts === 1 ? "" : "s"}`}
          />

          <ExecutionMetric
            label="Remaining"
            value={`${remainingStrategyContracts} ${
              isLegAwareExecution
                ? "strategy contract"
                : "contract"
            }${remainingStrategyContracts === 1 ? "" : "s"}`}
          />

          <ExecutionMetric
            label="Net Entry"
            value={formatCurrency(execution.entry_price)}
          />
        </div>

        {isLegAwareExecution && (
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-foreground">
                Option Legs
              </h4>

              <p className="mt-1 text-sm text-muted-foreground">
                Each close fill will be linked to its corresponding saved
                option leg.
              </p>
            </div>

            <div className="grid gap-3">
              {optionLegs.map((leg) => {
                const contractsToClose =
                  strategyCloseQuantityIsValid && closeQty !== null
                    ? getLegContractsToClose({
                        leg,
                        strategyContractsToClose: closeQty,
                        totalStrategyContracts: execution.contracts,
                      })
                    : 0;

                const closeAction = getClosingAction(leg.action);

                return (
                  <div
                    key={leg.id}
                    className={`rounded-xl border p-4 ${getLegTone(
                      leg.action,
                    )}`}
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_220px] lg:items-end">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Leg {leg.leg_order}
                        </p>

                        <p className="mt-1 font-semibold text-foreground">
                          {formatAction(leg.action)}{" "}
                          {leg.opened_contracts}{" "}
                          {formatStrike(leg.strike_price)}{" "}
                          {String(leg.option_type).toUpperCase()}
                        </p>

                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                          <LegMetric
                            label="Close Action"
                            value={closeAction}
                          />

                          <LegMetric
                            label="Expiration"
                            value={formatDate(
                              leg.expiration_date,
                            )}
                          />

                          <LegMetric
                            label="Entry"
                            value={formatCurrency(
                              leg.average_open_price ??
                                leg.entry_price,
                            )}
                          />

                          <LegMetric
                            label="Remaining"
                            value={String(
                              leg.remaining_contracts,
                            )}
                          />
                        </div>

                        {strategyCloseQuantityIsValid && (
                          <p className="mt-3 text-xs font-medium text-foreground">
                            This close will record{" "}
                            {contractsToClose} contract
                            {contractsToClose === 1 ? "" : "s"} for
                            this leg.
                          </p>
                        )}
                      </div>

                      <FormInput
                        label={`Leg ${leg.leg_order} Exit Price`}
                        type="number"
                        step="0.01"
                        min={0}
                        value={legExitPrices[leg.id] ?? ""}
                        onChange={(event) =>
                          updateLegExitPrice(
                            leg.id,
                            event.target.value,
                          )
                        }
                        hint={`${closeAction} price`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          className={
            isLegAwareExecution
              ? "grid grid-cols-1 gap-3"
              : "grid grid-cols-1 gap-3 md:grid-cols-2"
          }
        >
          <FormInput
            label={
              isLegAwareExecution
                ? "Strategy Contracts to Close"
                : "Contracts to Close"
            }
            type="number"
            min={1}
            max={remainingStrategyContracts}
            step={1}
            value={closeQty ?? ""}
            onChange={(event) =>
              setCloseQty(
                event.target.value === ""
                  ? null
                  : Number(event.target.value),
              )
            }
            hint={`Maximum: ${remainingStrategyContracts}`}
          />

          {!isLegAwareExecution && (
            <FormInput
              label="Exit Price"
              type="number"
              step="0.01"
              min={0.01}
              value={closePrice ?? ""}
              onChange={(event) =>
                setClosePrice(
                  event.target.value === ""
                    ? null
                    : Number(event.target.value),
                )
              }
            />
          )}
        </div>

        {multiLegClosePreview && (
          <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
            <div>
              <h4 className="font-semibold text-foreground">
                Multi-Leg Close Preview
              </h4>

              <p className="mt-1 text-sm text-muted-foreground">
                Estimated values use the entered leg exit prices and a
                standard option multiplier of 100.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <PreviewMetric
                label="Opening Cash Flow"
                value={formatCurrency(
                  multiLegClosePreview.openingCashFlow * 100,
                )}
              />

              <PreviewMetric
                label={`Net ${multiLegClosePreview.closeType} to Close`}
                value={formatCurrency(
                  Math.abs(
                    multiLegClosePreview.closingCashFlow * 100,
                  ),
                )}
              />

              <PreviewMetric
                label="Estimated P/L"
                value={formatCurrency(
                  multiLegClosePreview.realizedPnl * 100,
                )}
              />

              <PreviewMetric
                label="Estimated Return"
                value={formatPercent(
                  multiLegClosePreview.returnPct,
                )}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Leg</th>
                    <th className="px-3 py-2 text-left">Close</th>
                    <th className="px-3 py-2 text-left">Entry</th>
                    <th className="px-3 py-2 text-left">Exit</th>
                    <th className="px-3 py-2 text-left">Est. P/L</th>
                  </tr>
                </thead>

                <tbody>
                  {multiLegClosePreview.legs.map((leg) => (
                    <tr
                      key={leg.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-3 py-2 text-foreground">
                        Leg {leg.legOrder}:{" "}
                        {formatStrike(leg.strikePrice)}{" "}
                        {leg.optionType}
                      </td>

                      <td className="px-3 py-2 text-muted-foreground">
                        {leg.contractsToClose} @{" "}
                        {formatCurrency(leg.exitPrice)}
                      </td>

                      <td className="px-3 py-2 text-muted-foreground">
                        {formatCurrency(leg.entryPrice)}
                      </td>

                      <td className="px-3 py-2 text-muted-foreground">
                        {formatCurrency(leg.exitPrice)}
                      </td>

                      <td
                        className={
                          "px-3 py-2 font-medium " +
                          (leg.pnl >= 0
                            ? "text-emerald-400"
                            : "text-red-400")
                        }
                      >
                        {formatCurrency(leg.pnl * 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {legacyClosePreview && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm md:grid-cols-4">
            <PreviewMetric
              label="Close Entry Value"
              value={formatCurrency(
                legacyClosePreview.entryValue,
              )}
            />

            <PreviewMetric
              label="Close Exit Value"
              value={formatCurrency(
                legacyClosePreview.exitValue,
              )}
            />

            <PreviewMetric
              label="Estimated P/L"
              value={formatCurrency(
                legacyClosePreview.pnl,
              )}
            />

            <PreviewMetric
              label="Estimated Return"
              value={formatPercent(
                legacyClosePreview.returnPct,
              )}
            />
          </div>
        )}

        <Button
          variant="secondary"
          disabled={isPending || !canClose}
          onClick={handleCloseExecution}
        >
          {isPending
            ? "Closing..."
            : isFinalClose
              ? `Close Final ${closeQty ?? ""} ${
                  isLegAwareExecution
                    ? "Strategy Contract"
                    : "Contract"
                }${closeQty === 1 ? "" : "s"}`
              : `Partially Close ${closeQty ?? ""} ${
                  isLegAwareExecution
                    ? "Strategy Contract"
                    : "Contract"
                }${closeQty === 1 ? "" : "s"}`}
        </Button>
      </div>
    );
  }

  /* -------------------------------------------------
     CLOSED EXECUTION
  ------------------------------------------------- */
  return (
    <div className="space-y-4 rounded-xl border border-border bg-background p-4">
      <div>
        <h3 className="text-lg font-semibold">
          Execution (CLOSED)
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          This position has been fully closed.
        </p>
      </div>

      {messageBlock}

      <div className="grid gap-3 md:grid-cols-4">
        <ExecutionMetric
          label="Original Contracts"
          value={String(execution.contracts)}
        />

        <ExecutionMetric
          label="Average Exit"
          value={formatCurrency(execution.exit_price)}
        />

        <ExecutionMetric
          label="Realized P/L"
          value={formatCurrency(execution.pnl)}
        />

        <ExecutionMetric
          label="Return"
          value={formatPercent(execution.pnl_pct)}
        />
      </div>

      {optionLegs.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">
            Closed Option Legs
          </h4>

          <div className="grid gap-3 md:grid-cols-2">
            {optionLegs.map((leg) => (
              <div
                key={leg.id}
                className={`rounded-xl border p-4 ${getLegTone(
                  leg.action,
                )}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Leg {leg.leg_order}
                </p>

                <p className="mt-1 font-semibold text-foreground">
                  {formatAction(leg.action)}{" "}
                  {formatStrike(leg.strike_price)}{" "}
                  {String(leg.option_type).toUpperCase()}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <LegMetric
                    label="Entry"
                    value={formatCurrency(
                      leg.average_open_price ??
                        leg.entry_price,
                    )}
                  />

                  <LegMetric
                    label="Exit"
                    value={formatCurrency(
                      leg.average_close_price ??
                        leg.exit_price,
                    )}
                  />

                  <LegMetric
                    label="Opened"
                    value={String(leg.opened_contracts)}
                  />

                  <LegMetric
                    label="Closed"
                    value={String(leg.closed_contracts)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------
   PRESENTATION COMPONENTS
------------------------------------------------- */
function ExecutionMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function LegMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="mt-0.5 font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}