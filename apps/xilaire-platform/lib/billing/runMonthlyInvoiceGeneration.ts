import { createServerSupabaseClient } from "@/lib/supabaseServer"

/* -------------------------------------------------
   BILLING PERIOD UTIL
------------------------------------------------- */
function getPreviousMonthPeriod(runDate: Date) {
  const periodStart = new Date(
    runDate.getFullYear(),
    runDate.getMonth() - 1,
    1
  )

  const periodEnd = new Date(
    runDate.getFullYear(),
    runDate.getMonth(),
    0
  )

  return {
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
  }
}

/* -------------------------------------------------
   MONTHLY INVOICE GENERATION JOB
------------------------------------------------- */
export async function runMonthlyInvoiceGeneration(
  runDate = new Date()
) {
  const supabase = await createServerSupabaseClient()
  const { periodStart, periodEnd } = getPreviousMonthPeriod(runDate)

  /* ---------------------------------------------
     1️⃣ Fetch active monthly contracts
  --------------------------------------------- */
  const { data: contracts, error: contractError } =
    await supabase
      .from("contracts")
      .select(`
        id,
        org_id,
        monthly_amount,
        start_date,
        end_date
      `)
      .eq("status", "active")
      .eq("billing_interval", "monthly")

  if (contractError) throw contractError
  if (!contracts?.length) return

  /* ---------------------------------------------
     2️⃣ Generate invoices (idempotent)
  --------------------------------------------- */
  for (const contract of contracts) {
    // Skip if contract not active during period
    if (
      contract.start_date > periodEnd ||
      (contract.end_date && contract.end_date < periodStart)
    ) {
      continue
    }

    // Idempotency check
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .maybeSingle()

    if (existing) continue

    // Create invoice
    const { error: insertError } = await supabase
      .from("invoices")
      .insert({
        org_id: contract.org_id,
        contract_id: contract.id,
        period_start: periodStart,
        period_end: periodEnd,
        total_amount: contract.monthly_amount,
        status: "draft",
      })

    if (insertError) {
      throw insertError
    }
  }
}
