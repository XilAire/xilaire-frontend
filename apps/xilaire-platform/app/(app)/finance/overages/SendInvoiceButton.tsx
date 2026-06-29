"use client"

import { useState } from "react"

export function SendInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function send() {
    setLoading(true)

    const res = await fetch("/api/admin/overages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: invoiceId }),
    })

    if (!res.ok) {
      alert("Failed to send invoice")
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <span className="text-green-600 text-sm font-medium">
        Sent
      </span>
    )
  }

  return (
    <button
      onClick={send}
      disabled={loading}
      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
    >
      {loading ? "Sending…" : "Send Invoice"}
    </button>
  )
}