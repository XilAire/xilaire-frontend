import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function POST(req: Request) {
  // Create ONE modifiable response object
  const res = NextResponse.json({ message: "Signed out" });

  // Initialize Supabase server client (CASE Trades)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_CASE_TRADES!,
    {
      cookies: {
        get(name: string) {
          return req.headers.get("cookie") ?? "";
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set(name, value, options);
        },
        remove(name: string) {
          res.cookies.delete(name);
        },
      },
    }
  );

  // Perform logout
  await supabase.auth.signOut();

  // MUST return the same response object Supabase modified
  return res;
}
