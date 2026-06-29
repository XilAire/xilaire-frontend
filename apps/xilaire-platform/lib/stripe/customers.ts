import { stripe } from "./server"
import { createServerSupabaseClient } from "@/lib/supabaseServer"

export async function getOrCreateStripeCustomer(orgId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: org, error } = await supabase
    .from("orgs")
    .select("id, name, stripe_customer_id")
    .eq("id", orgId)
    .single()

  if (error || !org) throw error

  if (org.stripe_customer_id) {
    return org.stripe_customer_id
  }

  const customer = await stripe.customers.create({
    name: org.name,
    metadata: { org_id: org.id },
  })

  await supabase
    .from("orgs")
    .update({ stripe_customer_id: customer.id })
    .eq("id", org.id)

  return customer.id
}
