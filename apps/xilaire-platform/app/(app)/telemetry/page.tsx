import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { getProfile } from "@/lib/getProfile"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Telemetry | XilAire Platform",
  description: "Fleet-wide telemetry across managed endpoints.",
}

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type TelemetryRow = {
  endpoint_id: string
  hostname: string
  metric: string
  value: number
  unit: string | null
  recorded_at: string
}

interface PageProps {
  searchParams?: {
    endpoint?: string
    metric?: string
    range?: "1h" | "24h" | "7d"
  }
}

export default async function TelemetryPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient()

  /* -------------------------------------------------
     🔒 AUTH
  ------------------------------------------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/signin")

  const profile = await getProfile()

  if (
    !profile ||
    !["admin", "super_admin", "master_admin"].includes(profile.role)
  ) {
    redirect("/dashboard")
  }

  /* -------------------------------------------------
     🏢 ORG CONTEXT (CANONICAL)
  ------------------------------------------------- */
  const orgId = profile.org_id
  if (!orgId) redirect("/dashboard")

  /* -------------------------------------------------
     ⏱️ TIME RANGE
  ------------------------------------------------- */
  const range = searchParams?.range ?? "24h"

  const rangeMap: Record<string, number> = {
    "1h": 1,
    "24h": 24,
    "7d": 168,
  }

  const hours = rangeMap[range] ?? 24
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  /* -------------------------------------------------
     📊 QUERY (ORG-SAFE, RLS-SAFE)
  ------------------------------------------------- */
  let query = supabase
    .from("endpoint_metrics")
    .select(
      `
        endpoint_id,
        metric,
        value,
        unit,
        recorded_at,
        endpoints!inner (
          id,
          hostname,
          org_id
        )
      `
    )
    .eq("endpoints.org_id", orgId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: false })
    .limit(300)

  if (searchParams?.endpoint) {
    query = query.eq("endpoint_id", searchParams.endpoint)
  }

  if (searchParams?.metric) {
    query = query.eq("metric", searchParams.metric)
  }

  const { data, error } = await query

  if (error) {
    console.error("Telemetry query failed:", error)
  }

  const rows: TelemetryRow[] =
    data?.map((t: any) => ({
      endpoint_id: t.endpoint_id,
      hostname: t.endpoints.hostname,
      metric: t.metric,
      value: t.value,
      unit: t.unit,
      recorded_at: t.recorded_at,
    })) ?? []

  /* -------------------------------------------------
     🖥️ RENDER
  ------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Telemetry
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Fleet-wide telemetry across managed endpoints.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 text-sm">
        <Link href="/telemetry?range=1h" className="underline">
          Last 1h
        </Link>
        <Link href="/telemetry?range=24h" className="underline">
          Last 24h
        </Link>
        <Link href="/telemetry?range=7d" className="underline">
          Last 7d
        </Link>
      </div>

      {/* Empty */}
      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No telemetry data for selected filters.
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left">Endpoint</th>
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-left">Value</th>
                <th className="px-4 py-2 text-left">Recorded</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    <Link
                      href={`/endpoints/org/${orgId}/endpoints/${row.endpoint_id}`}
                      className="hover:underline"
                    >
                      {row.hostname}
                    </Link>
                  </td>

                  <td className="px-4 py-2">{row.metric}</td>

                  <td className="px-4 py-2">
                    {row.value} {row.unit}
                  </td>

                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(row.recorded_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
