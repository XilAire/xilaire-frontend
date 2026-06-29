import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabaseClient();

  /* -------------------------------------------------
     🔒 AUTH CONTEXT (SAFE)
  ------------------------------------------------- */
  let profile;
  try {
    profile = await getProfile();
  } catch {
    return NextResponse.json(
      { alerts: 0, notificationsFailed: 0 },
      { status: 200 }
    );
  }

  const effectiveOrgId =
    profile.effective_org_id ?? profile.org_id;

  /* -------------------------------------------------
     🚨 ACTIVE ALERT COUNT (CANONICAL SOURCE)
  ------------------------------------------------- */
  const { count: alertCount, error: alertError } =
    await supabase
      .from("active_alerts")
      .select("id, endpoints!inner(org_id)", {
        count: "exact",
        head: true,
      })
      .eq("endpoints.org_id", effectiveOrgId);

  if (alertError) {
    console.error("Alert badge query failed", {
      message: alertError.message,
      code: alertError.code,
      details: alertError.details,
    });
  }

  /* -------------------------------------------------
     📣 FAILED NOTIFICATIONS (UNCHANGED)
  ------------------------------------------------- */
  const { count: failedNotifications, error: notifError } =
    await supabase
      .from("alert_notifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed");

  if (notifError) {
    console.error("Notification badge query failed", {
      message: notifError.message,
      code: notifError.code,
      details: notifError.details,
    });
  }

  return NextResponse.json({
    alerts: alertCount ?? 0,
    notificationsFailed: failedNotifications ?? 0,
  });
}
