import { createServerSupabaseClient } from "@/lib/supabaseServer"

const DEFAULT_MARKUP_PERCENT = 20

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
interface ResolvedInvoiceLine {
  org_id: string

  vendor: string
  vendor_subscription_id: string

  sku: string
  product_name: string
  category?: string | null

  quantity: number

  unit_cost: number
  unit_price: number
  line_total: number

  billing_cycle: string
}

/* -------------------------------------------------
   RESOLUTION ENGINE
------------------------------------------------- */
export async function resolveInvoiceLinesForOrg(orgId: string) {
  const supabase = await createServerSupabaseClient()

  /* -------------------------------------------
     Fetch active vendor subscriptions
  -------------------------------------------- */
  const { data: subs, error: subErr } = await supabase
    .from("vendor_subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")

  if (subErr) throw subErr
  if (!subs || !subs.length) return []

  const vendor = subs[0].vendor
  const skus = subs.map((s) => s.sku)

  /* -------------------------------------------
     Fetch vendor products
  -------------------------------------------- */
  const { data: products, error: prodErr } = await supabase
    .from("vendor_products")
    .select("*")
    .eq("vendor", vendor)
    .in("sku", skus)

  if (prodErr) throw prodErr

  const productMap = new Map(
    products.map((p) => [p.sku, p])
  )

  /* -------------------------------------------
     Fetch contract (if any)
  -------------------------------------------- */
  const { data: contract } = await supabase
    .from("contracts")
    .select("markup_percent")
    .eq("org_id", orgId)
    .eq("status", "active")
    .maybeSingle()

  const markupPercent =
    contract?.markup_percent ?? DEFAULT_MARKUP_PERCENT

  /* -------------------------------------------
     Resolve invoice lines
  -------------------------------------------- */
  const lines: ResolvedInvoiceLine[] = subs.map((sub) => {
    const product = productMap.get(sub.sku)

    if (!product) {
      throw new Error(
        `No vendor_product found for SKU ${sub.sku} (${sub.vendor})`
      )
    }

    const unitPrice =
      sub.unit_cost * (1 + markupPercent / 100)

    return {
      org_id: orgId,

      vendor: sub.vendor,
      vendor_subscription_id: sub.vendor_subscription_id,

      sku: sub.sku,
      product_name: product.product_name,
      category: product.category,

      quantity: sub.quantity,

      unit_cost: sub.unit_cost,
      unit_price: Number(unitPrice.toFixed(2)),
      line_total: Number(
        (unitPrice * sub.quantity).toFixed(2)
      ),

      billing_cycle: sub.billing_cycle,
    }
  })

  return lines
}
