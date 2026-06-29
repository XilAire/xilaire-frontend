// apps/xilaire-platform/app/(app)/dashboard/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "Dashboard | XilAire Platform",
  description:
    "Overview of your bots, tickets, automations, and platform health.",
};

type RunStatus = "success" | "failed" | "running";

type DashboardStats = {
  managedDevices: number;
  uptime30d: number;
  automations24h: number;
  openTickets: number;
  activeAlerts: number;
  topBotId: string | null;
  topBotName: string | null;
  topBotSlug: string | null;
  topBotOpenTickets: number;
  topBotRuns24h: number;
};

type RecentActivityItem = {
  id: string;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  automation_name: string;
  bot_name: string | null;
};

async function getDashboardData(): Promise<{
  stats: DashboardStats;
  recentActivity: RecentActivityItem[];
}> {
  const supabase = await createServerSupabaseClient();

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  /* -----------------------------
     OPEN TICKETS
  ----------------------------- */
  const { data: openTicketRows, error: ticketsError } = await supabase
    .from("tickets")
    .select("id, status, bot_id")
    .eq("status", "open");

  if (ticketsError) {
    console.error("Error loading open tickets:", ticketsError);
  }

  const openTickets = openTicketRows?.length ?? 0;

  const openTicketsByBot = new Map<string, number>();
  (openTicketRows ?? []).forEach((t: any) => {
    if (!t.bot_id) return;
    openTicketsByBot.set(
      t.bot_id,
      (openTicketsByBot.get(t.bot_id) ?? 0) + 1
    );
  });

  /* -----------------------------
     ACTIVE ALERTS (CANONICAL)
  ----------------------------- */
  const { count: activeAlertsCount, error: alertsError } =
    await supabase
      .from("active_alerts")
      .select("id", { head: true, count: "exact" });

  if (alertsError) {
    console.error("Error counting active alerts:", alertsError);
  }

  /* -----------------------------
     AUTOMATION RUN COUNT (24H)
  ----------------------------- */
  const { count: runsCount, error: runsCountError } = await supabase
    .from("automation_runs")
    .select("id", { head: true, count: "exact" })
    .gte("started_at", since24h);

  if (runsCountError) {
    console.error("Error counting automation runs:", runsCountError);
  }

  /* -----------------------------
     RECENT AUTOMATION RUNS
  ----------------------------- */
  const { data: recentRuns, error: recentRunsError } = await supabase
    .from("automation_runs")
    .select(
      `
        id,
        status,
        started_at,
        finished_at,
        duration_ms,
        automations (
          name,
          bot_id,
          bots (
            name,
            slug
          )
        )
      `
    )
    .gte("started_at", since24h)
    .order("started_at", { ascending: false })
    .limit(5);

  if (recentRunsError) {
    console.error("Error loading recent automation runs:", recentRunsError);
  }

  const runs24hByBot = new Map<string, number>();

  const recentActivity: RecentActivityItem[] =
    recentRuns?.map((run: any) => {
      const botId = run.automations?.bot_id ?? null;
      if (botId) {
        runs24hByBot.set(
          botId,
          (runs24hByBot.get(botId) ?? 0) + 1
        );
      }

      return {
        id: run.id,
        status: run.status,
        started_at: run.started_at,
        finished_at: run.finished_at,
        duration_ms: run.duration_ms,
        automation_name: run.automations?.name ?? "Unknown automation",
        bot_name: run.automations?.bots?.name ?? null,
      };
    }) ?? [];

  /* -----------------------------
     TOP NOISY BOT
  ----------------------------- */
  const botIdsForStats = Array.from(
    new Set([...openTicketsByBot.keys(), ...runs24hByBot.keys()])
  );

  let topBotId: string | null = null;
  let topBotName: string | null = null;
  let topBotSlug: string | null = null;
  let topBotOpenTickets = 0;
  let topBotRuns24h = 0;

  if (botIdsForStats.length > 0) {
    const { data: botsData } = await supabase
      .from("bots")
      .select("id, name, slug")
      .in("id", botIdsForStats);

    if (botsData) {
      let bestScore = -1;

      botsData.forEach((b: any) => {
        const open = openTicketsByBot.get(b.id) ?? 0;
        const runs = runs24hByBot.get(b.id) ?? 0;
        const score = open * 2 + runs;

        if (score > bestScore) {
          bestScore = score;
          topBotId = b.id;
          topBotName = b.name;
          topBotSlug = b.slug;
          topBotOpenTickets = open;
          topBotRuns24h = runs;
        }
      });
    }
  }

  const stats: DashboardStats = {
    managedDevices: 126,
    uptime30d: 99.96,
    automations24h: runsCount ?? 0,
    openTickets,
    activeAlerts: activeAlertsCount ?? 0,
    topBotId,
    topBotName,
    topBotSlug,
    topBotOpenTickets,
    topBotRuns24h,
  };

  return { stats, recentActivity };
}

/* -----------------------------
   PAGE
----------------------------- */
export default async function DashboardPage() {
  const { stats, recentActivity } = await getDashboardData();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-50">Dashboard</h1>
        <p className="text-sm text-slate-400">
          Overview of your bots, tickets, and automations.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-5">
        <Card label="Managed devices" value={stats.managedDevices} />
        <Card
          label="Uptime (30d)"
          value={`${stats.uptime30d.toFixed(2)}%`}
          color="text-emerald-400"
        />
        <Card
          label="Automations (24h)"
          value={stats.automations24h}
          color="text-sky-400"
        />
        <Card
          label="Open tickets"
          value={stats.openTickets}
          color="text-amber-300"
        />
        <Card
          label="Active alerts"
          value={stats.activeAlerts}
          color="text-red-400"
        />
      </section>

      {/* rest unchanged */}
    </div>
  );
}

/* -----------------------------
   SMALL CARD COMPONENT
----------------------------- */
function Card({
  label,
  value,
  color = "text-slate-50",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
