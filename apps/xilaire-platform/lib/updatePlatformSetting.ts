// apps/xilaire-platform/lib/updatePlatformSetting.ts

import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function updatePlatformSetting(
  key: string,
  value: boolean,
  actorId: string
) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("platform_settings")
    .update({
      value,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  if (error) {
    console.error("Failed to update platform setting", error);
    throw error;
  }
}
