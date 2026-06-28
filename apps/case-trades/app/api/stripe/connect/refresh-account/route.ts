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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { organization_id, test = false } = body;

    if (!organization_id) {
      return NextResponse.json(
        { error: "organization_id is required." },
        { status: 400 }
      );
    }

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select(
        `
        id,
        name,
        slug,
        stripe_connect_account_id
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

    if (!organization.stripe_connect_account_id) {
      return NextResponse.json(
        { error: "Organization does not have a Stripe Connect account." },
        { status: 400 }
      );
    }

    const stripe = getStripe(test);

    const account = await stripe.accounts.retrieve(
      organization.stripe_connect_account_id
    );

    const onboardingComplete =
      Boolean(account.details_submitted) &&
      Boolean(account.charges_enabled) &&
      Boolean(account.payouts_enabled);

    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        stripe_connect_onboarding_complete: onboardingComplete,
        stripe_connect_charges_enabled: Boolean(account.charges_enabled),
        stripe_connect_payouts_enabled: Boolean(account.payouts_enabled),
        updated_at: new Date().toISOString(),
      })
      .eq("id", organization.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      organization_id: organization.id,
      stripe_connect_account_id: organization.stripe_connect_account_id,
      stripe_connect_onboarding_complete: onboardingComplete,
      stripe_connect_charges_enabled: Boolean(account.charges_enabled),
      stripe_connect_payouts_enabled: Boolean(account.payouts_enabled),
      details_submitted: Boolean(account.details_submitted),
    });
  } catch (error: any) {
    console.error("❌ STRIPE CONNECT REFRESH ACCOUNT FAILED", error);

    return NextResponse.json(
      {
        error:
          error?.message ?? "Failed to refresh Stripe Connect account status.",
      },
      { status: 500 }
    );
  }
}