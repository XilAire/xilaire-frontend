"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";

export async function acknowledgeAlerts(alertIds: string[]) {
  if (!Array.isArray(alertIds) || alertIds.length === 0) {
    return { success: false };
  }

  const profile = await getProfile();

  // 🔒 Admin-only
  if (!["admin", "super_admin", "master_admin"].includes(profile.role)) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("alerts")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
    })
    .in("id", alertIds)
    .eq("status", "open");

  if (error) {
    console.error("Bulk acknowledge failed:", error);
    throw new Error("Failed to acknowledge alerts");
  }

  return { success: true };
}
