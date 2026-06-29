import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const ticketId: string | undefined = body.ticketId;
    const newStatus: string | undefined = body.status;
    const newPriority: string | undefined = body.priority;

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required." },
        { status: 400 },
      );
    }

    /* ------------------------------------------------------
     * 1) Load existing ticket (for before/after logging)
     * ----------------------------------------------------*/
    const { data: oldTicket, error: loadError } = await supabaseAdmin
      .from("tickets")
      .select("status, priority")
      .eq("id", ticketId)
      .single();

    if (loadError || !oldTicket) {
      console.error("Error loading previous ticket state:", loadError);
      return NextResponse.json(
        { error: "Ticket not found." },
        { status: 404 },
      );
    }

    /* ------------------------------------------------------
     * 2) Prepare update payload
     * ----------------------------------------------------*/
    const update: Record<string, string> = {};
    if (newStatus) update.status = newStatus;
    if (newPriority) update.priority = newPriority;

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update (status/priority missing)." },
        { status: 400 },
      );
    }

    /* ------------------------------------------------------
     * 3) Update ticket
     * ----------------------------------------------------*/
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("tickets")
      .update(update)
      .eq("id", ticketId)
      .select("id, status, priority")
      .single();

    if (updateError) {
      console.error("Ticket update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update ticket." },
        { status: 500 },
      );
    }

    /* ------------------------------------------------------
     * 4) Build ACTIVITY LOG entries
     * ----------------------------------------------------*/
    const logs: any[] = [];

    // Status change
    if (newStatus && newStatus !== oldTicket.status) {
      logs.push({
        ticket_id: ticketId,
        type: "status_change",
        message: `Status changed from '${oldTicket.status}' → '${newStatus}'`,
      });
    }

    // Priority change
    if (newPriority && newPriority !== oldTicket.priority) {
      logs.push({
        ticket_id: ticketId,
        type: "priority_change",
        message: `Priority changed from '${oldTicket.priority}' → '${newPriority}'`,
      });
    }

    /* ------------------------------------------------------
     * 5) Insert logs (if any changes)
     * ----------------------------------------------------*/
    if (logs.length > 0) {
      const { error: logError } = await supabaseAdmin
        .from("ticket_activity")
        .insert(logs);

      if (logError) {
        console.error("Activity log insert error:", logError);
      }
    }

    return NextResponse.json({ ok: true, ticket: updated });
  } catch (err) {
    console.error("Tickets update API error:", err);
    return NextResponse.json(
      { error: "Server error." },
      { status: 500 },
    );
  }
}
