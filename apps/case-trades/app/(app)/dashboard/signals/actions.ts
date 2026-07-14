"use server";

import { revalidatePath } from "next/cache";

import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 🔑 CANONICAL RULE TYPES
 */
type RuleType = "STOP_LOSS" | "TAKE_PROFIT";

type ExecutionStyle = "scalp" | "swing" | "leap";

interface TemplateRule {
  rule_type: RuleType;
  value_pct: number;
  quantity_pct: number;
}

/**
 * SERVER ACTION — Apply execution rule template to a signal
 *
 * SECURITY GUARANTEES:
 * - Enforces role via roles.rank
 * - Requires master_admin or admin-level access
 * - Uses authenticated Supabase server client
 * - Preserves audit history
 * - Revalidates dependent pages
 *
 * Supports both call styles:
 *
 * applyExecutionTemplate(signalId, rules)
 *
 * applyExecutionTemplate(signalId, executionStyle, rules)
 */
export default async function applyExecutionTemplate(
  signalId: string,
  executionStyleOrRules: ExecutionStyle | TemplateRule[],
  maybeRules?: TemplateRule[],
) {
  if (!signalId) {
    throw new Error("Missing signalId");
  }

  const rules = Array.isArray(executionStyleOrRules)
    ? executionStyleOrRules
    : maybeRules;

  if (!rules || rules.length === 0) {
    throw new Error("No execution rules provided");
  }

  const supabase = await createSupabaseServerClient();

  /* -------------------------------------------------
     🔒 AUTHORIZATION — CANONICAL
  ------------------------------------------------- */
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank < 4) {
    throw new Error("Unauthorized: master_admin required");
  }

  const now = new Date().toISOString();

  /* -------------------------------------------------
     1️⃣ Deactivate existing active rules
  ------------------------------------------------- */
  const { error: deactivateError } = await supabase
    .from("signal_execution_rules")
    .update({
      is_active: false,
      updated_at: now,
      updated_by: role.user_id,
    })
    .eq("signal_id", signalId)
    .eq("is_active", true);

  if (deactivateError) {
    throw new Error(
      `Failed to deactivate existing execution rules: ${deactivateError.message}`,
    );
  }

  /* -------------------------------------------------
     2️⃣ Insert new rules
  ------------------------------------------------- */
  const { error: insertError } = await supabase
    .from("signal_execution_rules")
    .insert(
      rules.map((rule) => ({
        signal_id: signalId,
        rule_type: rule.rule_type,
        value_pct: rule.value_pct,
        quantity_pct: rule.quantity_pct,
        is_active: true,
        created_by: role.user_id,
        updated_by: role.user_id,
        created_at: now,
        updated_at: now,
      })),
    );

  if (insertError) {
    throw new Error(
      `Failed to insert execution rule template: ${insertError.message}`,
    );
  }

  /* -------------------------------------------------
     🔄 REVALIDATE DEPENDENT PAGES
  ------------------------------------------------- */
  revalidatePath("/dashboard/signals");
  revalidatePath(`/dashboard/signals/${signalId}`);
  revalidatePath("/dashboard/admin/signals");
  revalidatePath(`/dashboard/admin/signals/${signalId}`);
}

export { applyExecutionTemplate };