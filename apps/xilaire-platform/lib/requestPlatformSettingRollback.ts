// apps/xilaire-platform/lib/requestPlatformSettingRollback.ts

"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog";

export async function requestPlatformSettingRollback({
  key,
  rollbackValue,
  reason,
}: {
  key: string;
  rollbackValue: boolean;
  reason: string;
}) {
  const supabase = await createServerSupabaseClient();
  const profile = await getProfile();

  if (profile.role !== "master_admin") {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("platform_setting_changes")
    .insert({
      setting_key: key,
      requested_value: rollbackValue,
      reason,
      requested_by: profile.id,
      requested_at: new Date().toISOString(),
    });

  if (error) {
    throw error;
  }

  await writePlatformAuditLog({
    action: `Rollback requested for platform setting: ${key}`,
    actor: profile.email ?? "system",
  });
}
