// apps/xilaire-platform/app/api/booking/auto-complete/route.ts

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Complete paid bookings after their scheduled end time.
 * Secrets are resolved at request time so route-module imports do not
 * require runtime secrets during Next.js build-time page collection.
 */
export async function POST(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    // Fail closed if the server secret is not configured.
    if (!cronSecret) {
      console.error("Booking auto-complete: CRON_SECRET is not configured.");
      return new Response("Service unavailable", { status: 503 });
    }

    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Booking auto-complete: Supabase configuration is missing.");
      return new Response("Service unavailable", { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        updated_at: now,
      })
      .eq("status", "scheduled")
      .eq("payment_status", "paid")
      .lt("scheduled_end", now)
      .select("id");

    if (error) {
      console.error("Booking auto-complete failed:", error);
      return new Response("Error", { status: 500 });
    }

    console.log("Auto-completed bookings:", data?.map((booking) => booking.id) ?? []);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Booking auto-complete exception:", error);
    return new Response("Error", { status: 500 });
  }
}
