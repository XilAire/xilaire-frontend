import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/* -------------------------------------------------
   VIEW CONTRACT (LOCKED)
------------------------------------------------- */
type AlertDetailRow = {
  id: string;
  metric: string;
  value: number | null;
  severity: string;
  status: string;
  triggered_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  device_name: string | null;
  endpoint_id: string | null;
};

type AlertAuditRow = {
  id: string;
  action: "acknowledged" | "resolved";
  actor_id: string;
  created_at: string;
};

/* -------------------------------------------------
   SLA CONFIG (UI-ONLY)
------------------------------------------------- */
const SLA_LIMITS_MINUTES = {
  acknowledge: 15,
  resolve: 60,
};

function minutesBetween(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 60000
  );
}

function ageMinutesSince(a?: string | null) {
  if (!a) return null;
  return Math.round(
    (Date.now() - new Date(a).getTime()) / 60000
  );
}

function slaBadge(
  minutes: number | null,
  limit: number
): { label: string; className: string } {
  if (minutes === null) {
    return {
      label: "—",
      className:
        "bg-slate-500/10 text-slate-600 ring-slate-500/30",
    };
  }

  if (minutes <= limit) {
    return {
      label: `${minutes}m (OK)`,
      className:
        "bg-green-500/10 text-green-600 ring-green-500/30",
    };
  }

  return {
    label: `${minutes}m (BREACH)`,
    className:
      "bg-red-500/10 text-red-600 ring-red-500/30",
  };
}

export default async function AlertDetailPage({
  params,
}: {
  params: { alertId: string };
}) {
  const supabase = await createServerSupabaseClient();

  /* -------------------------------------------------
     LOAD ALERT (VIEW-ONLY, RLS-ENFORCED)
  ------------------------------------------------- */
  const { data: alert, error } = await supabase
    .from("alert_list_view")
    .select(
      `
        id,
        metric,
        value,
        severity,
        status,
        triggered_at,
        acknowledged_at,
        resolved_at,
        device_name,
        endpoint_id
      `
    )
    .eq("id", params.alertId)
    .maybeSingle();

  if (error || !alert) notFound();

  /* -------------------------------------------------
     LOAD AUDIT (RLS-ENFORCED)
  ------------------------------------------------- */
  const { data: audit } = await supabase
    .from("alert_audit_log")
    .select("id, action, actor_id, created_at")
    .eq("alert_id", params.alertId)
    .order("created_at", { ascending: false });

  /* -------------------------------------------------
     SLA CALCULATIONS (PURE UI)
  ------------------------------------------------- */
  const timeToAck = minutesBetween(
    alert.triggered_at,
    alert.acknowledged_at
  );

  const timeToResolve = minutesBetween(
    alert.triggered_at,
    alert.resolved_at
  );

  const ageMinutes = ageMinutesSince(alert.triggered_at);

  const ackBadge = slaBadge(
    timeToAck,
    SLA_LIMITS_MINUTES.acknowledge
  );

  const resolveBadge = slaBadge(
    timeToResolve,
    SLA_LIMITS_MINUTES.resolve
  );

  /* -------------------------------------------------
     RENDER
  ------------------------------------------------- */
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/alerts"
        className="text-sm text-slate-600 hover:underline dark:text-slate-400"
      >
        ← Back to Alerts
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {alert.metric.toUpperCase()} Alert
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Triggered{" "}
          {alert.triggered_at
            ? new Date(alert.triggered_at).toLocaleString()
            : "Unknown"}
        </p>
      </div>

      {/* Core Details */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-2 gap-4 text-sm">
        <Detail label="Device">
          {alert.endpoint_id ? (
            <Link
              href={`/endpoints/${alert.endpoint_id}`}
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              {alert.device_name ?? "View Endpoint"}
            </Link>
          ) : (
            alert.device_name ?? "Unknown"
          )}
        </Detail>

        <Detail label="Status">{alert.status}</Detail>
        <Detail label="Severity">{alert.severity}</Detail>
        <Detail label="Metric Value">
          {alert.value ?? "—"}
        </Detail>
      </div>

      {/* SLA / Aging */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-3 gap-4 text-sm">
        <SlaBox
          label="Time to Acknowledge"
          badge={ackBadge}
        />
        <SlaBox
          label="Time to Resolve"
          badge={resolveBadge}
        />
        <Detail label="Alert Age">
          {ageMinutes !== null ? `${ageMinutes}m` : "—"}
        </Detail>
      </div>

      {/* Lifecycle */}
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4 grid grid-cols-3 gap-4 text-sm">
        <Detail label="Triggered">
          {alert.triggered_at
            ? new Date(alert.triggered_at).toLocaleString()
            : "—"}
        </Detail>
        <Detail label="Acknowledged">
          {alert.acknowledged_at
            ? new Date(alert.acknowledged_at).toLocaleString()
            : "—"}
        </Detail>
        <Detail label="Resolved">
          {alert.resolved_at
            ? new Date(alert.resolved_at).toLocaleString()
            : "—"}
        </Detail>
      </div>

      {/* Audit */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <h2 className="text-sm font-semibold mb-2">
          Audit Trail
        </h2>

        {!audit || audit.length === 0 ? (
          <p className="text-xs text-slate-500">
            No audit events recorded.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {audit.map((a: AlertAuditRow) => (
              <li
                key={a.id}
                className="flex justify-between"
              >
                <span>Alert {a.action}</span>
                <span className="text-slate-500">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------
   UI HELPERS
------------------------------------------------- */
function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-medium text-slate-900 dark:text-slate-100">
        {children}
      </p>
    </div>
  );
}

function SlaBox({
  label,
  badge,
}: {
  label: string;
  badge: { label: string; className: string };
}) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <span
        className={[
          "inline-block rounded-full px-3 py-1 text-xs font-medium ring-1",
          badge.className,
        ].join(" ")}
      >
        {badge.label}
      </span>
    </div>
  );
}
