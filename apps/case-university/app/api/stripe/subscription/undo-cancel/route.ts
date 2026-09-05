import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { undoUniversityCancellation } from "@/lib/university/billing-management";
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

    const billingState = await undoUniversityCancellation({
      userId: user.id,
      mode: getUniversityStripeMode(),
    });

    return NextResponse.json({
      ok: true,
      billingState,
      message: "Cancellation was undone. Your current CASE University plan will renew normally.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to undo the CASE University cancellation.";
    console.error("[CASE University] Undo cancellation failed", error);
    return NextResponse.json({ error: "UNDO_CANCEL_FAILED", message }, { status: 400 });
  }
}
