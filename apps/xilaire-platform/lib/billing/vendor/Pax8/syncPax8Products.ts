import { createServerSupabaseClient } from "@/lib/supabaseServer"

/* -------------------------------------------------
   TYPES — Pax8 Product (Minimal)
------------------------------------------------- */
interface Pax8Product {
  id: string
  sku: string
  name: string
  description?: string
  category?: string
  listPrice?: number
  billingCycle?: "monthly" | "annual" | "usage"
  status: "active" | "inactive"
}

/* -------------------------------------------------
   PAX8 API CLIENT — PRODUCT CATALOG (READ-ONLY)
------------------------------------------------- */
async function fetchPax8Products(): Promise<Pax8Product[]> {
  const res = await fetch("https://api.pax8.com/v1/products", {
    headers: {
      Authorization: `Bearer ${process.env.PAX8_API_TOKEN}`,
      Accept: "application/json",
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pax8 API error (products): ${body}`)
  }

  return res.json()
}

/* -------------------------------------------------
   NORMALIZER — Pax8 → vendor_products
------------------------------------------------- */
function normalize(product: Pax8Product) {
  return {
    vendor: "pax8",
    vendor_product_id: product.id,
    sku: product.sku,
    product_name: product.name,
    description: product.description ?? null,
    category: product.category ?? null,
    list_price: product.listPrice ?? null,
    billing_cycle: product.billingCycle ?? null,
    is_active: product.status === "active",
    synced_at: new Date().toISOString(),
  }
}

/* -------------------------------------------------
   SYNC JOB — IDEMPOTENT, SERVICE ROLE
------------------------------------------------- */
export async function syncPax8Products() {
  const supabase = await createServerSupabaseClient()

  /* -------------------------------------------
     Fetch catalog from Pax8
  -------------------------------------------- */
  const products = await fetchPax8Products()

  if (!products.length) {
    return {
      vendor: "pax8",
      processed: 0,
      message: "No products returned from Pax8",
    }
  }

  /* -------------------------------------------
     Normalize
  -------------------------------------------- */
  const records = products.map(normalize)

  /* -------------------------------------------
     Upsert into vendor_products
  -------------------------------------------- */
  const { error } = await supabase
    .from("vendor_products")
    .upsert(records, {
      onConflict: "vendor,vendor_product_id",
    })

  if (error) throw error

  return {
    vendor: "pax8",
    processed: records.length,
    status: "success",
  }
}
