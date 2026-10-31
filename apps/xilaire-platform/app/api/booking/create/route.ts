// apps/xilaire-platform/app/api/booking/create/route.ts

import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/msGraph";
import { consumeBookingEligibility } from "@/lib/booking/bookingEligibility";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/* =================================================
   STRIPE SAFE INITIALIZATION
================================================= */

const STRIPE_MODE = process.env.STRIPE_MODE ?? "test";
// Closed by design. Requires separate explicit approval after concurrency and reconciliation work.
const BOOKING_CREATE_ACTIVATION_APPROVED: boolean = false;

const STRIPE_SECRET =
  STRIPE_MODE === "live"
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;

if (STRIPE_MODE !== "test" && STRIPE_MODE !== "live") {
  throw new Error("INVALID_STRIPE_MODE");
}

if (!STRIPE_SECRET) {
  throw new Error(`Missing Stripe secret for mode: ${STRIPE_MODE}`);
}

const stripe = new Stripe(STRIPE_SECRET, {
  apiVersion: "2026-07-29.dahlia",
});



/* =================================================
   CONFIG
================================================= */

const BOOKING_MAILBOX = process.env.BOOKING_MAILBOX_EMAIL!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

if (!BOOKING_MAILBOX) throw new Error("BOOKING_MAILBOX_EMAIL missing");
if (!BASE_URL) throw new Error("NEXT_PUBLIC_BASE_URL missing");

/* =================================================
   HELPERS
================================================= */

// Fixed service catalog. Never infer payment status from a nullable Stripe ID.
const SERVICE_CATALOG: Record<string, { duration: number; paid: boolean; priority: boolean }> = {
  free_consult: { duration: 30, paid: false, priority: false },
  demo: { duration: 30, paid: false, priority: false },
  sales: { duration: 30, paid: false, priority: false },
  technical_consult_business: { duration: 60, paid: true, priority: false },
  technical_consult_after_hours: { duration: 60, paid: true, priority: false },
  ai_strategy_session: { duration: 60, paid: true, priority: false },
  security_assessment_call: { duration: 60, paid: true, priority: false },
  m365_implementation_session: { duration: 60, paid: true, priority: false },
  enterprise_architecture_review: { duration: 90, paid: true, priority: false },
  priority_support_block_business: { duration: 60, paid: true, priority: true },
  priority_support_block_after_hours: { duration: 60, paid: true, priority: true },
};

