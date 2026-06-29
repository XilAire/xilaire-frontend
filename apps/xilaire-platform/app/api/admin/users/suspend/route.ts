import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerSupabaseClientReadOnly } from "@/lib/supabaseServerReadOnly";
import { logProfileAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const { userId } = await req.json();

  const supabase = createServerSupabaseClientReadOnly();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch target user BEFORE change
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("status, org_id")
    .eq("id", userId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Apply change
  await supabaseAdmin
    .from("profiles")
    .update({ status: "disabled" })
    .eq("id", userId);

  // 🔥 AUDIT LOG
  await logProfileAudit({
    actorId: actor.id,
    targetId: userId,
    orgId: target.org_id,
    action: "status_change",
    field: "status",
    oldValue: target.status,
    newValue: "disabled",
  });

  return NextResponse.json({ success: true });
}
