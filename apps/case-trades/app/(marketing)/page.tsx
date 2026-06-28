import Link from "next/link";
import type { ReactNode } from "react";
import PricingSection from "@/components/marketing/PricingSection";
import {
  Activity,
  BarChart3,
  BellRing,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  LineChart,
  Lock,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

export default function CaseTradesHomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
                CASE Trades
              </p>
              <p className="text-xs text-slate-400">
                Trading Intelligence Platform
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <Link href="#features" className="hover:text-white">
              Features
            </Link>
            <Link href="#journal" className="hover:text-white">
              Journal
            </Link>
            <Link href="#workflow" className="hover:text-white">
              Workflow
            </Link>
            <Link href="#strategies" className="hover:text-white">
              Strategies
            </Link>
            <Link href="#community" className="hover:text-white">
              Community
            </Link>
            <Link href="#pricing" className="hover:text-white">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5"
            >
              Sign In
            </Link>

            <Link
              href="/pricing"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              View Plans
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_35%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
              OPTIONS • STOCKS • JOURNAL • ANALYTICS • DISCORD SIGNALS
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              Trade with{" "}
              <span className="text-emerald-400">confidence</span>, not emotion.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              CASE Trades combines trade signal creation, execution rules,
              journaling, Discord automation, performance tracking, and risk
              discipline into one command center for active traders and signal
              communities.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-500"
              >
                View Plans
                <ChevronRight className="h-4 w-4" />
              </Link>

              <Link
                href="/auth/signin"
                className="rounded-xl border border-slate-700 px-6 py-3 font-medium text-slate-300 transition hover:border-slate-500 hover:bg-white/5"
              >
                Sign In
              </Link>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-4 text-sm">
              <StatCard value="12+" label="Platform modules" />
              <StatCard value="24/7" label="Alert-ready workflow" />
              <StatCard value="100%" label="Rule-driven signals" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-emerald-950/30 backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Live signal preview</p>
                <h3 className="text-xl font-semibold">CASE Trades Alert</h3>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                ACTIVE
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm text-slate-400">Signal</p>
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

            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <SnapshotLine
                icon={<BellRing />}
                text="Posts to Discord automatically"
              />
              <SnapshotLine
                icon={<ShieldCheck />}
                text="Execution rules applied instantly"
              />
              <SnapshotLine
                icon={<BookOpen />}
                text="Trades can be reviewed in the journal"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-t border-white/10 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Platform"
            title="One platform for every trade"
            description="Designed for active traders, investors, and signal communities that need speed, structure, journaling, analytics, and accountability."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Signal Management"
              description="Create, manage, and monitor stock and options signals from one dashboard."
            />

            <FeatureCard
              icon={<Target className="h-6 w-6" />}
              title="Execution Rules"
              description="Apply stop-loss, take-profit, trailing stop, and breakeven templates."
            />

            <FeatureCard
              icon={<BookOpen className="h-6 w-6" />}
              title="Trading Journal"
              description="Log entries, exits, notes, lessons learned, setups, and screenshots."
            />

            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Performance Analytics"
              description="Track win rates, open positions, returns, fills, expectancy, and strategy performance."
            />

            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Discord Automation"
              description="Broadcast signals instantly to alerts, options, stocks, gains, and premium channels."
            />

            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              title="AI Trade Review"
              description="Future AI coaching to review mistakes, strengths, rule violations, and trade quality."
            />

            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="Role-Based Access"
              description="Separate user, admin, super-admin, and master-admin workflows."
            />

            <FeatureCard
              icon={<Trophy className="h-6 w-6" />}
              title="Trade Improvement"
              description="Review every trade, identify patterns, and build repeatable discipline."
            />

            <FeatureCard
              icon={<ClipboardList className="h-6 w-6" />}
              title="Reports"
              description="Break down performance by ticker, setup, strategy, timeframe, and outcome."
            />
          </div>
        </div>
      </section>

      {/* JOURNAL */}
      <section
        id="journal"
        className="border-t border-white/10 bg-slate-900/40 py-20"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
              Trading Journal
            </p>

            <h2 className="mt-3 text-4xl font-bold">
              A Tradervue-style journal built into CASE Trades.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-400">
              Signals get traders in the door. Journaling keeps them improving.
              CASE Trades will help users log every trade, review outcomes,
              attach screenshots, identify mistakes, and turn trading history
              into a repeatable process.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <JournalFeature text="Manual trade entries" />
              <JournalFeature text="Entry and exit tracking" />
              <JournalFeature text="Notes and lessons learned" />
              <JournalFeature text="Setup and strategy tags" />
              <JournalFeature text="Win rate and P/L reports" />
              <JournalFeature text="Future AI trade coaching" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-emerald-950/20">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Journal preview</p>
                <h3 className="text-xl font-semibold">Trade Review</h3>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                PRO FEATURE
              </span>
            </div>

            <div className="space-y-4">
              <JournalMetric label="Ticker" value="SPY" />
              <JournalMetric label="Setup" value="Opening Range Breakout" />
              <JournalMetric label="Result" value="+31.91%" positive />
              <JournalMetric label="Mistake" value="Entered before confirmation" />
              <JournalMetric label="Lesson" value="Wait for candle close" />
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="mb-2 flex items-center gap-2 text-emerald-400">
                <Brain className="h-5 w-5" />
                <span className="font-semibold">AI Trade Coach</span>
              </div>

              <p className="text-sm leading-6 text-slate-400">
                Future AI reviews will grade trades, detect rule violations,
                summarize mistakes, and recommend improvements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Workflow"
            title="From signal idea to journal review"
            description="CASE Trades turns a trading idea into a structured signal, applies rules, routes the alert, and gives users a place to review the trade after it closes."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-4">
            <WorkflowCard
              step="01"
              title="Create Signal"
              text="Enter ticker, trade type, entry, confidence, style, strike, and expiration."
            />

            <WorkflowCard
              step="02"
              title="Apply Rules"
              text="Execution templates automatically attach risk and profit targets."
            />

            <WorkflowCard
              step="03"
              title="Broadcast"
              text="Post to alerts, options, stocks, high-risk plays, or manual channels."
            />

            <WorkflowCard
              step="04"
              title="Review"
              text="Log the trade outcome, notes, screenshots, and lessons learned in the journal."
            />
          </div>
        </div>
      </section>

      {/* STRATEGIES */}
      <section id="strategies" className="bg-slate-900/40 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Strategies"
            title="Built for every trading style"
            description="Whether you're scalping QQQ or holding LEAPS, CASE Trades adapts to your workflow."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <StrategyCard
              title="Scalp"
              description="Fast entries, tight risk, rapid profit targets, and short-term Discord alerts."
            />

            <StrategyCard
              title="Swing"
              description="Multi-day trades based on momentum, structure, and planned exits."
            />

            <StrategyCard
              title="LEAP"
              description="Long-term options positioning with wider risk bands and reduced noise."
            />
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section
        id="community"
        className="border-y border-white/10 bg-slate-900/50 py-20"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
              Community
            </p>

            <h2 className="mt-3 text-4xl font-bold">
              Built for Discord trading rooms.
            </h2>

            <p className="mt-4 text-lg leading-8 text-slate-400">
              Send alerts manually, automate signal posts, route trade updates,
              and keep your members informed across stocks, options, gains,
              earnings, news, training channels, and journal-driven education.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950 p-6">
            <div className="space-y-4">
              <CommunityLine icon={<MessageSquareText />} text="#alerts" />
              <CommunityLine icon={<Bot />} text="#bot-commands" />
              <CommunityLine
                icon={<TrendingUp />}
                text="#option-scalps-swings-leaps-watchlist"
              />
              <CommunityLine icon={<Trophy />} text="#gains" />
              <CommunityLine icon={<Sparkles />} text="#high-risk-play" />
              <CommunityLine icon={<BookOpen />} text="#journal-lessons" />
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-white/10 bg-slate-950">
        <PricingSection />
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-5xl font-bold">Ready to trade smarter?</h2>

          <p className="mt-6 text-lg text-slate-400">
            Join CASE Trades and build a repeatable, risk-controlled trading
            process with signals, journaling, analytics, and Discord
            automation.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/pricing"
              className="rounded-xl bg-emerald-600 px-8 py-4 text-lg font-medium text-white transition hover:bg-emerald-500"
            >
              View Plans
            </Link>

            <Link
              href="/auth/signin"
              className="rounded-xl border border-white/10 px-8 py-4 text-lg font-medium text-slate-300 transition hover:bg-white/5"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-4xl font-bold">{title}</h2>
      <p className="mt-4 text-lg text-slate-400">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 transition hover:border-emerald-500/40 hover:bg-slate-900">
      <div className="mb-4 text-emerald-400">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="leading-7 text-slate-400">{description}</p>
    </div>
  );
}

function StrategyCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center transition hover:border-emerald-500/40">
      <h3 className="mb-3 text-2xl font-bold">{title}</h3>
      <p className="leading-7 text-slate-400">{description}</p>
    </div>
  );
}

function WorkflowCard({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-6">
      <div className="mb-4 text-sm font-semibold text-emerald-400">{step}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xl font-bold text-emerald-400">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
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

function JournalFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
      <span>{text}</span>
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
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={
          "mt-1 font-semibold " +
          (positive ? "text-emerald-400" : "text-slate-100")
        }
      >
        {value}
      </p>
    </div>
  );
}

function SnapshotLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-emerald-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <span>{text}</span>
    </div>
  );
}

function CommunityLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <span className="font-medium text-slate-200">{text}</span>
      <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-400" />
    </div>
  );
}