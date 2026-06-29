// apps/xilaire-platform/lib/getPlatformSettings.ts

import { createServerSupabaseClient } from "@/lib/supabaseServer";

export type PlatformSetting = {
  key: string;
  value: boolean;
  description: string | null;
};

export async function getPlatformSettings(): Promise<PlatformSetting[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value, description")
    .order("key");

  if (error) {
    console.error("Failed to load platform settings", error);
    return [];
  }

  return data ?? [];
}
