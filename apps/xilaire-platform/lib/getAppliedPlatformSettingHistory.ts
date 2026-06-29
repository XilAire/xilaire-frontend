// apps/xilaire-platform/lib/getAppliedPlatformSettingHistory.ts

import { createServerSupabaseClient } from "@/lib/supabaseServer";

export type AppliedPlatformSettingChange = {
  id: string;
  setting_key: string;
  requested_value: boolean;
  approved_at: string | null;
  applied_at: string | null;
  approved_by: string | null;
};

export async function getAppliedPlatformSettingHistory(): Promise<
  AppliedPlatformSettingChange[]
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("platform_setting_changes")
    .select(
      "id, setting_key, requested_value, approved_at, applied_at, approved_by"
    )
    .not("applied_at", "is", null)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Failed to load applied setting history", error);
    return [];
  }

  return data ?? [];
}
