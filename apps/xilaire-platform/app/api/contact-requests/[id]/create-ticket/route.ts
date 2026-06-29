import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---- Supabase admin client (platform) ----
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const contactId = params.id;

  console.log("[create-ticket] incoming contactId:", contactId);

  if (!contactId) {
    return NextResponse.json(
      { error: "Missing contact request id." },
      { status: 400 },
    );
  }

  // 1) Load the contact request
  const { data: contact, error: contactError } = await supabaseAdmin
    .from("contact_requests")
    .select(
      `
        id,
        full_name,
        email,
        topic,
        service_sku,
        service_name,
        message,
        status,
        linked_ticket_id
      `,
    )
    .eq("id", contactId)
    .maybeSingle();

  console.log("[create-ticket] loaded contact:", { contact, contactError });

  if (contactError) {
    console.error("Error loading contact_request:", contactError);
    return NextResponse.json(
      { error: "Unable to load contact request.", details: contactError },
      { status: 500 },
    );
  }

  if (!contact) {
    return NextResponse.json(
      { error: "Contact request not found." },
      { status: 404 },
    );
  }

  if (contact.linked_ticket_id) {
    return NextResponse.json({
      ok: true,
      ticketId: contact.linked_ticket_id,
      alreadyLinked: true,
    });
  }

  // 2) Create the ticket
  const titleParts: string[] = [];
  if (contact.topic) titleParts.push(contact.topic);
  if (contact.service_name) titleParts.push(contact.service_name);

  const title =
    titleParts.join(" – ") ||
    `Contact request from ${contact.full_name ?? "unknown contact"}`;

  const descriptionLines: string[] = [];

  if (contact.full_name) descriptionLines.push(`Name: ${contact.full_name}`);
  if (contact.email) descriptionLines.push(`Email: ${contact.email}`);
  if (contact.service_sku || contact.service_name) {
    descriptionLines.push(
      `Service: ${contact.service_sku ?? ""} ${
        contact.service_name ?? ""
      }`.trim(),
    );
  }
  if (contact.message) {
    descriptionLines.push("");
    descriptionLines.push("Message:");
    descriptionLines.push(contact.message);
  }

  const description = descriptionLines.join("\n");

  const { data: ticketRow, error: ticketError } = await supabaseAdmin
    .from("tickets")
    .insert([
      {
        title,
        description,
        status: "open", // ticket_status enum
        priority: "medium", // ticket_priority enum
        bot_id: null,
        requester_email: contact.email ?? null,
      },
    ])
    .select("id")
    .maybeSingle();

  console.log("[create-ticket] insert ticket result:", { ticketRow, ticketError });

  if (ticketError || !ticketRow) {
    console.error("Error creating ticket from contact:", ticketError);
    return NextResponse.json(
      { error: "Unable to create ticket.", details: ticketError },
      { status: 500 },
    );
  }

  const ticketId: string = ticketRow.id;

  // 3) Link back to contact_requests
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("contact_requests")
    .update({
      linked_ticket_id: ticketId,
      status: "converted",
    })
    .eq("id", contactId)
    .select("id, status, linked_ticket_id")
    .maybeSingle();

  console.log("[create-ticket] update contact result:", {
    updated,
    updateError,
  });

  if (updateError || !updated) {
    console.error(
      "Error linking ticket back to contact_requests:",
      updateError,
    );
    return NextResponse.json(
      {
        ok: true,
        ticketId,
        warning:
          "Ticket created but contact request was not linked. Check Supabase.",
        details: updateError,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    ticketId,
    contactAfterUpdate: updated,
  });
}
