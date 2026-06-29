import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            res.cookies.set({ name, value, ...options });
          } catch (_) {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            res.cookies.set({ name, value: "", ...options });
          } catch (_) {}
        },
      },
    }
  );

  // Check auth session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // Allow all public pages
  const publicPaths = [
    "/",
    "/auth/signin",
    "/auth/signup",
    "/auth/reset",
    "/faq",
    "/courses",
    "/legal/terms",
    "/legal/privacy",
    "/legal/refund-policy",
    "/legal/online-training-disclosure",
    "/school",
  ];

  if (publicPaths.includes(pathname) || pathname.startsWith("/public")) {
    return res;
  }

  // Allow Next.js internal and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts")
  ) {
    return res;
  }

  // Allow API auth
  if (pathname.startsWith("/api/auth")) {
    return res;
  }

  // Protect all other routes
  if (!session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/signin";
    redirectUrl.search = `?redirect=${pathname}`;
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|favicon|icons|images|fonts).*)"],
};
