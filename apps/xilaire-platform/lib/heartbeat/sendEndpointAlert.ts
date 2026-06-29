import nodemailer from "nodemailer"
import { createClient } from "@supabase/supabase-js"

/* -------------------------------------------------
   🔒 SERVER-ONLY SUPABASE CLIENT (SERVICE ROLE)
------------------------------------------------- */
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM
) {
  throw new Error(
    "Missing Supabase env vars for sendEndpointAlert"
  )
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM,
  {
    auth: { persistSession: false },
  }
)

/* -------------------------------------------------
   📧 MAIL TRANSPORT (M365 / SMTP)
------------------------------------------------- */
const transporter = nodemailer.createTransport({
  host: process.env.ALERT_SMTP_HOST!,
  port: Number(process.env.ALERT_SMTP_PORT),
  secure: false, // STARTTLS
  auth: {
    user: process.env.ALERT_SMTP_USER!,
    pass: process.env.ALERT_SMTP_PASS!,
  },
})

/* -------------------------------------------------
   🚨 SEND ENDPOINT ALERT (ANTI-SPAM SAFE)
------------------------------------------------- */
type AlertPayload = {
  endpointId: string
  hostname: string
  oldStatus: "online" | "offline" | "stale"
  newStatus: "online" | "offline" | "stale"
  lastSeenAt: string | null
}

export async function sendEndpointAlert({
  endpointId,
  hostname,
  oldStatus,
  newStatus,
  lastSeenAt,
}: AlertPayload) {
  /* -------------------------------------------------
     1️⃣ HARD GUARD — REAL TRANSITION ONLY
  ------------------------------------------------- */
  if (oldStatus === newStatus) {
    return
  }

  /* -------------------------------------------------
     2️⃣ ANTI-DUPLICATE CHECK (AUDIT LOG)
  ------------------------------------------------- */
  const { data: lastLog, error } = await supabase
    .from("endpoint_status_audit_logs")
    .select("new_status")
    .eq("endpoint_id", endpointId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Alert audit lookup failed:", error)
    return
  }

  // If the latest recorded status already matches → skip alert
  if (lastLog?.new_status === newStatus) {
    return
  }

  /* -------------------------------------------------
     3️⃣ BUILD EMAIL
  ------------------------------------------------- */
  const subject = `🚨 Endpoint ${hostname} status changed: ${oldStatus} → ${newStatus}`

  const body = `
Endpoint Status Alert

Hostname: ${hostname}
Previous Status: ${oldStatus}
New Status: ${newStatus}
Last Seen: ${lastSeenAt ?? "Never"}

Timestamp: ${new Date().toLocaleString()}

XilAire Platform
  `.trim()

  /* -------------------------------------------------
     4️⃣ SEND EMAIL
  ------------------------------------------------- */
  try {
    await transporter.sendMail({
      from: `"XilAire Alerts" <${process.env.ALERT_SMTP_USER}>`,
      to: process.env.ALERT_RECIPIENT!,
      subject,
      text: body,
    })
  } catch (err) {
    console.error("Failed to send endpoint alert:", err)
  }
}
