// apps/xilaire-platform/lib/getActivePlatformApplyWindow.ts

import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function getActivePlatformApplyWindow() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("platform_apply_windows")
    .select("*")
    .eq("active", true)
    .order("starts_at", { ascending: false }) // ✅ FIXED
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load active apply window", error);
    return null;
  }

  return data;
}
