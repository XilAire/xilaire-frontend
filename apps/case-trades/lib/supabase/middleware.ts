import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  /* ---------------------------------------------------------
     1️⃣ PUBLIC ROUTES — NEVER REQUIRE AUTH
  --------------------------------------------------------- */
  if (
    pathname === "/" ||
    pathname.startsWith("/marketing") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return res;
  }

  /* ---------------------------------------------------------
     2️⃣ SUPABASE SERVER CLIENT (SSR SAFE)
  --------------------------------------------------------- */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_CASE_TRADES!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* ---------------------------------------------------------
     3️⃣ AUTH GUARD
  --------------------------------------------------------- */
  if (!user) {
    const redirectUrl = new URL("/auth/signin", req.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  /* ---------------------------------------------------------
     4️⃣ DEV-ONLY AUTH + ROLE CONTEXT LOGGING
     (Matches XilAire Platform behavior)
  --------------------------------------------------------- */
  if (process.env.NODE_ENV === "development") {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        role_id,
        roles:roles!profiles_role_id_fkey (
          name,
          rank
        )
        `
      )
      .eq("id", user.id)
      .single();

    if (!error && profile) {
      // 🔑 Supabase always types joins as arrays — normalize once
      const role = Array.isArray(profile.roles)
        ? profile.roles[0]
        : profile.roles;

      console.log("🔐 CASE TRADES AUTH CONTEXT", {
        path: pathname,
        user_id: user.id,
        email: profile.email,
        role_id: profile.role_id,
        role_name: role?.name,
        role_rank: role?.rank,
      });
    }
  }

  return res;
}

/* ---------------------------------------------------------
   5️⃣ MATCHER — CASE TRADES PROTECTED ROUTES
--------------------------------------------------------- */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/app/:path*",
    "/admin/:path*",
  ],
};
