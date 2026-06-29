import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client
 * - Bypasses RLS by design
 * - Server-only
 * - NEVER exposed to browser
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!,
  {
    auth: {
      persistSession: false,
    },
  }
);

/**
 * Fetch ALL platform apply windows
 * Enterprise-grade system read
 */
export async function getPlatformApplyWindows() {
  const { data, error } = await supabaseAdmin
    .from("platform_apply_windows")
    .select("*")
    .order("starts_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch platform apply windows", error);
    throw error;
  }

  return data ?? [];
}

/**
 * Fetch the currently active apply window (if any)
 */
export async function getActivePlatformApplyWindow() {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("platform_apply_windows")
    .select("*")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch active apply window", error);
    throw error;
  }

  return data ?? null;
}
