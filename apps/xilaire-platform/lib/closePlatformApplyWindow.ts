"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog";
import { revalidatePath } from "next/cache";

export async function closePlatformApplyWindow(
  windowId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  const profile = await getProfile();

  /* ---------------------------------------------------------
     AUTHORIZATION
  --------------------------------------------------------- */
  if (!profile || profile.role !== "master_admin") {
    return { ok: false, error: "Unauthorized" };
  }

  /* ---------------------------------------------------------
     CLOSE ACTIVE WINDOW ONLY (SCHEMA-SAFE)
  --------------------------------------------------------- */
  const { error } = await supabase
    .from("platform_apply_windows")
    .update({
      active: false,
    })
    .eq("id", windowId)
    .eq("active", true);

  if (error) {
    console.error("Failed to close apply window", error);
    return { ok: false, error: "Failed to close apply window" };
  }

  /* ---------------------------------------------------------
     AUDIT LOG
  --------------------------------------------------------- */
  await writePlatformAuditLog({
    action: "Platform apply window closed",
    actor: profile.email ?? "system",
    metadata: {
      window_id: windowId,
    },
  });

  // ✅ Force UI refresh
  revalidatePath("/admin/settings");

  return { ok: true };
}
