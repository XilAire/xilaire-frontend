"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { revalidatePath } from "next/cache";

/**
 * 🔑 CANONICAL RULE TYPES
 */
type RuleType = "STOP_LOSS" | "TAKE_PROFIT";

interface TemplateRule {
  rule_type: RuleType;
  value_pct: number;
  quantity_pct: number;
}

/**
 * SERVER ACTION — Apply execution rule template to a signal
 *
 * SECURITY GUARANTEES:
 * - Enforces role via roles.rank (NO string checks)
 * - Requires master_admin (rank === 4)
 * - Uses authenticated Supabase server client (RLS enforced)
 * - Preserves audit history
 * - Revalidates dependent pages
 */
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

  const supabase = await createSupabaseServerClient();

  /* -------------------------------------------------
     🔒 AUTHORIZATION — CANONICAL
  ------------------------------------------------- */
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank !== 4) {
    throw new Error("Unauthorized: master_admin required");
  }

  /* -------------------------------------------------
     1️⃣ Deactivate existing active rules
  ------------------------------------------------- */
  const { error: deactivateError } = await supabase
    .from("signal_execution_rules")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
      updated_by: role.user_id,
    })
    .eq("signal_id", signalId)
    .eq("is_active", true);

  if (deactivateError) {
    throw new Error(
      `Failed to deactivate existing execution rules: ${deactivateError.message}`
    );
  }

  /* -------------------------------------------------
     2️⃣ Insert new rules
  ------------------------------------------------- */
  const { error: insertError } = await supabase
    .from("signal_execution_rules")
    .insert(
      rules.map((r) => ({
        signal_id: signalId,
        rule_type: r.rule_type,
        value_pct: r.value_pct,
        quantity_pct: r.quantity_pct,
        is_active: true,
        created_by: role.user_id,
      }))
    );

  if (insertError) {
    throw new Error(
      `Failed to insert execution rule template: ${insertError.message}`
    );
  }

  /* -------------------------------------------------
     🔄 REVALIDATE DEPENDENT PAGES
  ------------------------------------------------- */
  revalidatePath("/dashboard/signals");
  revalidatePath(`/dashboard/signals/${signalId}`);
}

