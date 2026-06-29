import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * 🔒 READ-ONLY SERVER SUPABASE CLIENT
 *
 * SAFE FOR:
 * - Server Components
 * - Page rendering
 * - RLS-protected SELECTs
 *
 * ❌ MUST NOT WRITE COOKIES
 */
export function createServerSupabaseClientReadOnly() {
  const cookieStore = cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase PLATFORM environment variables");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
    },
  });
}
