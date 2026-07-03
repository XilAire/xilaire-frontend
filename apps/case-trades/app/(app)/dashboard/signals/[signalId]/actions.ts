"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { EXECUTION_RULE_TEMPLATES } from "@/lib/executionRuleTemplates";
import { closeSignalWithOutcome } from "@/lib/signals/updateSignalState";

/* -------------------------------------------------
   DOMAIN TYPES (AUTHORITATIVE)
------------------------------------------------- */
type TemplateRule =
  (typeof EXECUTION_RULE_TEMPLATES)[keyof typeof EXECUTION_RULE_TEMPLATES]["rules"][number];

type TradeStyle = "scalp" | "swing" | "leap";

/* =================================================
   APPLY EXECUTION TEMPLATE (ATOMIC / SAFE)
   🔒 Uses Postgres RPC to satisfy unique constraints
================================================= */
export async function applyExecutionTemplate(
  signalId: string,
  rules: TemplateRule[]
) {
  if (!signalId) {
    throw new Error("Missing signalId");
  }

  if (!rules || rules.length === 0) {
    throw new Error("No execution rules provided");
  }

  /* 🔒 AUTH */
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank !== 4) {
    throw new Error("Unauthorized: master_admin required");
  }

  const supabase = await createSupabaseServerClient();

  /* -------------------------------------------------
     1️⃣ RESOLVE TRADE STYLE (AUTHORITATIVE)
  ------------------------------------------------- */
  const style = Object.entries(EXECUTION_RULE_TEMPLATES).find(
    ([, template]) =>
      JSON.stringify(template.rules) === JSON.stringify(rules)
  )?.[0] as TradeStyle | undefined;

  if (!style) {
    throw new Error("Unable to resolve trade style from rules");
  }

  /* -------------------------------------------------
     2️⃣ APPLY VIA POSTGRES RPC (TRANSACTION)
     - Deactivates existing rules
     - Inserts new rules
     - Updates signal trade_style
     - Enforced by DB, not app code
  ------------------------------------------------- */
  const { error } = await supabase.rpc("apply_execution_template", {
    p_signal_id: signalId,
    p_rules: rules,
    p_user_id: role.user_id,
    p_trade_style: style,
  });

  if (error) {
    console.error("apply_execution_template RPC failed", error);
    throw new Error(error.message);
  }

  return { success: true };
}

/* =================================================
   CLOSE SIGNAL (LIFECYCLE ACTION)
================================================= */
export async function closeSignal(
  signalId: string,
  outcome: "WIN" | "LOSS" | "BREAKEVEN"
) {
  if (!signalId) {
    throw new Error("Missing signalId");
  }

  if (!outcome) {
    throw new Error("Missing outcome");
  }

  const updatedSignal = await closeSignalWithOutcome({
    signalId,
    outcome,
  });

  return {
    success: true,
    signal: updatedSignal,
  };
}