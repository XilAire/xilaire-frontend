import type { Metadata } from "next";
import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NewAutomationForm } from "./NewAutomationForm";

export const metadata: Metadata = {
  title: "New automation | XilAire Platform",
  description:
    "Create a new automation rule powered by your XilAire bots and workflows.",
};

type BotOption = {
  id: string;
  name: string;
  slug: string | null;
};

async function getBots(): Promise<BotOption[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("bots")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading bots for automation builder:", error);
    return [];
  }

  return data ?? [];
}

export default async function NewAutomationPage() {
  const bots = await getBots();

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">
            New automation
          </h1>
          <p className="text-sm text-slate-400">
            Define a new workflow for Nova, RevBot, Clara, and the rest of your
            XilAire bot fleet.
          </p>
        </div>

        <Link
          href="/automations"
          className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          Back to automations
        </Link>
      </header>

      {/* Builder card */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
        <NewAutomationForm bots={bots} />
      </section>
    </div>
  );
}
