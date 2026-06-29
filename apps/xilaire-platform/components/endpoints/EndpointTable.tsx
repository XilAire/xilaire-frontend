import EndpointRow, { Endpoint } from "./EndpointRow"

type Props = {
  endpoints: Endpoint[]
}

export default function EndpointTable({ endpoints }: Props) {
  if (endpoints.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        No endpoints registered.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left">Hostname</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">OS</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Last Seen</th>
          </tr>
        </thead>

        <tbody>
          {endpoints.map((endpoint) => (
            <EndpointRow key={endpoint.id} endpoint={endpoint} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
