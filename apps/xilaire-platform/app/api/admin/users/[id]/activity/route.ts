import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createRouteSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const targetUserId = params.id;

  if (!targetUserId) {
    return NextResponse.json(
      { error: "Missing user id" },
      { status: 400 }
    );
  }

  /**
   * ✅ SAFE QUERY — NO JOINS
   * profile_audit_logs has NO FK to profiles
   */
  const { data, error } = await supabaseAdmin
    .from("profile_audit_logs")
    .select(`
      id,
      actor_id,
      target_id,
      action,
      field,
      old_value,
      new_value,
      created_at
    `)
    .eq("target_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[AdminActivity]", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
