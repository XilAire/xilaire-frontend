import Link from "next/link";
import type { Metadata } from "next";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Journal Products | CASE Trades",
  description:
    "Explore CASE Trades journal subscriptions, trading journal features, broker import capabilities, AI trade reviews, analytics, and premium journaling tools.",
};

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  ClipboardList,
  LineChart,
  Sparkles,
  Target,
} from "lucide-react";

export const dynamic = "force-dynamic";

const journalPlans = [
  {
    name: "CASE Journal Starter",
    price: "$19.99",
    period: "/month",
    href: "/auth/signup?plan=journal_starter",
    cta: "Start Journal Starter",
    highlighted: false,
    features: [
      "Trade journal entries",
      "Basic P/L tracking",
      "Strategy notes",
      "Win/loss review",
      "Starter journal workflow",
    ],
  },
  {
    name: "CASE Journal Pro",
    price: "$49.99",
    period: "/month",
    href: "/auth/signup?plan=journal_pro",
    cta: "Start Journal Pro",
    highlighted: true,
    features: [
      "Everything in Journal Starter",
      "Advanced trade review",
      "Performance history",
      "Trading discipline notes",
      "Pro journal workflow",
    ],
  },
  {
    name: "CASE Journal Elite",
    price: "$99.99",
    period: "/month",
    href: "/auth/signup?plan=journal_elite",
    cta: "Start Journal Elite",
    highlighted: false,
    features: [
      "Everything in Journal Pro",
      "Elite journal access",
      "Full performance review",
      "Premium trade tracking",
      "Best for serious traders",
    ],
  },
];

export default function JournalProductPage() {
  return (
    <main className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/15 via-slate-900 to-slate-950 p-8">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300">
            <BookOpen className="h-4 w-4" />
            CASE Journal
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-100 md:text-5xl">
            Unlock structured journaling for better trading discipline.
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Track trades, review execution, measure performance, document
            lessons learned, and build a repeatable process around every trade
            you take.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              View Journal Plans
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/dashboard/billing"
              className="rounded-lg border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Manage Billing
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <ValueCard
          icon={<BookOpen />}
          title="Trade Journal"
          description="Record every trade with structured notes and outcomes."
        />

        <ValueCard
          icon={<BarChart3 />}
          title="Performance"
          description="Review win rate, P/L, patterns, and progress."
        />

        <ValueCard
          icon={<ClipboardList />}
          title="Reports"
          description="Break down trade history by setup and strategy."
        />

        <ValueCard
          icon={<Brain />}
          title="Discipline"
          description="Turn mistakes and lessons into a better process."
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-medium text-sky-300">Journal Preview</p>

            <h2 className="mt-2 text-2xl font-bold text-slate-100">
              Built to help traders review decisions, not just results.
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              CASE Journal gives traders a structured place to record entries,
              exits, notes, setups, outcomes, and lessons so improvement becomes
              measurable over time.
            </p>

            <div className="mt-6 space-y-3">
              <FeatureLine text="Manual trade entries and trade notes" />
              <FeatureLine text="Entry, exit, result, and setup tracking" />
              <FeatureLine text="Performance history and review workflow" />
              <FeatureLine text="Journal reports for disciplined improvement" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm text-slate-400">Example Review</p>
                <p className="text-2xl font-bold text-sky-300">
                  SPY Opening Range Breakout
                </p>
              </div>

              <LineChart className="h-8 w-8 text-sky-300" />
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <JournalMetric label="Ticker" value="SPY" />
              <JournalMetric label="Setup" value="ORB" />
              <JournalMetric label="Result" value="+31.91%" positive />
              <JournalMetric label="Mistake" value="Early Entry" />
              <JournalMetric label="Lesson" value="Wait For Close" />
              <JournalMetric label="Review" value="Needs Discipline" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-sky-300">
            Choose Journal Access
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-100">
            Start tracking trades and upgrade as your process grows.
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Select the journal plan that matches your trading discipline and
            reporting needs.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {journalPlans.map((plan) => (
            <div
              key={plan.name}
              className={
                "relative rounded-2xl border p-6 " +
                (plan.highlighted
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-white/10 bg-slate-950")
              }
            >
              {plan.highlighted && (
                <div className="absolute right-5 top-5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                  Best Value
                </div>
              )}

              <h3 className="text-2xl font-semibold text-slate-100">
                {plan.name}
              </h3>

              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-bold text-slate-100">
                  {plan.price}
                </span>
                <span className="pb-1 text-slate-400">{plan.period}</span>
              </div>

              <Link
                href={plan.href}
                className={
                  "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition " +
                  (plan.highlighted
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "border border-white/10 bg-slate-900 text-slate-200 hover:bg-slate-800")
                }
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <FeatureLine key={feature} text={feature} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-emerald-400" />

        <h2 className="mt-4 text-2xl font-bold text-slate-100">
          Ready to unlock CASE Journal?
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Subscribe to CASE Journal to unlock journal pages, reports,
          performance review, and a structured trade improvement workflow.
        </p>

        <div className="mt-6">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            View Pricing
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function ValueCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div className="text-sky-300 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <h3 className="mt-4 font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function FeatureLine({ text }: { text: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      <span className="text-slate-300">{text}</span>
    </div>
  );
}

function JournalMetric({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={
          "mt-1 font-semibold " +
          (positive ? "text-emerald-400" : "text-slate-100")
        }
      >
        {value}
      </div>
    </div>
  );
}