const EASTERN = "America/New_York";
const easternParts = new Intl.DateTimeFormat("en-US", {
  timeZone: EASTERN, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function formatEasternKey(instant: Date): string {
  const parts = easternParts.formatToParts(instant);
  const field = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return `${field("year")}-${field("month")}-${field("day")}T${field("hour")}:${field("minute")}`;
}

// Resolve wall-clock Eastern time without using the deployment host's timezone.
// Reject nonexistent/ambiguous DST wall times rather than guessing a booking instant.
function resolveEasternInstant(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const wallUtcMs = Date.parse(`${date}T${time}:00.000Z`);
  if (!Number.isFinite(wallUtcMs)) return null;
  const target = `${date}T${time}`;
  const possible = [4, 5]
    .map(hours => new Date(wallUtcMs + hours * 60 * 60 * 1000))
    .filter(candidate => formatEasternKey(candidate) === target);
  return possible.length === 1 ? possible[0] : null;
}

/* =================================================
   ROUTE
================================================= */

export async function POST(req: Request) {
  // No DB, Stripe or Graph operations are reachable until this gate is
  // separately reviewed and explicitly changed in a future approved stage.
  if (!BOOKING_CREATE_ACTIVATION_APPROVED) {
    return NextResponse.json(
      { error: "BOOKING_CREATION_DISABLED_PENDING_SAFETY_REVIEW" },
      { status: 503 }
    );
  }
  try {
    const { date, time, name, email, bookingType, duration } =
      await req.json();

    if (!date || !time || !name || !email || !bookingType || !duration) {
      return NextResponse.json(
        { error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 }
      );
    }

    const service = typeof bookingType === "string" ? SERVICE_CATALOG[bookingType] : undefined;
    if (!service || typeof duration !== "number" || duration !== service.duration ||
        typeof name !== "string" || typeof email !== "string" ||
        typeof date !== "string" || typeof time !== "string" ||
        !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "INVALID_BOOKING_REQUEST" }, { status: 400 });
    }
    const startInstant = resolveEasternInstant(date, time);
    if (!startInstant) {
      return NextResponse.json({ error: "INVALID_OR_AMBIGUOUS_EASTERN_TIME" }, { status: 400 });
    }
    const endInstant = new Date(startInstant.getTime() + duration * 60000);

    const { data: pricing, error: pricingError } =
      await supabaseAdmin
        .from("booking_pricing")
        .select("*")
        .eq("booking_type", bookingType)
        .eq("active", true)
        .single();

    if (pricingError || !pricing) {
      throw new Error("PRICING_NOT_FOUND");
    }

    const cookieStore = cookies();

    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 403 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json({ error: "ORG_REQUIRED" }, { status: 403 });
    }

    const { data: entitlements } = await supabaseAdmin
      .from("org_entitlements")
      .select("entitlement_key")
      .eq("org_id", profile.org_id)
      .eq("status", "active");

    const entitlementSet = new Set(
      entitlements?.map((e) => e.entitlement_key) ?? []
    );

    const isEnterprise = entitlementSet.has("enterprise_features");
    const isAfterHours = bookingType.includes("after_hours");
    // Enforce the chosen priority_access policy even if a pricing flag is misconfigured.
    if (service.priority && pricing.requires_priority !== true) {
      return NextResponse.json({ error: "PRIORITY_PRICING_MISCONFIGURED" }, { status: 503 });
    }
    const isPriorityBooking = service.priority && entitlementSet.has("priority_access");

    if (pricing.requires_premium && !entitlementSet.has("premium_bookings")) {
      return NextResponse.json(
        { error: "PREMIUM_SUBSCRIPTION_REQUIRED" },
        { status: 403 }
      );
    }

    if (pricing.requires_priority && !entitlementSet.has("priority_access")) {
      return NextResponse.json(
        { error: "ENTERPRISE_PRIORITY_REQUIRED" },
        { status: 403 }
      );
    }

    if (pricing.requires_extended && !entitlementSet.has("extended_sessions")) {
      return NextResponse.json(
        { error: "ENTERPRISE_EXTENDED_REQUIRED" },
        { status: 403 }
      );
    }

    if (
      isAfterHours &&
      !isEnterprise &&
      !entitlementSet.has("premium_bookings")
    ) {
      return NextResponse.json(
        { error: "AFTER_HOURS_REQUIRES_PREMIUM" },
        { status: 403 }
      );
    }

    if (!isEnterprise) {
      await consumeBookingEligibility(email, bookingType);
    }

    const startISO = startInstant.toISOString();
    const endISO = endInstant.toISOString();

    const selectedPriceId =
      STRIPE_MODE === "live"
        ? pricing.price_id_live
        : pricing.price_id_test;

    if (service.paid &&
        (typeof selectedPriceId !== "string" || !/^price_[A-Za-z0-9]+$/.test(selectedPriceId))) {
      return NextResponse.json({ error: "PAID_BOOKING_PRICE_MISSING" }, { status: 503 });
    }
    if (!service.paid && (pricing.price_id_test || pricing.price_id_live)) {
      return NextResponse.json({ error: "FREE_BOOKING_PRICE_MISCONFIGURED" }, { status: 503 });
    }
    const requiresPayment = service.paid;

    const { data: inserted, error: insertError } =
      await supabaseAdmin
        .from("bookings")
        .insert({
          attendee_email: email,
          attendee_name: name,
          scheduled_start: startISO,
          scheduled_end: endISO,
          booking_type: bookingType,
          status: requiresPayment ? "pending_payment" : "scheduled",
          payment_status: requiresPayment ? "pending" : "free",
          requires_payment: requiresPayment,
          price_id: selectedPriceId ?? null,
          priority_level: isPriorityBooking ? "enterprise" : "standard",
        })
        .select("id")
        .single();

    if (insertError || !inserted) {
      throw new Error("BOOKING_DB_INSERT_FAILED");
    }

    const bookingId = inserted.id;

    /* =================================================
       PAID FLOW (EXTENDED — ORG STRIPE ATTACHMENT)
    ================================================= */

    if (requiresPayment) {

      const { data: org } = await supabaseAdmin
        .from("orgs")
        .select("stripe_customer_id")
        .eq("id", profile.org_id)
        .single();

      const stripeCustomerId = org?.stripe_customer_id ?? null;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: bookingId,
        line_items: [{ price: selectedPriceId!, quantity: 1 }],
        customer: stripeCustomerId ?? undefined,
        customer_email: stripeCustomerId ? undefined : email,
        success_url: `${BASE_URL}/book/success?booking_id=${bookingId}`,
        cancel_url: `${BASE_URL}/book`,
        metadata: {
          booking_id: bookingId,
          booking_type: bookingType,
          stripe_mode: STRIPE_MODE,
          org_id: profile.org_id,
        },
      }, { idempotencyKey: `xilaire-booking-${bookingId}` });

      if (
        typeof session.id !== "string" ||
        !session.id.startsWith("cs_") ||
        typeof session.url !== "string" ||
        !session.url
      ) {
        throw new Error("BOOKING_CHECKOUT_SESSION_INVALID");
      }

      const { data: associated, error: associationError } =
        await supabaseAdmin
          .from("bookings")
          .update({
            stripe_checkout_session_id: session.id,
          })
          .eq("id", bookingId)
          .eq("status", "pending_payment")
          .eq("payment_status", "pending")
          .eq("requires_payment", true)
          .is("stripe_checkout_session_id", null)
          .select("id")
          .maybeSingle();

      if (
        associationError ||
        !associated ||
        associated.id !== bookingId
      ) {
        throw new Error(
          "BOOKING_CHECKOUT_ASSOCIATION_REQUIRES_RECONCILIATION"
        );
      }

      return NextResponse.json({
        requiresPayment: true,
        checkoutUrl: session.url,
        bookingId,
      });
    }

    /* =================================================
       FREE FLOW (UNCHANGED — FULLY PRESERVED)
    ================================================= */

    const client = getGraphClient();

    const graphEvent = await client
      .api(`/users/${BOOKING_MAILBOX}/events`)
      .post({
        subject: `XilAire – ${bookingType.replace(/_/g, " ")}`,
        start: { dateTime: startISO.replace("Z", ""), timeZone: "UTC" },
        end: { dateTime: endISO.replace("Z", ""), timeZone: "UTC" },
        attendees: [
          { emailAddress: { address: email, name }, type: "required" },
        ],
        isOnlineMeeting: true,
        onlineMeetingProvider: "teamsForBusiness",
      });

    if (!graphEvent?.id) throw new Error("GRAPH_EVENT_ID_MISSING");
    const { data: associatedEvent, error: graphAssociationError } = await supabaseAdmin
      .from("bookings")
      .update({ event_id: graphEvent.id })
      .eq("id", bookingId)
      .select("id")
      .maybeSingle();
    if (graphAssociationError || associatedEvent?.id !== bookingId) {
      throw new Error("BOOKING_GRAPH_ASSOCIATION_REQUIRES_RECONCILIATION");
    }

    // No direct sendMail calls. Notification worker remains separately disabled.
    // Graph event creation can itself send invitations to attendees;
    // this route stays gated until that behavior is explicitly approved.

    return NextResponse.json({ success: true, bookingId });

  } catch (error: any) {
    console.error("BOOKING_CREATE_ERROR:", error);
    return NextResponse.json(
      { error: "BOOKING_CREATE_FAILED" },
      { status: 500 }
    );
  }
}