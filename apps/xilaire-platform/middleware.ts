// middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

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
        setAll: (cookies) => {
          cookies.forEach((c) =>
            res.cookies.set(c.name, c.value, c.options)
          )
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
    return NextResponse.redirect(redirectUrl)
  }

  /* ---------------------------------------------------------
     3️⃣ ORG CONTEXT
  --------------------------------------------------------- */
  const org_id =
    (user.app_metadata as any)?.org_id ||
    (user.user_metadata as any)?.org_id

  if (!org_id) {
    return NextResponse.redirect(
      new URL("/unauthorized", req.url)
    )
  }

  /* ---------------------------------------------------------
     3.25️⃣ ORG METADATA (PLATFORM BYPASS)
  --------------------------------------------------------- */
  const supabaseAuthz = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
  )

  const { data: org } = await supabaseAuthz
    .from("orgs")
    .select("is_platform_org")
    .eq("id", org_id)
    .single()

  if (org?.is_platform_org === true) {
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
    return NextResponse.redirect(
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
    return NextResponse.redirect(
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