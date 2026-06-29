import { stripe } from "@/lib/stripePlatform"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getProfile } from "@/lib/getProfile"
import { redirect } from "next/navigation"

export const runtime = "nodejs"

/* -------------------------------------------------
   READ MODELS
------------------------------------------------- */
type FinanceInvoiceRow = {
  invoice_id: string
  contract_id: string | null
  org_id: string | null
  customer_id: string
  status: string
  amount_due: number
  amount_paid: number
  currency: string
  created: number
  hosted_invoice_url: string | null
}

export default async function FinanceInvoicesPage() {
  /* ---------------------------------------------
     1. Role gate
  --------------------------------------------- */
  const profile = await getProfile()

  if (!profile || !["finance", "master_admin"].includes(profile.role)) {
    redirect("/dashboard")
  }

  /* ---------------------------------------------
     2. Load recent Stripe invoices (authoritative)
  --------------------------------------------- */
  const invoices = await stripe.invoices.list({
    limit: 50,
    expand: ["data.customer"],
  })

  /* ---------------------------------------------
     3. Resolve contract + org mapping (Supabase)
     SAFE: no joins, explicit lookup
  --------------------------------------------- */
  const contractIds = invoices.data
    .map(i => i.metadata?.contract_id)
    .filter(Boolean) as string[]

  const { data: contracts } = await supabaseAdmin
    .from("contracts")
    .select("id, org_id")
    .in("id", contractIds)

  const contractMap = new Map(
    (contracts ?? []).map(c => [c.id, c])
  )

  /* ---------------------------------------------
     4. Normalize rows
  --------------------------------------------- */
  const rows: FinanceInvoiceRow[] = invoices.data.map(inv => {
    const contractId = inv.metadata?.contract_id ?? null
    const contract = contractId ? contractMap.get(contractId) : null

    return {
      invoice_id: inv.id,
      contract_id: contractId,
      org_id: contract?.org_id ?? null,
      customer_id: String(inv.customer),
      status: inv.status ?? "unknown",
      amount_due: inv.amount_due ?? 0,
      amount_paid: inv.amount_paid ?? 0,
      currency: inv.currency ?? "usd",
      created: inv.created,
      hosted_invoice_url: inv.hosted_invoice_url ?? null,
    }
  })

  /* ---------------------------------------------
     5. Render (READ-ONLY + ACTIONS)
  --------------------------------------------- */
  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        <p className="text-sm text-slate-400">
          Finance view of invoice lifecycle and payment status.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
        <table className="w-full border-collapse text-sm">
          <thead className="border-b border-slate-800 bg-slate-900 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Amount Due</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Currency</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {rows.map(row => (
              <tr
                key={row.invoice_id}
                className="hover:bg-slate-900 transition"
              >
                <td className="px-4 py-2 font-mono text-xs text-slate-300">
                  {row.invoice_id}
                </td>

                <td className="px-4 py-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium
                      ${
                        row.status === "paid"
                          ? "bg-emerald-900 text-emerald-300"
                          : row.status === "open"
                          ? "bg-amber-900 text-amber-300"
                          : "bg-slate-800 text-slate-300"
                      }`}
                  >
                    {row.status}
                  </span>
                </td>

                <td className="px-4 py-2 text-slate-100">
                  {(row.amount_due / 100).toFixed(2)}
                </td>

                <td className="px-4 py-2 text-slate-100">
                  {(row.amount_paid / 100).toFixed(2)}
                </td>

                <td className="px-4 py-2 uppercase text-slate-300">
                  {row.currency}
                </td>

                <td className="px-4 py-2 text-xs text-slate-400">
                  {new Date(row.created * 1000).toLocaleString()}
                </td>

                <td className="px-4 py-2 flex gap-3">
                  {row.hosted_invoice_url && (
                    <a
                      href={row.hosted_invoice_url}
                      target="_blank"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      View
                    </a>
                  )}

                  {row.status === "draft" && (
                    <form
                      action={async () => {
                        "use server"
                        await fetch(
                          "/api/admin/finance/invoices/finalize",
                          {
                            method: "POST",
                            body: JSON.stringify({
                              invoice_id: row.invoice_id,
                            }),
                          }
                        )
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                      >
                        Finalize
                      </button>
                    </form>
                  )}

                  {row.status === "open" && (
                    <form
                      action={async () => {
                        "use server"
                        await fetch(
                          "/api/admin/finance/invoices/void",
                          {
                            method: "POST",
                            body: JSON.stringify({
                              invoice_id: row.invoice_id,
                            }),
                          }
                        )
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-500"
                      >
                        Void
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  No invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}