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

    const title = body.title?.trim();
    const description = body.description?.trim() || null;
    const requester_email = body.requester_email?.trim() || null;
    const priority = body.priority || "medium";

    if (!title) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .insert([
        {
          title,
          description,
          requester_email,
          priority,
          // status will default to 'open' via DB default
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("Error inserting ticket:", error);
      return NextResponse.json(
        { error: "Unable to create ticket." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("Ticket create route error:", err);
    return NextResponse.json(
      { error: "Unexpected error while creating ticket." },
      { status: 500 },
    );
  }
}
