import "server-only";
import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendInviteUserEmail } from "@/lib/email/send-notification-email";
import { getXilAirePublicUrl } from "@/lib/email/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCTION_ORIGIN = "https://xilairetechnologies.com";
const DEVELOPMENT_ORIGIN = "http://localhost:3002";
const ROLE_RANK: Record<string, number> = {
  user: 0, admin: 1, super_admin: 2, master_admin: 3,
};
const RESPONSE_HEADERS = { "Cache-Control": "no-store" };
function respond(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: RESPONSE_HEADERS });
}
function validOrigin(req: Request) {
  const header = req.headers.get("origin");
  if (!header) return false; // browser-only POST; do not silently bypass origin checks
  try {
    const u = new URL(header);
    if (u.href !== `${u.origin}/`) return false;
    return u.origin === PRODUCTION_ORIGIN ||
      (process.env.NODE_ENV === "development" && u.origin === DEVELOPMENT_ORIGIN);
  } catch { return false; }
}
export async function POST(req: Request) {
  if (!validOrigin(req)) return respond({ error: "Invalid origin." }, 403);
  // Production invitation sending requires deployed acceptance callback and
  // persistent abuse controls. Fail closed until explicitly enabled.
  if (process.env.XILAIRE_ENABLE_CUSTOM_INVITES !== "true") {
    return respond({ error: "Custom invitations are not enabled." }, 503);
  }
  try {
    const supabase = createRouteSupabaseClient();
    const { data: { user: actor }, error: authError } = await supabase.auth.getUser();
    if (authError || !actor) return respond({ error: "Unauthorized" }, 401);
    const { data: actorProfile, error: profileError } = await supabaseAdmin
      .from("profiles").select("id, org_id, role, status, full_name")
      .eq("id", actor.id).maybeSingle();
    if (profileError) return respond({ error: "Authorization check failed" }, 500);
    const actorRole = String(actorProfile?.role ?? "").toLowerCase();
    if (!actorProfile || actorProfile.status !== "active" || !actorProfile.org_id ||
        (ROLE_RANK[actorRole] ?? -1) < ROLE_RANK.admin) {
      return respond({ error: "Forbidden" }, 403);
    }
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const requestedRole = typeof body?.role === "string" ? body.role.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return respond({ error: "Enter a valid email address." }, 400);
    }
    // The workflow only invites a nonprivileged user. A separate, audited
    // admin operation must assign an organization and authorize any role.
    if (requestedRole !== "user") {
      return respond({ error: "Privileged invitations require a separate approval workflow." }, 403);
    }
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite", email,
      options: { redirectTo: getXilAirePublicUrl("/auth/invite/confirm") },
    });
    const tokenHash = linkData?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      console.error("ADMIN_INVITE_GENERATE_FAILED", { actorId: actor.id });
      return respond({ error: "Unable to prepare invitation." }, 502);
    }
    const inviteUrl = new URL(getXilAirePublicUrl("/auth/invite/confirm"));
    inviteUrl.searchParams.set("token_hash", tokenHash);
    const delivery = await sendInviteUserEmail({
      to: email,
      inviteUrl: inviteUrl.toString(),
      inviterName: actorProfile.full_name || undefined,
    });
    if (!delivery.success) {
      console.error("ADMIN_INVITE_DELIVERY_FAILED", { actorId: actor.id });
      return respond({ error: "Invitation email could not be sent." }, 502);
    }
    console.info("ADMIN_INVITE_DELIVERY_ACCEPTED", { actorId: actor.id, messageId: delivery.id });
    return respond({ success: true, message: "Invitation email accepted for delivery." }, 200);
  } catch {
    console.error("ADMIN_INVITE_UNEXPECTED_ERROR");
    return respond({ error: "Unable to send invitation." }, 500);
  }
}
