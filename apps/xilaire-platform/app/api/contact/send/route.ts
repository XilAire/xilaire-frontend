import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

// --- Supabase Admin Client (XilAire Platform) ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// --- Email Config ---
const CONTACT_FROM = process.env.CONTACT_EMAIL_USER; // csthilaire@xilairetechnologies.com
const CONTACT_PASS = process.env.CONTACT_EMAIL_PASS;
const SUPPORT_TO =
  process.env.SUPPORT_INBOX_EMAIL || "support@xilairetechnologies.com";

// ---------------------------------------------------------------------------
// POST HANDLER
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const body = await req.json();

  const fullName = body.fullName?.trim();
  const email = body.email?.trim();
  const company = body.company?.trim();
  const employees = body.employees?.trim();
  const services = body.services?.trim(); // dropdown / topic
  const message = body.message?.trim();
  const honeypot = body.honeypot?.trim?.();

  const serviceSku = body.serviceSku?.trim?.();
  const serviceName = body.serviceName?.trim?.() || services || null;
  const sourcePath = body.sourcePath?.trim?.() || null;

  // 🕵️ Honeypot bot detection
  if (honeypot) return NextResponse.json({ ok: true });

  // Validation
  if (!fullName || !email || !message) {
    return NextResponse.json(
      { error: "Please fill out all required fields." },
      { status: 400 }
    );
  }

  if (!CONTACT_FROM || !CONTACT_PASS) {
    console.error("❌ Missing CONTACT_EMAIL_USER or CONTACT_EMAIL_PASS");
    return NextResponse.json(
      { error: "Email configuration missing." },
      { status: 500 }
    );
  }

  // -------------------------------------------------------------------------
  // 1) Save to Supabase (contact_requests)
  // -------------------------------------------------------------------------
  const { error: dbError } = await supabaseAdmin
    .from("contact_requests")
    .insert([
      {
        full_name: fullName,
        email,
        topic: services || null,
        message,
        service_sku: serviceSku ?? null,
        service_name: serviceName ?? null,
        source_path: sourcePath,
        raw_payload: body, // full JSON for future auditing/automation
      },
    ]);

  if (dbError) {
    console.error("❌ Supabase insert error:", dbError);
    return NextResponse.json(
      { error: "Unable to save your message. Please try again." },
      { status: 500 }
    );
  }

  // -------------------------------------------------------------------------
  // 2) Configure Office 365 SMTP Transport
  // -------------------------------------------------------------------------
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: CONTACT_FROM,
      pass: CONTACT_PASS,
    },
  });

  // INTERNAL EMAIL → support inbox
  const internalMail = transporter.sendMail({
    from: `"XilAire Technologies Contact" <noreply@xilairetechnologies.com>`,
    to: SUPPORT_TO,
    subject: `📩 New Platform Contact: ${services || serviceName || "General inquiry"}`,
    text: `
New contact form message (XilAire Platform):

Name: ${fullName}
Email: ${email}
Company: ${company || "-"}
Employees: ${employees || "-"}
Interested in: ${services || serviceName || "-"}
Service SKU: ${serviceSku || "-"}
Source path: ${sourcePath || "-"}

Message:
${message}
    `.trim(),
    html: `
      <h2>New XilAire Platform Contact</h2>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Company:</strong> ${company || "-"}</p>
      <p><strong>Employees:</strong> ${employees || "-"}</p>
      <p><strong>Interested in:</strong> ${services || serviceName || "-"}</p>
      <p><strong>Service SKU:</strong> ${serviceSku || "-"}</p>
      <p><strong>Source path:</strong> ${sourcePath || "-"}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `,
  });

  // CONFIRMATION EMAIL → back to sender
  const confirmationMail = transporter.sendMail({
    from: `"XilAire Technologies" <noreply@xilairetechnologies.com>`,
    to: email,
    subject: "We received your message",
    text: `
Hi ${fullName},

Thank you for contacting XilAire Technologies about your IT environment.

We've received your message and will review your needs around:
${services || serviceName || "Managed IT, Cloud, Security, VoIP, or Automation"}

Copy of your message:
${message}

— XilAire Technologies
    `.trim(),
    html: `
      <p>Hi ${fullName},</p>
      <p>Thank you for contacting <strong>XilAire Technologies</strong>. We have received your message and will review your request shortly.</p>
      <p><strong>Area of interest:</strong> ${
        services || serviceName || "Managed IT, Cloud, Security, VoIP, or Automation"
      }</p>
      <p><strong>Your message:</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
      <br/>
      <p>— XilAire Technologies</p>
    `,
  });

  try {
    await Promise.all([internalMail, confirmationMail]);
  } catch (err) {
    console.error("❌ Email send failure:", err);
    // Still OK because DB insert succeeded
    return NextResponse.json({
      ok: true,
      warning:
        "Your message was saved, but we could not send notification emails.",
    });
  }

  return NextResponse.json({ ok: true });
}
