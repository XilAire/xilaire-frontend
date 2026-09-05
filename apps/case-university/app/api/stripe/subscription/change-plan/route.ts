import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isUniversityPlanKey,
} from "@/lib/university/billing-checkout";
import {
  changeUniversityPlanImmediately,
} from "@/lib/university/billing-management";
import { getUniversityStripeMode } from "@/lib/university/stripe-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
          message: "Sign in to manage your CASE University membership.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { targetPlanKey?: unknown }
      | null;

    if (!body || !isUniversityPlanKey(body.targetPlanKey)) {
      return NextResponse.json(
        {
          error: "INVALID_PLAN",
          message: "Select a valid CASE University target plan.",
        },
        { status: 400 },
      );
    }

    const mode = getUniversityStripeMode();

    const result = await changeUniversityPlanImmediately({
      userId: user.id,
      targetPlanKey: body.targetPlanKey,
      mode,
    });

    return NextResponse.json({
      ok: true,
      subscriptionId: result.subscriptionId,
      targetPlanKey: result.targetPlanKey,
      stripeStatus: result.stripeStatus,
      pendingUpdate: result.pendingUpdate,
      billingState: result.billingState,
      message: result.pendingUpdate
        ? "Stripe is waiting for the prorated upgrade payment to complete."
        : "Your upgrade was submitted successfully. CASE University is synchronizing the new membership.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to change the CASE University subscription.";

    console.error(
      "[CASE University] Immediate subscription plan change failed",
      error,
    );

    return NextResponse.json(
      {
        error: "PLAN_CHANGE_FAILED",
        message,
      },
      { status: 400 },
    );
  }
}
