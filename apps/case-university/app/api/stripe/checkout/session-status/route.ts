import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUniversityBillingState } from "@/lib/university/billing-checkout";
import { getUniversityStripeClient } from "@/lib/university/stripe-server";
import { getUniversityStripeMode } from "@/lib/university/stripe-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id")?.trim();

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json(
        { error: "INVALID_SESSION" },
        { status: 400 },
      );
    }

    const stripe = getUniversityStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const sessionUserId =
      session.client_reference_id ??
      session.metadata?.case_university_user_id ??
      null;

    if (sessionUserId !== user.id) {
      return NextResponse.json(
        { error: "SESSION_NOT_OWNED" },
        { status: 403 },
      );
    }

    const mode = getUniversityStripeMode();
    const billingState = await getUniversityBillingState(user.id, mode);

    return NextResponse.json({
      checkoutStatus: session.status,
      paymentStatus: session.payment_status,
      billingState,
    });
  } catch (error) {
    console.error("[CASE University] Checkout status lookup failed", error);

    return NextResponse.json(
      {
        error: "STATUS_LOOKUP_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unable to verify checkout status.",
      },
      { status: 500 },
    );
  }
}
