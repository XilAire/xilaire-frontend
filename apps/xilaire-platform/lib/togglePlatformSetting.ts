"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog";

export async function togglePlatformSetting(
  key: string,
  value: boolean
) {
  const supabase = await createServerSupabaseClient();
  const profile = await getProfile();

  if (profile.role !== "master_admin") {
    throw new Error("Unauthorized platform setting change attempt");
  }

  const { error } = await supabase
    .from("platform_settings")
    .update({
      value,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  if (error) {
    console.error("Platform setting update failed", error);
    throw error;
  }

  await writePlatformAuditLog({
    action: `Platform setting '${key}' set to ${value}`,
    actor: profile.email ?? "system",
  });
}
