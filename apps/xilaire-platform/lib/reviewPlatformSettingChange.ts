// apps/xilaire-platform/lib/reviewPlatformSettingChange.ts

"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog";

export async function reviewPlatformSettingChange({
  id,
  approved,
}: {
  id: string;
  approved: boolean;
}) {
  const supabase = await createServerSupabaseClient();
  const profile = await getProfile();

  if (profile.role !== "master_admin") {
    throw new Error("Unauthorized");
  }

  /* 🔍 LOAD CHANGE */
  const { data: change, error } = await supabase
    .from("platform_setting_changes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !change) {
    throw new Error("Change not found");
  }

  /* 🔒 QUORUM ENFORCEMENT */
  if (change.requested_by === profile.id) {
    throw new Error(
      "Approval denied: requester cannot approve their own change"
    );
  }

  /* ✅ APPLY REVIEW */
  const { error: updateError } = await supabase
    .from("platform_setting_changes")
    .update({
      approved,
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("Failed to review platform setting change", updateError);
    throw updateError;
  }

  /* 📝 AUDIT */
  await writePlatformAuditLog({
    action: approved
      ? `Platform setting change approved: ${change.setting_key}`
      : `Platform setting change rejected: ${change.setting_key}`,
    actor: profile.email ?? "system",
  });
}
