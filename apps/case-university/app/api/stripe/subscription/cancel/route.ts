import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelUniversitySubscriptionAtPeriodEnd } from "@/lib/university/billing-management";
import { getUniversityStripeMode } from "@/lib/university/stripe-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Sign in to manage your CASE University membership." },
        { status: 401 },
      );
    }

    const billingState = await cancelUniversitySubscriptionAtPeriodEnd({
      userId: user.id,
      mode: getUniversityStripeMode(),
    });

    return NextResponse.json({
      ok: true,
      billingState,
      message: "Your membership will remain active through the current paid period, then move to Free.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel the CASE University membership.";
    console.error("[CASE University] Cancel at period end failed", error);
    return NextResponse.json({ error: "CANCEL_FAILED", message }, { status: 400 });
  }
}
