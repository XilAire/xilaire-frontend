import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { stripe } from "@/lib/stripePlatform"
import { OVERAGE_SKU_MAP } from "./overageSkuMap"
import { getOverageSummaryForContract } from "@/lib/getOverageSummary"

/* -------------------------------------------------
   CREATE DRAFT OVERAGE INVOICE (NO AUTO-SEND)
------------------------------------------------- */
export async function createOverageDraftInvoice(contractId: string) {
  /* ---------------------------------------------
     1. Resolve contract → Stripe customer
  --------------------------------------------- */
  const { data: contract, error: contractError } = await supabaseAdmin
    .from("contracts")
    .select("id, stripe_customer_id")
    .eq("id", contractId)
    .single()

  if (contractError || !contract?.stripe_customer_id) {
    throw new Error("CONTRACT_OR_CUSTOMER_NOT_FOUND")
  }

  /* ---------------------------------------------
     2. Load derived overages (VIEW-BASED)
  --------------------------------------------- */
  const overages = await getOverageSummaryForContract(contractId)

  if (overages.length === 0) {
    return { created: false, reason: "NO_OVERAGES" }
  }

  /* ---------------------------------------------
     3. Create DRAFT invoice (finance-controlled)
  --------------------------------------------- */
  const invoice = await stripe.invoices.create({
    customer: contract.stripe_customer_id,
    auto_advance: false, // 🚫 DO NOT FINALIZE
    collection_method: "send_invoice",
    days_until_due: 30,
    metadata: {
      contract_id: contractId,
      source: "entitlement_overage",
    },
  })

  /* ---------------------------------------------
     4. Create invoice items (TYPE-SAFE)
  --------------------------------------------- */
  for (const row of overages) {
    const sku = OVERAGE_SKU_MAP[row.entitlement_type]

    if (!sku) {
      throw new Error(`MISSING_SKU_FOR_${row.entitlement_type}`)
    }

    /* Resolve Stripe price to product + amount */
    const price = await stripe.prices.retrieve(
      sku.stripe_price_id
    )

    if (!price.unit_amount || !price.currency || !price.product) {
      throw new Error(`INVALID_STRIPE_PRICE_${sku.stripe_price_id}`)
    }

    await stripe.invoiceItems.create({
      customer: contract.stripe_customer_id,
      invoice: invoice.id,

      price_data: {
        currency: price.currency,
        unit_amount: price.unit_amount,
        product: typeof price.product === "string"
          ? price.product
          : price.product.id,
      },

      quantity: row.overage_quantity,

      description: `${sku.description} (${row.first_overage_at} → ${row.last_overage_at})`,

      metadata: {
        contract_id: row.contract_id,
        entitlement_type: row.entitlement_type,
      },
    })
  }

  /* ---------------------------------------------
     5. Return authoritative result
  --------------------------------------------- */
  return {
    created: true,
    invoice_id: invoice.id,
    line_items: overages.length,
  }
}