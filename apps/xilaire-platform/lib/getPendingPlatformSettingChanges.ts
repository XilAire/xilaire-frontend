import { createServerSupabaseClient } from "@/lib/supabaseServer";

export type PlatformSettingChange = {
  id: string;
  setting_key: string;
  requested_value: boolean;
  reason: string | null;
  requested_by: string;
  requested_at: string;
  approved: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
  applied_at: string | null;
};

export async function getPendingPlatformSettingChanges(): Promise<
  PlatformSettingChange[]
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("platform_setting_changes")
    .select("*")
    .order("requested_at", { ascending: true });

  if (error) {
    console.error("Failed to load pending platform setting changes", error);
    return [];
  }

  return data ?? [];
}
