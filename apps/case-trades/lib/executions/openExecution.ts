"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

interface OpenExecutionInput {
  signalId: string;
  contracts: number;
  entryPrice: number;
}

type SignalRow = {
  id: string;
  organization_id: string | null;
  status: string | null;
  instrument_type: "OPTION" | "STOCK" | string | null;
  entry_price: number | string | null;
  price: number | string | null;
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
};

type ExistingExecutionRow = {
  id: string;
  status: string | null;
};

type ExecutionFillInsert = {
  execution_id: string;
  signal_option_leg_id: string | null;
  contracts: number;
  price: number;
  side: "OPEN";
  created_by: string;
};

/* -------------------------------------------------
   NUMBER HELPERS
------------------------------------------------- */
function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function toPositiveInteger(
  value: number | string | null | undefined,
  fallback: number,
) {
  const parsed = toNumber(value);

  if (parsed === null || parsed <= 0) {
    return fallback;
  }

  return Math.max(1, Math.round(parsed));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

/* -------------------------------------------------
   OPTION-LEG HELPERS
------------------------------------------------- */
function isOpeningLongAction(action: string | null | undefined) {
  const normalized = String(action ?? "")
    .trim()
    .toUpperCase();

  return (
    normalized === "BUY_TO_OPEN" ||
    normalized === "BTO" ||
    normalized === "BUY" ||
    normalized === "LONG"
  );
}

function isOpeningShortAction(action: string | null | undefined) {
  const normalized = String(action ?? "")
    .trim()
    .toUpperCase();

  return (
    normalized === "SELL_TO_OPEN" ||
    normalized === "STO" ||
    normalized === "SELL" ||
    normalized === "SHORT"
  );
}

function getSignedOpeningPremium({
  action,
  contracts,
  price,
}: {
  action: string;
  contracts: number;
  price: number;
}) {
  const value = contracts * price;

  if (isOpeningShortAction(action)) {
    return value;
  }

  if (isOpeningLongAction(action)) {
    return -value;
  }

  return 0;
}

function greatestCommonDivisor(firstValue: number, secondValue: number) {
  let first = Math.abs(Math.round(firstValue));
  let second = Math.abs(Math.round(secondValue));

  while (second !== 0) {
    const remainder = first % second;
    first = second;
    second = remainder;
  }

  return Math.max(first, 1);
}

function calculateNetOptionEntry(legs: SignalOptionLegRow[]) {
  const pricedLegs = legs.filter((leg) => {
    const legPrice = toNumber(leg.entry_price);
    const legContracts = toNumber(leg.contracts);

    return (
      legPrice !== null &&
      legPrice >= 0 &&
      legContracts !== null &&
      legContracts > 0
    );
  });

  if (pricedLegs.length === 0) {
    return null;
  }

  const strategyContracts = pricedLegs
    .map((leg) => toPositiveInteger(leg.contracts, 1))
    .reduce((currentGcd, contracts) =>
      greatestCommonDivisor(currentGcd, contracts),
    );

  const netEntry = pricedLegs.reduce((total, leg) => {
    const legPrice = toNumber(leg.entry_price) ?? 0;
    const legContracts = toPositiveInteger(leg.contracts, 1);
    const legRatio = legContracts / strategyContracts;

    return (
      total +
      getSignedOpeningPremium({
        action: leg.action,
        contracts: legRatio,
        price: legPrice,
      })
    );
  }, 0);

  return roundMoney(netEntry);
}

function calculateStrategyContracts({
  legs,
  fallbackContracts,
}: {
  legs: SignalOptionLegRow[];
  fallbackContracts: number;
}) {
  const legQuantities = legs
    .map((leg) => toNumber(leg.contracts))
    .filter(
      (quantity): quantity is number =>
        quantity !== null && Number.isFinite(quantity) && quantity > 0,
    );

  if (legQuantities.length === 0) {
    return fallbackContracts;
  }

  return legQuantities
    .map((quantity) => Math.round(quantity))
    .reduce((currentGcd, quantity) =>
      greatestCommonDivisor(currentGcd, quantity),
    );
}

function buildOptionOpeningFills({
  executionId,
  userId,
  optionLegs,
  fallbackContracts,
  fallbackEntryPrice,
}: {
  executionId: string;
  userId: string;
  optionLegs: SignalOptionLegRow[];
  fallbackContracts: number;
  fallbackEntryPrice: number;
}): ExecutionFillInsert[] {
  return optionLegs.map((leg) => {
    const legContracts = toPositiveInteger(leg.contracts, fallbackContracts);
    const legEntryPrice = toNumber(leg.entry_price) ?? fallbackEntryPrice;

    if (legEntryPrice < 0) {
      throw new Error(
        `Invalid entry price for option leg ${leg.leg_order}.`,
      );
    }

    return {
      execution_id: executionId,
      signal_option_leg_id: leg.id,
      contracts: legContracts,
      price: legEntryPrice,
      side: "OPEN",
      created_by: userId,
    };
  });
}

/* -------------------------------------------------
   CLEANUP HELPER
------------------------------------------------- */
async function rollbackExecution({
  supabase,
  executionId,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  executionId: string;
}) {
  const { error: fillsDeleteError } = await supabase
    .from("execution_fills")
    .delete()
    .eq("execution_id", executionId);

  if (fillsDeleteError) {
    console.error(
      "openExecution: rollback fill deletion failed",
      fillsDeleteError,
    );
  }

  const { error: executionDeleteError } = await supabase
    .from("signal_executions")
    .delete()
    .eq("id", executionId);

  if (executionDeleteError) {
    console.error(
      "openExecution: rollback execution deletion failed",
      executionDeleteError,
    );
  }
}

/* -------------------------------------------------
   OPEN EXECUTION
------------------------------------------------- */
export async function openExecution({
  signalId,
  contracts,
  entryPrice,
}: OpenExecutionInput) {
  const supabase = await createSupabaseServerClient();

  /* -------------------------------------------------
     🔒 AUTH CONTEXT
  ------------------------------------------------- */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  if (!signalId) {
    throw new Error("Missing signalId");
  }

  if (
    !Number.isFinite(contracts) ||
    !Number.isInteger(contracts) ||
    contracts <= 0
  ) {
    throw new Error("Contracts must be a positive whole number");
  }

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    throw new Error("Entry price must be greater than 0");
  }

  const now = new Date().toISOString();

  /* -------------------------------------------------
     📥 LOAD SIGNAL
  ------------------------------------------------- */
  const { data: signalData, error: signalError } = await supabase
    .from("signals")
    .select(
      `
      id,
      organization_id,
      status,
      instrument_type,
      entry_price,
      price
    `,
    )
    .eq("id", signalId)
    .single();

  if (signalError || !signalData) {
    console.error("openExecution: signal lookup failed", signalError);
    throw new Error("Signal not found");
  }

  const signal = signalData as SignalRow;

  if (signal.status === "Closed" || signal.status === "Expired") {
    throw new Error("Cannot open execution for a closed or expired signal");
  }

  /* -------------------------------------------------
     🛑 PREVENT DUPLICATE EXECUTIONS
  ------------------------------------------------- */
  const { data: existingExecutionData, error: existingExecutionError } =
    await supabase
      .from("signal_executions")
      .select("id, status")
      .eq("signal_id", signalId)
      .in("status", ["OPEN", "PARTIAL"])
      .maybeSingle();

  if (existingExecutionError) {
    console.error(
      "openExecution: existing execution lookup failed",
      existingExecutionError,
    );
    throw new Error("Failed to verify existing execution");
  }

  const existingExecution =
    existingExecutionData as ExistingExecutionRow | null;

  if (existingExecution) {
    throw new Error(
      `This signal already has an ${String(
        existingExecution.status ?? "open",
      ).toLowerCase()} execution.`,
    );
  }

  /* -------------------------------------------------
     📥 LOAD OPTION LEGS
  ------------------------------------------------- */
  let optionLegs: SignalOptionLegRow[] = [];

  if (String(signal.instrument_type ?? "").toUpperCase() === "OPTION") {
    const { data: optionLegRows, error: optionLegsError } = await supabase
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
        entry_price
      `,
      )
      .eq("signal_id", signalId)
      .order("leg_order", { ascending: true });

    if (optionLegsError) {
      console.error(
        "openExecution: option leg lookup failed",
        optionLegsError,
      );
      throw new Error("Failed to load signal option legs");
    }

    optionLegs = (optionLegRows ?? []) as SignalOptionLegRow[];
  }

  const isMultiLegOption =
    String(signal.instrument_type ?? "").toUpperCase() === "OPTION" &&
    optionLegs.length > 0;

  /*
   * For option strategies, the saved leg prices are authoritative when all
   * required leg prices are available. The submitted entryPrice remains the
   * fallback for legacy and single-position executions.
   */
  const calculatedNetOptionEntry = isMultiLegOption
    ? calculateNetOptionEntry(optionLegs)
    : null;

  const resolvedEntryPrice =
    calculatedNetOptionEntry !== null
      ? Math.abs(calculatedNetOptionEntry)
      : entryPrice;

  const strategyContracts = isMultiLegOption
    ? calculateStrategyContracts({
        legs: optionLegs,
        fallbackContracts: contracts,
      })
    : contracts;

  const contractMultiplier =
    String(signal.instrument_type ?? "").toUpperCase() === "OPTION" ? 100 : 1;

  const entryCost = roundMoney(
    resolvedEntryPrice * strategyContracts * contractMultiplier,
  );

  /* -------------------------------------------------
     📥 CREATE STRATEGY-LEVEL EXECUTION
  ------------------------------------------------- */
  const { data: execution, error: execError } = await supabase
    .from("signal_executions")
    .insert({
      signal_id: signalId,
      status: "OPEN",
      contracts: strategyContracts,
      entry_price: resolvedEntryPrice,
      entry_cost: entryCost,
      opened_at: now,
      created_by: user.id,
    })
    .select(
      `
      id,
      signal_id,
      status,
      contracts,
      entry_price,
      entry_cost,
      opened_at,
      created_at,
      created_by
    `,
    )
    .single();

  if (execError || !execution) {
    console.error("openExecution: execution insert failed", execError);
    throw new Error("Failed to open execution");
  }

  /* -------------------------------------------------
     🧾 RECORD OPEN FILLS
  ------------------------------------------------- */
  const openingFills: ExecutionFillInsert[] = isMultiLegOption
    ? buildOptionOpeningFills({
        executionId: execution.id,
        userId: user.id,
        optionLegs,
        fallbackContracts: contracts,
        fallbackEntryPrice: entryPrice,
      })
    : [
        {
          execution_id: execution.id,
          signal_option_leg_id: null,
          contracts,
          price: entryPrice,
          side: "OPEN",
          created_by: user.id,
        },
      ];

  const { error: fillError } = await supabase
    .from("execution_fills")
    .insert(openingFills);

  if (fillError) {
    console.error("openExecution: fill insert failed", fillError);

    await rollbackExecution({
      supabase,
      executionId: execution.id,
    });

    throw new Error("Failed to record execution opening fills");
  }

  /* -------------------------------------------------
     🔄 SYNC SIGNAL ENTRY PRICE
  ------------------------------------------------- */
  const currentSignalEntry =
    toNumber(signal.entry_price) ?? toNumber(signal.price);

  const shouldSyncEntryPrice =
    currentSignalEntry === null ||
    currentSignalEntry <= 0 ||
    isMultiLegOption;

  if (shouldSyncEntryPrice) {
    const { error: signalUpdateError } = await supabase
      .from("signals")
      .update({
        entry_price: resolvedEntryPrice,
        price: resolvedEntryPrice,
        updated_at: now,
        updated_by: user.id,
      })
      .eq("id", signalId);

    if (signalUpdateError) {
      console.error(
        "openExecution: signal entry price sync failed",
        signalUpdateError,
      );

      await rollbackExecution({
        supabase,
        executionId: execution.id,
      });

      throw new Error(
        "Execution opening fills were created, but the signal entry price failed to synchronize",
      );
    }
  }

  return {
    ...execution,
    instrument_type: signal.instrument_type,
    option_leg_count: optionLegs.length,
    opening_fill_count: openingFills.length,
    net_entry_type:
      calculatedNetOptionEntry === null
        ? null
        : calculatedNetOptionEntry > 0
          ? "CREDIT"
          : calculatedNetOptionEntry < 0
            ? "DEBIT"
            : "EVEN",
    calculated_net_entry: calculatedNetOptionEntry,
  };
}