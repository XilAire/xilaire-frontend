import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getOrCreateUniversityStripeCustomer,
  getUniversityBillingState,
  getUniversityPlanForCheckout,
  isUniversityPlanKey,
} from "@/lib/university/billing-checkout";
import { getUniversityStripeClient } from "@/lib/university/stripe-server";
import { getUniversityStripeMode } from "@/lib/university/stripe-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAppUrl(): string {
  const value = process.env.NEXT_PUBLIC_CASE_UNIVERSITY_APP_URL?.trim();

  if (!value) {
    throw new Error(
      "[CASE University] NEXT_PUBLIC_CASE_UNIVERSITY_APP_URL is required.",
    );
  }

  return value.replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "AUTH_REQUIRED",
          message: "Sign in to continue to checkout.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { planKey?: unknown }
      | null;

    if (!body || !isUniversityPlanKey(body.planKey)) {
      return NextResponse.json(
        {
          error: "INVALID_PLAN",
          message: "Select a valid CASE University plan.",
        },
        { status: 400 },
      );
    }

    const mode = getUniversityStripeMode();
    const billingState = await getUniversityBillingState(user.id, mode);

    if (billingState.has_paid_subscription) {
      return NextResponse.json(
        {
          error: "SUBSCRIPTION_EXISTS",
          message:
            "This account already has a CASE University subscription. Use billing management to change the existing membership.",
        },
        { status: 409 },
      );
    }

    const plan = await getUniversityPlanForCheckout(body.planKey, mode);
    const customer = await getOrCreateUniversityStripeCustomer({
      userId: user.id,
      authEmail: user.email,
      mode,
    });

    const stripe = getUniversityStripeClient();
    const appUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "subscription",
      customer: customer.id,
      client_reference_id: user.id,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      payment_method_types: ["card"],
      return_url: `${appUrl}/pricing?checkout=return&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        case_university_user_id: user.id,
        app: "case_university",
        stripe_mode: mode,
        plan_key: plan.key,
      },
      subscription_data: {
        metadata: {
          case_university_user_id: user.id,
          app: "case_university",
          stripe_mode: mode,
          plan_key: plan.key,
        },
      },
    });

    if (!session.client_secret) {
      throw new Error("Stripe did not return an Embedded Checkout client secret.");
    }

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("[CASE University] Checkout session creation failed", error);

    return NextResponse.json(
      {
        error: "CHECKOUT_CREATE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unable to start CASE University checkout.",
      },
      { status: 500 },
    );
  }
}
