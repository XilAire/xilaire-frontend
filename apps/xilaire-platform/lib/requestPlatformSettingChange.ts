"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog";

export async function requestPlatformSettingChange({
  key,
  requestedValue,
  reason,
}: {
  key: string;
  requestedValue: boolean;
  reason?: string;
}) {
  const supabase = await createServerSupabaseClient();
  const profile = await getProfile();

  if (profile.role !== "master_admin") {
    throw new Error("Unauthorized platform setting change request");
  }

  const { error } = await supabase
    .from("platform_setting_changes")
    .insert({
      setting_key: key,
      requested_value: requestedValue,
      reason,
      requested_by: profile.id,
    });

  if (error) {
    console.error("Failed to request platform setting change", error);
    throw error;
  }

  // Audit is non-blocking and system-safe
  try {
    await writePlatformAuditLog({
      action: `Requested platform setting change: ${key} → ${requestedValue}`,
      actor: profile.email ?? "system",
    });
  } catch {
    // audit must never block
  }
}
