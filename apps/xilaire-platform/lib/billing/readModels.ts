import { supabase } from "@/lib/supabaseClient"

/* -------------------------------------------------
   READ MODELS — UI SAFE (READ-ONLY)
------------------------------------------------- */

export async function getInvoicesNet() {
  const { data, error } = await supabase
    .from("v_invoice_net")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getInvoiceAging() {
  const { data, error } = await supabase
    .from("v_invoice_aging")
    .select("*")

  if (error) throw error
  return data ?? []
}

export async function getInvoiceMargins() {
  const { data, error } = await supabase
    .from("v_invoice_margin")
    .select("*")

  if (error) throw error
  return data ?? []
}
