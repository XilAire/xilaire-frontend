"use client"

import { useRouter } from "next/navigation"

export type Endpoint = {
  id: string
  hostname: string
  device_type: string
  os: string
  agent_status: string
  last_seen_at: string | null
}

type Props = {
  endpoint: Endpoint
}

function getStatusPillClasses(status: string) {
  switch (status) {
    case "online":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "offline":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    case "stale":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

export default function EndpointRow({ endpoint }: Props) {
  const router = useRouter()

  return (
    <tr
      onClick={() => router.push(`/endpoints/${endpoint.id}`)}
      className="cursor-pointer border-t transition hover:bg-muted/40"
    >
      <td className="px-4 py-2 font-medium text-primary">
        {endpoint.hostname}
      </td>

      <td className="px-4 py-2">
        {endpoint.device_type}
      </td>

      <td className="px-4 py-2">
        {endpoint.os}
      </td>

      <td className="px-4 py-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusPillClasses(
            endpoint.agent_status
          )}`}
        >
          {endpoint.agent_status}
        </span>
      </td>

      <td className="px-4 py-2 text-muted-foreground">
        {endpoint.last_seen_at
          ? new Date(endpoint.last_seen_at).toLocaleString()
          : "Never"}
      </td>
    </tr>
  )
}
