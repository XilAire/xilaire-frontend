// apps/xilaire-platform/app/(app)/alerts/page.tsx

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import AlertsListClient from "./AlertsListClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Alerts | XilAire Platform",
  description: "System and device alerts requiring attention.",
};

/* -------------------------------------------------
   TYPES (UI CONTRACT — LOCKED)
------------------------------------------------- */
type AlertListRow = {
  id: string;
  metric: string;
  severity: string;
  status: string;
  triggered_at: string | null;
  device_name: string | null;
};

type StyleMap = Record<
  string,
  { bg: string; text: string; ring: string }
>;

/* -------------------------------------------------
   SEVERITY → UI MAP
------------------------------------------------- */
const SEVERITY_STYLES: StyleMap = {
  critical: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    ring: "ring-red-500/30",
  },
  warning: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-600 dark:text-yellow-400",
    ring: "ring-yellow-500/30",
  },
  info: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/30",
  },
  __fallback: {
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-500/30",
  },
};

/* -------------------------------------------------
   STATUS → UI MAP
------------------------------------------------- */
const STATUS_STYLES: StyleMap = {
  open: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    ring: "ring-red-500/30",
  },
  acknowledged: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/30",
  },
  resolved: {
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    ring: "ring-green-500/30",
  },
  __fallback: {
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-500/30",
  },
};

/* -------------------------------------------------
   PAGE (SERVER)
------------------------------------------------- */
export default async function AlertsPage() {
  const supabase = await createServerSupabaseClient();

  /* -------------------------------------------------
     🔍 DIAGNOSTIC — RAW active_alerts VIEW
     This tells us if RLS is stripping rows
  ------------------------------------------------- */
  const rawView = await supabase
    .from("active_alerts")
    .select("*");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[ACTIVE_ALERTS_RAW] error:", rawView.error);
  console.log("[ACTIVE_ALERTS_RAW] row count:", rawView.data?.length ?? 0);
  console.log("[ACTIVE_ALERTS_RAW] rows:", rawView.data);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  /* -------------------------------------------------
     🚨 NORMAL QUERY (UNCHANGED)
  ------------------------------------------------- */
  const { data, error } = await supabase
    .from("active_alerts")
    .select(
      `
        id,
        metric,
        severity,
        status,
        triggered_at,
        endpoints!inner (
          hostname,
          org_id
        )
      `
    )
    .order("triggered_at", { ascending: false });

  if (error) {
    console.error("[ALERTS_JOIN_QUERY_ERROR]", error);
  }

  console.log(
    "[ALERTS_JOIN_QUERY] row count:",
    data?.length ?? 0
  );

  const alerts: AlertListRow[] = (data ?? []).map((a: any) => ({
    id: a.id,
    metric: a.metric,
    severity: a.severity,
    status: a.status,
    triggered_at: a.triggered_at,
    device_name: a.endpoints?.hostname ?? null,
  }));

  console.log(
    "[ALERTS_MAPPED] final alerts length:",
    alerts.length
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
        Alerts
      </h1>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Active alerts, notifications, and system warnings.
      </p>

      {alerts.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm text-slate-500 dark:text-slate-400">
          No alerts found.
        </div>
      )}

      {alerts.length > 0 && (
        <AlertsListClient
          alerts={alerts}
          severityStyles={SEVERITY_STYLES}
          statusStyles={STATUS_STYLES}
        />
      )}
    </div>
  );
}
