import { notFound } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabaseServer"

interface PageProps {
  params: { id: string }
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient()

  /* -------------------------------------------------
     LOAD INVOICE (SOURCE OF TRUTH)
  ------------------------------------------------- */
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !invoice) {
    notFound()
  }

  /* -------------------------------------------------
     DERIVED UI STATE (STRIPE IS SOURCE OF TRUTH)
  ------------------------------------------------- */
  const stripeStatus = invoice.stripe_invoice_status
  const isPaid = stripeStatus === "paid"
  const isOverdue = stripeStatus === "overdue"
  const canPay =
    stripeStatus === "open" &&
    !!invoice.hosted_invoice_url

  /* -------------------------------------------------
     RENDER
  ------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* -------------------------------------------
          HEADER
      -------------------------------------------- */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Invoice #{invoice.id.slice(0, 8)}
        </h1>

        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
            ${
              isPaid
                ? "bg-green-100 text-green-800"
                : isOverdue
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
        >
          {stripeStatus.toUpperCase()}
        </span>
      </div>

      {/* -------------------------------------------
          DETAILS
      -------------------------------------------- */}
      <div className="rounded border p-4 space-y-2">
        <div>
          <strong>Period:</strong>{" "}
          {invoice.period_start} → {invoice.period_end}
        </div>

        <div>
          <strong>Total:</strong> ${invoice.total_amount}
        </div>

        {invoice.paid_at && (
          <div>
            <strong>Paid at:</strong>{" "}
            {new Date(invoice.paid_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* -------------------------------------------
          ACTIONS
      -------------------------------------------- */}
      {canPay && (
        <a
          href={invoice.hosted_invoice_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Pay Invoice
        </a>
      )}

      {isPaid && (
        <div className="font-medium text-green-700">
          ✅ This invoice has been paid.
        </div>
      )}
    </div>
  )
}
