import type { Metadata } from "next";
import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "Automations | XilAire Platform",
  description:
    "View and manage automations running inside your XilAire Platform.",
};

type AutomationStatus = "active" | "paused" | "archived";

type AutomationRow = {
  id: string;
  name: string;
  status: AutomationStatus;
  description: string | null;
  created_at: string;
  bot_id: string | null;
  bots?: {
    name: string;
    slug: string;
  } | null;
};

// Raw shape from Supabase – bots comes back as an array
type RawAutomationRow = Omit<AutomationRow, "bots"> & {
  bots?: {
    name: string;
    slug: string;
  }[] | null;
};

async function getAutomations(): Promise<AutomationRow[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("automations")
    .select(
      `
        id,
        name,
        status,
        description,
        created_at,
        bot_id,
        bots (
          name,
          slug
        )
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading automations:", error);
    return [];
  }

  const rows = (data ?? []) as RawAutomationRow[];

  // Flatten bots[] → bots (first related bot or null)
  return rows.map((row) => ({
    ...row,
    bots: row.bots && row.bots.length > 0 ? row.bots[0] : null,
  }));
}

function StatusBadge({ status }: { status: AutomationStatus }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

  switch (status) {
    case "active":
      return (
        <span className={`${base} bg-emerald-500/10 text-emerald-300`}>
          Active
        </span>
      );
    case "paused":
      return (
        <span className={`${base} bg-amber-500/10 text-amber-300`}>
          Paused
        </span>
      );
    case "archived":
    default:
      return (
        <span className={`${base} bg-slate-500/10 text-slate-300`}>
          Archived
        </span>
      );
  }
}

export default async function AutomationsPage() {
  const automations = await getAutomations();

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Automations</h1>
          <p className="text-sm text-slate-400">
            Overview of workflows, bots, and jobs running in your XilAire
            Platform.
          </p>
        </div>

        {/* NEW AUTOMATION */}
        <Link
          href="/automations/new"
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          New automation
        </Link>
      </header>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/70">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Automation
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Bot
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                Created
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-900/60 bg-slate-950/40">
            {automations.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No automations yet. Once you start wiring RevBot, Pulse, Nova,
                  and Clara into workflows, they&apos;ll appear here.
                </td>
              </tr>
            )}

            {automations.map((a) => (
              <tr key={a.id} className="hover:bg-slate-900/60">
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-50">
                      {a.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      #{a.id.slice(0, 8)}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 align-top">
                  <span className="text-sm text-slate-200">
                    {a.bots?.name ?? "—"}
                  </span>
                </td>

                <td className="px-4 py-3 align-top">
                  <StatusBadge status={a.status} />
                </td>

                <td className="px-4 py-3 align-top text-xs text-slate-300">
                  {a.description ?? "—"}
                </td>

                <td className="px-4 py-3 text-right align-top text-xs text-slate-400">
                  {new Date(a.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
