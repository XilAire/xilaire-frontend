import {
  createServerClient,
} from "@supabase/ssr";

import {
  cookies,
} from "next/headers";

export async function createClient() {
  const cookieStore =
    await cookies();

  return createServerClient(
    process.env
      .NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET!,
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_CASE_BUDGET!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(
          cookiesToSet,
        ) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options,
                );
              },
            );
          } catch {
            /*
             * Server Components cannot always write
             * response cookies directly.
             *
             * The root proxy refreshes the Supabase
             * session and writes updated cookies to
             * the outgoing response when necessary.
             */
          }
        },
      },
    },
  );
}