import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

/* -------------------------------------------------
   READ MODELS (DERIVED OVERAGES)
------------------------------------------------- */

type DerivedOverageRow = {
  usage_id: string
  contract_id: string
  entitlement_id: string
  entitlement_type: string
  quantity_used: number
  quantity_allocated: number
  overage_amount: number
  usage_type: string
  work_item_id: string
  occurred_at: string
}

/* -------------------------------------------------
   PAGE
------------------------------------------------- */

export default async function AdminOveragesPage() {
  /**
   * Overages are DERIVED from entitlement_usage
   * joined against contract_entitlements.
   */
  const { data, error } = await supabaseAdmin
    .from("entitlement_usage")
    .select(`
      id,
      contract_id,
      entitlement_id,
      quantity_used,
      usage_type,
      work_item_id,
      occurred_at,
      contract_entitlements (
        id,
        entitlement_type,
        quantity
      )
    `)
    .order("occurred_at", { ascending: false })

  if (error) {
    console.error("Overage admin load failed:", error)
    throw new Error("Failed to load overages")
  }

  /* -------------------------------------------------
     DERIVE OVERAGES (AUTHORITATIVE)
  ------------------------------------------------- */

  const overages: DerivedOverageRow[] = (data ?? [])
    .filter((row: any) => {
      const allocated = Number(row.contract_entitlements?.quantity ?? 0)
      return Number(row.quantity_used) > allocated
    })
    .map((row: any) => {
      const allocated = Number(row.contract_entitlements.quantity)
      const used = Number(row.quantity_used)

      return {
        usage_id: row.id,
        contract_id: row.contract_id,
        entitlement_id: row.entitlement_id,
        entitlement_type: row.contract_entitlements.entitlement_type,
        quantity_used: used,
        quantity_allocated: allocated,
        overage_amount: used - allocated,
        usage_type: row.usage_type,
        work_item_id: row.work_item_id,
        occurred_at: row.occurred_at,
      }
    })

  return (
    <section className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-slate-100">
          Entitlement Overages
        </h1>
        <p className="text-sm text-slate-400">
          Read-only derived view of entitlement usage exceeding contract limits.
        </p>
      </header>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="px-4 py-3">Contract</th>
              <th className="px-4 py-3">Entitlement</th>
              <th className="px-4 py-3">Allocated</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Overage</th>
              <th className="px-4 py-3">Usage Type</th>
              <th className="px-4 py-3">Work Item</th>
              <th className="px-4 py-3">Occurred</th>
            </tr>
          </thead>

          <tbody>
            {overages.map((row) => (
              <tr
                key={row.usage_id}
                className="border-b border-slate-800 last:border-0"
              >
                <td className="px-4 py-2 text-slate-200">
                  {row.contract_id}
                </td>

                <td className="px-4 py-2 font-medium text-red-300">
                  {row.entitlement_type}
                </td>

                <td className="px-4 py-2 text-slate-200">
                  {row.quantity_allocated}
                </td>

                <td className="px-4 py-2 text-slate-200">
                  {row.quantity_used}
                </td>

                <td className="px-4 py-2 font-semibold text-red-400">
                  +{row.overage_amount}
                </td>

                <td className="px-4 py-2 text-slate-200">
                  {row.usage_type}
                </td>

                <td className="px-4 py-2 text-slate-200">
                  {row.work_item_id}
                </td>

                <td className="px-4 py-2 text-slate-200">
                  {new Date(row.occurred_at).toLocaleString()}
                </td>
              </tr>
            ))}

            {overages.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No entitlement overages detected.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}