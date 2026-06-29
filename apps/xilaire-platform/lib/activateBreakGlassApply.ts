// apps/xilaire-platform/lib/activateBreakGlassApply.ts

"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog";

export async function activateBreakGlassApply(reason: string) {
  const supabase = await createServerSupabaseClient();
  const profile = await getProfile();

  if (profile.role !== "master_admin") {
    throw new Error("Unauthorized");
  }

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const { error } = await supabase
    .from("platform_apply_overrides")
    .insert({
      activated_by: profile.id,
      reason,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error("Failed to activate break-glass", error);
    throw error;
  }

  await writePlatformAuditLog({
    action: "Break-glass apply override activated",
    actor: profile.email ?? "system",
  });
}
