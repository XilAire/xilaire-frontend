"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog";
import { revalidatePath } from "next/cache";

export async function createPlatformApplyWindow(
  startsAt: string,
  endsAt: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  const profile = await getProfile();

  if (!profile || profile.role !== "master_admin") {
    return { ok: false, error: "Unauthorized" };
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { ok: false, error: "Invalid date format" };
  }

  if (end <= start) {
    return { ok: false, error: "End time must be after start time" };
  }

  /* ---------------------------------------------------------
     Enforce single active window
  --------------------------------------------------------- */
  const { data: existingActive } = await supabase
    .from("platform_apply_windows")
    .select("id")
    .eq("active", true)
    .maybeSingle();

  if (existingActive) {
    return {
      ok: false,
      error: "An active apply window already exists",
    };
  }

  /* ---------------------------------------------------------
     INSERT (SCHEMA-CORRECT)
  --------------------------------------------------------- */
  const { error } = await supabase
    .from("platform_apply_windows")
    .insert({
      starts_at: startsAt, // ✅ canonical
      ends_at: endsAt,     // ✅ canonical
      created_by: profile.id,
      active: true,
    });

  if (error) {
    console.error("Failed to create apply window", error);
    return { ok: false, error: "Failed to create apply window" };
  }

  /* ---------------------------------------------------------
     AUDIT + UI REVALIDATION
  --------------------------------------------------------- */
  await writePlatformAuditLog({
    action: "Platform apply window opened",
    actor: profile.email ?? "system",
  });

  // ✅ Force UI refresh
  revalidatePath("/admin/settings");

  return { ok: true };
}
