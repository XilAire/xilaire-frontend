"use client"

type StatusRow = {
  old_status: string
  new_status: string
  reason: string
  created_at: string
}

type Props = {
  history: StatusRow[]
}

const statusColor = (status: string) => {
  switch (status) {
    case "online":
      return "bg-green-500"
    case "stale":
      return "bg-yellow-500"
    case "offline":
      return "bg-red-500"
    default:
      return "bg-gray-400"
  }
}

export default function EndpointStatusTimeline({ history }: Props) {
  if (!history || history.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        No status changes recorded yet
      </div>
    )
  }

  return (
    <ul className="divide-y">
      {history.map((row, i) => (
        <li key={i} className="flex items-start gap-4 px-4 py-3">
          {/* Status Dot */}
          <div
            className={`mt-1 h-3 w-3 rounded-full ${statusColor(
              row.new_status
            )}`}
          />

          {/* Content */}
          <div className="flex-1">
            <p className="text-sm">
              <span className="capitalize font-medium">
                {row.old_status}
              </span>{" "}
              →{" "}
              <span className="capitalize font-medium">
                {row.new_status}
              </span>
            </p>

            <p className="text-xs text-muted-foreground">
              {row.reason} •{" "}
              {new Date(row.created_at).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
