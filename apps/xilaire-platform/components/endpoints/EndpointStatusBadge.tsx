type Props = {
  status: "online" | "offline" | "stale"
}

const STATUS_STYLES: Record<Props["status"], string> = {
  online: "bg-green-100 text-green-800",
  offline: "bg-red-100 text-red-800",
  stale: "bg-yellow-100 text-yellow-800",
}

export default function EndpointStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  )
}
