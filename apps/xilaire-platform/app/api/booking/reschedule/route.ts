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
const TIMEZONE = "America/New_York";

const ALLOWED_DURATIONS = [15, 30, 60];

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
function buildEasternDate(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function formatIcsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function formatDateET(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: TIMEZONE,
  }).format(d);
}

/* -------------------------------------------------
   POST /api/booking/reschedule
------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const { token, date, time, duration } =
      await req.json();

    if (!token || !date || !time || !duration) {
      return NextResponse.json(
        { error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 }
      );
    }

    if (!ALLOWED_DURATIONS.includes(duration)) {
      return NextResponse.json(
        { error: "INVALID_DURATION" },
        { status: 400 }
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
       FETCH BOOKING (DB AUTHORITATIVE)
    --------------------------------------------- */
    const { data: booking, error: bookingError } =
      await supabaseAdmin
        .from("bookings")
        .select("*")
        .eq("event_id", payload.eventId)
        .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "BOOKING_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "BOOKING_ALREADY_CANCELLED" },
        { status: 409 }
      );
    }

    const client = getGraphClient();

    const newStart = buildEasternDate(date, time);
    const newEnd = new Date(
      newStart.getTime() + duration * 60 * 1000
    );

    /* ---------------------------------------------
       AVAILABILITY CHECK (GRAPH CONFLICT GUARD)
    --------------------------------------------- */
    const windowStart = new Date(
      newStart.getTime() - 60 * 60 * 1000
    );
    const windowEnd = new Date(
      newEnd.getTime() + 60 * 60 * 1000
    );

    const availability = await client
      .api(`/users/${BOOKING_MAILBOX}/calendarView`)
      .header("Prefer", `outlook.timezone="${TIMEZONE}"`)
      .query({
        startDateTime: windowStart.toISOString(),
        endDateTime: windowEnd.toISOString(),
      })
      .select("id,start,end")
      .get();

    const conflict = availability.value?.some((e: any) => {
      if (e.id === payload.eventId) return false;

      const s = new Date(e.start.dateTime).getTime();
      const eTime = new Date(e.end.dateTime).getTime();

      return (
        newStart.getTime() < eTime &&
        newEnd.getTime() > s
      );
    });

    if (conflict) {
      return NextResponse.json(
        { error: "TIME_SLOT_UNAVAILABLE" },
        { status: 409 }
      );
    }

    /* ---------------------------------------------
       PATCH EVENT IN GRAPH
    --------------------------------------------- */
    await client
      .api(`/users/${BOOKING_MAILBOX}/events/${payload.eventId}`)
      .patch({
        start: {
          dateTime: newStart.toISOString(),
          timeZone: TIMEZONE,
        },
        end: {
          dateTime: newEnd.toISOString(),
          timeZone: TIMEZONE,
        },
      });

    /* ---------------------------------------------
       UPDATE DATABASE (SYNC)
    --------------------------------------------- */
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        scheduled_start: newStart.toISOString(),
        scheduled_end: newEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", payload.eventId);

    if (updateError) {
      console.error(
        "BOOKING_DB_RESCHEDULE_FAILED",
        updateError
      );
      throw new Error("DB_UPDATE_FAILED");
    }

    /* ---------------------------------------------
       ROTATE TOKEN
    --------------------------------------------- */
    const newToken = jwt.sign(
      {
        eventId: payload.eventId,
        email: payload.email,
        name: payload.name,
      },
      TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    const rescheduleUrl =
      `${BASE_URL}/book/reschedule?token=${newToken}`;

    const cancelUrl =
      `${BASE_URL}/api/booking/cancel?token=${newToken}`;

    const formattedDate = formatDateET(newStart);

    /* ---------------------------------------------
       BUILD ICS UPDATE
    --------------------------------------------- */
    const ics = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//XilAire Technologies//Booking//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:${payload.eventId}
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(newStart)}
DTEND:${formatIcsDate(newEnd)}
SUMMARY:XilAire Technologies – Call
ORGANIZER:MAILTO:${BOOKING_MAILBOX}
ATTENDEE:MAILTO:${payload.email}
SEQUENCE:2
END:VEVENT
END:VCALENDAR
`.trim();

    /* ---------------------------------------------
       CLIENT EMAIL (WITH LINKS RESTORED)
    --------------------------------------------- */
    const emailHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px">
        <h2 style="color:#0ea5e9">
          Your Call Has Been Rescheduled
        </h2>

        <p>Hi ${payload.name ?? "there"},</p>

        <p>
          Your call with <strong>XilAire Technologies</strong>
          has been rescheduled.
        </p>

        <p>
          <strong>New Date & Time:</strong><br/>
          ${formattedDate} (Eastern Time)
        </p>

        <div style="margin-top:20px">
          <a href="${rescheduleUrl}"
             style="display:inline-block;
                    padding:10px 16px;
                    background:#0ea5e9;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:6px;
                    margin-right:10px">
            Reschedule Again
          </a>

          <a href="${cancelUrl}"
             style="display:inline-block;
                    padding:10px 16px;
                    background:#dc2626;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:6px">
            Cancel Booking
          </a>
        </div>

        <p style="margin-top:20px;font-size:13px;color:#555">
          These links are unique and secure.
        </p>

        <p style="margin-top:20px">
          An updated calendar invite is attached.
        </p>

        <p>
          —<br/>
          <strong>XilAire Technologies</strong>
        </p>
      </div>
    `;

    await client
      .api(`/users/${BOOKING_MAILBOX}/sendMail`)
      .post({
        message: {
          subject:
            "Your XilAire Technologies Call Was Rescheduled",
          body: {
            contentType: "HTML",
            content: emailHtml,
          },
          toRecipients: [
            {
              emailAddress: {
                address: payload.email,
              },
            },
          ],
          attachments: [
            {
              "@odata.type":
                "#microsoft.graph.fileAttachment",
              name: "xilaire-update.ics",
              contentType: "text/calendar",
              contentBytes: Buffer.from(ics).toString(
                "base64"
              ),
            },
          ],
        },
        saveToSentItems: true,
      });

    /* ---------------------------------------------
       INTERNAL AUDIT EMAIL
    --------------------------------------------- */
    const internalSummary = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Booking Rescheduled (Audit Copy)</h2>

        <p><strong>Email:</strong> ${payload.email}</p>
        <p><strong>New Date:</strong> ${formattedDate}</p>
        <p><strong>Event ID:</strong> ${payload.eventId}</p>
      </div>
    `;

    await client
      .api(`/users/${BOOKING_MAILBOX}/sendMail`)
      .post({
        message: {
          subject: `AUDIT: Rescheduled – ${payload.email}`,
          body: {
            contentType: "HTML",
            content: internalSummary,
          },
          toRecipients: [
            {
              emailAddress: {
                address: BOOKING_MAILBOX,
              },
            },
          ],
        },
        saveToSentItems: true,
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("BOOKING_RESCHEDULE_ERROR", err);

    return NextResponse.json(
      { error: "INVALID_OR_EXPIRED_TOKEN" },
      { status: 400 }
    );
  }
}