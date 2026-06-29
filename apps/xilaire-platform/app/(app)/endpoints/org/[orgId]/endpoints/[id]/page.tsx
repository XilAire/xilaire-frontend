import { redirect, notFound } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { getProfile } from "@/lib/getProfile"

import TelemetryCharts from "@/components/endpoints/TelemetryCharts"
import EndpointStatusTimeline from "@/components/endpoints/EndpointStatusTimeline"

export const dynamic = "force-dynamic"

/* -------------------------------------------------
   RANGE CONFIG (CONSISTENT WITH TELEMETRY PAGE)
------------------------------------------------- */
type RangeKey = "1h" | "24h" | "7d"

const RANGE_MAP: Record<RangeKey, number> = {
  "1h": 1,
  "24h": 24,
  "7d": 24 * 7,
}

interface PageProps {
  params: {
    orgId: string
    id: string
  }
  searchParams?: {
    range?: RangeKey
  }
}

export default async function EndpointDetailPage({
  params,
  searchParams,
}: PageProps) {
  const supabase = await createServerSupabaseClient()
  const profile = await getProfile()

  if (!profile) redirect("/auth/signin")
  if (!["admin", "super_admin", "master_admin"].includes(profile.role)) {
    redirect("/dashboard")
  }

  /* -------------------------------------------------
     ⏱ RANGE
  ------------------------------------------------- */
  const range: RangeKey = searchParams?.range ?? "7d"
  const hoursBack = RANGE_MAP[range]

  const since = new Date()
  since.setHours(since.getHours() - hoursBack)

  /* -------------------------------------------------
     📡 ENDPOINT
  ------------------------------------------------- */
  const { data: endpoint, error } = await supabase
    .from("endpoints")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", params.orgId)
    .single()

  if (error || !endpoint) notFound()

  /* -------------------------------------------------
     📊 TELEMETRY (RAW ROWS)
  ------------------------------------------------- */
  const { data: telemetry } = await supabase
    .from("endpoint_metrics")
    .select("*")
    .eq("endpoint_id", params.id)
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true })

  /* -------------------------------------------------
     📈 CHART-SAFE METRICS
  ------------------------------------------------- */
  const chartMetrics =
    telemetry?.filter(
      (row) => row.metric && row.value !== null && row.recorded_at
    ) ?? []

  /* -------------------------------------------------
     🧭 STATUS HISTORY
  ------------------------------------------------- */
  const { data: statusHistory } = await supabase
    .from("endpoint_status_history")
    .select("*")
    .eq("endpoint_id", params.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl font-semibold">{endpoint.hostname}</h1>
        <p className="text-sm text-muted-foreground">
          {endpoint.device_type} · {endpoint.os}
        </p>
      </header>

      {/* System Info */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4">
        <div>
          <div className="text-sm text-muted-foreground">Status</div>
          <div>{endpoint.agent_status}</div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground">Last Seen</div>
          <div>
            {endpoint.last_seen_at
              ? new Date(endpoint.last_seen_at).toLocaleString()
              : "Never"}
          </div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground">CPU</div>
          <div>{endpoint.cpu_model ?? "—"}</div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground">RAM</div>
          <div>{endpoint.ram_gb ?? "—"} GB</div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground">Disk</div>
          <div>{endpoint.disk_total_gb ?? "—"} GB</div>
        </div>
      </div>

      {/* -------------------------------------------------
          📊 TELEMETRY
      ------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Telemetry</h2>

          <div className="flex gap-2 text-sm">
            {(["1h", "24h", "7d"] as const).map((r) => (
              <a
                key={r}
                href={`?range=${r}`}
                className={`rounded-md px-3 py-1 border transition
                  ${
                    range === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
              >
                {r === "1h"
                  ? "Last 1h"
                  : r === "24h"
                  ? "Last 24h"
                  : "Last 7d"}
              </a>
            ))}
          </div>
        </div>

        {chartMetrics.length > 0 ? (
          <TelemetryCharts metrics={chartMetrics} />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No telemetry recorded for this time range.
          </div>
        )}
      </section>

      {/* Status History */}
      <EndpointStatusTimeline history={statusHistory ?? []} />
    </div>
  )
}
