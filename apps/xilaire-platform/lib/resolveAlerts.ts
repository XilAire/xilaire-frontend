"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";

export async function resolveAlerts(alertIds: string[]) {
  if (!Array.isArray(alertIds) || alertIds.length === 0) {
    return { success: false };
  }

  const profile = await getProfile();

  // 🔒 Admin or higher only
  if (!["admin", "super_admin", "master_admin"].includes(profile.role)) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("alerts")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .in("id", alertIds)
    .eq("status", "acknowledged"); // 🔒 enforce lifecycle

  if (error) {
    console.error("Bulk resolve failed:", error);
    throw new Error("Failed to resolve alerts");
  }

  return { success: true };
}
