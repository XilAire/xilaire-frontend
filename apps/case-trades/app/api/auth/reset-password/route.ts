import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json(
      { error: "Email is required." },
      { status: 400 }
    );
  }

  // Create a mutable response
  const res = NextResponse.json({ ok: true });

  // Create Supabase SSR client (CASE Trades)
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

  // Ask Supabase to send password reset email
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { message: "Password reset email sent" },
    { status: 200 }
  );
}
