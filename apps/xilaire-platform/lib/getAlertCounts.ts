// apps/xilaire-platform/lib/getAlertCounts.ts

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";

/* -------------------------------------------------
   ALERT COUNT — CANONICAL, ENTERPRISE SAFE
------------------------------------------------- */
export async function getActiveAlertCount(): Promise<number> {
  const supabase = await createServerSupabaseClient();

  let profile;
  try {
    profile = await getProfile();
  } catch {
    return 0;
  }

  const effectiveOrgId =
    profile.effective_org_id ?? profile.org_id;

  const { count, error } = await supabase
    .from("alerts")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "active")
    .eq("org_id", effectiveOrgId);

  if (error) {
    console.error("Failed to count active alerts", {
      message: error.message,
      code: error.code,
    });
    return 0;
  }

  return count ?? 0;
}
