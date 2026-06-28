"use server";

import { createClient } from "@supabase/supabase-js";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

export async function updateExecutionRule({
  ruleId,
  value_pct,
}: {
  ruleId: string;
  value_pct: number;
}) {
  const role = await resolveCurrentUserRole();

  if (!role || role.role_name !== "master_admin") {
    throw new Error("Unauthorized");
  }

  if (value_pct <= 0) {
    throw new Error("Invalid percentage");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!
  );

  const { error } = await supabase
    .from("signal_execution_rules")
    .update({ value_pct })
    .eq("id", ruleId);

  if (error) {
    console.error("Update rule failed", error);
    throw new Error("Failed to update rule");
  }
}
