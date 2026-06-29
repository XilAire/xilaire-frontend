import Stripe from "stripe"
import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

/* -------------------------------------------------
   STRIPE CLIENT (NO apiVersion — BY DESIGN)
------------------------------------------------- */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_PLATFORM!)

/* -------------------------------------------------
   SUPABASE — SERVICE ROLE
------------------------------------------------- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

/* -------------------------------------------------
   POST /api/stripe/portal
------------------------------------------------- */
export async function POST(req: NextRequest) {
  const { contract_id } = await req.json()

  if (!contract_id) {
    return new Response("Missing contract_id", { status: 400 })
  }

  /* -------------------------------------------------
     🔒 LOAD CONTRACT (AUTHORITATIVE)
  ------------------------------------------------- */
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("id, org_id, stripe_customer_id")
    .eq("id", contract_id)
    .single()

  if (error || !contract) {
    return new Response("Contract not found", { status: 404 })
  }

  if (!contract.stripe_customer_id) {
    return new Response(
      "Contract is not linked to a Stripe customer",
      { status: 400 }
    )
  }

  /* -------------------------------------------------
     🧾 CREATE STRIPE PORTAL SESSION
  ------------------------------------------------- */
  const session = await stripe.billingPortal.sessions.create({
    customer: contract.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL_PLATFORM}/billing`,
  })

  return Response.json({
    url: session.url,
  })
}
