import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * ⚠️ WRITE-CAPABLE SUPABASE CLIENT
 *
 * 🚨 ROUTE HANDLERS ONLY
 * 🚨 DO NOT IMPORT IN SERVER COMPONENTS
 */
export function createRouteSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach((c) => {
            cookieStore.set(c.name, c.value, c.options);
          });
        },
      },
    }
  );
}

/**
 * 🔒 READ-ONLY SUPABASE CLIENT
 *
 * ✅ SERVER COMPONENTS
 * ✅ LAYOUTS
 * ✅ DATA LOADERS
 * ❌ NO MUTATIONS
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // 🚫 DO NOT SET COOKIES IN SERVER COMPONENTS
        setAll: () => {},
      },
    }
  );
}
