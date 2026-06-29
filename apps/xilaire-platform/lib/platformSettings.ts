// apps/xilaire-platform/lib/platformSettings.ts

import { createServerSupabaseClient } from "@/lib/supabaseServer";

/**
 * Platform-wide feature flags / settings
 * Source of truth: Supabase (platform_settings table)
 */

export type PlatformSetting = {
  key: string;
  value: boolean;
  description: string | null;
};

/**
 * Server-side read
 * RLS enforced
 * Master Admin only (via calling page guard)
 */
export async function getPlatformSettings(): Promise<PlatformSetting[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value, description")
    .order("key", { ascending: true });

  if (error) {
    console.error("Failed to load platform settings", error);
    return [];
  }

  return data ?? [];
}
