// apps/xilaire-platform/app/api/booking/create/route.ts

import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/msGraph";
import { consumeBookingEligibility } from "@/lib/booking/bookingEligibility";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/* =================================================
   STRIPE SAFE INITIALIZATION
================================================= */

const STRIPE_MODE = process.env.STRIPE_MODE ?? "test";

const STRIPE_SECRET =
  STRIPE_MODE === "live"
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;

if (!STRIPE_SECRET) {
  throw new Error(`Missing Stripe secret for mode: ${STRIPE_MODE}`);
}

const stripe = new Stripe(STRIPE_SECRET, {
  apiVersion: "2025-08-27.basil",
});

/* -------------------------------------------------
   DEBUG ACCOUNT + MODE
------------------------------------------------- */

async function verifyStripeBoot() {
  try {
    const account = await stripe.accounts.retrieve();
    console.log("Stripe Account ID:", account.id);
    console.log("Stripe Mode:", STRIPE_MODE);
    console.log("Stripe Key Preview:", STRIPE_SECRET.slice(0, 12));
  } catch (err) {
    console.error("Stripe Account Verification Failed:", err);
  }
}

verifyStripeBoot();

/* =================================================
   CONFIG
================================================= */

const BOOKING_MAILBOX = process.env.BOOKING_MAILBOX_EMAIL!;
const GRAPH_TIMEZONE = "Eastern Standard Time";
const DISPLAY_TIMEZONE = "America/New_York";
const ALLOWED_DURATIONS = [15, 30, 60, 90];
const TOKEN_SECRET = process.env.BOOKING_TOKEN_SECRET!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

if (!BOOKING_MAILBOX) throw new Error("BOOKING_MAILBOX_EMAIL missing");
if (!TOKEN_SECRET) throw new Error("BOOKING_TOKEN_SECRET missing");
if (!BASE_URL) throw new Error("NEXT_PUBLIC_BASE_URL missing");

/* =================================================
   HELPERS
================================================= */

function buildGraphDateTime(date: string, time: string) {
  return { dateTime: `${date}T${time}:00`, timeZone: GRAPH_TIMEZONE };
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, "0")}:${(total % 60)
    .toString()
    .padStart(2, "0")}`;
}

function formatDateET(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: DISPLAY_TIMEZONE,
    dateStyle: "full",
    timeStyle: "short",
  });
}

function formatIcsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/* =================================================
   ROUTE
================================================= */

export async function POST(req: Request) {
  try {
    const { date, time, name, email, bookingType, duration } =
      await req.json();

    if (!date || !time || !name || !email || !bookingType || !duration) {
      return NextResponse.json(
        { error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 }
      );
    }

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
    const isPriorityBooking =
      pricing.requires_priority && isEnterprise;

    if (!isEnterprise && !ALLOWED_DURATIONS.includes(duration)) {
      return NextResponse.json(
        { error: "INVALID_DURATION" },
        { status: 400 }
      );
    }

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

    const endTime = addMinutes(time, duration);
    const startISO = new Date(`${date}T${time}:00`).toISOString();
    const endISO = new Date(`${date}T${endTime}:00`).toISOString();

    const selectedPriceId =
      STRIPE_MODE === "live"
        ? pricing.price_id_live
        : pricing.price_id_test;

    const requiresPayment = !!selectedPriceId;

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
      });

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
        start: buildGraphDateTime(date, time),
        end: buildGraphDateTime(date, endTime),
        attendees: [
          {
            emailAddress: { address: email, name },
            type: "required",
          },
        ],
        isOnlineMeeting: true,
        onlineMeetingProvider: "teamsForBusiness",
      });

    await supabaseAdmin
      .from("bookings")
      .update({ event_id: graphEvent.id })
      .eq("id", bookingId);

    const token = jwt.sign(
      { eventId: graphEvent.id, email, name },
      TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    const cancelUrl = `${BASE_URL}/api/booking/cancel?token=${token}`;
    const rescheduleUrl = `${BASE_URL}/book/reschedule?token=${token}`;
    const formattedDate = formatDateET(startISO);

    const ics = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//XilAire Technologies//Booking//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:${graphEvent.id}
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(new Date(startISO))}
DTEND:${formatIcsDate(new Date(endISO))}
SUMMARY:XilAire Booking
ORGANIZER:MAILTO:${BOOKING_MAILBOX}
ATTENDEE;CN=${name}:MAILTO:${email}
DESCRIPTION:Reschedule: ${rescheduleUrl} \\nCancel: ${cancelUrl}
END:VEVENT
END:VCALENDAR
`.trim();

    await client.api(`/users/${BOOKING_MAILBOX}/sendMail`).post({
      message: {
        subject: "Your XilAire Booking Is Confirmed",
        body: {
          contentType: "HTML",
          content: `
            <p><strong>Scheduled For:</strong> ${formattedDate}</p>
            <p>
              <a href="${rescheduleUrl}">Reschedule</a> |
              <a href="${cancelUrl}">Cancel</a>
            </p>
          `,
        },
        toRecipients: [{ emailAddress: { address: email } }],
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
    });

    await client.api(`/users/${BOOKING_MAILBOX}/sendMail`).post({
      message: {
        subject: `BOOKING CONFIRMED – ${email}`,
        body: {
          contentType: "HTML",
          content: `
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Booking ID:</strong> ${bookingId}</p>
            <p>
              <a href="${rescheduleUrl}">Reschedule</a> |
              <a href="${cancelUrl}">Cancel</a>
            </p>
          `,
        },
        toRecipients: [
          { emailAddress: { address: BOOKING_MAILBOX } },
        ],
      },
      saveToSentItems: true,
    });

    return NextResponse.json({ success: true, bookingId });

  } catch (error: any) {
    console.error("BOOKING_CREATE_ERROR:", error);
    return NextResponse.json(
      { error: "BOOKING_CREATE_FAILED" },
      { status: 500 }
    );
  }
}