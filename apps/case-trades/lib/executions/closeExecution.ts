"use server";

import { createClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendClosedSignalAlert } from "@/lib/discord/sendClosedSignalAlert";
import { autoCloseSignalFromExecution } from "@/lib/signals/updateSignalState";

/* -------------------------------------------------
   SCOPED SUPABASE ADMIN CLIENT
------------------------------------------------- */
function createSupabaseAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES",
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/* -------------------------------------------------
   INPUT TYPES
------------------------------------------------- */
interface LegCloseInput {
  signalOptionLegId: string;
  contracts: number;
  price: number;
}

interface CloseExecutionInput {
  executionId: string;

  /**
   * For legacy executions, this is the number of contracts being closed.
   *
   * For multi-leg executions, this is the number of complete strategy units
   * being closed.
   */
  contracts: number;

  /**
   * Legacy single-position close price or the aggregate strategy close price.
   *
   * Multi-leg performance is calculated from legCloses rather than trusting
   * this aggregate value.
   */
  price: number;

  /**
   * One close instruction per option leg.
   */
  legCloses?: LegCloseInput[];
}

/* -------------------------------------------------
   DATABASE TYPES
------------------------------------------------- */
type ExecutionStatus = "OPEN" | "PARTIAL" | "CLOSED";

type ExecutionFillSide = "OPEN" | "CLOSE";

type SignalExecutionRow = {
  id: string;
  signal_id: string;
  status: string;
  contracts: number | string;
  entry_price: number | string;
  exit_price: number | string | null;
  entry_cost: number | string | null;
  exit_value: number | string | null;
  pnl: number | string | null;
  pnl_pct: number | string | null;
  opened_at: string;
  closed_at: string | null;
};

type SignalRow = {
  id: string;
  instrument_type: string | null;
  status: string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
  return_pct: number | string | null;
  outcome: string | null;
};

type SignalOptionLegRow = {
  id: string;
  signal_id: string;
  leg_order: number;
  action: string;
  option_type: string;
  strike_price: number | string | null;
  expiration_date: string | null;
  contracts: number | string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
};

type ExecutionFillRow = {
  id: string;
  execution_id: string;
  signal_option_leg_id: string | null;
  contracts: number | string | null;
  price: number | string | null;
  side: string;
  created_at: string;
  created_by: string;
};

type ExecutionFillInsert = {
  execution_id: string;
  signal_option_leg_id: string | null;
  contracts: number;
  price: number;
  side: "CLOSE";
  created_by: string;
};

type NormalizedExecutionFill = {
  id: string;
  executionId: string;
  signalOptionLegId: string | null;
  contracts: number;
  price: number;
  side: ExecutionFillSide;
};

type LegPerformance = {
  legId: string;
  action: string;
  openedContracts: number;
  closedContracts: number;
  remainingContracts: number;
  averageOpenPrice: number;
  averageClosePrice: number | null;
  openingCashFlow: number;
  closingCashFlow: number;
  realizedPnl: number;
};

type MultiLegPerformance = {
  legPerformance: LegPerformance[];
  openedStrategyContracts: number;
  closedStrategyContracts: number;
  remainingStrategyContracts: number;
  openingCashFlow: number;
  closingCashFlow: number;
  realizedPnl: number;
  realizedReturnPct: number | null;
  averageExitPrice: number | null;
  exitValue: number;
  status: ExecutionStatus;
};

type LegacyPerformance = {
  openedContracts: number;
  closedContracts: number;
  remainingContracts: number;
  averageEntryPrice: number;
  averageExitPrice: number | null;
  entryValue: number;
  exitValue: number;
  realizedPnl: number;
  realizedReturnPct: number | null;
  status: ExecutionStatus;
};

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

function toNullableNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function roundPrice(value: number) {
  return Number(value.toFixed(4));
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

  if (isLongOpeningAction(action)) {
    return -value;
  }

  throw new Error(`Unsupported opening action: ${action}`);
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

  if (isLongOpeningAction(action)) {
    return value;
  }

  throw new Error(`Unsupported opening action: ${action}`);
}

