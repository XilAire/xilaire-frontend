"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { EXECUTION_RULE_TEMPLATES } from "@/lib/executionRuleTemplates";

/**
 * Canonical derived rule type
 * (single source of truth)
 */
type TemplateRule =
  (typeof EXECUTION_RULE_TEMPLATES)[keyof typeof EXECUTION_RULE_TEMPLATES]["rules"][number];

type TradeStyle = "scalp" | "swing" | "leap";

/**
 * SERVER ACTION — Apply execution rule template
 *
 * ENTERPRISE-GRADE BEHAVIOR:
 * - Auth via role rank (DB-authoritative)
 * - RLS enforced (no service role)
 * - Deterministic DELETE → INSERT (no partial-unique race)
 * - Audit columns preserved
 * - Idempotent execution
 */
export default async function applyExecutionRuleTemplate(
  signalId: string,
  style: TradeStyle,
  rules: TemplateRule[]
) {
  if (!signalId) {
    throw new Error("Missing signalId");
  }

  if (!rules || rules.length === 0) {
    throw new Error("No execution rules provided");
  }

  /* -------------------------------------------------
     🔒 AUTH (AUTHORITATIVE)
  ------------------------------------------------- */
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank !== 4) {
    throw new Error("Unauthorized: master_admin required");
  }

  const supabase = await createSupabaseServerClient();

  /* -------------------------------------------------
     🔍 AUTH CONTEXT VERIFICATION (SAFE)
  ------------------------------------------------- */
  const { data: authData } = await supabase.auth.getUser();
  console.log("🔐 SERVER ACTION USER:", authData?.user?.id);

  /* -------------------------------------------------
     1️⃣ UPDATE SIGNAL TRADE STYLE
  ------------------------------------------------- */
  const { error: styleError } = await supabase
    .from("signals")
    .update({
      trade_style: style,
      updated_by: role.user_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", signalId);

  if (styleError) {
    console.error("Trade style update failed", styleError);
    throw new Error("Failed to update signal trade style");
  }

  /* -------------------------------------------------
     2️⃣ DELETE EXISTING RULES (ENTERPRISE-SAFE)
     - Avoids partial unique index race
     - Deterministic execution
  ------------------------------------------------- */
  const ruleTypes = rules.map((r) => r.rule_type);

  const { error: deleteError } = await supabase
    .from("signal_execution_rules")
    .delete()
    .eq("signal_id", signalId)
    .in("rule_type", ruleTypes);

  if (deleteError) {
    console.error("Rule delete failed", deleteError);
    throw new Error("Failed to clear existing execution rules");
  }

  /* -------------------------------------------------
     3️⃣ INSERT NEW RULES
  ------------------------------------------------- */
  const { error: insertError } = await supabase
    .from("signal_execution_rules")
    .insert(
      rules.map((r) => ({
        signal_id: signalId,
        rule_type: r.rule_type,
        value_pct: r.value_pct ?? null,
        quantity_pct: r.quantity_pct ?? null,
        is_active: true,
        created_by: role.user_id,
        created_at: new Date().toISOString(),
      }))
    );

  if (insertError) {
    console.error("Rule insert failed", insertError);
    throw new Error(insertError.message);
  }

  return { success: true };
}

