// File: supabase/functions/refresh_kpi_summary/index.ts
// @ts-nocheck

import { serve } from "https://deno.land/x/sift@0.5.0/mod.ts";
// pull in both code + types in one go
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

serve(async (_req) => {
  // 1) pull fresh raw automation_logs (last 24h)
  const { data: logs, error: logsError } = await supabase
    .from("automation_logs")
    .select("bot, status")
    .gt(
      "timestamp",
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    );

  if (logsError) {
    console.error("Failed to fetch logs:", logsError);
    return new Response(
      JSON.stringify({ error: logsError.message }),
      { status: 500 }
    );
  }

  // 2) compute summary per bot
  const summary = logs!.reduce<Record<string, { runs: number; failures: number }>>(
    (acc, { bot, status }) => {
      if (!acc[bot]) acc[bot] = { runs: 0, failures: 0 };
      acc[bot].runs += 1;
      if (status === "failure") acc[bot].failures += 1;
      return acc;
    },
    {}
  );

  // 3) prepare upsert entries for both metrics
  const timestamp = new Date().toISOString();
  const entries = [
    ...Object.entries(summary).map(([bot, { runs }]) => ({
      bot,
      metric: "runs",
      value: runs,
      timestamp,
    })),
    ...Object.entries(summary).map(([bot, { failures }]) => ({
      bot,
      metric: "errors",
      value: failures,
      timestamp,
    })),
  ];

  // 4) upsert into kpi_metrics
  const { error: upsertError } = await supabase
    .from("kpi_metrics")
    .upsert(entries, { onConflict: ["bot", "metric", "timestamp"] });

  if (upsertError) {
    console.error("Failed to upsert metrics:", upsertError);
    return new Response(
      JSON.stringify({ error: upsertError.message }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ success: true, summary }),
    { status: 200 }
  );
});
