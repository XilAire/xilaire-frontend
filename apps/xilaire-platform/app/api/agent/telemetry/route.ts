import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/* -------------------------------------------------
   🔒 SERVICE ROLE CLIENT
------------------------------------------------- */
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM
) {
  throw new Error("Missing Supabase env vars for agent telemetry")
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM,
  { auth: { persistSession: false } }
)

/* -------------------------------------------------
   POST /api/agent/telemetry
------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      endpoint_id,
      cpu_pct,
      memory_pct,
      disk_pct,
    } = body ?? {}

    if (!endpoint_id) {
      return NextResponse.json(
        { error: "endpoint_id is required" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    /* -------------------------------------------------
       🔄 UPDATE ENDPOINT SNAPSHOT
    ------------------------------------------------- */
    const { error: updateError } = await supabase
      .from("endpoints")
      .update({
        last_cpu_pct: cpu_pct,
        last_memory_pct: memory_pct,
        last_disk_pct: disk_pct,
        last_seen_at: now,
      })
      .eq("id", endpoint_id)

    if (updateError) {
      console.error(updateError)
      return NextResponse.json(
        { error: "Failed to update endpoint snapshot" },
        { status: 500 }
      )
    }

    /* -------------------------------------------------
       📈 INSERT TELEMETRY ROW
    ------------------------------------------------- */
    await supabase
      .from("endpoint_telemetry")
      .insert({
        endpoint_id,
        cpu_pct,
        memory_pct,
        disk_pct,
      })

    return NextResponse.json({ status: "ok" })
  } catch (err) {
    console.error("Telemetry error", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
