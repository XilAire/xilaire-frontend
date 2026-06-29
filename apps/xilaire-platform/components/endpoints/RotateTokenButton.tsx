// apps/xilaire-platform/components/endpoints/RotateTokenButton.tsx
"use client"

import { useState } from "react"

type Props = {
  endpointId: string
}

export default function RotateTokenButton({ endpointId }: Props) {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function rotate() {
    if (!confirm("Rotate agent token? The old token will stop working.")) {
      return
    }

    setLoading(true)
    setError(null)
    setToken(null)

    const res = await fetch("/api/endpoints/rotate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint_id: endpointId }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Failed to rotate token")
    } else {
      setToken(data.agent_token)
    }

    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <button
        onClick={rotate}
        disabled={loading}
        className="rounded border px-3 py-2 text-sm hover:bg-muted"
      >
        {loading ? "Rotating…" : "Rotate Agent Token"}
      </button>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {token && (
        <div className="rounded bg-muted p-3 text-sm">
          <p className="font-medium">New Agent Token (copy now)</p>
          <code className="block break-all">{token}</code>
        </div>
      )}
    </div>
  )
}