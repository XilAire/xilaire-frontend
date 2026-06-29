"use client"

import { useState } from "react"

export function FinalizeInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function finalize() {
    setLoading(true)

    const res = await fetch("/api/admin/overages/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: invoiceId }),
    })

    if (!res.ok) {
      alert("Failed to finalize invoice")
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <span className="text-green-600 text-sm font-medium">
        Finalized
      </span>
    )
  }

  return (
    <button
      onClick={finalize}
      disabled={loading}
      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? "Finalizing…" : "Finalize Invoice"}
    </button>
  )
}