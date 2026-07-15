"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { getUserOrganizations } from "@/lib/orgs/getUserOrganizations";
import { sendClosedSignalAlert } from "@/lib/discord/sendClosedSignalAlert";
import { sendPartialCloseSignalAlert } from "@/lib/discord/sendPartialCloseSignalAlert";
import {
  buildTradeSummary,
  type TradeSummaryDebitCredit,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

export type SignalStatus = "Active" | "Triggered" | "Closed" | "Expired";
export type SignalOutcome = "WIN" | "LOSS" | "BREAKEVEN" | null;

type CurrentSignalAccess = {
  id: string;
  organization_id: string | null;

  status: SignalStatus;
  closed_at: string | null;

  watching: boolean;
  watched: boolean;

  asset: string | null;
  underlying: string | null;

  instrument_type: string | null;

  /**
   * Execution style:
   * scalp, swing, leap
   */
  trade_style: string | null;

  /**
   * Strategy structure:
   * LONG_CALL, IRON_CONDOR, BULL_PUT_CREDIT_SPREAD, etc.
   */
  strategy_type: string | null;

  action: string | null;
  open_action: string | null;

  option_type: string | null;
  strike_price: string | number | null;
  expiration_date: string | null;

  contracts: string | number | null;
  quantity: string | number | null;
  shares: string | number | null;

  entry_price: string | number | null;
  price: string | number | null;
  return_pct: string | number | null;
  outcome: string | null;
  exit_price: string | number | null;

  signal_option_legs: SignalOptionLegRow[] | null;
};

type SignalOptionLegRow = {
  id: string;
  signal_id: string;
  leg_order: number | string | null;
  action: string | null;
  option_type: string | null;
  strike_price: string | number | null;
  expiration_date: string | null;
  contracts: string | number | null;
  entry_price: string | number | null;
  exit_price: string | number | null;
};

type SignalExecutionRow = {
  id: string;
  signal_id: string;
  status: string | null;
  contracts: number | string | null;
  exit_price: number | string | null;
  pnl: number | string | null;
  pnl_pct: number | string | null;
  closed_at: string | null;
};

type ExecutionFillRow = {
  id: string;
  execution_id: string;
  signal_option_leg_id: string | null;
  side: string | null;
  contracts: number | string | null;
  price: number | string | null;
};

function isMasterAdmin(role: Awaited<ReturnType<typeof resolveCurrentUserRole>>) {
  return (
    role?.role_name === "master_admin" ||
    role?.role_rank === 4 ||
    String(role?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

function normalizeNumber(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(
      value
        .replace(/\$/g, "")
        .replace(/,/g, "")
        .replace(/%/g, "")
        .replace(/\(/g, "-")
        .replace(/\)/g, "")
        .trim()
    );

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeOutcome(value: string | null | undefined): SignalOutcome {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["win", "winner", "profit", "profitable"].includes(normalized)) {
    return "WIN";
  }

  if (["loss", "loser", "lost"].includes(normalized)) {
    return "LOSS";
  }

  if (
    ["breakeven", "break_even", "break even", "flat", "even"].includes(
      normalized
    )
  ) {
    return "BREAKEVEN";
  }

  return null;
}

function inferOutcomeFromReturnPct(returnPct: number | null): SignalOutcome {
  if (returnPct === null) return null;
  if (returnPct > 0) return "WIN";
  if (returnPct < 0) return "LOSS";
  return "BREAKEVEN";
}

function calculateReturnPct({
  entryPrice,
  exitPrice,
  debitCredit,
}: {
  entryPrice: number | null;
  exitPrice: number | null;
  debitCredit?: TradeSummaryDebitCredit;
}) {
  if (entryPrice === null || exitPrice === null) return null;
  if (entryPrice === 0) return null;

  const absoluteEntry = Math.abs(entryPrice);

  const pnl =
    debitCredit === "CREDIT"
      ? absoluteEntry - Math.abs(exitPrice)
      : Math.abs(exitPrice) - absoluteEntry;

  return Number(((pnl / absoluteEntry) * 100).toFixed(2));
}

function buildCurrentTradeSummary(
  signal: CurrentSignalAccess,
) {
  return buildTradeSummary({
    symbol:
      signal.asset ??
      signal.underlying,

    underlying:
      signal.underlying,

    instrument_type:
      signal.instrument_type,

    strategy_type:
      signal.strategy_type,

    trade_style:
      signal.trade_style,

    execution_style:
      signal.trade_style,

    action:
      signal.action,

    open_action:
      signal.open_action,

    entry_price:
      signal.entry_price ??
      signal.price,

    exit_price:
      signal.exit_price,

    contracts:
      signal.contracts,

    quantity:
      signal.quantity,

    shares:
      signal.shares,

    option_type:
      signal.option_type,

    strike_price:
      signal.strike_price,

    expiration_date:
      signal.expiration_date,

    option_legs:
      (signal.signal_option_legs ??
        []) as TradeSummaryOptionLegInput[],
  });
}

async function assertSignalAccess({
  signalId,
  userId,
  isAdmin,
}: {
  signalId: string;
  userId: string;
  isAdmin: boolean;
}): Promise<CurrentSignalAccess> {
  const supabase = await createSupabaseServerClient();

  const { data: signal, error } = await supabase
    .from("signals")
    .select(
      `
      id,
      organization_id,
      status,
      closed_at,
      watching,
      watched,
      asset,
      underlying,
      instrument_type,
      trade_style,
      strategy_type,
      action,
      open_action,
      option_type,
      strike_price,
      expiration_date,
      contracts,
      quantity,
      shares,
      entry_price,
      price,
      return_pct,
      outcome,
      exit_price,
      signal_option_legs!left (
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
      )
      `
    )
    .eq("id", signalId)
    .single();

  if (error || !signal) {
    throw new Error(
      `Signal not found: ${error?.message ?? "No signal returned"}`
    );
  }

  const currentSignal = {
    id: signal.id,
    organization_id: signal.organization_id,
    status: signal.status as SignalStatus,
    closed_at: signal.closed_at ?? null,
    watching: Boolean(signal.watching),
    watched: Boolean(signal.watched),

    asset: signal.asset ?? null,
    underlying: signal.underlying ?? null,

    instrument_type: signal.instrument_type ?? null,
    trade_style: signal.trade_style ?? null,
    strategy_type: signal.strategy_type ?? null,

    action: signal.action ?? null,
    open_action: signal.open_action ?? null,

    option_type: signal.option_type ?? null,
    strike_price: signal.strike_price ?? null,
    expiration_date: signal.expiration_date ?? null,

    contracts: signal.contracts ?? null,
    quantity: signal.quantity ?? null,
    shares: signal.shares ?? null,

    entry_price: signal.entry_price ?? null,
    price: signal.price ?? null,
    return_pct: signal.return_pct ?? null,
    outcome: signal.outcome ?? null,
    exit_price: signal.exit_price ?? null,

    signal_option_legs:
      (signal.signal_option_legs ??
        []) as SignalOptionLegRow[],
  };

  if (isAdmin) {
    return currentSignal;
  }

  if (!currentSignal.organization_id) {
    throw new Error("Signal is missing organization_id.");
  }

  const organizations = await getUserOrganizations(userId);

  const canAccessSignal = organizations.some(
    (organization) =>
      organization.organization_id === currentSignal.organization_id &&
      organization.active === true &&
      organization.has_active_subscription === true &&
      organization.has_discord_access === true
  );

  if (!canAccessSignal) {
    throw new Error("Unauthorized signal access.");
  }

  return currentSignal;
}

function revalidateSignalPaths(signalId: string) {
  revalidatePath("/dashboard/signals");
  revalidatePath("/dashboard/admin/signals");
  revalidatePath("/dashboard/performance");
  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard/journal/reports");
  revalidatePath(`/dashboard/signals/${signalId}`);
  revalidatePath(`/dashboard/signals/edit/${signalId}`);
}

async function getAuthorizedSignal(signalId: string) {
  if (!signalId) throw new Error("Missing signalId");

  const role = await resolveCurrentUserRole();

  if (!role) throw new Error("Unauthorized");

  const admin = isMasterAdmin(role);

  const currentSignal = await assertSignalAccess({
    signalId,
    userId: role.user_id,
    isAdmin: admin,
  });

  if (!currentSignal.organization_id) {
    throw new Error("Signal is missing organization_id.");
  }

  return {
    role,
    admin,
    currentSignal,
  };
}

/* ----------------------------------------------
   UPDATE SIGNAL STATUS
---------------------------------------------- */
export async function updateSignalStatus(
  signalId: string,
  status: SignalStatus,
  options?: {
    outcome?: SignalOutcome;
    return_pct?: number | string | null;
    exit_price?: number | string | null;
    allow_ungraded_close?: boolean;
  }
) {
  const supabase = await createSupabaseServerClient();

  const { role, currentSignal } = await getAuthorizedSignal(signalId);

  const now = new Date().toISOString();
  const isClosingStatus = status === "Closed" || status === "Expired";

  const providedReturnPct = normalizeNumber(options?.return_pct);
  const exitPrice = normalizeNumber(options?.exit_price);
  const tradeSummary =
    buildCurrentTradeSummary(
      currentSignal
    );

  const entryPrice =
    tradeSummary.netEntryAmount ??
    normalizeNumber(currentSignal.entry_price) ??
    normalizeNumber(currentSignal.price);

  const calculatedReturnPct =
    providedReturnPct ??
    calculateReturnPct({
      entryPrice,
      exitPrice,
      debitCredit:
        tradeSummary.debitCredit,
    });

  const existingReturnPct = normalizeNumber(currentSignal.return_pct);

  const finalReturnPct = isClosingStatus
    ? calculatedReturnPct ?? existingReturnPct
    : null;

  const providedOutcome = normalizeOutcome(options?.outcome ?? null);
  const inferredOutcome = inferOutcomeFromReturnPct(finalReturnPct);
  const existingOutcome = normalizeOutcome(currentSignal.outcome);

  const finalOutcome = isClosingStatus
    ? providedOutcome ?? inferredOutcome ?? existingOutcome
    : null;

  const existingExitPrice = normalizeNumber(currentSignal.exit_price);
  const finalExitPrice = isClosingStatus
    ? exitPrice ?? existingExitPrice
    : null;

  if (
    isClosingStatus &&
    options?.allow_ungraded_close !== true &&
    (finalOutcome === null || finalReturnPct === null)
  ) {
    throw new Error(
      "Cannot close this signal without grading it. Provide an outcome and return percentage, or provide an exit price so return percentage can be calculated."
    );
  }

  const nextClosedAt = isClosingStatus ? currentSignal.closed_at ?? now : null;

  const { data: updatedSignal, error } = await supabase
    .from("signals")
    .update({
      status,
      closed_at: nextClosedAt,
      return_pct: finalReturnPct,
      outcome: finalOutcome,
      exit_price: finalExitPrice,
      watching: isClosingStatus ? false : currentSignal.watching,
      watched: isClosingStatus ? true : currentSignal.watched,
      updated_at: now,
      updated_by: role.user_id,
    })
    .eq("id", signalId)
    .eq("organization_id", currentSignal.organization_id)
    .select(
      `
      id,
      status,
      outcome,
      return_pct,
      exit_price,
      closed_at,
      watching,
      watched,
      updated_at,
      updated_by,
      organization_id
      `
    )
    .single();

  if (error || !updatedSignal) {
    throw new Error(
      `Failed to update signal status: ${
        error?.message ?? "No updated signal returned"
      }`
    );
  }

  if (
    (status === "Closed" || status === "Expired") &&
    currentSignal.status !== status
  ) {
    try {
      await sendClosedSignalAlert(updatedSignal.id);
    } catch (discordError) {
      console.error("Failed to send Discord close alert:", discordError);
    }
  }

  revalidateSignalPaths(signalId);

  return updatedSignal;
}

/* ----------------------------------------------
   CLOSE SIGNAL WITH OUTCOME
---------------------------------------------- */
export async function closeSignalWithOutcome({
  signalId,
  outcome,
  return_pct,
  exit_price,
}: {
  signalId: string;
  outcome?: SignalOutcome;
  return_pct?: number | string | null;
  exit_price?: number | string | null;
}) {
  return updateSignalStatus(signalId, "Closed", {
    outcome,
    return_pct,
    exit_price,
  });
}

/* ----------------------------------------------
   CLOSE SIGNAL WITHOUT GRADING
---------------------------------------------- */
export async function closeSignalWithoutOutcome(signalId: string) {
  return updateSignalStatus(signalId, "Closed", {
    allow_ungraded_close: true,
  });
}

type ExecutionLifecycleSummary = {
  totalStrategyContracts: number;
  closedStrategyContracts: number;
  remainingStrategyContracts: number;
  averageExitPrice: number | null;
  realizedReturnPct: number | null;
};

function getFillContracts(fill: ExecutionFillRow) {
  return Math.max(normalizeNumber(fill.contracts) ?? 0, 0);
}

function getLegStrategyRatio({
  openedLegContracts,
  executionContracts,
}: {
  openedLegContracts: number;
  executionContracts: number;
}) {
  if (executionContracts <= 0) {
    return Math.max(openedLegContracts, 1);
  }

  return Math.max(openedLegContracts / executionContracts, 1);
}

function calculateExecutionStrategyLifecycle({
  execution,
  fills,
  optionLegs,
}: {
  execution: SignalExecutionRow;
  fills: ExecutionFillRow[];
  optionLegs: SignalOptionLegRow[];
}) {
  const executionContracts = Math.max(
    normalizeNumber(execution.contracts) ?? 0,
    0,
  );

  if (executionContracts <= 0) {
    return {
      total: 0,
      closed: 0,
      remaining: 0,
    };
  }

  const executionFills = fills.filter(
    (fill) => fill.execution_id === execution.id,
  );

  const linkedLegIds = Array.from(
    new Set(
      executionFills
        .map((fill) => fill.signal_option_leg_id)
        .filter((legId): legId is string => Boolean(legId)),
    ),
  );

  if (linkedLegIds.length > 0) {
    const relevantLegs = optionLegs.filter((leg) =>
      linkedLegIds.includes(leg.id),
    );

    if (relevantLegs.length > 0) {
      const remainingUnits = relevantLegs.map((leg) => {
        const legFills = executionFills.filter(
          (fill) => fill.signal_option_leg_id === leg.id,
        );

        const openedLegContracts = legFills
          .filter(
            (fill) =>
              String(fill.side ?? "").toUpperCase() === "OPEN",
          )
          .reduce((sum, fill) => sum + getFillContracts(fill), 0);

        const closedLegContracts = legFills
          .filter(
            (fill) =>
              String(fill.side ?? "").toUpperCase() === "CLOSE",
          )
          .reduce((sum, fill) => sum + getFillContracts(fill), 0);

        const remainingLegContracts = Math.max(
          openedLegContracts - closedLegContracts,
          0,
        );

        const ratio = getLegStrategyRatio({
          openedLegContracts,
          executionContracts,
        });

        return Math.floor(remainingLegContracts / ratio);
      });

      const remaining =
        remainingUnits.length > 0
          ? Math.max(Math.min(...remainingUnits), 0)
          : executionContracts;

      return {
        total: executionContracts,
        closed: Math.max(executionContracts - remaining, 0),
        remaining,
      };
    }
  }

  const legacyOpenContracts = executionFills
    .filter(
      (fill) =>
        fill.signal_option_leg_id === null &&
        String(fill.side ?? "").toUpperCase() === "OPEN",
    )
    .reduce((sum, fill) => sum + getFillContracts(fill), 0);

  const legacyCloseContracts = executionFills
    .filter(
      (fill) =>
        fill.signal_option_leg_id === null &&
        String(fill.side ?? "").toUpperCase() === "CLOSE",
    )
    .reduce((sum, fill) => sum + getFillContracts(fill), 0);

  const openedContracts =
    legacyOpenContracts > 0
      ? legacyOpenContracts
      : executionContracts;

  const remaining = Math.max(
    openedContracts - legacyCloseContracts,
    0,
  );

  return {
    total: executionContracts,
    closed: Math.max(executionContracts - remaining, 0),
    remaining,
  };
}

function buildExecutionLifecycleSummary({
  executions,
  fills,
  optionLegs,
  currentSignal,
}: {
  executions: SignalExecutionRow[];
  fills: ExecutionFillRow[];
  optionLegs: SignalOptionLegRow[];
  currentSignal: CurrentSignalAccess;
}): ExecutionLifecycleSummary {
  const lifecycleRows = executions.map((execution) =>
    calculateExecutionStrategyLifecycle({
      execution,
      fills,
      optionLegs,
    }),
  );

  const totalStrategyContracts = lifecycleRows.reduce(
    (sum, row) => sum + row.total,
    0,
  );

  const closedStrategyContracts = lifecycleRows.reduce(
    (sum, row) => sum + row.closed,
    0,
  );

  const remainingStrategyContracts = lifecycleRows.reduce(
    (sum, row) => sum + row.remaining,
    0,
  );

  const executionsWithExitPrice = executions.filter(
    (execution) => normalizeNumber(execution.exit_price) !== null,
  );

  const weightedExitValue = executionsWithExitPrice.reduce(
    (sum, execution) => {
      const executionContracts = Math.max(
        normalizeNumber(execution.contracts) ?? 0,
        0,
      );

      const exitPrice = normalizeNumber(execution.exit_price) ?? 0;

      return sum + executionContracts * exitPrice;
    },
    0,
  );

  const exitPriceWeight = executionsWithExitPrice.reduce(
    (sum, execution) =>
      sum + Math.max(normalizeNumber(execution.contracts) ?? 0, 0),
    0,
  );

  const averageExitPrice =
    normalizeNumber(currentSignal.exit_price) ??
    (exitPriceWeight > 0
      ? Number((weightedExitValue / exitPriceWeight).toFixed(4))
      : null);

  const executionsWithReturn = executions.filter(
    (execution) => normalizeNumber(execution.pnl_pct) !== null,
  );

  const weightedReturnValue = executionsWithReturn.reduce(
    (sum, execution) => {
      const executionContracts = Math.max(
        normalizeNumber(execution.contracts) ?? 0,
        0,
      );

      const returnPct = normalizeNumber(execution.pnl_pct) ?? 0;

      return sum + executionContracts * returnPct;
    },
    0,
  );

  const returnWeight = executionsWithReturn.reduce(
    (sum, execution) =>
      sum + Math.max(normalizeNumber(execution.contracts) ?? 0, 0),
    0,
  );

  const realizedReturnPct =
    normalizeNumber(currentSignal.return_pct) ??
    (returnWeight > 0
      ? Number((weightedReturnValue / returnWeight).toFixed(2))
      : null);

  return {
    totalStrategyContracts,
    closedStrategyContracts: Math.min(
      closedStrategyContracts,
      totalStrategyContracts,
    ),
    remainingStrategyContracts: Math.max(
      remainingStrategyContracts,
      0,
    ),
    averageExitPrice,
    realizedReturnPct,
  };
}

/* ----------------------------------------------
   AUTO-CLOSE / PARTIAL-CLOSE SIGNAL FROM FILLS
---------------------------------------------- */
export async function autoCloseSignalFromExecution(signalId: string) {
  const supabase = await createSupabaseServerClient();

  const { currentSignal } = await getAuthorizedSignal(signalId);

  const { data: executionsData, error: executionsError } = await supabase
    .from("signal_executions")
    .select(
      `
      id,
      signal_id,
      status,
      contracts,
      exit_price,
      pnl,
      pnl_pct,
      closed_at
      `,
    )
    .eq("signal_id", signalId);

  if (executionsError) {
    throw new Error(
      `Failed to load signal executions: ${executionsError.message}`,
    );
  }

  const executions = (executionsData ?? []) as SignalExecutionRow[];

  if (executions.length === 0) {
    return {
      closed: false,
      reason: "no_executions",
      signal_id: signalId,
    };
  }

  const executionIds = executions.map((execution) => execution.id);

  const { data: fillsData, error: fillsError } = await supabase
    .from("execution_fills")
    .select(
      `
      id,
      execution_id,
      signal_option_leg_id,
      side,
      contracts,
      price
      `,
    )
    .in("execution_id", executionIds);

  if (fillsError) {
    throw new Error(
      `Failed to load execution fills: ${fillsError.message}`,
    );
  }

  const fills = (fillsData ?? []) as ExecutionFillRow[];

  const lifecycle = buildExecutionLifecycleSummary({
    executions,
    fills,
    optionLegs: currentSignal.signal_option_legs ?? [],
    currentSignal,
  });

  const totalContracts = lifecycle.totalStrategyContracts;
  const closedContracts = lifecycle.closedStrategyContracts;
  const remainingContracts = lifecycle.remainingStrategyContracts;

  if (totalContracts <= 0) {
    return {
      closed: false,
      reason: "no_contract_quantity",
      signal_id: signalId,
    };
  }

  if (closedContracts <= 0) {
    revalidateSignalPaths(signalId);

    return {
      closed: false,
      reason: "no_close_fills",
      signal_id: signalId,
      total_contracts: totalContracts,
      closed_contracts: closedContracts,
      remaining_contracts: remainingContracts,
    };
  }

  const averageExitPrice = lifecycle.averageExitPrice;
  const realizedReturnPct = lifecycle.realizedReturnPct;

  if (remainingContracts > 0) {
    try {
      await sendPartialCloseSignalAlert({
        signalId,
        closedContracts,
        totalContracts,
        remainingContracts,
        exitPrice: averageExitPrice,
        realizedReturnPct,
      });
    } catch (discordError) {
      console.error(
        "Failed to send Discord partial close alert:",
        discordError,
      );
    }

    revalidateSignalPaths(signalId);

    return {
      closed: false,
      reason: "still_open",
      signal_id: signalId,
      total_contracts: totalContracts,
      closed_contracts: closedContracts,
      remaining_contracts: remainingContracts,
      exit_price: averageExitPrice,
      realized_return_pct: realizedReturnPct,
    };
  }

  const finalReturnPct =
    realizedReturnPct ??
    normalizeNumber(currentSignal.return_pct);

  const finalExitPrice =
    averageExitPrice ??
    normalizeNumber(currentSignal.exit_price);

  const finalOutcome =
    normalizeOutcome(currentSignal.outcome) ??
    inferOutcomeFromReturnPct(finalReturnPct);

  if (
    currentSignal.status === "Closed" &&
    finalOutcome !== null &&
    finalReturnPct !== null
  ) {
    revalidateSignalPaths(signalId);

    return {
      closed: true,
      reason: "already_synchronized",
      signal_id: signalId,
      total_contracts: totalContracts,
      closed_contracts: closedContracts,
      remaining_contracts: 0,
      exit_price: finalExitPrice,
      return_pct: finalReturnPct,
      outcome: finalOutcome,
    };
  }

  if (
    finalExitPrice === null ||
    finalReturnPct === null ||
    finalOutcome === null
  ) {
    throw new Error(
      "Cannot synchronize the completed execution because exit price, return percentage, or outcome is missing.",
    );
  }

  const updatedSignal = await updateSignalStatus(signalId, "Closed", {
    outcome: finalOutcome,
    return_pct: finalReturnPct,
    exit_price: finalExitPrice,
  });

  return {
    closed: true,
    reason: "execution_complete",
    signal_id: signalId,
    total_contracts: totalContracts,
    closed_contracts: closedContracts,
    remaining_contracts: 0,
    exit_price: finalExitPrice,
    return_pct: finalReturnPct,
    outcome: finalOutcome,
    signal: updatedSignal,
  };
}

/* ----------------------------------------------
   TOGGLE WATCH STATE
---------------------------------------------- */
export async function toggleSignalWatch(signalId: string) {
  const supabase = await createSupabaseServerClient();

  const { role, currentSignal } = await getAuthorizedSignal(signalId);

  const nextWatching = !currentSignal.watching;
  const nextWatched = currentSignal.watching ? true : currentSignal.watched;
  const now = new Date().toISOString();

  const { data: updatedSignal, error: updateError } = await supabase
    .from("signals")
    .update({
      watching: nextWatching,
      watched: nextWatched,
      updated_at: now,
      updated_by: role.user_id,
    })
    .eq("id", signalId)
    .eq("organization_id", currentSignal.organization_id)
    .select("id, watching, watched, updated_at, updated_by, organization_id")
    .single();

  if (updateError || !updatedSignal) {
    throw new Error(
      `Failed to update watch state: ${
        updateError?.message ?? "No updated signal returned"
      }`
    );
  }

  revalidateSignalPaths(signalId);

  return updatedSignal;
}