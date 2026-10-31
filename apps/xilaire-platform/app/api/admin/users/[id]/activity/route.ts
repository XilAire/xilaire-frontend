import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const roleRanks: Record<string, number> = {
  user: 0,
  admin: 1,
  super_admin: 2,
  master_admin: 3,
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const headers = {
  "Cache-Control": "no-store",
};

function failure(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers }
  );
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteSupabaseClient();

    const {
      data: { user: actor },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !actor) {
      return failure("Unauthorized", 401);
    }

    const { data: actorProfile, error: actorError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, org_id, role, status")
        .eq("id", actor.id)
        .maybeSingle();

    if (actorError) {
      console.error("ADMIN_HISTORY_ACTOR_LOOKUP_FAILED");
      return failure("Unable to verify access", 500);
    }

    if (
      !actorProfile ||
      actorProfile.status !== "active" ||
      !actorProfile.org_id
    ) {
      return failure("Forbidden", 403);
    }

    const actorRole = String(actorProfile.role || "")
      .trim()
      .toLowerCase();

    const actorRank = roleRanks[actorRole];

    if (actorRank === undefined || actorRank < 1) {
      return failure("Forbidden", 403);
    }

    const targetUserId = params.id;

    if (
      typeof targetUserId !== "string" ||
      !uuidPattern.test(targetUserId)
    ) {
      return failure("Invalid user ID", 400);
    }

    const { data: target, error: targetError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, org_id, role")
        .eq("id", targetUserId)
        .maybeSingle();

    if (targetError) {
      console.error("ADMIN_HISTORY_TARGET_LOOKUP_FAILED");
      return failure("Unable to verify target", 500);
    }

    if (!target) {
      return failure("User not found", 404);
    }

    if (target.org_id !== actorProfile.org_id) {
      return failure("Forbidden", 403);
    }

    const targetRole = String(target.role || "")
      .trim()
      .toLowerCase();

    const targetRank = roleRanks[targetRole];

    // Protect peer and higher-ranked administrators.
    // Administrators may inspect their own history.
    if (
      targetRank === undefined ||
      (target.id !== actor.id && targetRank >= actorRank)
    ) {
      return failure("Forbidden", 403);
    }

    const { data, error } = await supabaseAdmin
      .from("profile_audit_logs")
      .select(
        "id, actor_id, target_id, action, field, old_value, new_value, created_at"
      )
      .eq("target_id", targetUserId)
      .eq("org_id", actorProfile.org_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("ADMIN_HISTORY_QUERY_FAILED");
      return failure("Unable to retrieve activity", 500);
    }

    // Preserve the array response expected by UserAdmin.tsx.
    return NextResponse.json(data ?? [], {
      status: 200,
      headers,
    });
  } catch {
    console.error("ADMIN_HISTORY_UNEXPECTED_ERROR");
    return failure("Unable to process request", 500);
  }
}