/* -------------------------------------------------
   GENERIC PERFORMANCE HELPERS
------------------------------------------------- */
function calculateTotalContracts(
  fills: NormalizedExecutionFill[],
  side: ExecutionFillSide,
) {
  return fills
    .filter((fill) => fill.side === side)
    .reduce((sum, fill) => sum + fill.contracts, 0);
}

function calculateWeightedAveragePrice(
  fills: NormalizedExecutionFill[],
  side: ExecutionFillSide,
) {
  const matchingFills = fills.filter((fill) => fill.side === side);

  const totalContracts = matchingFills.reduce(
    (sum, fill) => sum + fill.contracts,
    0,
  );

  if (totalContracts <= 0) {
    return null;
  }

  const totalValue = matchingFills.reduce(
    (sum, fill) => sum + fill.contracts * fill.price,
    0,
  );

  return totalValue / totalContracts;
}

function getOutcomeFromPnl(pnl: number) {
  if (pnl > 0) {
    return "WIN";
  }

  if (pnl < 0) {
    return "LOSS";
  }

  return "BREAKEVEN";
}

function normalizeFill(
  fill: ExecutionFillRow,
): NormalizedExecutionFill | null {
  const side = String(fill.side ?? "").toUpperCase();

  if (side !== "OPEN" && side !== "CLOSE") {
    return null;
  }

  const contracts = toNumber(fill.contracts);
  const price = toNumber(fill.price);

  if (!Number.isInteger(contracts) || contracts <= 0 || price < 0) {
    return null;
  }

  return {
    id: fill.id,
    executionId: fill.execution_id,
    signalOptionLegId: fill.signal_option_leg_id,
    contracts,
    price,
    side,
  };
}

