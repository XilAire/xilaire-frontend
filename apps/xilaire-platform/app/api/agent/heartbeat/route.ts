import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/* -------------------------------------------------
   🔒 SERVICE ROLE CLIENT (NO SESSION, NO RLS)
------------------------------------------------- */
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM
) {
  throw new Error("Missing Supabase env vars for agent heartbeat")
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM,
  { auth: { persistSession: false } }
)

/* -------------------------------------------------
   POST /api/agent/heartbeat
------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { endpoint_id } = body

    if (!endpoint_id) {
      return NextResponse.json(
        { error: "endpoint_id is required" },
        { status: 400 }
      )
    }

    /* -------------------------------------------------
       🔍 LOAD ENDPOINT
    ------------------------------------------------- */
    const { data: endpoint, error: lookupError } = await supabase
      .from("endpoints")
      .select("id, agent_status")
      .eq("id", endpoint_id)
      .single()

    if (lookupError || !endpoint) {
      return NextResponse.json(
        { error: "Unknown endpoint" },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()
    const wasOffline = endpoint.agent_status !== "online"

    /* -------------------------------------------------
       🔄 UPDATE HEARTBEAT
    ------------------------------------------------- */
    const { error: updateError } = await supabase
      .from("endpoints")
      .update({
        agent_status: "online",
        last_seen_at: now,
      })
      .eq("id", endpoint.id)

    if (updateError) {
      console.error("Heartbeat update failed", updateError)
      return NextResponse.json(
        { error: "Heartbeat update failed" },
        { status: 500 }
      )
    }

    /* -------------------------------------------------
       🧾 AUDIT LOG (ONLY ON STATE CHANGE)
    ------------------------------------------------- */
    if (wasOffline) {
      await supabase
        .from("endpoint_status_audit_logs")
        .insert({
          endpoint_id: endpoint.id,
          old_status: "offline",
          new_status: "online",
          reason: "heartbeat",
          actor: "agent",
        })
    }

    /* -------------------------------------------------
       ✅ RESPONSE
    ------------------------------------------------- */
    return NextResponse.json({
      status: "ok",
      server_time: now,
      next_heartbeat_seconds: 60,
    })
  } catch (err) {
    console.error("Agent heartbeat fatal error", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
