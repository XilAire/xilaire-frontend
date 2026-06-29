// apps/xilaire-platform/app/(app)/bots/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Bots | XilAire Platform",
  description:
    "View the bots that power your automations inside the XilAire Platform.",
};

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type BotRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

type BotWithStats = BotRow & {
  openTickets: number;
  runs24h: number;
};

/* -------------------------------------------------
   DATA LOADER (SERVER-ONLY, SAFE)
------------------------------------------------- */
async function getBotsWithStats() {
  const supabase = await createServerSupabaseClient();

  /* 1️⃣ Base bots */
  const { data: bots, error: botsError } = await supabase
    .from("bots")
    .select("id, name, slug, description, created_at")
    .order("name", { ascending: true });

  if (botsError) {
    console.error("Error loading bots:", botsError);
    return [];
  }

  const botList = (bots as BotRow[]) ?? [];
  if (botList.length === 0) return [];

  const botIds = botList.map((b) => b.id);

  /* 2️⃣ Open / in-progress tickets */
  const { data: ticketRows, error: ticketsError } = await supabase
    .from("tickets")
    .select("id, bot_id, status")
    .in("status", ["open", "in_progress"] as TicketStatus[])
    .in("bot_id", botIds);

  if (ticketsError) {
    console.error("Error loading ticket stats:", ticketsError);
  }

  const ticketsByBot = new Map<string, number>();
  (ticketRows ?? []).forEach((t: any) => {
    if (!t.bot_id) return;
    ticketsByBot.set(
      t.bot_id,
      (ticketsByBot.get(t.bot_id) ?? 0) + 1
    );
  });

  /* 3️⃣ Automation runs (24h) */
  const since24h = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: runRows, error: runsError } = await supabase
    .from("automation_runs")
    .select(
      `
        id,
        started_at,
        automations (
          bot_id
        )
      `
    )
    .gte("started_at", since24h);

  if (runsError) {
    console.error("Error loading automation run stats:", runsError);
  }

  const runsByBot = new Map<string, number>();
  (runRows ?? []).forEach((run: any) => {
    const botId = run.automations?.bot_id;
    if (!botId) return;
    runsByBot.set(botId, (runsByBot.get(botId) ?? 0) + 1);
  });

  /* 4️⃣ Merge */
  return botList.map((bot) => ({
    ...bot,
    openTickets: ticketsByBot.get(bot.id) ?? 0,
    runs24h: runsByBot.get(bot.id) ?? 0,
  }));
}

/* -------------------------------------------------
   PAGE
------------------------------------------------- */
export default async function BotsPage() {
  const bots = await getBotsWithStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Bots</h1>
          <p className="text-sm text-slate-400">
            Core automation agents that handle sales, health checks,
            reporting, and support.
          </p>
        </div>

        <button className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">
          New bot
        </button>
      </header>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/70">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Bot
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                Open tickets
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                Runs (24h)
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                Created
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-900/60 bg-slate-950/40">
            {bots.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No bots found yet.
                </td>
              </tr>
            )}

            {bots.map((bot) => (
              <tr key={bot.id} className="hover:bg-slate-900/60">
                <td className="px-4 py-3">
                  <Link
                    href={`/bots/${bot.id}`}
                    className="font-medium text-sky-300 hover:text-sky-200"
                  >
                    {bot.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{bot.slug}</td>
                <td className="px-4 py-3">
                  {bot.description ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {bot.openTickets}
                </td>
                <td className="px-4 py-3 text-right">
                  {bot.runs24h}
                </td>
                <td className="px-4 py-3 text-right text-slate-400">
                  {new Date(bot.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