/* -------------------------------------------------
   LEG VALIDATION
------------------------------------------------- */
function normalizeLegCloseInputs(
  legCloses: LegCloseInput[] | undefined,
): LegCloseInput[] {
  if (!legCloses || legCloses.length === 0) {
    return [];
  }

  const seenLegIds = new Set<string>();

  return legCloses.map((legClose, index) => {
    const signalOptionLegId = String(
      legClose.signalOptionLegId ?? "",
    ).trim();

    const contracts = Number(legClose.contracts);
    const price = Number(legClose.price);

    if (!signalOptionLegId) {
      throw new Error(
        `Multi-leg close instruction ${index + 1} is missing a leg ID`,
      );
    }

    if (seenLegIds.has(signalOptionLegId)) {
      throw new Error(
        `Duplicate close instruction for option leg ${signalOptionLegId}`,
      );
    }

    if (
      !Number.isFinite(contracts) ||
      !Number.isInteger(contracts) ||
      contracts <= 0
    ) {
      throw new Error(
        `Invalid close quantity for option leg ${signalOptionLegId}`,
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      throw new Error(
        `Invalid close price for option leg ${signalOptionLegId}`,
      );
    }

    seenLegIds.add(signalOptionLegId);

    return {
      signalOptionLegId,
      contracts,
      price,
    };
  });
}

/* -------------------------------------------------
   STRATEGY CONTRACT HELPERS
------------------------------------------------- */
function getLegRatio({
  openedLegContracts,
  strategyContracts,
}: {
  openedLegContracts: number;
  strategyContracts: number;
}) {
  if (strategyContracts <= 0) {
    return Math.max(openedLegContracts, 1);
  }

  return Math.max(openedLegContracts / strategyContracts, 1);
}

function calculateRemainingStrategyContracts({
  executionContracts,
  optionLegs,
  fills,
}: {
  executionContracts: number;
  optionLegs: SignalOptionLegRow[];
  fills: NormalizedExecutionFill[];
}) {
  if (optionLegs.length === 0) {
    return 0;
  }

  const remainingStrategyUnits = optionLegs.map((leg) => {
    const legFills = fills.filter(
      (fill) => fill.signalOptionLegId === leg.id,
    );

    const linkedOpenedLegContracts =
      calculateTotalContracts(
        legFills,
        "OPEN",
      );

    const closedLegContracts =
      calculateTotalContracts(
        legFills,
        "CLOSE",
      );

    /*
     * Older multi-leg executions may have been created before opening fills
     * were linked to signal_option_legs. In that case, use the saved leg
     * contract quantity as the opening baseline instead of treating the leg
     * as unopened.
     */
    const savedLegContracts =
      Math.max(
        toNumber(
          leg.contracts,
        ),
        0,
      );

    const openedLegContracts =
      linkedOpenedLegContracts >
      0
        ? linkedOpenedLegContracts
        : savedLegContracts;

    const remainingLegContracts =
      Math.max(
        openedLegContracts -
          closedLegContracts,
        0,
      );

    const ratio = getLegRatio({
      openedLegContracts,
      strategyContracts:
        executionContracts,
    });

    return Math.floor(
      remainingLegContracts /
        ratio,
    );
  });

  if (remainingStrategyUnits.length === 0) {
    return 0;
  }

  return Math.max(Math.min(...remainingStrategyUnits), 0);
}

/* -------------------------------------------------
   LEG PERFORMANCE CALCULATION
------------------------------------------------- */
function calculateMultiLegPerformance({
  execution,
  optionLegs,
  fills,
}: {
  execution: SignalExecutionRow;
  optionLegs: SignalOptionLegRow[];
  fills: NormalizedExecutionFill[];
}): MultiLegPerformance {
  const executionContracts = Math.max(
    toNumber(execution.contracts),
    0,
  );

  const legPerformance: LegPerformance[] = optionLegs.map((leg) => {
    const legFills = fills.filter(
      (fill) => fill.signalOptionLegId === leg.id,
    );

    const openedContracts = calculateTotalContracts(legFills, "OPEN");
    const closedContracts = calculateTotalContracts(legFills, "CLOSE");
    const remainingContracts = Math.max(
      openedContracts - closedContracts,
      0,
    );

    const averageOpenPrice =
      calculateWeightedAveragePrice(legFills, "OPEN") ??
      toNumber(leg.entry_price);

    const averageClosePrice =
      calculateWeightedAveragePrice(legFills, "CLOSE");

    const openingCashFlow = getOpeningCashFlow({
      action: leg.action,
      contracts: closedContracts,
      price: averageOpenPrice,
    });

    const closingCashFlow =
      averageClosePrice === null
        ? 0
        : getClosingCashFlow({
            action: leg.action,
            contracts: closedContracts,
            price: averageClosePrice,
          });

    return {
      legId: leg.id,
      action: leg.action,
      openedContracts,
      closedContracts,
      remainingContracts,
      averageOpenPrice,
      averageClosePrice,
      openingCashFlow,
      closingCashFlow,
      realizedPnl: openingCashFlow + closingCashFlow,
    };
  });

  const remainingStrategyContracts =
    calculateRemainingStrategyContracts({
      executionContracts,
      optionLegs,
      fills,
    });

  const openedStrategyContracts = executionContracts;

  const closedStrategyContracts = Math.max(
    openedStrategyContracts - remainingStrategyContracts,
    0,
  );

  const openingCashFlow = legPerformance.reduce(
    (sum, leg) => sum + leg.openingCashFlow,
    0,
  );

  const closingCashFlow = legPerformance.reduce(
    (sum, leg) => sum + leg.closingCashFlow,
    0,
  );

  /*
   * Option prices are quoted per share. One standard options contract
   * represents 100 shares.
   */
  const realizedPnl = roundMoney(
    (openingCashFlow + closingCashFlow) * 100,
  );

  const realizedEntryBasis = Math.abs(openingCashFlow * 100);

  const realizedReturnPct =
    realizedEntryBasis > 0
      ? roundPercent((realizedPnl / realizedEntryBasis) * 100)
      : null;

  const exitValue = roundMoney(Math.abs(closingCashFlow) * 100);

  const averageExitPrice =
    closedStrategyContracts > 0
      ? roundPrice(
          Math.abs(closingCashFlow) / closedStrategyContracts,
        )
      : null;

  const status: ExecutionStatus =
    remainingStrategyContracts <= 0
      ? "CLOSED"
      : closedStrategyContracts > 0
        ? "PARTIAL"
        : "OPEN";

  return {
    legPerformance,
    openedStrategyContracts,
    closedStrategyContracts,
    remainingStrategyContracts,
    openingCashFlow,
    closingCashFlow,
    realizedPnl,
    realizedReturnPct,
    averageExitPrice,
    exitValue,
    status,
  };
}

/* -------------------------------------------------
   LEGACY PERFORMANCE CALCULATION
------------------------------------------------- */
function calculateLegacyPerformance({
  execution,
  fills,
  instrumentType,
}: {
  execution: SignalExecutionRow;
  fills: NormalizedExecutionFill[];
  instrumentType: string | null;
}): LegacyPerformance {
  const openFills = fills.filter(
    (fill) =>
      fill.side === "OPEN" && fill.signalOptionLegId === null,
  );

  const closeFills = fills.filter(
    (fill) =>
      fill.side === "CLOSE" && fill.signalOptionLegId === null,
  );

  const openedContracts =
    calculateTotalContracts(openFills, "OPEN") ||
    Math.max(toNumber(execution.contracts), 0);

  const closedContracts = calculateTotalContracts(
    closeFills,
    "CLOSE",
  );

  const remainingContracts = Math.max(
    openedContracts - closedContracts,
    0,
  );

  const averageEntryPrice =
    calculateWeightedAveragePrice(openFills, "OPEN") ??
    toNumber(execution.entry_price);

  const averageExitPrice =
    calculateWeightedAveragePrice(closeFills, "CLOSE");

  const multiplier =
    String(instrumentType ?? "").toUpperCase() === "OPTION" ? 100 : 1;

  const entryValue =
    averageEntryPrice * closedContracts * multiplier;

  const exitValue =
    (averageExitPrice ?? 0) * closedContracts * multiplier;

  const realizedPnl = roundMoney(exitValue - entryValue);

  const realizedReturnPct =
    entryValue > 0
      ? roundPercent((realizedPnl / entryValue) * 100)
      : null;

  const status: ExecutionStatus =
    remainingContracts <= 0
      ? "CLOSED"
      : closedContracts > 0
        ? "PARTIAL"
        : "OPEN";

  return {
    openedContracts,
    closedContracts,
    remainingContracts,
    averageEntryPrice,
    averageExitPrice:
      averageExitPrice === null
        ? null
        : roundPrice(averageExitPrice),
    entryValue: roundMoney(entryValue),
    exitValue: roundMoney(exitValue),
    realizedPnl,
    realizedReturnPct,
    status,
  };
}

/* -------------------------------------------------
   ROLLBACK HELPER
------------------------------------------------- */
async function rollbackInsertedCloseFills({
  supabase,
  insertedFillIds,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  insertedFillIds: string[];
}) {
  if (insertedFillIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("execution_fills")
    .delete()
    .in("id", insertedFillIds);

  if (error) {
    console.error(
      "closeExecution: failed to roll back close fills",
      error,
    );
  }
}

/* -------------------------------------------------
   CLOSE EXECUTION
------------------------------------------------- */
export async function closeExecution({
  executionId,
  contracts,
  price,
  legCloses,
}: CloseExecutionInput) {
  const supabase = await createSupabaseServerClient();

  /* -------------------------------------------------
     AUTHENTICATION
  ------------------------------------------------- */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  if (!executionId) {
    throw new Error("Missing executionId");
  }

  if (
    !Number.isFinite(contracts) ||
    !Number.isInteger(contracts) ||
    contracts <= 0
  ) {
    throw new Error(
      "Close quantity must be a positive whole number",
    );
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Invalid close price");
  }

  const normalizedLegCloses = normalizeLegCloseInputs(legCloses);
  const isMultiLegClose = normalizedLegCloses.length > 0;

  const now = new Date().toISOString();

  /* -------------------------------------------------
     LOAD EXECUTION
  ------------------------------------------------- */
  const { data: executionData, error: executionError } = await supabase
    .from("signal_executions")
    .select(
      `
      id,
      signal_id,
      status,
      contracts,
      entry_price,
      exit_price,
      entry_cost,
      exit_value,
      pnl,
      pnl_pct,
      opened_at,
      closed_at
    `,
    )
    .eq("id", executionId)
    .single();

  if (executionError || !executionData) {
    console.error(
      "closeExecution: execution lookup failed",
      executionError,
    );

    throw new Error("Execution not found");
  }

  const execution = executionData as SignalExecutionRow;

  if (!execution.signal_id) {
    throw new Error("Execution is missing signal_id");
  }

  if (String(execution.status).toUpperCase() === "CLOSED") {
    throw new Error("Execution already closed");
  }

  /* -------------------------------------------------
     LOAD SIGNAL
  ------------------------------------------------- */
  const { data: signalData, error: signalError } = await supabase
    .from("signals")
    .select(
      `
      id,
      instrument_type,
      status,
      entry_price,
      exit_price,
      return_pct,
      outcome
    `,
    )
    .eq("id", execution.signal_id)
    .single();

  if (signalError || !signalData) {
    console.error(
      "closeExecution: signal lookup failed",
      signalError,
    );

    throw new Error("Signal not found");
  }

  const signal = signalData as SignalRow;

  /* -------------------------------------------------
     LOAD OPTION LEGS
  ------------------------------------------------- */
  let optionLegs: SignalOptionLegRow[] = [];

  if (isMultiLegClose) {
    const requestedLegIds = normalizedLegCloses.map(
      (legClose) => legClose.signalOptionLegId,
    );

    /*
     * The parent execution and signal have already been loaded through the
     * authenticated server client. Use a service-role client only for this
     * tightly scoped child-table lookup because the current
     * signal_option_legs SELECT RLS policy can return an empty result even
     * when the authenticated user is authorized to manage the parent signal.
     */
    const supabaseAdmin =
      createSupabaseAdminClient();

    const { data: optionLegData, error: optionLegError } =
      await supabaseAdmin
        .from("signal_option_legs")
        .select(
          `
          id,
          signal_id,
          leg_order,
          action,
          option_type,
          strike_price,
          expiration_date,
          contracts,
          entry_price,
          exit_price
        `,
        )
        .eq("signal_id", execution.signal_id)
        .in("id", requestedLegIds)
        .order("leg_order", { ascending: true });

    if (optionLegError) {
      console.error(
        "closeExecution: option leg lookup failed",
        {
          executionId,
          signalId: execution.signal_id,
          requestedLegIds,
          error: optionLegError,
        },
      );

      throw new Error("Failed to load option legs");
    }

    optionLegs = (optionLegData ?? []) as SignalOptionLegRow[];

    if (optionLegs.length !== requestedLegIds.length) {
      console.error(
        "closeExecution: option leg ownership validation failed",
        {
          executionId,
          signalId: execution.signal_id,
          requestedLegIds,
          returnedLegIds: optionLegs.map((leg) => leg.id),
          returnedLegCount: optionLegs.length,
        },
      );

      throw new Error(
        "One or more option legs do not belong to this execution's signal",
      );
    }

    const returnedLegIds = new Set(
      optionLegs.map((leg) => leg.id),
    );

    for (const requestedLegId of requestedLegIds) {
      if (!returnedLegIds.has(requestedLegId)) {
        throw new Error(
          `Option leg ${requestedLegId} does not belong to this signal`,
        );
      }
    }
  }

  /* -------------------------------------------------
     LOAD CURRENT FILLS
  ------------------------------------------------- */
  const { data: fillData, error: fillsError } = await supabase
    .from("execution_fills")
    .select(
      `
      id,
      execution_id,
      signal_option_leg_id,
      contracts,
      price,
      side,
      created_at,
      created_by
    `,
    )
    .eq("execution_id", executionId);

  if (fillsError) {
    console.error(
      "closeExecution: failed to load execution fills",
      fillsError,
    );

    throw new Error("Failed to load execution fills");
  }

  const fillsBeforeClose = ((fillData ?? []) as ExecutionFillRow[])
    .map(normalizeFill)
    .filter(
      (fill): fill is NormalizedExecutionFill => fill !== null,
    );

  /* -------------------------------------------------
     VALIDATE MULTI-LEG CLOSE
  ------------------------------------------------- */
  if (isMultiLegClose) {
    const executionContracts = Math.max(
      toNumber(execution.contracts),
      0,
    );

    const remainingStrategyContracts =
      calculateRemainingStrategyContracts({
        executionContracts,
        optionLegs,
        fills: fillsBeforeClose,
      });

    if (remainingStrategyContracts <= 0) {
      throw new Error(
        "Execution has no remaining strategy contracts to close",
      );
    }

    if (contracts > remainingStrategyContracts) {
      throw new Error(
        "Close quantity exceeds remaining strategy contracts",
      );
    }

    if (normalizedLegCloses.length !== optionLegs.length) {
      throw new Error(
        "A close instruction is required for every option leg",
      );
    }

    for (const leg of optionLegs) {
      const closeInstruction = normalizedLegCloses.find(
        (legClose) => legClose.signalOptionLegId === leg.id,
      );

      if (!closeInstruction) {
        throw new Error(
          `Missing close instruction for option leg ${leg.leg_order}`,
        );
      }

      const legFills = fillsBeforeClose.filter(
        (fill) => fill.signalOptionLegId === leg.id,
      );

      const linkedOpenedLegContracts =
        calculateTotalContracts(
          legFills,
          "OPEN",
        );

      const closedLegContracts =
        calculateTotalContracts(
          legFills,
          "CLOSE",
        );

      const savedLegContracts =
        Math.max(
          toNumber(
            leg.contracts,
          ),
          0,
        );

      const openedLegContracts =
        linkedOpenedLegContracts >
        0
          ? linkedOpenedLegContracts
          : savedLegContracts;

      const remainingLegContracts =
        Math.max(
          openedLegContracts -
            closedLegContracts,
          0,
        );

      if (openedLegContracts <= 0) {
        throw new Error(
          `Option leg ${leg.leg_order} has no opening contract quantity`,
        );
      }

      if (closeInstruction.contracts > remainingLegContracts) {
        throw new Error(
          `Close quantity exceeds the remaining contracts for option leg ${leg.leg_order}`,
        );
      }

      const expectedRatio = getLegRatio({
        openedLegContracts,
        strategyContracts: executionContracts,
      });

      const expectedLegCloseContracts = Math.round(
        contracts * expectedRatio,
      );

      if (
        closeInstruction.contracts !== expectedLegCloseContracts
      ) {
        throw new Error(
          `Option leg ${leg.leg_order} must close ${expectedLegCloseContracts} contract${
            expectedLegCloseContracts === 1 ? "" : "s"
          } for ${contracts} strategy contract${
            contracts === 1 ? "" : "s"
          }`,
        );
      }
    }
  }

  /* -------------------------------------------------
     VALIDATE LEGACY CLOSE
  ------------------------------------------------- */
  if (!isMultiLegClose) {
    if (price <= 0) {
      throw new Error(
        "Legacy close price must be greater than 0",
      );
    }

    const openedContracts =
      fillsBeforeClose
        .filter(
          (fill) =>
            fill.side === "OPEN" &&
            fill.signalOptionLegId === null,
        )
        .reduce(
          (sum, fill) => sum + fill.contracts,
          0,
        ) || Math.max(toNumber(execution.contracts), 0);

    const alreadyClosedContracts = fillsBeforeClose
      .filter(
        (fill) =>
          fill.side === "CLOSE" &&
          fill.signalOptionLegId === null,
      )
      .reduce(
        (sum, fill) => sum + fill.contracts,
        0,
      );

    const remainingContracts = Math.max(
      openedContracts - alreadyClosedContracts,
      0,
    );

    if (remainingContracts <= 0) {
      throw new Error(
        "Execution has no remaining contracts to close",
      );
    }

    if (contracts > remainingContracts) {
      throw new Error(
        "Close quantity exceeds remaining contracts",
      );
    }
  }

  /* -------------------------------------------------
     INSERT CLOSE FILLS
  ------------------------------------------------- */
  const closeFillRows: ExecutionFillInsert[] = isMultiLegClose
    ? normalizedLegCloses.map((legClose) => ({
        execution_id: executionId,
        signal_option_leg_id: legClose.signalOptionLegId,
        contracts: legClose.contracts,
        price: legClose.price,
        side: "CLOSE",
        created_by: user.id,
      }))
    : [
        {
          execution_id: executionId,
          signal_option_leg_id: null,
          contracts,
          price,
          side: "CLOSE",
          created_by: user.id,
        },
      ];

  const {
    data: insertedCloseFillData,
    error: closeFillInsertError,
  } = await supabase
    .from("execution_fills")
    .insert(closeFillRows)
    .select(
      `
      id,
      execution_id,
      signal_option_leg_id,
      contracts,
      price,
      side,
      created_at,
      created_by
    `,
    );

  if (
    closeFillInsertError ||
    !insertedCloseFillData ||
    insertedCloseFillData.length !== closeFillRows.length
  ) {
    console.error(
      "closeExecution: close fill insert failed",
      closeFillInsertError,
    );

    throw new Error("Failed to record close fills");
  }

  const insertedCloseFills =
    insertedCloseFillData as ExecutionFillRow[];

  const insertedCloseFillIds = insertedCloseFills.map(
    (fill) => fill.id,
  );

  /* -------------------------------------------------
     RELOAD ALL FILLS
  ------------------------------------------------- */
  const { data: allFillData, error: allFillsError } =
    await supabase
      .from("execution_fills")
      .select(
        `
        id,
        execution_id,
        signal_option_leg_id,
        contracts,
        price,
        side,
        created_at,
        created_by
      `,
      )
      .eq("execution_id", executionId);

  if (allFillsError) {
    console.error(
      "closeExecution: failed to reload execution fills",
      allFillsError,
    );

    await rollbackInsertedCloseFills({
      supabase,
      insertedFillIds: insertedCloseFillIds,
    });

    throw new Error(
      "Close fills were recorded but performance could not be recalculated",
    );
  }

  const fillsAfterClose = ((allFillData ?? []) as ExecutionFillRow[])
    .map(normalizeFill)
    .filter(
      (fill): fill is NormalizedExecutionFill => fill !== null,
    );

  /* -------------------------------------------------
     CALCULATE PERFORMANCE
  ------------------------------------------------- */
  const multiLegPerformance = isMultiLegClose
    ? calculateMultiLegPerformance({
        execution,
        optionLegs,
        fills: fillsAfterClose,
      })
    : null;

  const legacyPerformance = !isMultiLegClose
    ? calculateLegacyPerformance({
        execution,
        fills: fillsAfterClose,
        instrumentType: signal.instrument_type,
      })
    : null;

  const nextExecutionStatus =
    multiLegPerformance?.status ??
    legacyPerformance?.status ??
    "OPEN";

  const averageExitPrice =
    multiLegPerformance?.averageExitPrice ??
    legacyPerformance?.averageExitPrice ??
    null;

  const exitValue =
    multiLegPerformance?.exitValue ??
    legacyPerformance?.exitValue ??
    0;

  const realizedPnl =
    multiLegPerformance?.realizedPnl ??
    legacyPerformance?.realizedPnl ??
    0;

  const realizedReturnPct =
    multiLegPerformance?.realizedReturnPct ??
    legacyPerformance?.realizedReturnPct ??
    null;

  const remainingContracts =
    multiLegPerformance?.remainingStrategyContracts ??
    legacyPerformance?.remainingContracts ??
    0;

  const closedContracts =
    multiLegPerformance?.closedStrategyContracts ??
    legacyPerformance?.closedContracts ??
    0;

  /* -------------------------------------------------
     UPDATE OPTION-LEG EXIT PRICES
  ------------------------------------------------- */
  if (multiLegPerformance) {
    for (const legPerformance of multiLegPerformance.legPerformance) {
      const supabaseAdmin =
        createSupabaseAdminClient();

      const { error: optionLegUpdateError } = await supabaseAdmin
        .from("signal_option_legs")
        .update({
          exit_price: legPerformance.averageClosePrice,
          updated_at: now,
        })
        .eq("id", legPerformance.legId)
        .eq("signal_id", execution.signal_id);

      if (optionLegUpdateError) {
        console.error(
          "closeExecution: option leg exit-price update failed",
          {
            legId: legPerformance.legId,
            error: optionLegUpdateError,
          },
        );

        await rollbackInsertedCloseFills({
          supabase,
          insertedFillIds: insertedCloseFillIds,
        });

        throw new Error(
          "Failed to update option-leg exit prices",
        );
      }
    }
  }

  /* -------------------------------------------------
     UPDATE EXECUTION

     exit_value is generated by PostgreSQL and must not be assigned by the
     application. The database recalculates it from the execution values.
  ------------------------------------------------- */
  const { error: executionUpdateError } = await supabase
    .from("signal_executions")
    .update({
      status: nextExecutionStatus,
      exit_price: averageExitPrice,
      pnl: roundMoney(realizedPnl),
      pnl_pct: realizedReturnPct,
      closed_at:
        nextExecutionStatus === "CLOSED" ? now : null,
    })
    .eq("id", executionId);

  if (executionUpdateError) {
    console.error(
      "closeExecution: execution update failed",
      executionUpdateError,
    );

    await rollbackInsertedCloseFills({
      supabase,
      insertedFillIds: insertedCloseFillIds,
    });

    throw new Error(
      "Failed to update execution performance",
    );
  }

  /* -------------------------------------------------
     UPDATE SIGNAL
  ------------------------------------------------- */
  const { error: signalUpdateError } = await supabase
    .from("signals")
    .update({
      exit_price: averageExitPrice,
      return_pct: realizedReturnPct,
      outcome:
        closedContracts > 0
          ? getOutcomeFromPnl(realizedPnl)
          : null,
      status:
        nextExecutionStatus === "CLOSED"
          ? "Closed"
          : "Triggered",
      closed_at:
        nextExecutionStatus === "CLOSED" ? now : null,
      updated_at: now,
      updated_by: user.id,
    })
    .eq("id", execution.signal_id);

  if (signalUpdateError) {
    console.error(
      "closeExecution: signal update failed",
      signalUpdateError,
    );

    throw new Error(
      "Execution updated, but signal performance failed to synchronize",
    );
  }

  /* -------------------------------------------------
     FINAL-CLOSE LIFECYCLE
  ------------------------------------------------- */
  let lifecycleResult: Awaited<
    ReturnType<typeof autoCloseSignalFromExecution>
  > | null = null;

  let lifecycleWarning:
    | {
        message: string;
        error: string;
      }
    | null = null;

  if (nextExecutionStatus === "CLOSED") {
    try {
      lifecycleResult =
        await autoCloseSignalFromExecution(
          execution.signal_id,
        );
    } catch (error) {
      console.error(
        "closeExecution: lifecycle synchronization failed",
        {
          executionId,
          signalId:
            execution.signal_id,
          error,
        },
      );

      lifecycleWarning = {
        message:
          "Execution closed successfully but lifecycle synchronization failed.",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  /* -------------------------------------------------
     FINAL DISCORD CLOSE ALERT
  ------------------------------------------------- */
  if (
    nextExecutionStatus === "CLOSED" &&
    !lifecycleResult
  ) {
    try {
      await sendClosedSignalAlert(
        execution.signal_id,
      );
    } catch (discordError) {
      console.error(
        "closeExecution: Discord close alert failed, but the execution was closed",
        discordError,
      );
    }
  }

  return {
    execution_id: executionId,
    signal_id: execution.signal_id,

    requested_strategy_contracts: contracts,
    submitted_aggregate_close_price: price,

    multi_leg: isMultiLegClose,
    close_fill_count: insertedCloseFills.length,
    close_fill_ids: insertedCloseFillIds,

    remaining_contracts: remainingContracts,
    closed_contracts: closedContracts,

    average_exit_price: averageExitPrice,
    exit_value: roundMoney(exitValue),
    realized_pnl: roundMoney(realizedPnl),
    realized_return_pct: realizedReturnPct,

    final_close: nextExecutionStatus === "CLOSED",
    execution_status: nextExecutionStatus,

    leg_performance:
      multiLegPerformance?.legPerformance.map((leg) => ({
        signal_option_leg_id: leg.legId,
        action: leg.action,
        opened_contracts: leg.openedContracts,
        closed_contracts: leg.closedContracts,
        remaining_contracts: leg.remainingContracts,
        average_open_price: roundPrice(
          leg.averageOpenPrice,
        ),
        average_close_price:
          leg.averageClosePrice === null
            ? null
            : roundPrice(leg.averageClosePrice),
        realized_pnl: roundMoney(
          leg.realizedPnl * 100,
        ),
      })) ?? null,

    lifecycle: lifecycleResult,
    lifecycle_warning: lifecycleWarning,
  };
}