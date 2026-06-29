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

type OnboardingBody = {
  email?: string;
  license_number?: string | null;
  license_type?: string | null;
  insurance_expiration?: string | null;
  notes?: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  org_id: string | null;
  account_type: string | null;
};

type VendorRow = {
  id: string;
  org_id: string | null;
  email: string | null;
  onboarding_status?: string | null;
  onboarding_completed_at?: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (isoDatePattern.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function resolveBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "").trim() || null;
}

export async function POST(req: Request) {
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

    const body = (await req.json()) as OnboardingBody;

    const {
      data: authUserData,
      error: authUserError,
    } = await authClient.auth.getUser(token);

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
    const authUserId = authUser.id;
    const authEmail = normalizeEmail(authUser.email);

    const requestedEmail = normalizeEmail(body.email);
    const licenseNumber = normalizeString(body.license_number);
    const licenseType = normalizeString(body.license_type);
    const insuranceExpiration = normalizeDate(body.insurance_expiration);
    const notes = normalizeString(body.notes);

    if (!licenseNumber) {
      return NextResponse.json(
        {
          ok: false,
          error: "License number is required.",
        },
        { status: 400 }
      );
    }

    if (!licenseType) {
      return NextResponse.json(
        {
          ok: false,
          error: "License type is required.",
        },
        { status: 400 }
      );
    }

    if (!insuranceExpiration) {
      return NextResponse.json(
        {
          ok: false,
          error: "Insurance expiration is required and must be YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, email, org_id, account_type")
      .eq("id", authUserId)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      console.error("VENDOR_ONBOARDING_PROFILE_LOOKUP_ERROR:", profileError);

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
          ok: false,
          error: "No profile was found for the signed-in user.",
        },
        { status: 404 }
      );
    }

    if (profile.account_type !== "vendor") {
      return NextResponse.json(
        {
          ok: false,
          error: "Only vendor accounts can complete vendor onboarding.",
        },
        { status: 403 }
      );
    }

    if (!profile.org_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Vendor profile is missing org context.",
        },
        { status: 400 }
      );
    }

    const resolvedEmail =
      requestedEmail || normalizeEmail(profile.email) || authEmail;

    if (!resolvedEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "Vendor email could not be resolved.",
        },
        { status: 400 }
      );
    }

    const { data: vendor, error: vendorLookupError } = await adminClient
      .from("infrastructure_vendors")
      .select("id, org_id, email, onboarding_status, onboarding_completed_at")
      .eq("org_id", profile.org_id)
      .eq("email", resolvedEmail)
      .maybeSingle<VendorRow>();

    if (vendorLookupError) {
      console.error("VENDOR_ONBOARDING_VENDOR_LOOKUP_ERROR:", vendorLookupError);

      return NextResponse.json(
        {
          ok: false,
          error: vendorLookupError.message,
        },
        { status: 500 }
      );
    }

    if (!vendor?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "No vendor record was found for this account.",
          debug: {
            org_id: profile.org_id,
            email: resolvedEmail,
          },
        },
        { status: 404 }
      );
    }

    const completedAt = new Date().toISOString();

    const updatePayload = {
      license_number: licenseNumber,
      license_type: licenseType,
      insurance_expiration: insuranceExpiration,
      notes,
      onboarding_status: "complete",
      onboarding_completed_at: completedAt,
    };

    const { error: updateError } = await adminClient
      .from("infrastructure_vendors")
      .update(updatePayload)
      .eq("id", vendor.id);

    if (updateError) {
      console.error("VENDOR_ONBOARDING_UPDATE_ERROR:", updateError);

      return NextResponse.json(
        {
          ok: false,
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Vendor onboarding saved successfully.",
        vendor: {
          id: vendor.id,
          org_id: vendor.org_id,
          email: vendor.email,
          onboarding_status: "complete",
          onboarding_completed_at: completedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("VENDOR_ONBOARDING_ROUTE_FATAL_ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown vendor onboarding error.",
      },
      { status: 500 }
    );
  }
}