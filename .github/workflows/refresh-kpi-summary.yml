import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Load Supabase environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { error } = await supabase.from("social_kpi_daily_summary").upsert([
    {
      platform: "Instagram",
      metric_type: "engagement_rate",
      day: today,
      avg_value: 5.2,
      data_points: 1,
    },
    {
      platform: "X",
      metric_type: "reach_growth",
      day: today,
      avg_value: 320,
      data_points: 1,
    },
  ]);

  if (error) {
    return new Response(`Error updating KPI summary: ${error.message}`, {
      status: 500,
    });
  }

  return new Response("✅ Social KPIs refreshed!", { status: 200 });
});
