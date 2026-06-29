// apps/xilaire-platform/app/(app)/reports/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Reports | XilAire Platform",
  description:
    "Summary reports for tickets and automations in your XilAire Platform.",
};

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";
type RunStatus = "success" | "failed" | "running";
type RangeOption = "24h" | "7d" | "30d";

type TicketsSummary = {
  total: number;
  byStatus: { status: TicketStatus; count: number }[];
  byPriority: { priority: TicketPriority; count: number }[];
  closedInRange: number;
};

type AutomationSummary = {
  totalInRange: number;
  failedInRange: number;
  successRateInRange: number;
};

type ReportsData = {
  tickets: TicketsSummary;
  automations: AutomationSummary;
};

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
function getRangeWindowMs(range: RangeOption): number {
  switch (range) {
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "24h":
    default:
      return 24 * 60 * 60 * 1000;
  }
}

function getRangeLabel(range: RangeOption): string {
  switch (range) {
    case "7d":
      return "last 7 days";
    case "30d":
      return "last 30 days";
    case "24h":
    default:
      return "last 24 hours";
  }
}

/* -------------------------------------------------
   DATA LOADER (SERVER SAFE)
------------------------------------------------- */
async function getReportsData(range: RangeOption): Promise<ReportsData> {
  const supabase = await createServerSupabaseClient();

  const now = Date.now();
  const since = new Date(
    now - getRangeWindowMs(range)
  ).toISOString();

  /* ---- Tickets summary -------------------------------- */
  const { data: ticketRows, error: ticketsError } = await supabase
    .from("tickets")
    .select("id, status, priority, created_at");

  if (ticketsError) {
    console.error("Error loading tickets for reports:", ticketsError);
  }

  const ticketsInRange =
    (ticketRows ?? []).filter(
      (t: any) => t.created_at && t.created_at >= since
    );

  const statusBuckets: Record<TicketStatus, number> = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };

  const priorityBuckets: Record<TicketPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  let closedInRange = 0;

  ticketsInRange.forEach((t: any) => {
    const status = t.status as TicketStatus;
    const priority = t.priority as TicketPriority | null;

    if (status in statusBuckets) statusBuckets[status]++;
    if (priority && priority in priorityBuckets)
      priorityBuckets[priority]++;
    if (status === "closed") closedInRange++;
  });

  const ticketsSummary: TicketsSummary = {
    total: ticketsInRange.length,
    byStatus: (Object.keys(statusBuckets) as TicketStatus[]).map(
      (s) => ({ status: s, count: statusBuckets[s] })
    ),
    byPriority: (
      Object.keys(priorityBuckets) as TicketPriority[]
    ).map((p) => ({ priority: p, count: priorityBuckets[p] })),
    closedInRange,
  };

  /* ---- Automation runs summary ------------------------ */
  const { data: runRows, error: runsError } = await supabase
    .from("automation_runs")
    .select("id, status, started_at")
    .gte("started_at", since);

  if (runsError) {
    console.error(
      "Error loading automation runs for reports:",
      runsError
    );
  }

  const runs = runRows ?? [];

  let failed = 0;
  let success = 0;

  runs.forEach((r: any) => {
    if (r.status === "failed") failed++;
    if (r.status === "success") success++;
  });

  const total = runs.length;

  return {
    tickets: ticketsSummary,
    automations: {
      totalInRange: total,
      failedInRange: failed,
      successRateInRange:
        total === 0 ? 0 : Math.round((success / total) * 100),
    },
  };
}

/* -------------------------------------------------
   PAGE
------------------------------------------------- */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { range?: string };
}) {
  const range = (searchParams?.range ?? "24h") as RangeOption;
  const rangeLabel = getRangeLabel(range);

  const { tickets, automations } = await getReportsData(range);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">
            Reports
          </h1>
          <p className="text-sm text-slate-400">
            High-level trends across tickets and automations (
            {rangeLabel}).
          </p>
        </div>

        <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/60 p-1 text-xs">
          {(["24h", "7d", "30d"] as RangeOption[]).map((opt) => (
            <Link
              key={opt}
              href={`/reports?range=${opt}`}
              className={[
                "px-3 py-1 rounded-full transition",
                range === opt
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-400 hover:text-slate-100",
              ].join(" ")}
            >
              {opt}
            </Link>
          ))}
        </div>
      </header>

      {/* Summary */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase text-slate-400">
            Total tickets
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">
            {tickets.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase text-slate-400">
            Automation runs
          </p>
          <p className="mt-2 text-3xl font-semibold text-sky-400">
            {automations.totalInRange}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase text-slate-400">
            Success rate
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-400">
            {automations.successRateInRange}%
          </p>
        </div>
      </section>
    </div>
  );
}
