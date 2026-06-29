import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createRouteSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach((c) =>
            cookieStore.set(c.name, c.value, c.options)
          );
        },
      },
    }
  );
}
