import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const supabase = await createRouteSupabaseClient();

  /* -------------------------------------------------
     AUTH
  ------------------------------------------------- */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* -------------------------------------------------
     INPUT
  ------------------------------------------------- */
  const { userId, status } = await req.json();

  if (!userId || (status !== "active" && status !== "disabled")) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }

  /* -------------------------------------------------
     LOAD CURRENT STATE (FOR AUDIT)
  ------------------------------------------------- */
  const { data: currentProfile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!currentProfile) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  /* -------------------------------------------------
     UPDATE STATUS
  ------------------------------------------------- */
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      status,
      updated_by: user.id,
    })
    .eq("id", userId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  /* -------------------------------------------------
     AUDIT LOG
  ------------------------------------------------- */
  await supabaseAdmin.from("admin_audit_logs").insert({
    actor_id: user.id,
    target_user_id: userId,
    org_id: currentProfile.org_id,
    action: status === "active" ? "user_activated" : "user_suspended",
    old_value: { status: currentProfile.status },
    new_value: { status },
  });

  return NextResponse.json({ success: true });
}
