// apps/xilaire-platform/lib/alerts.ts

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";

/* -------------------------------------------------
   TYPES — CANONICAL AUDIT ROW
------------------------------------------------- */
export type NotificationAuditRow = {
  notification_id: string;
  alert_id: string;
  hostname: string;
  metric: string;
  value: number;
  severity: "warning" | "critical";
  channel: string;
  destination: string;
  status: "sent" | "failed";
  error: string | null;
  sent_at: string;
};

/* -------------------------------------------------
   READ-ONLY NOTIFICATION AUDIT
   ENTERPRISE-SAFE
   - NO throws
   - RLS-respecting
   - Master admin safe
   - Future org selector compatible
------------------------------------------------- */
export async function getNotificationAudit(): Promise<
  NotificationAuditRow[]
> {
  const supabase = await createServerSupabaseClient();

  // 🔐 Optional auth context (DO NOT block rendering)
  let profile: any = null;
  try {
    profile = await getProfile();
  } catch {
    // unauthenticated → still allow render (empty or RLS-limited)
  }

  const { data, error } = await supabase
    .from("alert_notifications")
    .select(
      `
      id,
      alert_id,
      channel,
      destination,
      status,
      error,
      sent_at,
      alerts (
        metric,
        value,
        severity,
        endpoints (
          hostname
        )
      )
    `
    )
    .order("sent_at", { ascending: false })
    .limit(100);

  if (error) {
    // ❗ ENTERPRISE RULE:
    // Read paths NEVER throw
    console.error("Notification audit query failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      role: profile?.role ?? "unknown",
    });

    return [];
  }

  /* -------------------------------------------------
     NORMALIZE SUPABASE RELATIONS (DEFENSIVE)
  ------------------------------------------------- */
  return (data ?? []).map((n: any) => {
    const alert = Array.isArray(n.alerts) ? n.alerts[0] : null;
    const endpoint =
      alert && Array.isArray(alert.endpoints)
        ? alert.endpoints[0]
        : null;

    return {
      notification_id: n.id,
      alert_id: n.alert_id,
      hostname: endpoint?.hostname ?? "unknown",
      metric: alert?.metric ?? "",
      value: Number(alert?.value ?? 0),
      severity: alert?.severity ?? "warning",
      channel: n.channel,
      destination: n.destination,
      status: n.status,
      error: n.error,
      sent_at: n.sent_at,
    };
  });
}
