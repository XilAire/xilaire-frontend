// apps/xilaire-platform/app/api/stripe/webhook/route.ts

import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { getGraphClient } from "@/lib/msGraph"
import jwt from "jsonwebtoken"

export const runtime = "nodejs"

/* =================================================
   ENV VALIDATION
================================================= */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY_PLATFORM!
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
const TOKEN_SECRET = process.env.BOOKING_TOKEN_SECRET!
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!

/* =================================================
   CLIENTS
================================================= */

const stripe = new Stripe(STRIPE_SECRET_KEY, )

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/* =================================================
   CONSTANTS
================================================= */

const BOOKING_MAILBOX = "booking@xilairetechnologies.com"
const GRAPH_TIMEZONE = "Eastern Standard Time"
const DISPLAY_TIMEZONE = "America/New_York"
const BOOKING_PAYMENT_TIMEOUT_MINUTES = 30

/* =================================================
   HELPERS
================================================= */

function buildGraphDateTime(iso: string) {
  return { dateTime: iso, timeZone: GRAPH_TIMEZONE }
}

function formatDateET(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: DISPLAY_TIMEZONE,
    dateStyle: "full",
    timeStyle: "short",
  })
}

function formatIcsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
}

function formatBookingTitle(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

/* =================================================
   WEBHOOK HANDLER
================================================= */

export async function POST(req: Request) {
  let claimedEventId: string | null = null
  let claimToken: string | null = null

  try {
    const rawBody = await req.text()
    const sig = req.headers.get("stripe-signature")
    if (!sig) return new Response("Missing signature", { status: 400 })

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET
      ) as Stripe.Event
    } catch (err) {
      console.error("Invalid signature:", err)
      return new Response("Invalid signature", { status: 400 })
    }

    /* =================================================
       IDEMPOTENCY GUARD
    ================================================= */

    const { data: claimRows, error: claimError } = await supabase.rpc(
      "claim_stripe_webhook_event",
      {
        p_event_id: event.id,
        p_event_type: event.type,
        p_api_version: event.api_version ?? null,
        p_livemode: event.livemode,
        p_payload: event,
      }
    )

    if (claimError) {
      console.error("Stripe event claim failed:", claimError)
      return new Response("Event claim failed", { status: 500 })
    }

    const claim = Array.isArray(claimRows) ? claimRows[0] : null

    if (!claim || typeof claim.outcome !== "string") {
      return new Response("Invalid event claim result", { status: 500 })
    }

    if (claim.outcome === "completed") {
      return new Response("OK", { status: 200 })
    }

    if (claim.outcome === "in_progress") {
      return new Response("Event already processing", { status: 503 })
    }

    if (
      claim.outcome === "legacy_review" ||
      claim.outcome === "manual_review"
    ) {
      return new Response("Event requires manual review", { status: 503 })
    }

    if (
      claim.outcome !== "claimed" ||
      typeof claim.token !== "string" ||
      !claim.token
    ) {
      return new Response("Event claim denied", { status: 500 })
    }

    claimedEventId = event.id
    claimToken = claim.token
        switch (event.type) {

      /* =================================================
         SUBSCRIPTION CREATED / UPDATED
      ================================================= */

      case "customer.subscription.created":
      case "customer.subscription.updated": {

        const subscription = event.data.object as Stripe.Subscription
        const stripeCustomerId = subscription.customer as string
        const stripeSubscriptionId = subscription.id
        const priceId = subscription.items.data[0]?.price?.id

        /* ---------------------------------------------
           CORE SAAS ENTITLEMENTS
        --------------------------------------------- */

        let { data: org } = await supabase
          .from("orgs")
          .select("*")
          .eq("stripe_customer_id", stripeCustomerId)
          .single()

        if (!org) {
          const customer = await stripe.customers.retrieve(stripeCustomerId)

          if ("email" in customer && customer.email) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("org_id")
              .eq("email", customer.email)
              .single()

            if (profile?.org_id) {
              await supabase
                .from("orgs")
                .update({ stripe_customer_id: stripeCustomerId })
                .eq("id", profile.org_id).throwOnError()

              const { data: refreshed } = await supabase
                .from("orgs")
                .select("*")
                .eq("id", profile.org_id)
                .single()

              org = refreshed
            }
          }
        }

        if (org && priceId) {
          await supabase
            .from("orgs")
            .update({ stripe_subscription_id: stripeSubscriptionId })
            .eq("id", org.id).throwOnError()

          await supabase
            .from("org_entitlements")
            .delete()
            .eq("org_id", org.id)
            .eq("source", "stripe_subscription").throwOnError()

          const { data: mappings } = await supabase
            .from("subscription_entitlement_map")
            .select("entitlement_key")
            .eq("stripe_price_id", priceId).throwOnError()

          if (mappings) {
            for (const m of mappings) {
              await supabase.from("org_entitlements").insert({
                org_id: org.id,
                entitlement_key: m.entitlement_key,
                status: "active",
                source: "stripe_subscription",
              }).throwOnError()
            }
          }
        }

        /* ---------------------------------------------
           INFRASTRUCTURE BILLING SYNC
        --------------------------------------------- */

        await supabase
          .from("infrastructure_recurring")
          .update({
            billing_status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id).throwOnError()

        break
      }
            /* =================================================
         SUBSCRIPTION DELETED
      ================================================= */

      case "customer.subscription.deleted": {

        const subscription = event.data.object as Stripe.Subscription
        const stripeCustomerId = subscription.customer as string

        /* ---------------------------------------------
           CORE SAAS CLEANUP
        --------------------------------------------- */

        const { data: org } = await supabase
          .from("orgs")
          .select("id")
          .eq("stripe_customer_id", stripeCustomerId)
          .single()

        if (org) {
          await supabase
            .from("org_entitlements")
            .delete()
            .eq("org_id", org.id)
            .eq("source", "stripe_subscription").throwOnError()

          await supabase
            .from("orgs")
            .update({ stripe_subscription_id: null })
            .eq("id", org.id).throwOnError()
        }

        /* ---------------------------------------------
           INFRASTRUCTURE CANCELLATION SYNC
        --------------------------------------------- */

        await supabase
          .from("infrastructure_recurring")
          .update({
            billing_status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id).throwOnError()

        const { data: recurring } = await supabase
          .from("infrastructure_recurring")
          .select("project_id")
          .eq("stripe_subscription_id", subscription.id)
          .single()

        if (recurring?.project_id) {
          await supabase
            .from("infrastructure_projects")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", recurring.project_id).throwOnError()

          await supabase.from("infrastructure_project_logs").insert({
            project_id: recurring.project_id,
            log_type: "subscription_cancelled",
            message: "Subscription cancelled in Stripe",
            created_at: new Date().toISOString(),
          }).throwOnError()
        }

        break
      }

      /* =================================================
         INVOICE PAID
      ================================================= */

      case "invoice.paid": {

        const invoice = event.data.object as any

        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? null

        if (subscriptionId) {

          await supabase
            .from("infrastructure_recurring")
            .update({
              billing_status: "paid",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId).throwOnError()

          const { data: recurring } = await supabase
            .from("infrastructure_recurring")
            .select("project_id")
            .eq("stripe_subscription_id", subscriptionId)
            .single()

          if (recurring?.project_id) {

            await supabase
              .from("infrastructure_projects")
              .update({
                status: "active",
                updated_at: new Date().toISOString(),
              })
              .eq("id", recurring.project_id).throwOnError()

            await supabase.from("infrastructure_project_logs").insert({
              project_id: recurring.project_id,
              log_type: "billing_restored",
              message: "Billing restored after successful payment",
              created_at: new Date().toISOString(),
            }).throwOnError()
          }
        }

        break
      }

      /* =================================================
         INVOICE PAYMENT FAILED
      ================================================= */

      case "invoice.payment_failed": {

        const invoice = event.data.object as any

        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? null

        if (subscriptionId) {

          await supabase
            .from("infrastructure_recurring")
            .update({
              billing_status: "payment_failed",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId).throwOnError()

          const { data: recurring } = await supabase
            .from("infrastructure_recurring")
            .select("project_id")
            .eq("stripe_subscription_id", subscriptionId)
            .single()

          if (recurring?.project_id) {

            await supabase
              .from("infrastructure_projects")
              .update({
                status: "billing_hold",
                updated_at: new Date().toISOString(),
              })
              .eq("id", recurring.project_id).throwOnError()

            await supabase.from("infrastructure_project_logs").insert({
              project_id: recurring.project_id,
              log_type: "billing_hold",
              message: "Project placed on billing hold due to payment failure",
              created_at: new Date().toISOString(),
            }).throwOnError()
          }
        }

        break
      }
            /* =================================================
         BOOKING FINALIZATION
      ================================================= */

      case "checkout.session.completed": {

        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode !== "payment") break

        const bookingId = session.metadata?.booking_id
        if (!bookingId) break

        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .single()

        if (bookingError || !booking) {
          throw new Error("CHECKOUT_BOOKING_LOOKUP_REQUIRES_RECONCILIATION")
        }
        // AUTH-04T-24Q-R2: New paid booking identity guard.
        // Do not claim or create a Graph event for an
        // unassociated or mismatched Checkout session.

        if (
          !session.client_reference_id ||
          session.client_reference_id !== bookingId
        ) {
          throw new Error(
            "CHECKOUT_CLIENT_REFERENCE_MISMATCH"
          )
        }

        if (
          typeof session.id !== "string" ||
          !session.id.startsWith("cs_") ||
          typeof booking.stripe_checkout_session_id !== "string" ||
          booking.stripe_checkout_session_id !== session.id
        ) {
          throw new Error(
            "CHECKOUT_SESSION_ASSOCIATION_MISMATCH"
          )
        }

        if (booking.payment_status === "paid") {
          if (
            booking.stripe_checkout_session_id === session.id &&
            booking.status === "scheduled" &&
            typeof booking.event_id === "string" &&
            booking.event_id.length > 0
          ) {
            break
          }

          throw new Error("PAID_CHECKOUT_EXISTING_BOOKING_REQUIRES_RECONCILIATION")
        }



        if (
          booking.requires_payment !== true ||
          booking.status !== "pending_payment" ||
          booking.payment_status !== "pending"
        ) {
          throw new Error(
            "CHECKOUT_BOOKING_STATE_REQUIRES_RECONCILIATION"
          )
        }
        /* ---------------------------------------------
           PRICE VALIDATION
        --------------------------------------------- */

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
        const paidPriceId = lineItems.data[0]?.price?.id

        if (!paidPriceId || paidPriceId !== booking.price_id) {
          console.error("PRICE_ID_MISMATCH", paidPriceId, booking.price_id)
          throw new Error("PAID_CHECKOUT_PRICE_MISMATCH_REQUIRES_RECONCILIATION")
        }

        if (session.payment_status !== "paid") {
          throw new Error(
            "CHECKOUT_PAYMENT_NOT_CONFIRMED"
          )
        }

        // A verified payment arriving late must not be expired by
        // webhook delivery time. Existing cancelled/expired bookings
        // require reconciliation before any calendar creation.
        if (
          booking.status === "cancelled" ||
          booking.status === "expired" ||
          booking.payment_status === "expired"
        ) {
          throw new Error("PAID_CHECKOUT_BOOKING_REQUIRES_RECONCILIATION")
        }

        /* ---------------------------------------------
           CLAIM DURABLE BOOKING FULFILLMENT
        --------------------------------------------- */

        const { data: fulfillmentRows, error: fulfillmentClaimError } =
          await supabase.rpc("claim_booking_fulfillment", {
            p_booking_id: bookingId,
            p_checkout_session_id: session.id,
          })

        if (fulfillmentClaimError) {
          throw new Error("BOOKING_FULFILLMENT_CLAIM_ERROR")
        }

        const fulfillmentClaim = Array.isArray(fulfillmentRows)
          ? fulfillmentRows[0]
          : null

        if (
          !fulfillmentClaim ||
          fulfillmentClaim.outcome !== "claimed" ||
          typeof fulfillmentClaim.token !== "string" ||
          typeof fulfillmentClaim.graph_transaction_id !== "string"
        ) {
          // An existing claim must not be automatically reclaimed.
          // In-progress and ambiguous outcomes require reconciliation.
          throw new Error(
            "BOOKING_FULFILLMENT_NOT_CLAIMED_REQUIRES_REVIEW"
          )
        }

        const fulfillmentToken = fulfillmentClaim.token
        const graphTransactionId =
          fulfillmentClaim.graph_transaction_id

        /* ---------------------------------------------
           DURABLE GRAPH START CHECKPOINT
        --------------------------------------------- */

        const { data: graphStarted, error: graphStartError } =
          await supabase.rpc("mark_booking_graph_started", {
            p_booking_id: bookingId,
            p_claim_token: fulfillmentToken,
          })

        if (graphStartError || graphStarted !== true) {
          // No Graph creation request has been issued.
          // Preserve the claim for operator reconciliation.
          throw new Error("BOOKING_GRAPH_START_CHECKPOINT_FAILED")
        }

        /* ---------------------------------------------
           CREATE GRAPH EVENT WITH TRANSACTION ID
        --------------------------------------------- */

        const client = getGraphClient()

        let graphEventId: string | null = null

        try {
          const graphEvent = await client
            .api(`/users/${BOOKING_MAILBOX}/events`)
            .post({
              transactionId: graphTransactionId,
              subject: `XilAire – ${formatBookingTitle(booking.booking_type)}`,
              start: buildGraphDateTime(booking.scheduled_start),
              end: buildGraphDateTime(booking.scheduled_end),
              attendees: [
                {
                  emailAddress: {
                    address: booking.attendee_email,
                    name: booking.attendee_name,
                  },
                  type: "required",
                },
              ],
              isOnlineMeeting: true,
              onlineMeetingProvider: "teamsForBusiness",
            })

          if (
            !graphEvent ||
            typeof graphEvent.id !== "string" ||
            graphEvent.id.length === 0
          ) {
            throw new Error("GRAPH_EVENT_ID_MISSING")
          }

          graphEventId = graphEvent.id

        } catch {

          // Graph may have created the event before returning
          // an error or timeout. Do not automatically retry POST.

          const { data: markedUnknown, error: unknownError } =
            await supabase.rpc("mark_booking_fulfillment_unknown", {
              p_booking_id: bookingId,
              p_claim_token: fulfillmentToken,
              p_graph_transaction_id: graphTransactionId,
              p_error: "GRAPH_CREATE_RESULT_UNKNOWN",
            })

          if (unknownError || markedUnknown !== true) {
            throw new Error(
              "BOOKING_GRAPH_UNKNOWN_CHECKPOINT_FAILED_REQUIRES_REVIEW"
            )
          }

          throw new Error(
            "BOOKING_GRAPH_RESULT_UNKNOWN_REQUIRES_REVIEW"
          )
        }

        /* ---------------------------------------------
           CONFIRM DURABLE GRAPH EVENT
        --------------------------------------------- */

        const { data: graphConfirmed, error: graphConfirmError } =
          await supabase.rpc("confirm_booking_graph_event", {
            p_booking_id: bookingId,
            p_claim_token: fulfillmentToken,
            p_graph_transaction_id: graphTransactionId,
            p_graph_event_id: graphEventId,
          })

        if (graphConfirmError || graphConfirmed !== true) {
          // The Graph event may already exist.
          // No automatic second Graph POST is permitted.
          throw new Error(
            "BOOKING_GRAPH_CONFIRMATION_REQUIRES_REVIEW"
          )
        }

        /* ---------------------------------------------
           ATOMIC BOOKING COMPLETION + OUTBOX
        --------------------------------------------- */

        const {
          data: fulfillmentCompleted,
          error: fulfillmentCompleteError,
        } = await supabase.rpc("complete_booking_fulfillment", {
          p_booking_id: bookingId,
          p_claim_token: fulfillmentToken,
          p_graph_transaction_id: graphTransactionId,
        })

        if (
          fulfillmentCompleteError ||
          fulfillmentCompleted !== true
        ) {
          // Graph state is durable; operator reconciliation
          // is required if completion cannot be recorded.
          throw new Error(
            "BOOKING_FULFILLMENT_COMPLETION_REQUIRES_REVIEW"
          )
        }

        // The RPC commits booking + both notification jobs.
        // Notification delivery is handled by a separate worker.
        // No Graph sendMail operation occurs in this webhook.

        console.log("Booking fulfillment committed:", bookingId)

        break
      }

      default:
        break
    }

    
    const { data: completed, error: completionError } =
      await supabase.rpc("complete_stripe_webhook_event", {
        p_event_id: claimedEventId,
        p_claim_token: claimToken,
      })

    if (completionError || completed !== true) {
      throw new Error("Stripe event completion recording failed")
    }

    claimedEventId = null
    claimToken = null

    return new Response("OK", { status: 200 })

  } catch (err) {
    console.error("Webhook handler failed:", err)

    if (claimedEventId && claimToken) {
      try {
        const { data: failed, error: failureError } =
          await supabase.rpc("fail_stripe_webhook_event", {
            p_event_id: claimedEventId,
            p_claim_token: claimToken,
            p_error: "Webhook processing failed",
          })

        if (failureError || failed !== true) {
          console.error("Unable to record Stripe event failure")
        }
      } catch (failureRecordingError) {
        console.error(
          "Stripe event failure recording raised an exception",
          failureRecordingError
        )
      }
    }

    return new Response("Webhook processing failed", { status: 500 })
  }
}
