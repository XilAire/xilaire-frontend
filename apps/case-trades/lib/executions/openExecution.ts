"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

interface OpenExecutionInput {
  signalId: string;
  contracts: number;
  entryPrice: number;
}

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

  if (contracts <= 0 || entryPrice <= 0) {
    throw new Error("Invalid execution input");
  }

  /* -------------------------------------------------
     📥 LOAD SIGNAL
  ------------------------------------------------- */
  const { data: signal, error: signalError } = await supabase
    .from("signals")
    .select("id, organization_id, status, entry_price, price")
    .eq("id", signalId)
    .single();

  if (signalError || !signal) {
    console.error("openExecution: signal lookup failed", signalError);
    throw new Error("Signal not found");
  }

  if (signal.status === "Closed" || signal.status === "Expired") {
    throw new Error("Cannot open execution for a closed or expired signal");
  }

  /* -------------------------------------------------
     📥 CREATE EXECUTION
  ------------------------------------------------- */
  const { data: execution, error: execError } = await supabase
    .from("signal_executions")
    .insert({
      signal_id: signalId,
      status: "OPEN",
      contracts,
      entry_price: entryPrice,
      opened_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select()
    .single();

  if (execError || !execution) {
    console.error("openExecution: execution insert failed", execError);
    throw new Error("Failed to open execution");
  }

  /* -------------------------------------------------
     🧾 RECORD OPEN FILL
  ------------------------------------------------- */
  const { error: fillError } = await supabase.from("execution_fills").insert({
    execution_id: execution.id,
    contracts,
    price: entryPrice,
    side: "OPEN",
    created_by: user.id,
  });

  if (fillError) {
    console.error("openExecution: fill insert failed", fillError);
    throw new Error("Failed to record execution fill");
  }

  /* -------------------------------------------------
     🔄 SYNC SIGNAL ENTRY PRICE
  ------------------------------------------------- */
  const shouldSyncEntryPrice =
    signal.entry_price === null ||
    signal.entry_price === undefined ||
    Number(signal.entry_price) <= 0;

  if (shouldSyncEntryPrice) {
    const { error: signalUpdateError } = await supabase
      .from("signals")
      .update({
        entry_price: entryPrice,
        price: entryPrice,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", signalId);

    if (signalUpdateError) {
      console.error(
        "openExecution: signal entry price sync failed",
        signalUpdateError
      );

      throw new Error("Execution opened but failed to sync signal entry price");
    }
  }

  return execution;
}
