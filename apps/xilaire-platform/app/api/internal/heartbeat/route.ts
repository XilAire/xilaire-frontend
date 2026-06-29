import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkOfflineEndpoints } from "@/lib/heartbeat/checkOfflineEndpoints"

export const dynamic = "force-dynamic"

// 🔐 SERVICE ROLE CLIENT — REQUIRED FOR CRON
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

/**
 * 🔁 INTERNAL HEARTBEAT EXECUTION
 * Used by:
 * - Vercel Cron (GET)
 * - Manual / internal trigger (POST)
 */
async function runHeartbeat() {
  const result = await checkOfflineEndpoints(supabase)

  return NextResponse.json({
    status: "ok",
    ...result,
  })
}

/**
 * 🤖 VERCEL CRON ENTRYPOINT
 */
export async function GET() {
  try {
    return await runHeartbeat()
  } catch (error) {
    console.error("Heartbeat GET failed:", error)

    return NextResponse.json(
      { error: "Heartbeat failed" },
      { status: 500 }
    )
  }
}

/**
 * 🧪 MANUAL / INTERNAL TRIGGER
 */
export async function POST() {
  try {
    return await runHeartbeat()
  } catch (error) {
    console.error("Heartbeat POST failed:", error)

    return NextResponse.json(
      { error: "Heartbeat failed" },
      { status: 500 }
    )
  }
}
