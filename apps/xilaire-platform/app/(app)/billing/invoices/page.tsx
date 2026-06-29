"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabasePlatform } from "@/lib/supabasePlatformClient"

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type Invoice = {
  id: string
  period_start: string
  period_end: string
  status: string
  total_amount: number
  hosted_invoice_url?: string | null
  created_at: string
}

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
function getInvoiceBadge(inv: Invoice) {
  if (inv.status === "paid") {
    return { label: "Paid", color: "bg-emerald-600" }
  }

  if (inv.status === "open") {
    return { label: "Awaiting Payment", color: "bg-amber-500" }
  }

  if (inv.status === "draft") {
    return { label: "Draft", color: "bg-slate-500" }
  }

  return { label: "Locked", color: "bg-slate-700" }
}

/* -------------------------------------------------
   PAGE
------------------------------------------------- */
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    setLoading(true)

    const { data, error } = await supabasePlatform
      .from("invoices")
      .select(`
        id,
        period_start,
        period_end,
        status,
        total_amount,
        hosted_invoice_url,
        created_at
      `)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setInvoices(data)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Loading invoices…
      </p>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Invoices</h1>
      </div>

      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        {/* HEADER */}
        <div
          className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide
                     text-slate-400
                     bg-slate-900/60
                     border-b border-slate-700/60"
        >
          <div className="col-span-4">Period</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Total</div>
          <div className="col-span-4 text-right">Actions</div>
        </div>

        {/* ROWS */}
        {invoices.length === 0 && (
          <p className="p-6 text-sm text-slate-500">
            No invoices found.
          </p>
        )}

        {invoices.map((inv) => {
          const badge = getInvoiceBadge(inv)

          const canPay =
            inv.status === "open" && !!inv.hosted_invoice_url

          const canDownload =
            inv.status !== "draft" && !!inv.hosted_invoice_url

          return (
            <div
              key={inv.id}
              className="grid grid-cols-12 gap-4 items-center px-6 py-4 border-b border-slate-800"
            >
              {/* PERIOD */}
              <div className="col-span-4">
                <p className="font-medium text-sm">
                  {inv.period_start} → {inv.period_end}
                </p>
                <p className="text-xs text-slate-500">
                  #{inv.id.slice(0, 8)}
                </p>
              </div>

              {/* STATUS */}
              <div className="col-span-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white ${badge.color}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* TOTAL */}
              <div className="col-span-2 text-sm font-medium">
                ${inv.total_amount.toFixed(2)}
              </div>

              {/* ACTIONS */}
              <div className="col-span-4 flex justify-end gap-2">
                <Link
                  href={`/billing/invoices/${inv.id}`}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800"
                >
                  View
                </Link>

                {canDownload && (
                  <a
                    href={inv.hosted_invoice_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800"
                  >
                    PDF
                  </a>
                )}

                {canPay && (
                  <a
                    href={inv.hosted_invoice_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                  >
                    Pay
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
