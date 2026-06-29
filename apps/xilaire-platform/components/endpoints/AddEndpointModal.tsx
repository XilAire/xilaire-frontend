"use client"

import { useState } from "react"

type Props = {
  onClose: () => void
}

export default function AddEndpointModal({ onClose }: Props) {
  const [form, setForm] = useState({
    hostname: "",
    device_type: "workstation",
    os: "",
    os_version: "",
  })

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    agent_token: string
    endpoint: { hostname: string }
  } | null>(null)

  async function handleSubmit() {
    setLoading(true)

    const res = await fetch("/api/endpoints/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    setLoading(false)

    if (!res.ok) {
      alert(data.error ?? "Failed to create endpoint")
      return
    }

    setResult(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-background p-6 space-y-4">
        <h2 className="text-lg font-semibold">Add Endpoint</h2>

        {!result && (
          <>
            <input
              placeholder="Hostname"
              className="w-full rounded-md border px-3 py-2"
              value={form.hostname}
              onChange={(e) =>
                setForm({ ...form, hostname: e.target.value })
              }
            />

            <select
              className="w-full rounded-md border px-3 py-2"
              value={form.device_type}
              onChange={(e) =>
                setForm({ ...form, device_type: e.target.value })
              }
            >
              <option value="workstation">Workstation</option>
              <option value="laptop">Laptop</option>
              <option value="server">Server</option>
            </select>

            <input
              placeholder="OS (e.g. Windows)"
              className="w-full rounded-md border px-3 py-2"
              value={form.os}
              onChange={(e) =>
                setForm({ ...form, os: e.target.value })
              }
            />

            <input
              placeholder="OS Version (optional)"
              className="w-full rounded-md border px-3 py-2"
              value={form.os_version}
              onChange={(e) =>
                setForm({ ...form, os_version: e.target.value })
              }
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Cancel
              </button>

              <button
                disabled={loading}
                onClick={handleSubmit}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                {loading ? "Creating..." : "Create Endpoint"}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-4">
            <p className="text-sm">
              Endpoint <strong>{result.endpoint.hostname}</strong> created.
            </p>

            <div className="rounded-md border bg-muted p-3 font-mono text-sm">
              {result.agent_token}
            </div>

            <p className="text-xs text-muted-foreground">
              ⚠️ Copy this token now. It will not be shown again.
            </p>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
