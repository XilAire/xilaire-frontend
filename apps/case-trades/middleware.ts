import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

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

  if (!user) {
    const redirectUrl = new URL("/auth/signin", req.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

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
    .maybeSingle();

  if (error || !profile) {
    console.error("CASE Trades middleware profile lookup failed", {
      user_id: user.id,
      email: user.email,
      error,
    });

    const redirectUrl = new URL("/auth/signin", req.url);
    redirectUrl.searchParams.set("redirect", pathname);
    redirectUrl.searchParams.set("reason", "profile");
    return NextResponse.redirect(redirectUrl);
  }

  const role = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles;

  const isMasterAdmin =
    role?.name === "master_admin" ||
    role?.rank === 4 ||
    profile.email?.toLowerCase() === "csthilaire@xilairetechnologies.com";

  if (pathname.startsWith("/dashboard/master-admin")) {
    if (!isMasterAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (!isMasterAdmin) {
    const needsSignalsPrompt =
      pathname.startsWith("/dashboard/signals") ||
      pathname.startsWith("/dashboard/performance");

    const needsJournalPrompt = pathname.startsWith("/dashboard/journal");

    if (needsSignalsPrompt || needsJournalPrompt) {
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from("subscriptions")
        .select(
          `
          id,
          status,
          current_period_end,
          plan:plans (
            id,
            key,
            name,
            plan_entitlements (
              product_key,
              limits
            )
          )
        `
        )
        .eq("user_id", user.id);

      if (subscriptionsError) {
        console.error("Middleware subscription lookup failed", subscriptionsError);
      }

      const activeSubscriptions = subscriptions ?? [];

      const hasSignalsAccess = activeSubscriptions.some((sub: any) => {
        const isActive =
          sub.status === "active" ||
          sub.status === "trialing" ||
          sub.status === "past_due";

        const plan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan;
        const planText = `${plan?.key ?? ""} ${plan?.name ?? ""}`.toLowerCase();
        const planEntitlements = plan?.plan_entitlements ?? [];

        return (
          isActive &&
          (planText.includes("signal") ||
            planEntitlements.some(
              (entitlement: any) =>
                entitlement.product_key === "signals" &&
                entitlement.limits?.signals === true
            ))
        );
      });

      const hasJournalAccess = activeSubscriptions.some((sub: any) => {
        const isActive =
          sub.status === "active" ||
          sub.status === "trialing" ||
          sub.status === "past_due";

        const plan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan;
        const planText = `${plan?.key ?? ""} ${plan?.name ?? ""}`.toLowerCase();
        const planEntitlements = plan?.plan_entitlements ?? [];

        return (
          isActive &&
          (planText.includes("journal") ||
            planEntitlements.some(
              (entitlement: any) =>
                entitlement.product_key === "journal" &&
                entitlement.limits?.journal === true
            ))
        );
      });

      if (needsSignalsPrompt && !hasSignalsAccess) {
        const billingUrl = new URL("/dashboard/billing", req.url);
        billingUrl.searchParams.set("product", "signals");
        billingUrl.searchParams.set("reason", "subscribe");
        billingUrl.searchParams.set("redirect", pathname);

        return NextResponse.redirect(billingUrl);
      }

      if (needsJournalPrompt && !hasJournalAccess) {
        const billingUrl = new URL("/dashboard/billing", req.url);
        billingUrl.searchParams.set("product", "journal");
        billingUrl.searchParams.set("reason", "subscribe");
        billingUrl.searchParams.set("redirect", pathname);

        return NextResponse.redirect(billingUrl);
      }
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log("🔐 CASE TRADES AUTH CONTEXT", {
      path: pathname,
      user_id: user.id,
      email: profile.email,
      role_id: profile.role_id,
      role_name: role?.name,
      role_rank: role?.rank,
      master_admin: isMasterAdmin,
    });
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/app/:path*", "/admin/:path*"],
};