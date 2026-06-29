// apps/xilaire-platform/lib/isBreakGlassActive.ts

import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function isBreakGlassActive(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("platform_apply_overrides")
    .select("id")
    .gt("expires_at", new Date().toISOString())
    .limit(1);

  if (error) {
    console.error("Failed to check break-glass status", error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}
