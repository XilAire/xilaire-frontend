import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

/* -------------------------------------------------
   POST /api/signals/trigger
------------------------------------------------- */
export async function POST(req: Request) {
  try {
    /* -------------------------------------------------
       PARSE BODY
    ------------------------------------------------- */
    const body = await req.json();

    const { signal_id, next_status } = body ?? {};

    if (!signal_id || !next_status) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    /* -------------------------------------------------
       AUTHORIZATION — MASTER ADMIN ONLY
    ------------------------------------------------- */
    const role = await resolveCurrentUserRole();

    if (!role || role.role_rank !== 4) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    /* -------------------------------------------------
       LOAD SIGNAL
    ------------------------------------------------- */
    const { data: signal, error: loadError } = await supabase
      .from("signals")
      .select("id, status")
      .eq("id", signal_id)
      .single();

    if (loadError || !signal) {
      return NextResponse.json(
        { error: "Signal not found" },
        { status: 404 }
      );
    }

    /* -------------------------------------------------
       UPDATE STATUS (AUDITED)
    ------------------------------------------------- */
    const { error: updateError } = await supabase
      .from("signals")
      .update({
        status: next_status,
        updated_by: role.user_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", signal_id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update signal" },
        { status: 500 }
      );
    }

    /* -------------------------------------------------
       SUCCESS
    ------------------------------------------------- */
    return NextResponse.json({
      success: true,
      signal_id,
      previous_status: signal.status,
      next_status,
    });
  } catch (err) {
    console.error("Trigger signal failed:", err);
    return NextResponse.json(
      { error: "Failed to trigger signal" },
      { status: 500 }
    );
  }
}
