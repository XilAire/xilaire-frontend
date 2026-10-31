/**
 * XilAire Technologies
 * AUTH-04T-24U-R8B
 *
 * Pure booking notification message builders.
 *
 * No Supabase calls.
 * No Microsoft Graph calls.
 * No JWT signing.
 * No HTTP requests.
 */

export type BookingNotificationInput = {
  bookingId: string
  attendeeName: string
  attendeeEmail: string
  bookingTitle: string
  scheduledStart: string
  scheduledEnd: string
  stripeCheckoutSessionId: string
  graphEventId: string
  bookingMailbox: string
  cancelUrl: string
  rescheduleUrl: string
  teamsJoinUrl?: string | null
}

export type BookingNotificationMessage = {
  subject: string
  body: {
    contentType: "HTML"
    content: string
  }
  toRecipients: Array<{
    emailAddress: {
      address: string
    }
  }>
  attachments?: Array<{
    "@odata.type": "#microsoft.graph.fileAttachment"
    name: string
    contentType: "text/calendar"
    contentBytes: string
  }>
}

/**
 * Escape untrusted values before inserting them into HTML.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Prevent CRLF or delimiter injection in ICS properties.
 */
function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
}

function validDate(value: string): Date {
  const result = new Date(value)

  if (!Number.isFinite(result.getTime())) {
    throw new Error("INVALID_BOOKING_NOTIFICATION_DATE")
  }

  return result
}

function formatDateET(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(validDate(value))
}

function formatIcsDate(value: Date): string {
  return value.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
}

function requireHttpsUrl(value: string): string {
  const parsed = new URL(value)

  if (parsed.protocol !== "https:") {
    throw new Error("BOOKING_NOTIFICATION_URL_NOT_HTTPS")
  }

  if (parsed.username || parsed.password) {
    throw new Error("BOOKING_NOTIFICATION_URL_HAS_CREDENTIALS")
  }

  return parsed.toString()
}

function validateInput(input: BookingNotificationInput): void {
  const required = [
    input.bookingId,
    input.attendeeName,
    input.attendeeEmail,
    input.bookingTitle,
    input.stripeCheckoutSessionId,
    input.graphEventId,
    input.bookingMailbox,
    input.cancelUrl,
    input.rescheduleUrl,
  ]

  if (required.some((value) => !value || !value.trim())) {
    throw new Error("BOOKING_NOTIFICATION_REQUIRED_FIELD_MISSING")
  }

  if (
    /[\r\n]/.test(input.attendeeEmail) ||
    /[\r\n]/.test(input.bookingMailbox)
  ) {
    throw new Error("BOOKING_NOTIFICATION_ADDRESS_INVALID")
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.attendeeEmail)) {
    throw new Error("BOOKING_NOTIFICATION_ATTENDEE_EMAIL_INVALID")
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.bookingMailbox)) {
    throw new Error("BOOKING_NOTIFICATION_MAILBOX_INVALID")
  }

  if (validDate(input.scheduledEnd) <= validDate(input.scheduledStart)) {
    throw new Error("BOOKING_NOTIFICATION_TIME_RANGE_INVALID")
  }

  requireHttpsUrl(input.cancelUrl)
  requireHttpsUrl(input.rescheduleUrl)

  if (input.teamsJoinUrl) {
    requireHttpsUrl(input.teamsJoinUrl)
  }
}

/**
 * RFC 5545 content-line folding.
 *
 * Each physical line is at most 75 UTF-8 octets.
 * Continuations begin with one space, which counts
 * toward the 75-octet limit.
 *
 * Fold only complete Unicode code points.
 */
function foldIcsLine(line: string): string {
  const parts: string[] = []
  let current = ""
  let octets = 0

  for (const character of line) {
    const width = Buffer.byteLength(character, "utf8")

    if (octets + width > 75) {
      parts.push(current)
      current = " "
      octets = 1
    }

    current += character
    octets += width
  }

  parts.push(current)

  return parts.join("\r\n")
}
function makeIcs(input: BookingNotificationInput): string {
  const cancelUrl = escapeIcs(requireHttpsUrl(input.cancelUrl))
  const rescheduleUrl = escapeIcs(requireHttpsUrl(input.rescheduleUrl))

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//XilAire Technologies//Booking//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(input.graphEventId)}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(validDate(input.scheduledStart))}`,
    `DTEND:${formatIcsDate(validDate(input.scheduledEnd))}`,
    `SUMMARY:${escapeIcs(`XilAire - ${input.bookingTitle}`)}`,
    `ORGANIZER:MAILTO:${escapeIcs(input.bookingMailbox)}`,
    `ATTENDEE;CN="${escapeIcs(input.attendeeName)}":MAILTO:${escapeIcs(input.attendeeEmail)}`,
    `DESCRIPTION:Reschedule: ${rescheduleUrl}\\nCancel: ${cancelUrl}`,
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].map(foldIcsLine).join("\r\n")
}

export function buildCustomerBookingConfirmation(
  input: BookingNotificationInput
): BookingNotificationMessage {
  validateInput(input)

  const name = escapeHtml(input.attendeeName)
  const formattedDate = escapeHtml(formatDateET(input.scheduledStart))

  const rescheduleUrl = escapeHtml(requireHttpsUrl(input.rescheduleUrl))
  const cancelUrl = escapeHtml(requireHttpsUrl(input.cancelUrl))

  const teamsLink = input.teamsJoinUrl
    ? `<p><a href="${escapeHtml(requireHttpsUrl(input.teamsJoinUrl))}">Join Meeting</a></p>`
    : ""

  const ics = makeIcs(input)

  return {
    subject: "Your XilAire Booking Is Confirmed",
    body: {
      contentType: "HTML",
      content: `
        <div style="font-family:Arial,sans-serif;max-width:600px">
          <h2 style="color:#0ea5e9">Your XilAire Booking Is Confirmed</h2>
          <p>Hi ${name},</p>
          <p><strong>Scheduled For:</strong> ${formattedDate}</p>
          ${teamsLink}
          <p>
            <a href="${rescheduleUrl}">Reschedule</a> |
            <a href="${cancelUrl}">Cancel</a>
          </p>
        </div>
      `,
    },
    toRecipients: [
      {
        emailAddress: {
          address: input.attendeeEmail,
        },
      },
    ],
    attachments: [
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: "xilaire-booking.ics",
        contentType: "text/calendar",
        contentBytes: Buffer.from(ics, "utf8").toString("base64"),
      },
    ],
  }
}

export function buildInternalBookingConfirmation(
  input: BookingNotificationInput
): BookingNotificationMessage {
  validateInput(input)

  const name = escapeHtml(input.attendeeName)
  const email = escapeHtml(input.attendeeEmail)
  const bookingTitle = escapeHtml(input.bookingTitle)
  const date = escapeHtml(formatDateET(input.scheduledStart))
  const session = escapeHtml(input.stripeCheckoutSessionId)
  const bookingId = escapeHtml(input.bookingId)

  return {
    subject: `BOOKING CONFIRMED - ${input.attendeeEmail}`,
    body: {
      contentType: "HTML",
      content: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Type:</strong> ${bookingTitle}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Stripe Session:</strong> ${session}</p>
        <p><strong>Booking ID:</strong> ${bookingId}</p>
      `,
    },
    toRecipients: [
      {
        emailAddress: {
          address: input.bookingMailbox,
        },
      },
    ],
  }
}