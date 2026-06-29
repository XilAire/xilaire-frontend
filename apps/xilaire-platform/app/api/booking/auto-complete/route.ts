// apps/xilaire-platform/app/api/booking/auto-complete/route.ts

import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

/* =================================================
   ENV VALIDATION
================================================= */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM
const CRON_SECRET = process.env.CRON_SECRET

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM")
}

if (!SUPABASE_SERVICE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM")
}

if (!CRON_SECRET) {
  throw new Error("Missing CRON_SECRET")
}

/* =================================================
   CLIENT
================================================= */

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
)

/* =================================================
   AUTO COMPLETE BOOKINGS
================================================= */

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 })
    }

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        updated_at: now,
      })
      .eq("status", "scheduled")
      .eq("payment_status", "paid")
      .lt("scheduled_end", now)
      .select("id")

    if (error) {
      console.error("❌ Auto-complete failed:", error)
      return new Response("Error", { status: 500 })
    }

    console.log(
      "✅ Auto-completed bookings:",
      data?.map(b => b.id) ?? []
    )

    return new Response("OK", { status: 200 })

  } catch (err) {
    console.error("❌ Auto-complete exception:", err)
    return new Response("OK", { status: 500 })
  }
}