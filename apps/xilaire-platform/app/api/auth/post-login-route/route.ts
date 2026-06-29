import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!;

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM");
}

const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeLower(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function resolveBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "").trim() || null;
}

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  account_type: "individual" | "business" | "vendor" | "internal" | null;
  org_id: string | null;
  status: string | null;
};

type VendorRow = {
  id: string;
  org_id: string | null;
  email: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
  onboarding_status?: string | null;
  onboarding_completed_at?: string | null;
  license_number: string | null;
  license_type: string | null;
  insurance_expiration: string | null;
};

function isActiveProfile(profile: ProfileRow | null) {
  if (!profile) return false;
  return normalizeLower(profile.status) === "active";
}

function isVendorProfile(profile: ProfileRow | null) {
  if (!profile) return false;
  return normalizeLower(profile.account_type) === "vendor";
}

function isVendorRecordActive(vendor: VendorRow | null) {
  if (!vendor) return false;
  if (vendor.is_active === true) return true;
  if (vendor.active === true) return true;
  return false;
}

function isVendorOnboardingComplete(vendor: VendorRow | null) {
  if (!vendor) return false;

  const onboardingStatus = normalizeLower(vendor.onboarding_status);

  if (onboardingStatus === "complete") {
    return true;
  }

  if (normalizeString(vendor.onboarding_completed_at)) {
    return true;
  }

  return Boolean(
    normalizeString(vendor.license_number) &&
      normalizeString(vendor.license_type) &&
      normalizeString(vendor.insurance_expiration)
  );
}

export async function GET(req: Request) {
  try {
    const token = resolveBearerToken(req);

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing bearer token.",
        },
        { status: 401 }
      );
    }

    const { data: authUserData, error: authUserError } =
      await authClient.auth.getUser(token);

    if (authUserError || !authUserData?.user?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: authUserError?.message || "Unable to resolve signed-in user.",
        },
        { status: 401 }
      );
    }

    const authUser = authUserData.user;
    const userId = authUser.id;
    const authEmail = normalizeLower(authUser.email);

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, email, role, account_type, org_id, status")
      .eq("id", userId)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      return NextResponse.json(
        {
          ok: false,
          error: profileError.message,
        },
        { status: 500 }
      );
    }

    if (!profile?.id) {
      return NextResponse.json(
        {
          ok: true,
          route: "/dashboard",
          reason: "profile_missing",
        },
        { status: 200 }
      );
    }

    if (!isActiveProfile(profile)) {
      return NextResponse.json(
        {
          ok: true,
          route: "/unauthorized",
          reason: "profile_inactive",
        },
        { status: 200 }
      );
    }

    if (!isVendorProfile(profile)) {
      return NextResponse.json(
        {
          ok: true,
          route: "/dashboard",
          reason: "non_vendor",
        },
        { status: 200 }
      );
    }

    const lookupEmail = normalizeLower(profile.email) || authEmail;

    if (!lookupEmail) {
      return NextResponse.json(
        {
          ok: true,
          route: "/vendor/onboarding",
          reason: "vendor_email_missing",
        },
        { status: 200 }
      );
    }

    if (!profile.org_id) {
      return NextResponse.json(
        {
          ok: true,
          route: "/vendor/onboarding",
          reason: "vendor_org_missing",
        },
        { status: 200 }
      );
    }

    const { data: vendorRows, error: vendorError } = await adminClient
      .from("infrastructure_vendors")
      .select(
        `
          id,
          org_id,
          email,
          active,
          is_active,
          onboarding_status,
          onboarding_completed_at,
          license_number,
          license_type,
          insurance_expiration
        `
      )
      .eq("org_id", profile.org_id)
      .ilike("email", lookupEmail)
      .limit(2);

    if (vendorError) {
      return NextResponse.json(
        {
          ok: false,
          error: vendorError.message,
        },
        { status: 500 }
      );
    }

    if ((vendorRows?.length ?? 0) > 1) {
      return NextResponse.json(
        {
          ok: true,
          route: "/unauthorized",
          reason: "vendor_duplicate_match",
        },
        { status: 200 }
      );
    }

    const vendor = (vendorRows?.[0] || null) as VendorRow | null;

    if (!vendor?.id) {
      return NextResponse.json(
        {
          ok: true,
          route: "/vendor/onboarding",
          reason: "vendor_missing",
        },
        { status: 200 }
      );
    }

    if (!isVendorRecordActive(vendor)) {
      return NextResponse.json(
        {
          ok: true,
          route: "/unauthorized",
          reason: "vendor_inactive",
          vendor: {
            id: vendor.id,
            org_id: vendor.org_id,
            email: vendor.email,
          },
        },
        { status: 200 }
      );
    }

    if (!isVendorOnboardingComplete(vendor)) {
      return NextResponse.json(
        {
          ok: true,
          route: "/vendor/onboarding",
          reason: "vendor_incomplete",
          vendor: {
            id: vendor.id,
            org_id: vendor.org_id,
            email: vendor.email,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        route: "/vendor/dashboard",
        reason: "vendor_complete",
        vendor: {
          id: vendor.id,
          org_id: vendor.org_id,
          email: vendor.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown post-login routing error.",
      },
      { status: 500 }
    );
  }
}