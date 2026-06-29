/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type BookingEmailParams = {
  name: string;
  email: string;
  start: Date;
  end: Date;
  oldStart?: Date;
  oldEnd?: Date;
  cancelUrl?: string;
  rescheduleUrl?: string;
  rebookUrl?: string;
};

/* -------------------------------------------------
   BASE TEMPLATE (BRANDING)
------------------------------------------------- */
function baseTemplate(title: string, bodyHtml: string) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
      <div style="max-width:600px;margin:auto;background:#ffffff;
                  border-radius:8px;padding:24px">
        <h2 style="margin-top:0;color:#2563eb">${title}</h2>

        ${bodyHtml}

        <hr style="margin:32px 0"/>

        <p style="font-size:12px;color:#6b7280">
          —<br/>
          <strong>XilAire Technologies</strong><br/>
          Operations & Automation<br/>
          <a href="https://xilairetechnologies.com"
             style="color:#2563eb;text-decoration:none">
            xilairetechnologies.com
          </a>
        </p>
      </div>
    </div>
  `;
}

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
function formatDateRange(start: Date, end: Date) {
  return `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/* -------------------------------------------------
   CONFIRMATION EMAIL
------------------------------------------------- */
export function buildBookingConfirmationEmail({
  name,
  start,
  end,
  cancelUrl,
  rescheduleUrl,
}: BookingEmailParams) {
  const when = formatDateRange(start, end);

  const body = `
    <p>Hi ${name},</p>

    <p>Your meeting with <strong>XilAire Technologies</strong> has been scheduled.</p>

    <p><strong>When:</strong><br/>${when}</p>

    <p style="margin-top:24px">
      <a href="${rescheduleUrl}"
         style="display:inline-block;margin-right:12px;
                padding:10px 16px;
                background:#2563eb;color:#fff;
                text-decoration:none;border-radius:6px">
        Reschedule
      </a>

      <a href="${cancelUrl}"
         style="display:inline-block;
                padding:10px 16px;
                background:#dc2626;color:#fff;
                text-decoration:none;border-radius:6px">
        Cancel
      </a>
    </p>
  `;

  return {
    subject: "Your meeting with XilAire Technologies is confirmed",
    html: baseTemplate("Meeting Confirmed ✅", body),
  };
}

/* -------------------------------------------------
   RESCHEDULE EMAIL
------------------------------------------------- */
export function buildBookingRescheduledEmail({
  name,
  start,
  end,
  oldStart,
  oldEnd,
  cancelUrl,
  rescheduleUrl,
}: BookingEmailParams) {
  const newWhen = formatDateRange(start, end);
  const oldWhen =
    oldStart && oldEnd ? formatDateRange(oldStart, oldEnd) : null;

  const body = `
    <p>Hi ${name},</p>

    <p>Your meeting with <strong>XilAire Technologies</strong> has been rescheduled.</p>

    ${
      oldWhen
        ? `
      <p style="margin-top:16px;color:#6b7280">
        <strong>Previous time:</strong><br/>
        ${oldWhen}
      </p>
    `
        : ""
    }

    <p style="margin-top:16px">
      <strong>New time:</strong><br/>
      ${newWhen}
    </p>

    <p style="margin-top:24px">
      <a href="${rescheduleUrl}"
         style="display:inline-block;margin-right:12px;
                padding:10px 16px;
                background:#2563eb;color:#fff;
                text-decoration:none;border-radius:6px">
        Reschedule Again
      </a>

      <a href="${cancelUrl}"
         style="display:inline-block;
                padding:10px 16px;
                background:#dc2626;color:#fff;
                text-decoration:none;border-radius:6px">
        Cancel Meeting
      </a>
    </p>

    <p style="margin-top:24px;font-size:12px;color:#6b7280">
      This email reflects the most recent update to your meeting.
    </p>
  `;

  return {
    subject: "Your meeting with XilAire Technologies has been rescheduled",
    html: baseTemplate("Meeting Rescheduled 🔁", body),
  };
}

/* -------------------------------------------------
   CANCELLATION EMAIL
------------------------------------------------- */
export function buildBookingCancellationEmail({
  name,
  start,
  end,
  rebookUrl,
}: BookingEmailParams) {
  const when = formatDateRange(start, end);

  const body = `
    <p>Hi ${name},</p>

    <p>This confirms your meeting scheduled for:</p>

    <p><strong>${when}</strong></p>

    <p>has been cancelled.</p>

    ${
      rebookUrl
        ? `
      <p style="margin-top:24px">
        <a href="${rebookUrl}"
           style="display:inline-block;
                  padding:10px 16px;
                  background:#2563eb;color:#fff;
                  text-decoration:none;border-radius:6px">
          Book a new meeting
        </a>
      </p>
    `
        : ""
    }
  `;

  return {
    subject: "Your meeting with XilAire Technologies has been cancelled",
    html: baseTemplate("Meeting Cancelled ❌", body),
  };
}