"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { getUserOrganizations } from "@/lib/orgs/getUserOrganizations";
import { sendClosedSignalAlert } from "@/lib/discord/sendClosedSignalAlert";

export type SignalStatus = "Active" | "Triggered" | "Closed" | "Expired";
export type SignalOutcome = "WIN" | "LOSS" | "BREAKEVEN" | null;

type CurrentSignalAccess = {
  id: string;
  organization_id: string | null;
  status: SignalStatus;
  closed_at: string | null;
  watching: boolean;
  watched: boolean;
  entry_price: string | number | null;
  price: string | number | null;
  return_pct: string | number | null;
  outcome: string | null;
  exit_price: string | number | null;
};

type SignalExecutionRow = {
  id: string;
  signal_id: string;
  contracts: number | string | null;
};

type ExecutionFillRow = {
  id: string;
  execution_id: string;
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
    const parsed = Number(value.replace("%", "").trim());
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
}: {
  entryPrice: number | null;
  exitPrice: number | null;
}) {
  if (entryPrice === null || exitPrice === null) return null;
  if (entryPrice === 0) return null;

  return Number((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2));
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
      entry_price,
      price,
      return_pct,
      outcome,
      exit_price
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
    entry_price: signal.entry_price ?? null,
    price: signal.price ?? null,
    return_pct: signal.return_pct ?? null,
    outcome: signal.outcome ?? null,
    exit_price: signal.exit_price ?? null,
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
  const entryPrice =
    normalizeNumber(currentSignal.entry_price) ??
    normalizeNumber(currentSignal.price);

  const calculatedReturnPct =
    providedReturnPct ??
    calculateReturnPct({
      entryPrice,
      exitPrice,
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

  /*
  |--------------------------------------------------------------------------
  | Signal Lifecycle Events
  |--------------------------------------------------------------------------
  |
  | Fire notifications only after the database update succeeds.
  | This keeps updateSignalStatus() as the single source of truth while
  | allowing Discord, email, push notifications, etc. to subscribe to
  | lifecycle events.
  |
  */
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
   Use only when intentionally saving an unresolved close.
---------------------------------------------- */
export async function closeSignalWithoutOutcome(signalId: string) {
  return updateSignalStatus(signalId, "Closed", {
    allow_ungraded_close: true,
  });
}

/* ----------------------------------------------
   AUTO-CLOSE SIGNAL FROM EXECUTION FILLS

   This is the missing sync layer:
   - Reads signal_executions
   - Reads execution_fills
   - Calculates remaining contracts
   - If remaining contracts = 0, closes the signal
   - Saves outcome, return_pct, exit_price, closed_at
---------------------------------------------- */
export async function autoCloseSignalFromExecution(signalId: string) {
  const supabase = await createSupabaseServerClient();

  const { currentSignal } = await getAuthorizedSignal(signalId);

  if (
    currentSignal.status === "Closed" &&
    currentSignal.outcome &&
    currentSignal.return_pct !== null
  ) {
    revalidateSignalPaths(signalId);
    return {
      closed: false,
      reason: "already_closed",
      signal_id: signalId,
    };
  }

  const entryPrice =
    normalizeNumber(currentSignal.entry_price) ??
    normalizeNumber(currentSignal.price);

  if (entryPrice === null || entryPrice === 0) {
    throw new Error(
      "Cannot auto-close signal because entry price is missing or invalid."
    );
  }

  const { data: executionsData, error: executionsError } = await supabase
    .from("signal_executions")
    .select("id, signal_id, contracts")
    .eq("signal_id", signalId);

  if (executionsError) {
    throw new Error(
      `Failed to load signal executions: ${executionsError.message}`
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
    .select("id, execution_id, side, contracts, price")
    .in("execution_id", executionIds);

  if (fillsError) {
    throw new Error(`Failed to load execution fills: ${fillsError.message}`);
  }

  const fills = (fillsData ?? []) as ExecutionFillRow[];

  const totalContracts = executions.reduce((sum, execution) => {
    return sum + (normalizeNumber(execution.contracts) ?? 0);
  }, 0);

  const closeFills = fills.filter(
    (fill) => String(fill.side ?? "").toUpperCase() === "CLOSE"
  );

  const closedContracts = closeFills.reduce((sum, fill) => {
    return sum + (normalizeNumber(fill.contracts) ?? 0);
  }, 0);

  const remainingContracts = Math.max(totalContracts - closedContracts, 0);

  if (totalContracts <= 0) {
    return {
      closed: false,
      reason: "no_contract_quantity",
      signal_id: signalId,
    };
  }

  if (remainingContracts > 0) {
    revalidateSignalPaths(signalId);

    return {
      closed: false,
      reason: "still_open",
      signal_id: signalId,
      total_contracts: totalContracts,
      closed_contracts: closedContracts,
      remaining_contracts: remainingContracts,
    };
  }

  const totalCloseValue = closeFills.reduce((sum, fill) => {
    const contracts = normalizeNumber(fill.contracts) ?? 0;
    const price = normalizeNumber(fill.price) ?? 0;

    return sum + contracts * price;
  }, 0);

  const exitPrice =
    closedContracts > 0
      ? Number((totalCloseValue / closedContracts).toFixed(4))
      : null;

  const returnPct = calculateReturnPct({
    entryPrice,
    exitPrice,
  });

  const outcome = inferOutcomeFromReturnPct(returnPct);

  if (exitPrice === null || returnPct === null || outcome === null) {
    throw new Error(
      "Cannot auto-close signal because exit price, return percentage, or outcome could not be calculated."
    );
  }

  const updatedSignal = await updateSignalStatus(signalId, "Closed", {
    outcome,
    return_pct: returnPct,
    exit_price: exitPrice,
  });

  return {
    closed: true,
    reason: "execution_complete",
    signal_id: signalId,
    total_contracts: totalContracts,
    closed_contracts: closedContracts,
    remaining_contracts: remainingContracts,
    exit_price: exitPrice,
    return_pct: returnPct,
    outcome,
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