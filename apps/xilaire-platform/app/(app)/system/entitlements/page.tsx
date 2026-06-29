import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

/* -------------------------------------------------
   TYPES (ADMIN READ-ONLY)
------------------------------------------------- */

type EntitlementUsage = {
  quantity_used: number | null
}

type ContractEntitlement = {
  id: string
  entitlement_type: string
  quantity: number
  period: string
  entitlement_usage: EntitlementUsage[]
}

type ContractWithEntitlements = {
  id: string
  org_id: string | null
  stripe_subscription_status: string
  created_at: string
  contract_entitlements: ContractEntitlement[]
}

/* -------------------------------------------------
   HELPERS (DISPLAY ONLY)
------------------------------------------------- */

function getEntitlementStatus(allocated: number, used: number) {
  const remaining = allocated - used
  const remainingPercent =
    allocated > 0 ? remaining / allocated : 0

  if (remaining <= 0) return "exceeded"
  if (remainingPercent <= 0.25) return "warning"
  return "ok"
}

function StatusBadge({ status }: { status: "ok" | "warning" | "exceeded" }) {
  if (status === "exceeded") {
    return (
      <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-300">
        Exceeded
      </span>
    )
  }

  if (status === "warning") {
    return (
      <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs font-medium text-yellow-300">
        Low
      </span>
    )
  }

  return (
    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
      OK
    </span>
  )
}

/* -------------------------------------------------
   PAGE
------------------------------------------------- */

export default async function AdminEntitlementsPage() {
  const { data, error } = await supabaseAdmin
    .from("contracts")
    .select(`
      id,
      org_id,
      stripe_subscription_status,
      created_at,
      contract_entitlements (
        id,
        entitlement_type,
        quantity,
        period,
        entitlement_usage (
          quantity_used
        )
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Entitlement admin load failed:", error)
    throw new Error("Failed to load entitlements")
  }

  const contracts = (data ?? []) as ContractWithEntitlements[]

  return (
    <section className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-slate-100">
          Entitlements
        </h1>
        <p className="text-sm text-slate-400">
          Read-only view of contract entitlements and usage.
          Soft warnings indicate low or exceeded usage.
        </p>
      </header>

      {/* Contracts */}
      <div className="space-y-6">
        {contracts.map((contract) => (
          <div
            key={contract.id}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-md"
          >
            {/* Contract Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-100">
                  Contract
                </h2>
                <p className="text-xs text-slate-400">
                  Contract ID: {contract.id}
                </p>
              </div>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                {contract.stripe_subscription_status}
              </span>
            </div>

            {/* Entitlements Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="py-2">Entitlement</th>
                    <th className="py-2">Period</th>
                    <th className="py-2">Allocated</th>
                    <th className="py-2">Used</th>
                    <th className="py-2">Remaining</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {contract.contract_entitlements.map((entitlement) => {
                    const used =
                      entitlement.entitlement_usage?.reduce(
                        (sum, row) => sum + (row.quantity_used ?? 0),
                        0
                      ) ?? 0

                    const allocated = entitlement.quantity
                    const remaining = Math.max(allocated - used, 0)
                    const status = getEntitlementStatus(
                      allocated,
                      used
                    )

                    return (
                      <tr
                        key={entitlement.id}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <td className="py-2 font-medium text-slate-100">
                          {entitlement.entitlement_type}
                        </td>
                        <td className="py-2 text-slate-200">
                          {entitlement.period}
                        </td>
                        <td className="py-2 text-slate-200">
                          {allocated}
                        </td>
                        <td className="py-2 text-slate-200">
                          {used}
                        </td>
                        <td className="py-2 text-slate-200">
                          {remaining}
                        </td>
                        <td className="py-2">
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    )
                  })}

                  {contract.contract_entitlements.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-4 text-center text-slate-500"
                      >
                        No entitlements assigned to this contract.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {contracts.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 text-center text-slate-400">
            No contracts found.
          </div>
        )}
      </div>
    </section>
  )
}