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

    const { data: existing } = await supabase
      .from("stripe_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle()

    if (existing) return new Response("OK", { status: 200 })

    await supabase.from("stripe_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      api_version: event.api_version,
      livemode: event.livemode,
      payload: event,
    })
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
                .eq("id", profile.org_id)

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
            .eq("id", org.id)

          await supabase
            .from("org_entitlements")
            .delete()
            .eq("org_id", org.id)
            .eq("source", "stripe_subscription")

          const { data: mappings } = await supabase
            .from("subscription_entitlement_map")
            .select("entitlement_key")
            .eq("stripe_price_id", priceId)

          if (mappings) {
            for (const m of mappings) {
              await supabase.from("org_entitlements").insert({
                org_id: org.id,
                entitlement_key: m.entitlement_key,
                status: "active",
                source: "stripe_subscription",
              })
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
          .eq("stripe_subscription_id", subscription.id)

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
            .eq("source", "stripe_subscription")

          await supabase
            .from("orgs")
            .update({ stripe_subscription_id: null })
            .eq("id", org.id)
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
          .eq("stripe_subscription_id", subscription.id)

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
            .eq("id", recurring.project_id)

          await supabase.from("infrastructure_project_logs").insert({
            project_id: recurring.project_id,
            log_type: "subscription_cancelled",
            message: "Subscription cancelled in Stripe",
            created_at: new Date().toISOString(),
          })
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
            .eq("stripe_subscription_id", subscriptionId)

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
              .eq("id", recurring.project_id)

            await supabase.from("infrastructure_project_logs").insert({
              project_id: recurring.project_id,
              log_type: "billing_restored",
              message: "Billing restored after successful payment",
              created_at: new Date().toISOString(),
            })
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
            .eq("stripe_subscription_id", subscriptionId)

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
              .eq("id", recurring.project_id)

            await supabase.from("infrastructure_project_logs").insert({
              project_id: recurring.project_id,
              log_type: "billing_hold",
              message: "Project placed on billing hold due to payment failure",
              created_at: new Date().toISOString(),
            })
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

        const { data: booking } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .single()

        if (!booking) break
        if (booking.payment_status === "paid") break

        /* ---------------------------------------------
           PAYMENT WINDOW ENFORCEMENT
        --------------------------------------------- */

        const created = new Date(booking.created_at).getTime()
        const minutesElapsed = (Date.now() - created) / 1000 / 60

        if (minutesElapsed > BOOKING_PAYMENT_TIMEOUT_MINUTES) {

          await supabase
            .from("bookings")
            .update({
              status: "cancelled",
              payment_status: "expired",
              cancelled_by: "system",
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId)

          break
        }

        /* ---------------------------------------------
           PRICE VALIDATION
        --------------------------------------------- */

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
        const paidPriceId = lineItems.data[0]?.price?.id

        if (!paidPriceId || paidPriceId !== booking.price_id) {
          console.error("PRICE_ID_MISMATCH", paidPriceId, booking.price_id)
          break
        }

        if (session.payment_status !== "paid") break

        /* ---------------------------------------------
           CREATE GRAPH EVENT
        --------------------------------------------- */

        const client = getGraphClient()

        const graphEvent = await client
          .api(`/users/${BOOKING_MAILBOX}/events`)
          .post({
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

        await supabase
          .from("bookings")
          .update({
            payment_status: "paid",
            status: "scheduled",
            stripe_checkout_session_id: session.id,
            event_id: graphEvent.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId)

        /* ---------------------------------------------
           TOKEN GENERATION
        --------------------------------------------- */

        const token = jwt.sign(
          {
            eventId: graphEvent.id,
            email: booking.attendee_email,
            name: booking.attendee_name,
          },
          TOKEN_SECRET,
          { expiresIn: "7d" }
        )

        const cancelUrl = `${BASE_URL}/api/booking/cancel?token=${token}`
        const rescheduleUrl = `${BASE_URL}/book/reschedule?token=${token}`
        const formattedDate = formatDateET(booking.scheduled_start)
        const teamsJoin = graphEvent?.onlineMeeting?.joinUrl ?? null

        /* ---------------------------------------------
           ICS GENERATION
        --------------------------------------------- */

        const ics = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//XilAire Technologies//Booking//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:${graphEvent.id}
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(new Date(booking.scheduled_start))}
DTEND:${formatIcsDate(new Date(booking.scheduled_end))}
SUMMARY:XilAire – ${formatBookingTitle(booking.booking_type)}
ORGANIZER:MAILTO:${BOOKING_MAILBOX}
ATTENDEE;CN=${booking.attendee_name}:MAILTO:${booking.attendee_email}
DESCRIPTION:Reschedule: ${rescheduleUrl}\\nCancel: ${cancelUrl}
SEQUENCE:0
END:VEVENT
END:VCALENDAR
`.trim()

        /* ---------------------------------------------
           CLIENT EMAIL
        --------------------------------------------- */

        await client.api(`/users/${BOOKING_MAILBOX}/sendMail`).post({
          message: {
            subject: "Your XilAire Booking Is Confirmed",
            body: {
              contentType: "HTML",
              content: `
                <div style="font-family:Arial,sans-serif;max-width:600px">
                  <h2 style="color:#0ea5e9">Your XilAire Booking Is Confirmed</h2>
                  <p>Hi ${booking.attendee_name},</p>
                  <p><strong>Scheduled For:</strong> ${formattedDate}</p>
                  ${teamsJoin ? `<p><a href="${teamsJoin}">Join Meeting</a></p>` : ""}
                  <p>
                    <a href="${rescheduleUrl}">Reschedule</a> |
                    <a href="${cancelUrl}">Cancel</a>
                  </p>
                </div>
              `,
            },
            toRecipients: [
              { emailAddress: { address: booking.attendee_email } },
            ],
            attachments: [
              {
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: "xilaire-booking.ics",
                contentType: "text/calendar",
                contentBytes: Buffer.from(ics).toString("base64"),
              },
            ],
          },
          saveToSentItems: true,
        })

        /* ---------------------------------------------
           INTERNAL SUMMARY EMAIL
        --------------------------------------------- */

        await client.api(`/users/${BOOKING_MAILBOX}/sendMail`).post({
          message: {
            subject: `BOOKING CONFIRMED – ${booking.attendee_email}`,
            body: {
              contentType: "HTML",
              content: `
                <p><strong>Name:</strong> ${booking.attendee_name}</p>
                <p><strong>Email:</strong> ${booking.attendee_email}</p>
                <p><strong>Type:</strong> ${formatBookingTitle(booking.booking_type)}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Stripe Session:</strong> ${session.id}</p>
                <p><strong>Booking ID:</strong> ${booking.id}</p>
              `,
            },
            toRecipients: [
              { emailAddress: { address: BOOKING_MAILBOX } },
            ],
          },
          saveToSentItems: true,
        })

        console.log("Booking finalized:", bookingId)

        break
      }

      default:
        break
    }

    return new Response("OK", { status: 200 })

  } catch (err) {
    console.error("Webhook handler failed:", err)
    return new Response("OK", { status: 200 })
  }
}