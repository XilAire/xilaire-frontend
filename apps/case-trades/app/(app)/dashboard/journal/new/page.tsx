import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Save,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/auth/getUserEntitlements";

export const dynamic = "force-dynamic";

export default async function NewJournalTradePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const entitlements = await getUserEntitlements(user.id);

  if (!entitlements.journal.active) {
    return <JournalUpgradeRequired />;
  }

  const canJournalOptions = entitlements.journal.options;
  const instrumentOptions = canJournalOptions
    ? ["STOCK", "OPTION"]
    : ["STOCK"];

  const sideOptions = canJournalOptions
    ? ["LONG", "SHORT", "CALL", "PUT"]
    : ["LONG", "SHORT"];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/journal"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-slate-100">
          New Journal Entry
        </h1>
        <p className="text-sm text-slate-400">
          Manually log a trade, notes, and outcome.
        </p>
      </div>

      {!canJournalOptions && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 text-amber-300" />
            <div>
              <p className="text-sm font-medium text-amber-200">
                Starter Journal Plan
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Your current plan supports stock journaling only. Upgrade to Pro
                or Elite to journal options trades.
              </p>
              <Link
                href="/dashboard/billing"
                className="mt-3 inline-flex text-sm font-medium text-amber-200 hover:text-amber-100"
              >
                Upgrade Journal Plan →
              </Link>
            </div>
          </div>
        </div>
      )}

      <form className="space-y-6 rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Symbol" name="symbol" placeholder="SPY" required />

          <Select
            label="Instrument Type"
            name="instrument_type"
            options={instrumentOptions}
          />

          <Select label="Side" name="side" options={sideOptions} />

          <Field
            label="Quantity"
            name="quantity"
            type="number"
            placeholder="1"
            step="0.0001"
          />

          <Field
            label="Entry Price"
            name="entry_price"
            type="number"
            step="0.01"
            placeholder="2.35"
          />

          <Field
            label="Exit Price"
            name="exit_price"
            type="number"
            step="0.01"
            placeholder="3.10"
          />

          <Field label="Entry Date" name="entry_date" type="datetime-local" />

          <Field label="Exit Date" name="exit_date" type="datetime-local" />
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Journal Access
          </h2>

          <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-3">
            <AccessItem enabled label="Stock trades" />
            <AccessItem enabled={canJournalOptions} label="Options trades" />
            <AccessItem
              enabled={entitlements.journal.ai_review}
              label="AI review"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Notes
          </label>
          <textarea
            name="notes"
            rows={7}
            placeholder="Why did you enter? What was your plan? What did you learn?"
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Lesson Learned
          </label>
          <textarea
            name="lesson_learned"
            rows={4}
            placeholder="What would you repeat or avoid next time?"
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/journal"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <Save className="h-4 w-4" />
            Save Trade
          </button>
        </div>
      </form>
    </div>
  );
}

function JournalUpgradeRequired() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/journal"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8">
        <div className="mb-5 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
          <Lock className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-semibold text-slate-100">
          Journal Plan Required
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          You need an active CASE Journal subscription to create journal
          entries.
        </p>

        <div className="mt-6">
          <Link
            href="/dashboard/billing"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            View Journal Plans
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  step,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <select
        name={name}
        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function AccessItem({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <div
      className={
        "flex items-center gap-2 rounded-lg px-3 py-2 " +
        (enabled
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-slate-900 text-slate-500")
      }
    >
      <CheckCircle2 className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}
