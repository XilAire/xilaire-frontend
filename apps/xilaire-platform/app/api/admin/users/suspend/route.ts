import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logProfileAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store",
};

const roleRanks: Record<string, number> = {
  user: 0,
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
      console.error("ADMIN_SUSPEND_ACTOR_LOOKUP_FAILED");
      return respond({ error: "Unable to verify access" }, 500);
    }

    if (
      !actorProfile ||
      actorProfile.status !== "active" ||
      !actorProfile.org_id
    ) {
      return respond({ error: "Forbidden" }, 403);
    }

    const actorRole = String(actorProfile.role || "")
      .trim()
      .toLowerCase();

    const actorRank = roleRanks[actorRole];

    if (actorRank === undefined || actorRank < 1) {
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

    if (userId === actor.id) {
      return respond(
        { error: "You cannot suspend your own account" },
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
      console.error("ADMIN_SUSPEND_TARGET_LOOKUP_FAILED");
      return respond({ error: "Unable to verify target" }, 500);
    }

    if (!target) {
      return respond({ error: "User not found" }, 404);
    }

    if (target.org_id !== actorProfile.org_id) {
      return respond({ error: "Forbidden" }, 403);
    }

    const targetRole = String(target.role || "")
      .trim()
      .toLowerCase();

    const targetRank = roleRanks[targetRole];

    // Unknown roles, peers, and higher roles are protected.
    if (targetRank === undefined || targetRank >= actorRank) {
      return respond({ error: "Forbidden" }, 403);
    }

    if (target.status === "deleted") {
      return respond(
        { error: "Deleted accounts cannot be suspended" },
        403
      );
    }

    if (target.status === "disabled") {
      return respond(
        { success: true, unchanged: true },
        200
      );
    }

    // Only active accounts can enter the disabled state here.
    if (target.status !== "active") {
      return respond(
        { error: "Unsupported account status transition" },
        409
      );
    }

    const { data: updated, error: updateError } =
      await supabaseAdmin
        .from("profiles")
        .update({ status: "disabled" })
        .eq("id", userId)
        .eq("org_id", actorProfile.org_id)
        .eq("role", target.role)
        .eq("status", "active")
        .select("id")
        .maybeSingle();

    if (updateError) {
      console.error("ADMIN_SUSPEND_UPDATE_FAILED");
      return respond({ error: "Unable to suspend account" }, 500);
    }

    if (!updated) {
      return respond(
        { error: "Account changed during request. Retry." },
        409
      );
    }

    // Preserve the existing audit integration.
    // A failure here cannot undo a committed status change.
    try {
      await logProfileAudit({
        actorId: actor.id,
        targetId: userId,
        orgId: actorProfile.org_id,
        action: "status_change",
        field: "status",
        oldValue: target.status,
        newValue: "disabled",
      });
    } catch {
      console.error("ADMIN_SUSPEND_AUDIT_WRITE_FAILED");

      return respond(
        {
          success: true,
          auditRecorded: false,
          warning: "Account suspended, but audit logging failed.",
        },
        200
      );
    }

    return respond(
      { success: true, auditRecorded: true },
      200
    );
  } catch {
    console.error("ADMIN_SUSPEND_UNEXPECTED_ERROR");
    return respond({ error: "Unable to process request" }, 500);
  }
}
