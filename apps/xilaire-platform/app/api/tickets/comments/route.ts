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
    const message: string | undefined = body.message;
    const userEmail: string = body.userEmail || "Unknown";

    /* -----------------------------------------------------
     * Validation
     * ---------------------------------------------------*/
    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required." },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "message cannot be empty." },
        { status: 400 }
      );
    }

    /* -----------------------------------------------------
     * Insert comment INTO ticket_comments
     * ---------------------------------------------------*/
    const { data: comment, error: commentError } = await supabaseAdmin
      .from("ticket_comments")
      .insert({
        ticket_id: ticketId,
        message: message.trim(),
        user_email: userEmail,
      })
      .select("*")
      .single();

    if (commentError) {
      console.error("❌ ticket_comments insert failed:", commentError);
      return NextResponse.json(
        { error: "Failed to add comment." },
        { status: 500 }
      );
    }

    /* -----------------------------------------------------
     * Log activity (non-blocking, but reported if fails)
     * ---------------------------------------------------*/
    const { error: activityError } = await supabaseAdmin
      .from("ticket_activity")
      .insert({
        ticket_id: ticketId,
        type: "comment",
        message: `Comment added by ${userEmail}`,
      });

    if (activityError) {
      console.error("⚠️ ticket_activity insert failed:", activityError);
      // We do NOT return an error here — comment succeeded.
    }

    /* -----------------------------------------------------
     * Success Response
     * ---------------------------------------------------*/
    return NextResponse.json({
      ok: true,
      comment,
    });
  } catch (err) {
    console.error("❌ Comment Route Fatal Error:", err);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
