import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const redirect = NextResponse.redirect(new URL("/auth/update-password", origin));
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  if (!tokenHash) return NextResponse.redirect(new URL("/auth/forgot-password?error=invalid_link", origin));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
    { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => { cookies.forEach(({ name, value, options }) => redirect.cookies.set(name, value, options)); },
    } }
  );
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  if (error) {
    console.warn("[XilAire recovery] Invalid or expired recovery token", error.message);
    return NextResponse.redirect(new URL("/auth/forgot-password?error=expired_link", origin));
  }
  return redirect;
}
