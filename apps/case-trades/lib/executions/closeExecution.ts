"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { autoCloseSignalFromExecution } from "@/lib/signals/updateSignalState";

interface CloseExecutionInput {
  executionId: string;
  contracts: number;
  price: number;
}

export async function closeExecution({
  executionId,
  contracts,
  price,
}: CloseExecutionInput) {
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

  if (!executionId) {
    throw new Error("Missing executionId");
  }

  if (contracts <= 0 || price <= 0) {
    throw new Error("Invalid close input");
  }

  /* -------------------------------------------------
     📥 LOAD EXECUTION
  ------------------------------------------------- */
  const { data: execution, error: execError } = await supabase
    .from("signal_executions")
    .select("id, signal_id, status")
    .eq("id", executionId)
    .single();

  if (execError || !execution) {
    throw new Error("Execution not found");
  }

  if (!execution.signal_id) {
    throw new Error("Execution is missing signal_id");
  }

  if (execution.status !== "OPEN") {
    throw new Error("Execution already closed");
  }

  /* -------------------------------------------------
     📊 CALCULATE REMAINING CONTRACTS
  ------------------------------------------------- */
  const { data: fills, error: fillsError } = await supabase
    .from("execution_fills")
    .select("contracts, side")
    .eq("execution_id", executionId);

  if (fillsError || !fills) {
    throw new Error("Failed to load execution fills");
  }

  const opened = fills
    .filter((fill) => fill.side === "OPEN")
    .reduce((sum, fill) => sum + Number(fill.contracts ?? 0), 0);

  const closed = fills
    .filter((fill) => fill.side === "CLOSE")
    .reduce((sum, fill) => sum + Number(fill.contracts ?? 0), 0);

  const remaining = opened - closed;

  if (remaining <= 0) {
    throw new Error("Execution has no remaining contracts to close");
  }

  if (contracts > remaining) {
    throw new Error("Close quantity exceeds remaining contracts");
  }

  const isFinalClose = contracts === remaining;

  /* -------------------------------------------------
     🧾 RECORD CLOSE FILL
  ------------------------------------------------- */
  const { error: fillError } = await supabase.from("execution_fills").insert({
    execution_id: executionId,
    contracts,
    price,
    side: "CLOSE",
    created_by: user.id,
  });

  if (fillError) {
    console.error("closeExecution: fill insert failed", fillError);
    throw new Error("Failed to record close fill");
  }

  /* -------------------------------------------------
     🔒 AUTO-CLOSE EXECUTION IF FINAL
  ------------------------------------------------- */
  if (isFinalClose) {
    const now = new Date().toISOString();

    const { error: closeError } = await supabase
      .from("signal_executions")
      .update({
        status: "CLOSED",
        closed_at: now,
      })
      .eq("id", executionId);

    if (closeError) {
      console.error("closeExecution: final close failed", closeError);
      throw new Error("Failed to finalize execution");
    }

    await autoCloseSignalFromExecution(execution.signal_id);
  }

  return {
    execution_id: executionId,
    signal_id: execution.signal_id,
    closed_contracts: contracts,
    close_price: price,
    final_close: isFinalClose,
  };
}
