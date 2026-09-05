import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUniversityPlanKey } from "@/lib/university/billing-checkout";
import { scheduleUniversityPlanChange } from "@/lib/university/billing-management";
import { getUniversityStripeMode } from "@/lib/university/stripe-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Sign in to manage your CASE University membership." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { targetPlanKey?: unknown }
      | null;

    if (!body || !isUniversityPlanKey(body.targetPlanKey)) {
      return NextResponse.json(
        { error: "INVALID_PLAN", message: "Select a valid CASE University target plan." },
        { status: 400 },
      );
    }

    const billingState = await scheduleUniversityPlanChange({
      userId: user.id,
      targetPlanKey: body.targetPlanKey,
      mode: getUniversityStripeMode(),
    });

    return NextResponse.json({
      ok: true,
      billingState,
      message: "Your plan change is scheduled for the end of the current billing period.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to schedule the CASE University plan change.";
    console.error("[CASE University] Scheduled plan change failed", error);
    return NextResponse.json({ error: "SCHEDULE_CHANGE_FAILED", message }, { status: 400 });
  }
}
