"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function resolveAlert(alertId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("alerts")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", alertId)
    .neq("status", "resolved");

  if (error) throw error;
}
