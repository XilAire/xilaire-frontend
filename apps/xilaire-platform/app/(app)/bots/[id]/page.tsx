// apps/xilaire-platform/app/(app)/bots/[id]/page.tsx
import type { Metadata } from "next";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";
type RunStatus = "success" | "failed" | "running";

type Bot = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

type BotTicket = {
  id: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
};

type BotRun = {
  id: string;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  automation_name: string;
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { data } = await supabasePlatform
    .from("bots")
    .select("name")
    .eq("id", params.id)
    .maybeSingle();

  const name = data?.name ?? "Bot";

  return {
    title: `${name} | Bots | XilAire Platform`,
  };
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

  switch (status) {
    case "open":
      return (
        <span className={`${base} bg-amber-500/10 text-amber-300`}>Open</span>
      );
    case "in_progress":
      return (
        <span className={`${base} bg-sky-500/10 text-sky-300`}>
          In progress
        </span>
      );
    case "resolved":
      return (
        <span className={`${base} bg-emerald-500/10 text-emerald-300`}>
          Resolved
        </span>
      );
    case "closed":
    default:
      return (
        <span className={`${base} bg-slate-500/10 text-slate-300`}>
          Closed
        </span>
      );
  }
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium";

  switch (priority) {
    case "critical":
      return (
        <span className={`${base} bg-rose-500/15 text-rose-300`}>
          Critical
        </span>
      );
    case "high":
      return (
        <span className={`${base} bg-orange-500/15 text-orange-300`}>
          High
        </span>
      );
    case "medium":
      return (
        <span className={`${base} bg-sky-500/15 text-sky-300`}>
          Medium
        </span>
      );
    case "low":
    default:
      return (
        <span className={`${base} bg-slate-500/15 text-slate-300`}>Low</span>
      );
  }
}

function RunStatusPill({ status }: { status: RunStatus }) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium";

  switch (status) {
    case "failed":
      return (
        <span className={`${base} bg-rose-500/15 text-rose-300`}>Failed</span>
      );
    case "running":
      return (
        <span className={`${base} bg-sky-500/15 text-sky-300`}>Running</span>
      );
    case "success":
    default:
      return (
        <span className={`${base} bg-emerald-500/15 text-emerald-300`}>
          Success
        </span>
      );
  }
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

async function getBotDetail(
  id: string,
): Promise<{ bot: Bot | null; tickets: BotTicket[]; runs: BotRun[] }> {
  // Bot
  const { data: botData, error: botError } = await supabasePlatform
    .from("bots")
    .select("id, name, slug, description, created_at")
    .eq("id", id)
    .maybeSingle();

  if (botError) {
    console.error("Error loading bot:", botError);
  }

  const bot = (botData as Bot | null) ?? null;

  // Tickets for this bot
  const { data: ticketRows, error: ticketsError } = await supabasePlatform
    .from("tickets")
    .select("id, title, status, priority, created_at")
    .eq("bot_id", id)
    .order("created_at", { ascending: false });

  if (ticketsError) {
    console.error("Error loading bot tickets:", ticketsError);
  }

  const tickets = (ticketRows as BotTicket[]) ?? [];

  // Runs for this bot (via automations.bot_id)
  const { data: runRows, error: runsError } = await supabasePlatform
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
        bot_id
      )
    `
    )
    .eq("automations.bot_id", id)
    .order("started_at", { ascending: false });

  if (runsError) {
    console.error("Error loading bot runs:", runsError);
  }

  const runs: BotRun[] =
    runRows?.map((run: any) => ({
      id: run.id as string,
      status: run.status as RunStatus,
      started_at: run.started_at as string,
      finished_at: run.finished_at as string | null,
      duration_ms: run.duration_ms as number | null,
      automation_name: run.automations?.name ?? "Unknown automation",
    })) ?? [];

  return { bot, tickets, runs };
}

export default async function BotDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { bot, tickets, runs } = await getBotDetail(params.id);

  if (!bot) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-50">Bot not found</h1>
        <p className="text-sm text-slate-400">
          We couldn&apos;t find a bot with that ID.
        </p>
      </div>
    );
  }

  const openTickets = tickets.filter(
    (t) => t.status === "open" || t.status === "in_progress",
  ).length;
  const runs24hCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const runs24h = runs.filter(
    (r) => new Date(r.started_at) >= runs24hCutoff,
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-50">{bot.name}</h1>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
            {bot.slug}
          </span>
        </div>
        {bot.description && (
          <p className="text-sm text-slate-400">{bot.description}</p>
        )}
        <p className="text-xs text-slate-500">
          Created {new Date(bot.created_at).toLocaleString()}
        </p>
      </header>

      {/* Stats strip */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Open tickets
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">
            {openTickets}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Total tickets
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {tickets.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Runs (24h)
          </p>
          <p className="mt-2 text-2xl font-semibold text-sky-400">
            {runs24h}
          </p>
        </div>
      </section>

      {/* Timelines */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Tickets */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-sm font-semibold text-slate-50">Tickets</h2>
          {tickets.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              No tickets associated with this bot yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-3 text-xs">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-slate-900/60 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-50">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Created{" "}
                      {new Date(t.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Runs */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-sm font-semibold text-slate-50">
            Automation runs
          </h2>
          {runs.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              No automation runs for this bot yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-3 text-xs">
              {runs.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-slate-900/60 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-50">
                      {r.automation_name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Started{" "}
                      {new Date(r.started_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • Duration {formatDuration(r.duration_ms)}
                    </p>
                  </div>
                  <RunStatusPill status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
