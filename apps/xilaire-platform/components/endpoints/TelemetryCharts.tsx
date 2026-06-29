"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type MetricRow = {
  metric: string
  value: number
  recorded_at: string
}

export default function TelemetryCharts({
  metrics,
}: {
  metrics: MetricRow[]
}) {
  /* -------------------------------------------------
     🔎 METRIC MAPPING (MATCHES DB)
  ------------------------------------------------- */
  const cpu = metrics.filter((m) => m.metric === "cpu_usage_pct")
  const memory = metrics.filter((m) => m.metric === "ram_used_pct")
  const disk = metrics.filter((m) => m.metric === "disk_used_pct")

  return (
    <div className="space-y-4">
      <MetricChart title="CPU Usage (%)" data={cpu} />
      <MetricChart title="Memory Usage (%)" data={memory} />
      <MetricChart title="Disk Usage (%)" data={disk} />
    </div>
  )
}

/* -------------------------------------------------
   📊 ENTERPRISE METRIC CHART
------------------------------------------------- */
function MetricChart({
  title,
  data,
}: {
  title: string
  data: MetricRow[]
}) {
  const chartData = data.map((d) => ({
    time: new Date(d.recorded_at).toLocaleTimeString(),
    value: Number(d.value),
  }))

  /* -------------------------------------------------
     ❌ NO DATA
  ------------------------------------------------- */
  if (chartData.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {title}: No data collected yet.
      </div>
    )
  }

  /* -------------------------------------------------
     🟡 SINGLE POINT → SNAPSHOT MODE
  ------------------------------------------------- */
  if (chartData.length === 1) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="mb-1 text-sm font-medium">{title}</h3>
        <div className="text-2xl font-semibold">
          {chartData[0].value}
        </div>
        <div className="text-xs text-muted-foreground">
          Last updated {chartData[0].time}
        </div>
      </div>
    )
  }

  /* -------------------------------------------------
     🟢 TIME-SERIES MODE
  ------------------------------------------------- */
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 text-sm font-medium">{title}</h3>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
