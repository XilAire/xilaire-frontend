import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BellRing,
  Check,
  LineChart,
  ShieldCheck,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

const signalPlans = [
  {
    name: "CASE Signals Weekly",
    price: "$29.99",
    period: "/week",
    href: "/auth/signup?plan=signals_weekly",
    cta: "Start Weekly Signals",
    highlighted: false,
    features: [
      "CASE Signals Discord access",
      "Weekly signal access",
      "Options-first trade alerts",
      "Entry price, strike, and expiration",
      "Signal board and watch tracking",
    ],
  },
  {
    name: "CASE Signals Monthly",
    price: "$99.99",
    period: "/month",
    href: "/auth/signup?plan=signals_monthly",
    cta: "Start Monthly Signals",
    highlighted: true,
    features: [
      "Everything in Weekly",
      "Best value for signal subscribers",
      "Monthly signal access",
      "Stop-loss and take-profit guidance",
      "Discord role access for signals",
    ],
  },
];

export default function SignalsProductPage() {
  return (
    <main className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-950 p-8">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
            <Activity className="h-4 w-4" />
            CASE Signals
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-100 md:text-5xl">
            Unlock trade signals built for disciplined execution.
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Get access to CASE trade alerts, options-first setups, Discord
            signal access, confidence scoring, and structured trade context so
            you can evaluate opportunities faster.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              View Signal Plans
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
          icon={<BellRing />}
          title="Live Alerts"
          description="Signal-ready workflow for fast-moving trade ideas."
        />

        <ValueCard
          icon={<Target />}
          title="Trade Context"
          description="Entry, confidence, style, risk, and target details."
        />

        <ValueCard
          icon={<ShieldCheck />}
          title="Risk Awareness"
          description="Stop-loss and take-profit guidance for each setup."
        />

        <ValueCard
          icon={<Zap />}
          title="Discord Access"
          description="Premium Discord role access for active subscribers."
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              Signal Preview
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-100">
              Designed for quick evaluation.
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              CASE Signals are structured to help you quickly understand the
              setup, action, risk, confidence, and trading style before making
              your own decision.
            </p>

            <div className="mt-6 space-y-3">
              <FeatureLine text="Options-first trade alert format" />
              <FeatureLine text="Confidence score and trade style" />
              <FeatureLine text="Entry, underlying, stop-loss, and target context" />
              <FeatureLine text="Discord access for subscribed signal members" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm text-slate-400">Example Signal</p>
                <p className="text-2xl font-bold text-emerald-400">
                  BUY QQQ 498 CALL
                </p>
              </div>

              <LineChart className="h-8 w-8 text-emerald-400" />
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <SignalMetric label="Entry" value="$2.35" />
              <SignalMetric label="Underlying" value="$486.42" />
              <SignalMetric label="Confidence" value="92%" />
              <SignalMetric label="Style" value="SCALP" />
              <SignalMetric label="Stop Loss" value="-15%" />
              <SignalMetric label="Take Profit" value="+20%" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-emerald-300">
            Choose Signals Access
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-100">
            Start with weekly access or save with monthly.
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Select the plan that matches your trading workflow.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {signalPlans.map((plan) => (
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
        <TrendingUp className="mx-auto h-10 w-10 text-emerald-400" />

        <h2 className="mt-4 text-2xl font-bold text-slate-100">
          Ready to unlock CASE Signals?
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Subscribe to CASE Signals to view signal pages, receive Discord signal
          access, and follow structured trade ideas inside the platform.
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
      <div className="text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
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

function SignalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-100">{value}</div>
    </div>
  );
}