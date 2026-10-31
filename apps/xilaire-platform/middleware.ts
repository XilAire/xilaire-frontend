// middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

export async function middleware(req: NextRequest) {
  let res = NextResponse.next()

  // Preserve refreshed session cookies on authorization redirects.
  const redirectWithCookies = (url: URL) => {
    const redirected = NextResponse.redirect(url)

    for (const cookie of res.cookies.getAll()) {
      redirected.cookies.set(cookie)
    }

    return redirected
  }

  const { pathname } = req.nextUrl
  const normalizedPath = pathname.endsWith("/")
    ? pathname
    : `${pathname}/`

  /* ---------------------------------------------------------
     1️⃣ PUBLIC ROUTES — NEVER REQUIRE AUTH
  --------------------------------------------------------- */
  if (
    normalizedPath === "/" ||
    normalizedPath.startsWith("/marketing/") ||
    normalizedPath.startsWith("/services/") ||
    normalizedPath.startsWith("/pricing/") ||
    normalizedPath.startsWith("/about/") ||
    normalizedPath.startsWith("/contact/") ||
    normalizedPath.startsWith("/auth/") ||
    normalizedPath.startsWith("/_next/") ||
    normalizedPath === "/favicon.ico/"
  ) {
    return res
  }

  /* ---------------------------------------------------------
     2️⃣ AUTHENTICATION (SSR SAFE)
  --------------------------------------------------------- */
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Update the incoming request so downstream server
          // components see the refreshed Supabase session.
          for (const cookie of cookiesToSet) {
            req.cookies.set(cookie.name, cookie.value)
          }

          // Recreate the response with updated request headers.
          const existingCookies = res.cookies.getAll()
          res = NextResponse.next({
            request: { headers: req.headers },
          })

          for (const cookie of existingCookies) {
            res.cookies.set(cookie)
          }

          for (const cookie of cookiesToSet) {
            res.cookies.set(
              cookie.name,
              cookie.value,
              cookie.options
            )
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  if (!user) {
    const redirectUrl = new URL("/auth/signin", req.url)
    redirectUrl.searchParams.set("redirect", pathname)
    return redirectWithCookies(redirectUrl)
  }

  /* ---------------------------------------------------------
     3️⃣ ORG CONTEXT
  --------------------------------------------------------- */
  // Authorization context must come from the current profile,
  // not client-editable user_metadata or stale JWT org claims.
  const supabaseAuthz = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  const { data: actor, error: actorError } = await supabaseAuthz
    .from("profiles")
    .select("id, status, org_id")
    .eq("id", user.id)
    .maybeSingle()

  if (
    actorError ||
    !actor ||
    actor.id !== user.id ||
    actor.status !== "active" ||
    !actor.org_id
  ) {
    return redirectWithCookies(
      new URL("/unauthorized", req.url)
    )
  }

  const org_id = actor.org_id
  const { data: org } = await supabaseAuthz
    .from("orgs")
    .select("is_platform_org")
    .eq("id", org_id)
    .single()

  if (!org) {
    return redirectWithCookies(
      new URL("/unauthorized", req.url)
    )
  }

  if (org.is_platform_org === true) {
    return res
  }

  /* ---------------------------------------------------------
     3.5️⃣ BILLING ROUTES — AUTH OK, NO FEATURE CHECK
  --------------------------------------------------------- */
  if (normalizedPath.startsWith("/billing/")) {
    return res
  }

  /* ---------------------------------------------------------
     4️⃣ ROUTE → ENTITLEMENT MAP
  --------------------------------------------------------- */
  const routeEntitlements: Record<string, string> = {
    "/endpoints/": "endpoints",
    "/tickets/": "tickets",
    "/automations/": "automations",
    "/monitoring/": "monitoring",
  }

  const entitlementKey = Object.entries(routeEntitlements).find(
    ([route]) => normalizedPath.startsWith(route)
  )?.[1]

  if (!entitlementKey) {
    return res
  }

  /* ---------------------------------------------------------
     6️⃣ ACTIVE CONTRACT CHECK
  --------------------------------------------------------- */
  const { data: contract } = await supabaseAuthz
    .from("contracts")
    .select("id, current_period_end")
    .eq("org_id", org_id)
    .in("stripe_subscription_status", ["active", "trialing"])
    .single()

  if (
    !contract ||
    (contract.current_period_end &&
      new Date(contract.current_period_end) < new Date())
  ) {
    return redirectWithCookies(
      new URL("/billing/upgrade", req.url)
    )
  }

  /* ---------------------------------------------------------
     7️⃣ FEATURE ENTITLEMENT CHECK
  --------------------------------------------------------- */
  const { data: entitlement } = await supabaseAuthz
    .from("contract_entitlements")
    .select("id")
    .eq("contract_id", contract.id)
    .eq("entitlement_key", entitlementKey)
    .single()

  if (!entitlement) {
    return redirectWithCookies(
      new URL("/billing/upgrade", req.url)
    )
  }

  return res
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/endpoints/:path*",
    "/tickets/:path*",
    "/automations/:path*",
    "/monitoring/:path*",
    "/app/:path*",
    "/admin/:path*",
  ],
}