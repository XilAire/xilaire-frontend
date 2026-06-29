import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { getProfile } from "@/lib/getProfile"
import EndpointStatusBadge from "@/components/endpoints/EndpointStatusBadge"
import EndpointStatusTimeline from "@/components/endpoints/EndpointStatusTimeline"
import TelemetryCharts from "@/components/endpoints/TelemetryCharts"

export const dynamic = "force-dynamic"

interface PageProps {
  params: { id: string }
}

export default async function EndpointDetailPage({ params }: PageProps) {
  /* -------------------------------------------------
     🔒 AUTH — REQUIRE SESSION
  ------------------------------------------------- */
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  /* -------------------------------------------------
     🔐 ROLE AUTH — ADMIN OR MASTER ADMIN
  ------------------------------------------------- */
  const profile = await getProfile()

  if (!profile || !["admin", "master_admin"].includes(profile.role)) {
    redirect("/dashboard")
  }

  /* -------------------------------------------------
     📥 LOAD ENDPOINT
  ------------------------------------------------- */
  const { data: endpoint, error: endpointError } = await supabase
    .from("endpoints")
    .select(`
      id,
      hostname,
      device_type,
      os,
      os_version,
      cpu_model,
      cpu_cores,
      ram_gb,
      disk_total_gb,
      agent_status,
      last_seen_at
    `)
    .eq("id", params.id)
    .single()

  if (endpointError || !endpoint) {
    notFound()
  }

  /* -------------------------------------------------
     📊 LOAD RECENT TELEMETRY
  ------------------------------------------------- */
  const { data: metrics } = await supabase
    .from("endpoint_metrics")
    .select("metric, value, unit, recorded_at")
    .eq("endpoint_id", params.id)
    .order("recorded_at", { ascending: true })
    .limit(100)

  /* -------------------------------------------------
     🧾 LOAD STATUS HISTORY
  ------------------------------------------------- */
  const { data: statusHistory } = await supabase
    .from("endpoint_status_audit_logs")
    .select("old_status, new_status, reason, actor, created_at")
    .eq("endpoint_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20)

  /* -------------------------------------------------
     🚨 LOAD RECENT ALERTS (VIEW — RLS SAFE)
  ------------------------------------------------- */
  const { data: alerts } = await supabase
    .from("alert_list_view")
    .select("id, metric, severity, status, triggered_at")
    .eq("endpoint_id", params.id)
    .order("triggered_at", { ascending: false })
    .limit(10)

  /* -------------------------------------------------
     🖥️ RENDER
  ------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/endpoints"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to Endpoints
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{endpoint.hostname}</h1>
          <p className="text-sm text-muted-foreground">
            {endpoint.device_type} • {endpoint.os}
          </p>
        </div>

        <EndpointStatusBadge status={endpoint.agent_status} />
      </div>

      {/* Hardware */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
        <div>
          <p className="text-xs text-muted-foreground">CPU</p>
          <p>{endpoint.cpu_model}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Cores</p>
          <p>{endpoint.cpu_cores}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">RAM</p>
          <p>{endpoint.ram_gb} GB</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Disk</p>
          <p>{endpoint.disk_total_gb} GB</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Last Seen</p>
          <p>
            {endpoint.last_seen_at
              ? new Date(endpoint.last_seen_at).toLocaleString()
              : "Never"}
          </p>
        </div>
      </div>

      {/* Status History */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-2 font-medium">
          Status History
        </div>

        <EndpointStatusTimeline history={statusHistory ?? []} />
      </div>

      {/* 🚨 Recent Alerts */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-2 font-medium">
          Recent Alerts
        </div>

        {!alerts || alerts.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No alerts recorded for this endpoint
          </div>
        ) : (
          <ul className="divide-y text-sm">
            {alerts.map((alert) => (
              <li key={alert.id} className="px-4 py-3">
                <Link
                  href={`/alerts/${alert.id}`}
                  className="flex justify-between hover:underline"
                >
                  <span>
                    {alert.metric.toUpperCase()} •{" "}
                    <span className="text-muted-foreground">
                      {alert.status}
                    </span>
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {alert.triggered_at
                      ? new Date(alert.triggered_at).toLocaleString()
                      : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 📈 Telemetry Charts */}
      <TelemetryCharts metrics={metrics ?? []} />

      {/* 📋 Telemetry Table */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-2 font-medium">
          Recent Telemetry
        </div>

        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">Metric</th>
              <th className="px-4 py-2 text-left">Value</th>
              <th className="px-4 py-2 text-left">Recorded</th>
            </tr>
          </thead>

          <tbody>
            {metrics?.map((m, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2">{m.metric}</td>
                <td className="px-4 py-2">
                  {m.value} {m.unit}
                </td>
                <td className="px-4 py-2">
                  {new Date(m.recorded_at).toLocaleString()}
                </td>
              </tr>
            ))}

            {(!metrics || metrics.length === 0) && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No telemetry recorded yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
