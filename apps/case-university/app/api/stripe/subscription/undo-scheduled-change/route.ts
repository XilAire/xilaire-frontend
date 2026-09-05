import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { undoUniversityScheduledPlanChange } from "@/lib/university/billing-management";
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

    const billingState = await undoUniversityScheduledPlanChange({
      userId: user.id,
      mode: getUniversityStripeMode(),
    });

    return NextResponse.json({
      ok: true,
      billingState,
      message: "The scheduled plan change was removed. Your current plan will renew normally.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to undo the scheduled plan change.";
    console.error("[CASE University] Undo scheduled plan change failed", error);
    return NextResponse.json({ error: "UNDO_SCHEDULE_FAILED", message }, { status: 400 });
  }
}
