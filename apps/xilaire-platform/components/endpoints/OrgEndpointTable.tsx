"use client"

import { useRouter } from "next/navigation"

interface OrgEndpointTableProps {
  org: {
    id: string
    name: string
  }

  endpoints: {
    id: string
    hostname: string
    device_type: string
    os: string
    agent_status: string
    last_seen_at: string | null
    location_id: string | null
  }[]

  page: number
  pageSize: number
  total: number

  filters: {
    page?: string
    status?: string
    location?: string
    q?: string
  }
}

export default function OrgEndpointTable({
  org,
  endpoints,
  page,
  pageSize,
  total,
  filters,
}: OrgEndpointTableProps) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">{org.name} — Endpoints</h1>
      </header>

      <table className="w-full border border-border rounded-lg">
        <thead>
          <tr className="text-left text-sm text-muted-foreground">
            <th className="px-4 py-2">Hostname</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">OS</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map(endpoint => (
            <tr
              key={endpoint.id}
              className="cursor-pointer hover:bg-muted"
              onClick={() =>
                router.push(
                  `/endpoints/org/${org.id}/endpoints/${endpoint.id}`
                )
              }
            >
              <td className="px-4 py-2 font-medium">
                {endpoint.hostname}
              </td>
              <td className="px-4 py-2">{endpoint.device_type}</td>
              <td className="px-4 py-2">{endpoint.os}</td>
              <td className="px-4 py-2">{endpoint.agent_status}</td>
              <td className="px-4 py-2 text-muted-foreground">
                {endpoint.last_seen_at
                  ? new Date(endpoint.last_seen_at).toLocaleString()
                  : "Never"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
