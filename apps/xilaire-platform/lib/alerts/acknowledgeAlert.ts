"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function acknowledgeAlert(alertId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("alerts")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: user.id,
    })
    .eq("id", alertId)
    .eq("status", "open");

  if (error) throw error;
}
