import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const allowedRoles = ["user", "admin", "super_admin", "master_admin"] as const;
type AllowedRole = (typeof allowedRoles)[number];

export async function POST(req: Request) {
  const supabase = await createRouteSupabaseClient();

  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = await req.json();

  if (!userId || !role) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!allowedRoles.includes(role as AllowedRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (actor.id === userId) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 403 }
    );
  }

  /* -------------------------------------------------
     FETCH CURRENT ROLE (for audit)
  ------------------------------------------------- */
  const { data: currentProfile, error: fetchError } =
    await supabaseAdmin
      .from("profiles")
      .select("role, org_id")
      .eq("id", userId)
      .single();

  if (fetchError || !currentProfile) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  /* -------------------------------------------------
     UPDATE ROLE
  ------------------------------------------------- */
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      role,
      updated_by: actor.id,
    })
    .eq("id", userId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 400 }
    );
  }

  /* -------------------------------------------------
     WRITE AUDIT LOG (THIS WAS MISSING)
  ------------------------------------------------- */
  await supabaseAdmin.from("profile_audit_logs").insert({
    org_id: currentProfile.org_id,
    actor_id: actor.id,
    target_id: userId,
    action: "role_change",
    field: "role",
    old_value: currentProfile.role,
    new_value: role,
  });

  return NextResponse.json({ success: true });
}
