import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
        .select("id, role, org_id, status")
        .eq("id", actor.id)
        .maybeSingle();

    if (actorError) {
      console.error("ADMIN_ROLE_ACTOR_LOOKUP_FAILED");
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
    const proposedRole = body?.role;

    if (
      typeof userId !== "string" ||
      !uuidPattern.test(userId) ||
      typeof proposedRole !== "string"
    ) {
      return respond({ error: "Invalid payload" }, 400);
    }

    const requestedRole = proposedRole.trim().toLowerCase();

    if (
      !Object.prototype.hasOwnProperty.call(roleRanks, requestedRole)
    ) {
      return respond({ error: "Invalid role" }, 400);
    }

    if (actor.id === userId) {
      return respond(
        { error: "You cannot change your own role" },
        403
      );
    }

    // Master-admin provisioning requires separate controls.
    if (requestedRole === "master_admin") {
      return respond({ error: "Forbidden" }, 403);
    }

    const requestedRank = roleRanks[requestedRole];

    // Never allow promotion to the caller's own rank or higher.
    if (requestedRank >= actorRank) {
      return respond({ error: "Forbidden" }, 403);
    }

    const { data: target, error: targetError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, role, org_id, status")
        .eq("id", userId)
        .maybeSingle();

    if (targetError) {
      console.error("ADMIN_ROLE_TARGET_LOOKUP_FAILED");
      return respond({ error: "Unable to verify target" }, 500);
    }

    if (!target) {
      return respond({ error: "User not found" }, 404);
    }

    if (
      target.org_id !== actorProfile.org_id ||
      target.status !== "active"
    ) {
      return respond({ error: "Forbidden" }, 403);
    }

    const currentRole = String(target.role || "")
      .trim()
      .toLowerCase();

    const currentRank = roleRanks[currentRole];

    if (currentRank === undefined || currentRank >= actorRank) {
      return respond({ error: "Forbidden" }, 403);
    }

    if (currentRole === requestedRole) {
      return respond(
        { success: true, unchanged: true },
        200
      );
    }

    // Constrain the write to the original organization,
    // status, and role to reduce stale-state changes.
    const { data: updated, error: updateError } =
      await supabaseAdmin
        .from("profiles")
        .update({
          role: requestedRole,
          updated_by: actor.id,
        })
        .eq("id", userId)
        .eq("org_id", actorProfile.org_id)
        .eq("status", "active")
        .eq("role", target.role)
        .select("id")
        .maybeSingle();

    if (updateError) {
      console.error("ADMIN_ROLE_UPDATE_FAILED");
      return respond({ error: "Unable to update role" }, 500);
    }

    if (!updated) {
      return respond(
        { error: "Account changed during request. Retry." },
        409
      );
    }

    // Preserve existing audit-log integration.
    const { error: auditError } = await supabaseAdmin
      .from("profile_audit_logs")
      .insert({
        org_id: actorProfile.org_id,
        actor_id: actor.id,
        target_id: userId,
        action: "role_change",
        field: "role",
        old_value: target.role,
        new_value: requestedRole,
      });

    if (auditError) {
      // The role update has already committed; do not report
      // that the update failed or silently hide the audit error.
      console.error("ADMIN_ROLE_AUDIT_WRITE_FAILED");
      return respond(
        {
          success: true,
          auditRecorded: false,
          warning: "Role updated, but audit logging failed.",
        },
        200
      );
    }

    return respond(
      { success: true, auditRecorded: true },
      200
    );
  } catch {
    console.error("ADMIN_ROLE_UNEXPECTED_ERROR");
    return respond({ error: "Unable to process request" }, 500);
  }
}
