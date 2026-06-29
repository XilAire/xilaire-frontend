// apps/xilaire-platform/app/api/automations/create/route.ts
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

    const name = body.name?.trim();
    const description = body.description?.trim() || null;
    const bot_id = body.bot_id || null;

    if (!name) {
      return NextResponse.json(
        { error: "Automation name is required." },
        { status: 400 },
      );
    }

    // Insert into automations table
    const { data, error } = await supabaseAdmin
      .from("automations")
      .insert([
        {
          name,
          description,
          bot_id,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("❌ Error inserting automation:", error);
      return NextResponse.json(
        { error: "Failed to create automation." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: data?.id,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("❌ /api/automations/create error:", err);
    return NextResponse.json(
      { error: "Unexpected error while creating automation." },
      { status: 500 },
    );
  }
}
