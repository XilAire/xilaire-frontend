import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const failed = NextResponse.redirect(new URL("/auth/signin?error=invalid_invitation", origin));
  failed.headers.set("Cache-Control", "no-store");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  if (!tokenHash) return failed;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM;
  if (!url || !anon) return failed;

  // Verification creates an authenticated session. This route deliberately
  // does NOT grant organization membership or privileged roles.
  const success = NextResponse.redirect(new URL("/auth/update-password", origin));
  success.headers.set("Cache-Control", "no-store");
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          success.cookies.set(name, value, options);
        }
      },
    },
  });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
  if (error) {
    console.warn("ADMIN_INVITE_CONFIRM_FAILED");
    return failed;
  }
  return success;
}
