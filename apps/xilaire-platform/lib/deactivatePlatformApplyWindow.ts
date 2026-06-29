// apps/xilaire-platform/lib/deactivatePlatformApplyWindow.ts

"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog";

export async function deactivatePlatformApplyWindow(windowId: string) {
  const supabase = await createServerSupabaseClient();
  const profile = await getProfile();

  if (profile.role !== "master_admin") {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("platform_apply_windows")
    .update({ active: false })
    .eq("id", windowId);

  if (error) {
    console.error("Failed to deactivate apply window", error);
    throw error;
  }

  await writePlatformAuditLog({
    action: "Platform apply window closed",
    actor: profile.email ?? "system",
  });
}
