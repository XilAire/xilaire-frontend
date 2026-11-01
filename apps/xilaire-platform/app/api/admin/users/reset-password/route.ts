import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requestPasswordReset } from "@/lib/auth/password-recovery";

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
      console.error("ADMIN_RESET_ACTOR_LOOKUP_FAILED");
      return respond({ error: "Unable to verify access" }, 500);
    }

    if (
      !actorProfile ||
      actorProfile.status !== "active" ||
      !actorProfile.org_id
    ) {
      return respond({ error: "Forbidden" }, 403);
    }

    const actorRole =
      String(actorProfile.role || "").trim().toLowerCase();

    const actorRank = roleRanks[actorRole] ?? 0;

    if (actorRank === 0) {
      return respond({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => null);

    if (typeof body?.email !== "string") {
      return respond({ error: "Valid email is required" }, 400);
    }

    const email = body.email.trim().toLowerCase();

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return respond({ error: "Valid email is required" }, 400);
    }

    const { data: target, error: targetError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, org_id, role, status")
        .eq("email", email)
        .maybeSingle();

    if (targetError) {
      console.error("ADMIN_RESET_TARGET_LOOKUP_FAILED");
      return respond({ error: "Unable to process request" }, 500);
    }

    // Do not disclose whether an email belongs to an
    // unknown account, another organization, or a
    // disallowed account type.
    const accepted = {
      success: true,
      message: "If this account is eligible, a reset email will be requested.",
    };

    if (!target || target.org_id !== actorProfile.org_id) {
      return respond(accepted, 200);
    }

    if (target.status !== "active") {
      return respond(accepted, 200);
    }

    const targetRole =
      String(target.role || "").trim().toLowerCase();

    const targetRank = roleRanks[targetRole] ?? 0;

    // Prevent resetting one's own administrator account
    // through this privileged administrative endpoint.
    // Self-service recovery remains a separate workflow.
    if (target.id === actor.id) {
      return respond({ error: "Use self-service recovery" }, 403);
    }

    if (targetRank >= actorRank) {
      return respond({ error: "Forbidden" }, 403);
    }

    // All reset emails use the production XilAire recovery flow.
    // Existing administrator authorization checks remain above.
    await requestPasswordReset(email);

    return respond(accepted, 200);
  } catch {
    console.error("ADMIN_RESET_UNEXPECTED_ERROR");
    return respond({ error: "Unable to process request" }, 500);
  }
}
