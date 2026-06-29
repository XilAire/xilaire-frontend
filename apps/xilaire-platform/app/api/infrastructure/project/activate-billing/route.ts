import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import Stripe from "stripe"

export const runtime = "nodejs"

/* =================================================
   STRIPE CLIENT
================================================= */

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY_PLATFORM!,
)

/* =================================================
   SUPABASE CLIENT
================================================= */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!,
  { auth: { persistSession: false } }
)

/* =================================================
   POST /api/infrastructure/project/activate-billing
================================================= */

export async function POST(req: Request) {
  try {
    const { project_id } = await req.json()

    if (!project_id) {
      return NextResponse.json(
        { error: "Missing project_id" },
        { status: 400 }
      )
    }

    /* -------------------------------------------------
       Extract org_id from JWT (safe parse)
    ------------------------------------------------- */

    const cookieStore = cookies()
    const token = cookieStore.get("sb-access-token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let payload: any
    try {
      payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      )
    } catch {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 401 }
      )
    }

    const org_id = payload?.org_id

    if (!org_id) {
      return NextResponse.json(
        { error: "Invalid token — missing org_id" },
        { status: 403 }
      )
    }

    /* -------------------------------------------------
       Fetch project (org scoped)
    ------------------------------------------------- */

    const { data: project } = await supabase
      .from("infrastructure_projects")
      .select(`
        id,
        client_name,
        stripe_customer_id
      `)
      .eq("id", project_id)
      .eq("org_id", org_id)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    /* -------------------------------------------------
       Fetch active recurring services
    ------------------------------------------------- */

    const { data: recurringServices } = await supabase
      .from("infrastructure_recurring")
      .select(`
        id,
        service_type,
        monthly_amount,
        stripe_subscription_id
      `)
      .eq("project_id", project_id)
      .eq("active", true)

    if (!recurringServices || recurringServices.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No recurring services to activate",
      })
    }

    /* -------------------------------------------------
       Create or reuse Stripe customer
    ------------------------------------------------- */

    let stripeCustomerId = project.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: project.client_name ?? "Infrastructure Client",
        metadata: { project_id },
      })

      stripeCustomerId = customer.id

      await supabase
        .from("infrastructure_projects")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", project_id)
    }

    /* -------------------------------------------------
       Create subscriptions per service
    ------------------------------------------------- */

    for (const service of recurringServices) {

      // Skip if already subscribed
      if (service.stripe_subscription_id) continue

      const monthlyAmount = Number(service.monthly_amount || 0)

      if (monthlyAmount <= 0) continue

      const product = await stripe.products.create({
        name: `Infrastructure – ${service.service_type}`,
        metadata: {
          project_id,
          service_id: service.id,
        },
      })

      const price = await stripe.prices.create({
        unit_amount: Math.round(monthlyAmount * 100),
        currency: "usd",
        recurring: { interval: "month" },
        product: product.id,
      })

      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: price.id }],
        metadata: {
          project_id,
          service_id: service.id,
        },
      })

      await supabase
        .from("infrastructure_recurring")
        .update({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: stripeCustomerId,
          stripe_price_id: price.id,
          billing_status: subscription.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", service.id)

      await supabase
        .from("infrastructure_project_logs")
        .insert({
          project_id,
          log_type: "stripe_subscription_created",
          message: `Stripe subscription created for ${service.service_type}`,
          created_at: new Date().toISOString(),
        })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error("ACTIVATE_BILLING_ERROR:", err)

    return NextResponse.json(
      { error: "Failed to activate billing" },
      { status: 500 }
    )
  }
}