import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store",
};

const roleRanks: Record<string, number> = {
  admin: 1,
  super_admin: 2,
  master_admin: 3,
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function respond(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE,
  });
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteSupabaseClient();

    const {
      data: { user: actor },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !actor) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const { data: actorProfile, error: actorError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, org_id, role, status")
        .eq("id", actor.id)
        .maybeSingle();

    if (actorError) {
      console.error("ADMIN_ACTIVITY_ACTOR_LOOKUP_FAILED");
      return respond({ error: "Unable to verify access" }, 500);
    }

    if (
      !actorProfile ||
      actorProfile.status !== "active" ||
      !actorProfile.org_id
    ) {
      return respond({ error: "Forbidden" }, 403);
    }

    const actorRole = String(actorProfile.role || "").toLowerCase();
    const actorRank = roleRanks[actorRole] ?? 0;

    if (actorRank === 0) {
      return respond({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => null);
    const userId = body?.userId;

    if (
      typeof userId !== "string" ||
      !uuidPattern.test(userId)
    ) {
      return respond({ error: "Invalid userId" }, 400);
    }

    const { data: target, error: targetError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, org_id, role")
        .eq("id", userId)
        .maybeSingle();

    if (targetError) {
      console.error("ADMIN_ACTIVITY_TARGET_LOOKUP_FAILED");
      return respond({ error: "Unable to verify target" }, 500);
    }

    if (!target) {
      return respond({ error: "User not found" }, 404);
    }

    // Audit history must never cross organization boundaries.
    if (target.org_id !== actorProfile.org_id) {
      return respond({ error: "Forbidden" }, 403);
    }

    const targetRole = String(target.role || "").toLowerCase();
    const targetRank = roleRanks[targetRole] ?? 0;

    // An administrator can inspect their own activity, but
    // not the activity of a peer or higher-level administrator.
    if (
      actor.id !== target.id &&
      targetRank >= actorRank
    ) {
      return respond({ error: "Forbidden" }, 403);
    }

    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("ADMIN_ACTIVITY_QUERY_FAILED");
      return respond({ error: "Unable to retrieve activity" }, 500);
    }

    return respond({ data: data ?? [] }, 200);
  } catch {
    console.error("ADMIN_ACTIVITY_UNEXPECTED_ERROR");
    return respond({ error: "Unable to process request" }, 500);
  }
}
