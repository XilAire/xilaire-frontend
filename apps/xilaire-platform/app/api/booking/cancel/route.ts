import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getGraphClient } from "@/lib/msGraph";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/* -------------------------------------------------
   CONFIG
------------------------------------------------- */
const TOKEN_SECRET = process.env.BOOKING_TOKEN_SECRET!;
const BOOKING_MAILBOX = "booking@xilairetechnologies.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;
const DISPLAY_TIMEZONE = "America/New_York";

const ALLOWED_REASONS = [
  "changed_plans",
  "scheduling_conflict",
  "no_longer_needed",
  "other",
];

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
function formatIcsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/* -------------------------------------------------
   GET /api/booking/cancel?token=...
------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const reasonParam = searchParams.get("reason");
    const noteParam = searchParams.get("note");

    if (!token) {
      return NextResponse.redirect(
        `${BASE_URL}/book/cancelled?status=missing`
      );
    }

    /* ---------------------------------------------
       VERIFY TOKEN
    --------------------------------------------- */
    const payload = jwt.verify(token, TOKEN_SECRET) as {
      eventId: string;
      email: string;
      name?: string;
    };

    /* ---------------------------------------------
       DETERMINE REASON
    --------------------------------------------- */
    let cancellationReason = "changed_plans";
    let cancellationNote: string | null = null;

    if (reasonParam && ALLOWED_REASONS.includes(reasonParam)) {
      cancellationReason = reasonParam;
    }

    if (cancellationReason === "other") {
      cancellationNote = noteParam?.slice(0, 500) ?? null;
    }

    /* ---------------------------------------------
       FETCH BOOKING (SAFE)
    --------------------------------------------- */
    const { data: booking, error: bookingError } =
      await supabaseAdmin
        .from("bookings")
        .select("*")
        .eq("event_id", payload.eventId)
        .maybeSingle();

    if (!booking) {
      console.error("BOOKING_NOT_FOUND", bookingError);
      return NextResponse.redirect(
        `${BASE_URL}/book/cancelled?status=notfound`
      );
    }

    if (booking.status === "cancelled") {
      return NextResponse.redirect(
        `${BASE_URL}/book/cancelled?status=already`
      );
    }

    /* ---------------------------------------------
       UPDATE BOOKING STATUS
    --------------------------------------------- */
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: "attendee",
        cancellation_reason: cancellationReason,
        cancellation_note: cancellationNote,
      })
      .eq("event_id", payload.eventId);

    if (updateError) {
      console.error("BOOKING_STATUS_UPDATE_FAILED", updateError);
      throw new Error("BOOKING_STATUS_UPDATE_FAILED");
    }

    const client = getGraphClient();

    /* ---------------------------------------------
       FETCH EVENT (BEST EFFORT)
    --------------------------------------------- */
    let event: any = null;

    try {
      event = await client
        .api(`/users/${BOOKING_MAILBOX}/events/${payload.eventId}`)
        .get();
    } catch {}

    const start = event?.start?.dateTime
      ? new Date(event.start.dateTime)
      : null;

    const end = event?.end?.dateTime
      ? new Date(event.end.dateTime)
      : null;

    /* ---------------------------------------------
       CANCEL EVENT (GRAPH)
    --------------------------------------------- */
    try {
      await client
        .api(`/users/${BOOKING_MAILBOX}/events/${payload.eventId}/cancel`)
        .post({
          comment: `Cancelled by attendee. Reason: ${cancellationReason}`,
        });
    } catch (err: any) {
      if (![404, 410].includes(err?.statusCode)) {
        throw err;
      }
    }

    /* ---------------------------------------------
       BUILD ICS
    --------------------------------------------- */
    const ics =
      start && end
        ? `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//XilAire Technologies//Booking//EN
METHOD:CANCEL
BEGIN:VEVENT
UID:${payload.eventId}
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(start)}
DTEND:${formatIcsDate(end)}
SUMMARY:XilAire Technologies – Call
ORGANIZER:MAILTO:${BOOKING_MAILBOX}
ATTENDEE:MAILTO:${payload.email}
SEQUENCE:1
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR
`.trim()
        : null;

    /* ---------------------------------------------
       ATTENDEE EMAIL
    --------------------------------------------- */
    if (start) {
      const formattedDate = start.toLocaleString("en-US", {
        timeZone: DISPLAY_TIMEZONE,
        dateStyle: "full",
        timeStyle: "short",
      });

      await client.api(`/users/${BOOKING_MAILBOX}/sendMail`).post({
        message: {
          subject:
            "Your XilAire Technologies Call Was Cancelled",
          body: {
            contentType: "HTML",
            content: `
              <div style="font-family:Arial,sans-serif">
                <h2>Your Call Has Been Cancelled</h2>
                <p><strong>${formattedDate} (ET)</strong></p>
                <p>Reason: ${cancellationReason}</p>
              </div>
            `,
          },
          toRecipients: [
            { emailAddress: { address: payload.email } },
          ],
          attachments: ics
            ? [
                {
                  "@odata.type":
                    "#microsoft.graph.fileAttachment",
                  name: "xilaire-cancel.ics",
                  contentType: "text/calendar",
                  contentBytes: Buffer.from(ics).toString(
                    "base64"
                  ),
                },
              ]
            : [],
        },
        saveToSentItems: true,
      });
    }

    return NextResponse.redirect(`${BASE_URL}/book/cancelled`);
  } catch (err) {
    console.error("BOOKING_CANCEL_ERROR", err);
    return NextResponse.redirect(
      `${BASE_URL}/book/cancelled?status=invalid`
    );
  }
}