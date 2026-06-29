/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type IcsParams = {
  eventId: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  organizerEmail: string;
  attendeeEmail: string;
  sequence?: number;
};

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
function formatIcsDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0] + "Z";
}

/* -------------------------------------------------
   CREATE / UPDATE EVENT
------------------------------------------------- */
export function buildIcsInvite({
  eventId,
  title,
  description,
  start,
  end,
  organizerEmail,
  attendeeEmail,
  sequence = 0,
}: IcsParams): string {
  return `
BEGIN:VCALENDAR
PRODID:-//XilAire Technologies//Booking//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${eventId}
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(start)}
DTEND:${formatIcsDate(end)}
SEQUENCE:${sequence}
SUMMARY:${title}
DESCRIPTION:${description ?? ""}
ORGANIZER:MAILTO:${organizerEmail}
ATTENDEE;CN=${attendeeEmail};RSVP=TRUE:MAILTO:${attendeeEmail}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
`.trim();
}

/* -------------------------------------------------
   CANCEL EVENT
------------------------------------------------- */
export function buildIcsCancel({
  eventId,
  title,
  start,
  end,
  organizerEmail,
  attendeeEmail,
  sequence = 1,
}: IcsParams): string {
  return `
BEGIN:VCALENDAR
PRODID:-//XilAire Technologies//Booking//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:CANCEL
BEGIN:VEVENT
UID:${eventId}
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(start)}
DTEND:${formatIcsDate(end)}
SEQUENCE:${sequence}
SUMMARY:${title}
ORGANIZER:MAILTO:${organizerEmail}
ATTENDEE:MAILTO:${attendeeEmail}
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR
`.trim();
}