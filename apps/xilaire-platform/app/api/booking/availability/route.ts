import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/msGraph";
import { DateTime } from "luxon";
import { BOOKING_PAYMENT_LINKS } from "@/lib/bookingPaymentLinks";

export const runtime = "nodejs";

/* -------------------------------------------------
   CONFIG
------------------------------------------------- */
const BOOKING_MAILBOX = "booking@xilairetechnologies.com";
const TIMEZONE = "America/New_York";

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;

/* -------------------------------------------------
   ENTERPRISE BOOKING CONFIG (CANONICAL)
------------------------------------------------- */
type BookingService = {
  duration: number;
  businessPrice: number;
  afterHoursPrice?: number;
  businessLink?: string;
  afterLink?: string;
  onePerEmail: boolean;
  businessOnly?: boolean;
  hasAfterVariant?: boolean;
};

const BOOKING_SERVICES: Record<string, BookingService> = {
  /* ---------------- FREE ---------------- */
  free_consult: {
    duration: 30,
    businessPrice: 0,
    onePerEmail: true,
  },

  demo: {
    duration: 30,
    businessPrice: 0,
    onePerEmail: true,
  },

  sales: {
    duration: 30,
    businessPrice: 0,
    onePerEmail: false,
  },

  /* ---------------- PAID ---------------- */

  technical_consult: {
    duration: 60,
    businessPrice: 195,
    afterHoursPrice: 295,
    businessLink: BOOKING_PAYMENT_LINKS.technical_consult_business,
    afterLink: BOOKING_PAYMENT_LINKS.technical_consult_after,
    onePerEmail: false,
    hasAfterVariant: true,
  },

  ai_strategy_session: {
    duration: 60,
    businessPrice: 295,
    businessOnly: true,
    businessLink: BOOKING_PAYMENT_LINKS.ai_strategy_session_business,
    onePerEmail: false,
  },

  security_assessment_call: {
    duration: 60,
    businessPrice: 350,
    businessOnly: true,
    businessLink: BOOKING_PAYMENT_LINKS.security_assessment_call_business,
    onePerEmail: false,
  },

  m365_implementation_session: {
    duration: 60,
    businessPrice: 275,
    businessOnly: true,
    businessLink: BOOKING_PAYMENT_LINKS.m365_implementation_session_business,
    onePerEmail: false,
  },

  enterprise_architecture_review: {
    duration: 90,
    businessPrice: 750,
    businessOnly: true,
    businessLink:
      BOOKING_PAYMENT_LINKS.enterprise_architecture_review_business,
    onePerEmail: false,
  },

  priority_support_block: {
    duration: 60,
    businessPrice: 225,
    afterHoursPrice: 350,
    businessLink: BOOKING_PAYMENT_LINKS.priority_support_block_business,
    afterLink: BOOKING_PAYMENT_LINKS.priority_support_block_after,
    onePerEmail: false,
    hasAfterVariant: true,
  },
};

/* -------------------------------------------------
   GET /api/booking/availability
------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "MISSING_DATE" }, { status: 400 });
    }

    const dayStart = DateTime.fromISO(date, { zone: TIMEZONE }).startOf("day");
    const dayEnd = dayStart.endOf("day");

    const client = getGraphClient();

    const response = await client
      .api(`/users/${BOOKING_MAILBOX}/calendarView`)
      .header("Prefer", `outlook.timezone="${TIMEZONE}"`)
      .query({
        startDateTime: dayStart.toISO(),
        endDateTime: dayEnd.toISO(),
      })
      .select("start,end")
      .get();

    const busyEvents = (response.value || []).map((event: any) => ({
      start: DateTime.fromISO(event.start.dateTime, {
        zone: TIMEZONE,
      }).toMillis(),
      end: DateTime.fromISO(event.end.dateTime, {
        zone: TIMEZONE,
      }).toMillis(),
    }));

    const isBusinessHours = (dt: DateTime) =>
      dt.weekday <= 5 &&
      dt.hour >= BUSINESS_START_HOUR &&
      dt.hour < BUSINESS_END_HOUR;

    const overlapsBusy = (start: number, end: number) =>
      busyEvents.some((b) => start < b.end && end > b.start);

    const availability: any[] = [];

    let cursor = dayStart;

    while (cursor < dayEnd) {
      for (const [serviceKey, config] of Object.entries(
        BOOKING_SERVICES
      )) {
        const slotStart = cursor;
        const slotEnd = cursor.plus({ minutes: config.duration });

        if (slotEnd > dayEnd) continue;

        const startMs = slotStart.toMillis();
        const endMs = slotEnd.toMillis();

        if (overlapsBusy(startMs, endMs)) continue;

        const business = isBusinessHours(slotStart);

        /* -------- BUSINESS ONLY FILTER -------- */
        if (config.businessOnly && !business) continue;

        /* -------- CANONICAL BOOKING TYPE -------- */
        let bookingType = serviceKey;

        if (config.hasAfterVariant) {
          bookingType = business
            ? `${serviceKey}_business`
            : `${serviceKey}_after_hours`;
        }

        /* -------- PRICE -------- */
        let price = config.businessPrice;
        let stripePaymentLink: string | null = null;

        if (config.businessPrice > 0) {
          if (business) {
            price = config.businessPrice;
            stripePaymentLink = config.businessLink ?? null;
          } else {
            price =
              config.afterHoursPrice ?? config.businessPrice;
            stripePaymentLink =
              config.afterLink ?? config.businessLink ?? null;
          }
        }

        availability.push({
          bookingType,
          duration: config.duration,
          start: slotStart.toISO(),
          end: slotEnd.toISO(),
          category: business ? "business_hours" : "after_hours",
          price,
          requiresPayment: price > 0,
          stripePaymentLink,
          eligibility: { onePerEmail: config.onePerEmail },
        });
      }

      cursor = cursor.plus({ minutes: 30 });
    }

    return NextResponse.json({
      date,
      timezone: TIMEZONE,
      availability,
    });
  } catch (error) {
    console.error("BOOKING_AVAILABILITY_ERROR", error);
    return NextResponse.json(
      { error: "GRAPH_AVAILABILITY_FAILED" },
      { status: 500 }
    );
  }
}