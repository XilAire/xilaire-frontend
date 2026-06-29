import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import Stripe from "stripe"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

/* =================================================
   ENV VALIDATION
================================================= */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY_PLATFORM

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM")
}

if (!SERVICE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM")
}

if (!ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM")
}

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY_PLATFORM")
}

/* =================================================
   CLIENTS
================================================= */

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

const authClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
})

const stripe = new Stripe(STRIPE_SECRET_KEY)

/* =================================================
   RESPONSE HEADERS
================================================= */

const NO_STORE_HEADERS: HeadersInit = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
}

/* =================================================
   STATUS CONFIG (MATCHES DATABASE)
================================================= */

const VALID_STATUSES = [
  "pipeline",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]

/* =================================================
   TOKEN RESOLUTION
================================================= */

function resolveToken(req: Request) {
  const authHeader = req.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim()
  }

  const cookieStore = cookies()

  return (
    cookieStore.get("sb-access-token")?.value ||
    cookieStore.get("sb-access-token.0")?.value ||
    cookieStore.get("sb-access-token.1")?.value ||
    null
  )
}

/* =================================================
   POST /api/infrastructure/project/update
================================================= */

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const id = String(body?.id || "").trim()
    const updates = body?.updates

    if (!id) {
      return NextResponse.json(
        { error: "Missing project id" },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Invalid updates payload" },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    /* -------------------------------------------------
       AUTH
    ------------------------------------------------- */

    const token = resolveToken(req)

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      )
    }

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token)

    if (authError || !user) {
      console.error("PROJECT_UPDATE_AUTH_ERROR:", authError)

      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      )
    }

    const org_id = String(
      user.user_metadata?.org_id ||
      user.app_metadata?.org_id ||
      ""
    ).trim()

    if (!org_id) {
      return NextResponse.json(
        { error: "Invalid token — missing org_id" },
        { status: 403, headers: NO_STORE_HEADERS }
      )
    }

    /* -------------------------------------------------
       FETCH PROJECT
    ------------------------------------------------- */

    const { data: existing, error: fetchError } = await supabase
      .from("infrastructure_projects")
      .select("*")
      .eq("id", id)
      .eq("org_id", org_id)
      .single()

    if (fetchError || !existing) {
      console.error("PROJECT_UPDATE_FETCH_ERROR:", fetchError)

      return NextResponse.json(
        { error: "Project not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      )
    }

    /* -------------------------------------------------
       STATUS VALIDATION
    ------------------------------------------------- */

    const currentStatus = String(existing.status || "").trim()
    const rawNewStatus =
      typeof updates.status === "string"
        ? updates.status.trim()
        : undefined

    if (rawNewStatus && !VALID_STATUSES.includes(rawNewStatus)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    /* -------------------------------------------------
       BUILD SAFE UPDATE PAYLOAD
    ------------------------------------------------- */

    const safeUpdates: Record<string, any> = {}

    if (typeof updates.status === "string") {
      safeUpdates.status = updates.status.trim()
    }

    if (typeof updates.client_name === "string") {
      safeUpdates.client_name = updates.client_name.trim()
    }

    if (typeof updates.project_name === "string") {
      safeUpdates.project_name = updates.project_name.trim()
    }

    if (typeof updates.project_type === "string") {
      safeUpdates.project_type = updates.project_type.trim() || null
    }

    if (typeof updates.project_address === "string") {
      safeUpdates.project_address = updates.project_address.trim() || null
    }

    if (typeof updates.project_value !== "undefined") {
      safeUpdates.project_value = Number(updates.project_value || 0)
    }

    if (typeof updates.electrical_wholesale !== "undefined") {
      safeUpdates.electrical_wholesale = Number(updates.electrical_wholesale || 0)
    }

    if (typeof updates.tech_cost !== "undefined") {
      safeUpdates.tech_cost = Number(updates.tech_cost || 0)
    }

    if (typeof updates.projected_margin !== "undefined") {
      safeUpdates.projected_margin = Number(updates.projected_margin || 0)
    }

    if (typeof updates.permit_required === "boolean") {
      safeUpdates.permit_required = updates.permit_required
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    /* -------------------------------------------------
       UPDATE PROJECT
    ------------------------------------------------- */

    const { data: updatedProject, error: updateError } = await supabase
      .from("infrastructure_projects")
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("org_id", org_id)
      .select()
      .single()

    if (updateError) {
      console.error("PROJECT_UPDATE_QUERY_ERROR:", updateError)
      throw updateError
    }

    /* -------------------------------------------------
       STATUS CHANGE LOG
    ------------------------------------------------- */

    if (rawNewStatus && rawNewStatus !== currentStatus) {
      await supabase.from("infrastructure_project_logs").insert({
        project_id: id,
        log_type: "status_change",
        message: `Status changed from ${currentStatus} to ${rawNewStatus}`,
      })
    }

    /* -------------------------------------------------
       BILLING ACTIVATION (IN PROGRESS)
    ------------------------------------------------- */

    if (rawNewStatus === "in_progress") {
      const { data: recurring, error: recurringError } = await supabase
        .from("infrastructure_recurring")
        .select("*")
        .eq("project_id", id)
        .eq("active", true)

      if (recurringError) {
        console.error("PROJECT_UPDATE_RECURRING_FETCH_ERROR:", recurringError)
      }

      if (recurring && recurring.length > 0) {
        let stripeCustomerId = existing.stripe_customer_id

        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            name: existing.client_name,
            metadata: { project_id: id },
          })

          stripeCustomerId = customer.id

          await supabase
            .from("infrastructure_projects")
            .update({ stripe_customer_id: stripeCustomerId })
            .eq("id", id)
            .eq("org_id", org_id)
        }

        for (const service of recurring) {
          if (service.stripe_subscription_id) continue

          const monthlyAmount = Number(service.monthly_amount || 0)

          const product = await stripe.products.create({
            name: service.service_type,
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
          })

          await supabase
            .from("infrastructure_recurring")
            .update({
              stripe_subscription_id: subscription.id,
              stripe_customer_id: stripeCustomerId,
              stripe_price_id: price.id,
              billing_status: "active",
            })
            .eq("id", service.id)

          await supabase.from("infrastructure_project_logs").insert({
            project_id: id,
            log_type: "stripe_subscription_created",
            message: `Stripe subscription created for ${service.service_type}`,
          })
        }
      }
    }

    /* -------------------------------------------------
       BILLING CANCELLATION
    ------------------------------------------------- */

    if (rawNewStatus === "cancelled") {
      const { data: recurring, error: recurringError } = await supabase
        .from("infrastructure_recurring")
        .select("*")
        .eq("project_id", id)
        .not("stripe_subscription_id", "is", null)

      if (recurringError) {
        console.error("PROJECT_UPDATE_RECURRING_CANCEL_FETCH_ERROR:", recurringError)
      }

      if (recurring && recurring.length > 0) {
        for (const service of recurring) {
          if (!service.stripe_subscription_id) continue

          await stripe.subscriptions.cancel(service.stripe_subscription_id)

          await supabase
            .from("infrastructure_recurring")
            .update({
              billing_status: "cancelled",
            })
            .eq("id", service.id)

          await supabase.from("infrastructure_project_logs").insert({
            project_id: id,
            log_type: "stripe_subscription_cancelled",
            message: `Stripe subscription cancelled for ${service.service_type}`,
          })
        }
      }
    }

    /* -------------------------------------------------
       RESPONSE
    ------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,
        project: updatedProject,
      },
      {
        status: 200,
        headers: NO_STORE_HEADERS,
      }
    )
  } catch (err) {
    console.error("UPDATE_INFRA_PROJECT_ERROR:", err)

    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}