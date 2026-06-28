import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripe(testMode = false) {
  const secretKey = testMode
    ? process.env.STRIPE_SECRET_KEY_TEST
    : process.env.STRIPE_SECRET_KEY_CASE_TRADES;

  if (!secretKey) {
    throw new Error(
      testMode
        ? "Missing STRIPE_SECRET_KEY_TEST."
        : "Missing STRIPE_SECRET_KEY_CASE_TRADES."
    );
  }

  return new Stripe(secretKey);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function readRequestBody(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return await req.json();
  }

  const formData = await req.formData();

  return {
    organization_id: formData.get("organization_id"),
    email: formData.get("email"),
    country: formData.get("country") ?? "US",
    business_type: formData.get("business_type") ?? "company",
    test: formData.get("test") === "true",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await readRequestBody(req);

    const organization_id =
      typeof body.organization_id === "string" ? body.organization_id : null;

    const email = typeof body.email === "string" ? body.email : undefined;

    const country =
      typeof body.country === "string" && body.country
        ? body.country
        : "US";

    const business_type =
      typeof body.business_type === "string" && body.business_type
        ? body.business_type
        : "company";

    const test = body.test === true || body.test === "true";

    if (!organization_id) {
      return NextResponse.json(
        { error: "organization_id is required." },
        { status: 400 }
      );
    }

    const stripe = getStripe(test);

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select(
        `
        id,
        name,
        slug,
        stripe_connect_account_id,
        stripe_connect_onboarding_complete,
        stripe_connect_charges_enabled,
        stripe_connect_payouts_enabled
        `
      )
      .eq("id", organization_id)
      .single();

    if (organizationError || !organization) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 404 }
      );
    }

    let accountId = organization.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country,
        email,
        business_type: business_type as Stripe.AccountCreateParams.BusinessType,
        capabilities: {
          card_payments: {
            requested: true,
          },
          transfers: {
            requested: true,
          },
        },
        metadata: {
          organization_id: organization.id,
          organization_name: organization.name,
          organization_slug: organization.slug,
        },
      });

      accountId = account.id;

      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          stripe_connect_account_id: account.id,
          stripe_connect_onboarding_complete: false,
          stripe_connect_charges_enabled: false,
          stripe_connect_payouts_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organization.id);

      if (updateError) {
        throw updateError;
      }
    }

    const origin = req.nextUrl.origin;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/dashboard/organizations/billing?org=${encodeURIComponent(
        organization.slug
      )}&refresh_connect=true`,
      return_url: `${origin}/dashboard/organizations/billing?org=${encodeURIComponent(
        organization.slug
      )}&connect=success`,
    });

    return NextResponse.redirect(accountLink.url);
  } catch (error: any) {
    console.error("❌ STRIPE CONNECT CREATE ACCOUNT FAILED", error);

    return NextResponse.json(
      {
        error: error?.message ?? "Failed to create Stripe Connect account.",
      },
      { status: 500 }
    );
  }
}