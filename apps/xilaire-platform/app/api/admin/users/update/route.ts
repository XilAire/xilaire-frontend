import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = createRouteSupabaseClient();

  /* ---------------------------------------------------------
     1️⃣ AUTH — SERVER CONTEXT ONLY
  --------------------------------------------------------- */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ---------------------------------------------------------
     2️⃣ INPUT
  --------------------------------------------------------- */
  const body = await req.json();
  const { id: targetUserId, data } = body;

  if (!targetUserId || !data || typeof data !== "object") {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  }

  /* ---------------------------------------------------------
     3️⃣ LOAD CURRENT USER STATE (FOR AUDIT DIFF)
  --------------------------------------------------------- */
  const { data: currentProfile, error: fetchError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", targetUserId)
    .single();

  if (fetchError || !currentProfile) {
    console.error("❌ Profile fetch failed", fetchError);
    return NextResponse.json(
      { error: "Target user not found" },
      { status: 404 }
    );
  }

  const orgId = currentProfile.org_id;

  if (!orgId) {
    console.error("❌ Missing org_id on profile", currentProfile);
    return NextResponse.json(
      { error: "Target user has no org_id" },
      { status: 500 }
    );
  }

  /* ---------------------------------------------------------
     4️⃣ UPDATE USER PROFILE
  --------------------------------------------------------- */
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      ...data,
      updated_by: user.id, // 🔑 REQUIRED BY TRIGGER
    })
    .eq("id", targetUserId);

  if (updateError) {
    console.error("❌ Update user error:", updateError);
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  /* ---------------------------------------------------------
     5️⃣ BUILD DIFF-ONLY AUDIT SNAPSHOT
  --------------------------------------------------------- */
  const oldValue = Object.fromEntries(
    Object.keys(data).map((key) => [key, currentProfile[key]])
  );

  const newValue = data;

  /* ---------------------------------------------------------
     6️⃣ WRITE ADMIN AUDIT LOG (CLEAN SIGNAL)
  --------------------------------------------------------- */
  const { error: auditError } = await supabaseAdmin
    .from("admin_audit_logs")
    .insert({
      actor_id: user.id,
      target_user_id: targetUserId,
      org_id: orgId,
      action: "user_updated",
      old_value: oldValue,
      new_value: newValue,
    });

  if (auditError) {
    console.error("❌ Admin audit log error:", auditError);
    return NextResponse.json(
      { error: "Audit logging failed" },
      { status: 500 }
    );
  }

  /* ---------------------------------------------------------
     7️⃣ DONE
  --------------------------------------------------------- */
  return NextResponse.json({ success: true });
}
