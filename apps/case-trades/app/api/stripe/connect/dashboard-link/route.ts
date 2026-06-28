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

    const {
      organization_id,
      test = false,
    }: {
      organization_id?: string;
      test?: boolean;
    } = body;

    if (!organization_id) {
      return NextResponse.json(
        {
          error: "organization_id is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: organization, error } = await supabase
      .from("organizations")
      .select(
        `
        id,
        name,
        stripe_connect_account_id,
        stripe_connect_onboarding_complete,
        stripe_connect_charges_enabled,
        stripe_connect_payouts_enabled
        `
      )
      .eq("id", organization_id)
      .single();

    if (error || !organization) {
      return NextResponse.json(
        {
          error: "Organization not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!organization.stripe_connect_account_id) {
      return NextResponse.json(
        {
          error: "Organization has not connected Stripe.",
        },
        {
          status: 400,
        }
      );
    }

    const stripe = getStripe(test);

    const loginLink = await stripe.accounts.createLoginLink(
      organization.stripe_connect_account_id
    );

    return NextResponse.json({
      success: true,
      organization_id: organization.id,
      organization_name: organization.name,
      dashboard_url: loginLink.url,
      onboarding_complete:
        organization.stripe_connect_onboarding_complete,
      charges_enabled:
        organization.stripe_connect_charges_enabled,
      payouts_enabled:
        organization.stripe_connect_payouts_enabled,
    });
  } catch (error: any) {
    console.error(
      "❌ STRIPE CONNECT DASHBOARD LINK FAILED",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ??
          "Failed to create Stripe Express dashboard link.",
      },
      {
        status: 500,
      }
    );
  }
}