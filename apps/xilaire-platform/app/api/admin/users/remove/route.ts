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
      console.error("REMOVE_USER_ACTOR_LOOKUP_FAILED");
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

    if (actor.id === userId) {
      return respond(
        { error: "You cannot remove your own account" },
        403
      );
    }

    const { data: target, error: targetError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, org_id, role, status")
        .eq("id", userId)
        .maybeSingle();

    if (targetError) {
      console.error("REMOVE_USER_TARGET_LOOKUP_FAILED");
      return respond({ error: "Unable to verify target" }, 500);
    }

    if (!target) {
      return respond({ error: "User not found" }, 404);
    }

    // Fail closed: never allow cross-organization removal.
    if (target.org_id !== actorProfile.org_id) {
      return respond({ error: "Forbidden" }, 403);
    }

    const targetRole = String(target.role || "").toLowerCase();
    const targetRank = roleRanks[targetRole] ?? 0;

    // Equal or higher-ranked administrators are protected.
    if (targetRank >= actorRank) {
      return respond({ error: "Forbidden" }, 403);
    }

    if (target.status === "deleted") {
      return respond({ success: true, alreadyRemoved: true }, 200);
    }

    const { data: updated, error: updateError } =
      await supabaseAdmin
        .from("profiles")
        .update({ status: "deleted" })
        .eq("id", userId)
        .eq("org_id", actorProfile.org_id)
        .eq("status", target.status)
        .select("id")
        .maybeSingle();

    if (updateError) {
      console.error("REMOVE_USER_UPDATE_FAILED");
      return respond({ error: "Unable to remove user" }, 500);
    }

    if (!updated) {
      return respond(
        { error: "Account changed during request. Retry." },
        409
      );
    }

    return respond({ success: true }, 200);
  } catch {
    console.error("REMOVE_USER_UNEXPECTED_ERROR");
    return respond({ error: "Unable to process request" }, 500);
  }
}
