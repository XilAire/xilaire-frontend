// apps/xilaire-platform/lib/isWithinPlatformApplyWindow.ts

import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function isWithinPlatformApplyWindow(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("platform_apply_windows")
    .select("id")
    .eq("active", true)
    .lte("starts_at", now) // ✅ FIXED
    .gte("ends_at", now)   // ✅ FIXED
    .maybeSingle();

  if (error) {
    console.error("Apply window check failed", error);
    return false;
  }

  return Boolean(data);
}
