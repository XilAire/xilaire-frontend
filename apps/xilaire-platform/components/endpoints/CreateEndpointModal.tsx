"use client"

import { useState } from "react"

export default function CreateEndpointModal() {
  const [hostname, setHostname] = useState("")
  const [deviceType, setDeviceType] = useState("workstation")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)

    const res = await fetch("/api/endpoints/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostname,
        device_type: deviceType,
      }),
    })

    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Add Endpoint</h2>

      <input
        className="w-full rounded border px-3 py-2"
        placeholder="Hostname"
        value={hostname}
        onChange={(e) => setHostname(e.target.value)}
      />

      <select
        className="w-full rounded border px-3 py-2"
        value={deviceType}
        onChange={(e) => setDeviceType(e.target.value)}
      >
        <option value="workstation">Workstation</option>
        <option value="laptop">Laptop</option>
        <option value="server">Server</option>
      </select>

      <button
        onClick={handleCreate}
        disabled={loading}
        className="rounded bg-primary px-4 py-2 text-white"
      >
        {loading ? "Creating…" : "Create Endpoint"}
      </button>

      {result?.agent_token && (
        <div className="rounded bg-muted p-3 text-sm">
          <p className="font-medium">Agent Token</p>
          <code className="block break-all">{result.agent_token}</code>

          <p className="mt-2 font-medium">Install Command</p>
          <code className="block break-all">
            {result.install_command}
          </code>
        </div>
      )}
    </div>
  )
}
