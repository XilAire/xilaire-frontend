"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // ✅ REQUIRED
import { getProfile } from "@/lib/getProfile";
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog";
import { isWithinPlatformApplyWindow } from "@/lib/isWithinPlatformApplyWindow";
import { isBreakGlassActive } from "@/lib/isBreakGlassActive";

/**
 * Applies approved platform setting changes
 * HARD GUARDED by apply window OR break-glass override
 * Manual execution only
 */
export async function applyApprovedPlatformSettingChanges() {
  // 🔐 USER CONTEXT (auth + RLS-aware reads)
  const supabase = await createServerSupabaseClient();
  const profile = await getProfile();

  /* ---------------------------------------------------------
     🔒 ROLE GUARD
  --------------------------------------------------------- */
  if (!profile || profile.role !== "master_admin") {
    throw new Error("Unauthorized");
  }

  /* ---------------------------------------------------------
     🔒 APPLY WINDOW / BREAK-GLASS GUARD
  --------------------------------------------------------- */
  const withinWindow = await isWithinPlatformApplyWindow();
  const breakGlassActive = await isBreakGlassActive();

  if (!withinWindow && !breakGlassActive) {
    throw new Error(
      "Apply blocked: outside maintenance window and no break-glass override active"
    );
  }

  /* ---------------------------------------------------------
     📥 LOAD APPROVED, UNAPPLIED CHANGES (USER CONTEXT OK)
  --------------------------------------------------------- */
  const { data: changes, error } = await supabase
    .from("platform_setting_changes")
    .select("*")
    .eq("approved", true)
    .is("applied_at", null);

  if (error) {
    console.error("Failed to load approved changes", error);
    throw error;
  }

  if (!changes || changes.length === 0) {
    return;
  }

  /* ---------------------------------------------------------
     🔁 APPLY EACH CHANGE (ADMIN CONTEXT — BYPASSES RLS)
  --------------------------------------------------------- */
  for (const change of changes) {
    /* 🔧 APPLY SETTING */
    const { error: settingError } = await supabaseAdmin
      .from("platform_settings")
      .update({
        value: change.requested_value,
        updated_at: new Date().toISOString(),
        updated_by: profile.id,
      })
      .eq("key", change.setting_key);

    if (settingError) {
      console.error(
        `Failed to apply setting ${change.setting_key}`,
        settingError
      );
      continue;
    }

    /* ✅ MARK CHANGE AS APPLIED */
    const { error: appliedError } = await supabaseAdmin
      .from("platform_setting_changes")
      .update({
        applied_at: new Date().toISOString(),
      })
      .eq("id", change.id);

    if (appliedError) {
      console.error(
        `Failed to mark change applied for ${change.id}`,
        appliedError
      );
      continue;
    }

    /* 🧾 AUDIT LOG */
    await writePlatformAuditLog({
      action: `Platform setting applied: ${change.setting_key} → ${change.requested_value}`,
      actor: profile.email ?? "system",
    });
  }
}
