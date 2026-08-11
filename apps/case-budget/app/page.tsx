import type {
  Metadata,
} from "next";
import Link from "next/link";

import CaseBudgetLogo from "@/components/branding/CaseBudgetLogo";

export const metadata: Metadata = {
  title:
    "CASE Budget | Plan Your Money. Build Your Future.",
  description:
    "Plan your money, manage bills, track spending, reduce debt, build savings, and grow your net worth with CASE Budget.",
};

type FeatureIcon =
  | "budget"
  | "transactions"
  | "bills"
  | "goals"
  | "debt"
  | "net-worth";

type Feature = {
  title: string;
  description: string;
  icon: FeatureIcon;
};

const features:
  Feature[] = [
    {
      title:
        "Zero-based budgeting",
      description:
        "Give every available dollar a purpose with flexible monthly plans built around your real priorities.",
      icon:
        "budget",
    },
    {
      title:
        "Transaction tracking",
      description:
        "Review, categorize, and understand your spending across personal and shared workspaces.",
      icon:
        "transactions",
    },
    {
      title:
        "Bills and reminders",
      description:
        "Track upcoming payments, recurring expenses, due dates, and overdue bills before they become a problem.",
      icon:
        "bills",
    },
    {
      title:
        "Savings goals",
      description:
        "Create goals, monitor progress, and stay focused on emergency funds, purchases, travel, and long-term plans.",
      icon:
        "goals",
    },
    {
      title:
        "Debt payoff planning",
      description:
        "Organize balances, compare payoff strategies, and build a clear path toward becoming debt-free.",
      icon:
        "debt",
    },
    {
      title:
        "Net worth tracking",
      description:
        "Bring assets, debts, accounts, and investments together for a complete view of your financial progress.",
      icon:
        "net-worth",
    },
  ];

type Benefit = {
  title: string;
  description: string;
};

const benefits:
  Benefit[] = [
    {
      title:
        "Built for real life",
      description:
        "Plan around changing income, unexpected expenses, irregular bills, and the financial priorities that matter to you.",
    },
    {
      title:
        "Designed for households",
      description:
        "Collaborate with a spouse, partner, family member, or trusted teammate without sharing passwords.",
    },
    {
      title:
        "Ready to grow with you",
      description:
        "Start with budgeting and expand into accounts, savings, debt, investments, reports, and long-term wealth planning.",
    },
  ];

type Step = {
  number: string;
  title: string;
  description: string;
};

const steps:
  Step[] = [
    {
      number:
        "01",
      title:
        "Create your workspace",
      description:
        "Start with a personal budget or create a shared household workspace for collaborative planning.",
    },
    {
      number:
        "02",
      title:
        "Build your monthly plan",
      description:
        "Add expected income, create budget groups, and assign money to the items that matter most.",
    },
    {
      number:
        "03",
      title:
        "Track and improve",
      description:
        "Review transactions, manage bills, adjust spending, monitor goals, and measure progress over time.",
    },
  ];

type TrustItem = {
  title: string;
  description: string;
  icon:
    | "shield"
    | "lock"
    | "users";
};

const trustItems:
  TrustItem[] = [
    {
      title:
        "Protected account access",
      description:
        "Secure authentication, protected sessions, password recovery, and optional multi-factor authentication.",
      icon:
        "lock",
    },
    {
      title:
        "Workspace-level permissions",
      description:
        "Role-based access helps keep personal, household, and organization information appropriately separated.",
      icon:
        "users",
    },
    {
      title:
        "Security-focused architecture",
      description:
        "Server-only credentials, database access controls, and Row Level Security help protect sensitive data.",
      icon:
        "shield",
    },
  ];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <MarketingHeader />

      <HeroSection />

      <TrustBar />

      <FeaturesSection />

      <BenefitsSection />

      <HowItWorksSection />

      <SecuritySection />

      <FinalCallToAction />

      <MarketingFooter />
    </main>
  );
}

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-default)_92%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandMark />

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          <a
            href="#features"
            className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Features
          </a>

          <a
            href="#how-it-works"
            className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            How it works
          </a>

          <a
            href="#security"
            className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Security
          </a>

          <Link
            href="/support"
            className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Support
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:inline-flex"
          >
            Sign in
          </Link>

          <Link
            href="/sign-up"
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border-subtle)]">
      <div
        aria-hidden="true"
        className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] blur-3xl"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-56 -left-44 h-[520px] w-[520px] rounded-full bg-[color-mix(in_srgb,var(--success)_8%,transparent)] blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-center lg:px-8 lg:py-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--primary)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface-default))] px-3 py-1.5 text-xs font-bold text-[var(--primary)]">
            <span className="flex h-2 w-2 rounded-full bg-[var(--success)]" />

            Personal finance with a complete plan
          </div>

          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl xl:text-7xl">
            Take control of your
            money. Build wealth with
            confidence.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
            CASE Budget brings budgeting,
            transactions, bills, savings,
            debt, net worth, and financial
            planning into one clear,
            connected workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Start building your plan

              <ArrowRightIcon />
            </Link>

            <a
              href="#features"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-6 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Explore features
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--text-muted)]">
            <HeroCheck label="No credit card required" />
            <HeroCheck label="Mobile-first experience" />
            <HeroCheck label="Secure workspace access" />
          </div>
        </div>

        <BudgetPreview />
      </div>
    </section>
  );
}

function BudgetPreview() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-8 rounded-[2rem] bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] blur-3xl"
      />

      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl shadow-black/10">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                August budget
              </p>

              <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">
                Monthly plan
              </h2>
            </div>

            <span className="rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--success)]">
              Fully assigned
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-3 gap-3">
            <PreviewMetric
              label="Income"
              value="$8,240"
            />

            <PreviewMetric
              label="Assigned"
              value="$8,240"
            />

            <PreviewMetric
              label="Remaining"
              value="$0"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  Housing
                </p>

                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  4 budget items
                </p>
              </div>

              <p className="text-sm font-black text-[var(--text-primary)]">
                $2,850
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <PreviewBudgetRow
                name="Mortgage"
                amount="$2,250"
                progress="100%"
              />

              <PreviewBudgetRow
                name="Electricity"
                amount="$225"
                progress="84%"
              />

              <PreviewBudgetRow
                name="Water"
                amount="$95"
                progress="62%"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]">
                  <CalendarIcon />
                </div>

                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)]">
                    Next bill
                  </p>

                  <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                    Internet · Aug 8
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
                  <GoalIcon />
                </div>

                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)]">
                    Emergency fund
                  </p>

                  <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                    72% complete
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type PreviewMetricProps = {
  label: string;
  value: string;
};

function PreviewMetric({
  label,
  value,
}: PreviewMetricProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-2 text-base font-black text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

type PreviewBudgetRowProps = {
  name: string;
  amount: string;
  progress: string;
};

function PreviewBudgetRow({
  name,
  amount,
  progress,
}: PreviewBudgetRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="font-bold text-[var(--text-primary)]">
          {name}
        </span>

        <span className="text-[var(--text-muted)]">
          {amount}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-default)]">
        <div
          className="h-full rounded-full bg-[var(--primary)]"
          style={{
            width:
              progress,
          }}
        />
      </div>
    </div>
  );
}

function TrustBar() {
  return (
    <section className="border-b border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:px-8">
        <TrustBarItem
          icon={<ShieldIcon />}
          title="Security-focused"
          description="Protected accounts and workspaces"
        />

        <TrustBarItem
          icon={<MobileIcon />}
          title="Mobile-first"
          description="Designed for every screen"
        />

        <TrustBarItem
          icon={<HouseholdIcon />}
          title="Built for collaboration"
          description="Personal and shared planning"
        />
      </div>
    </section>
  );
}

type TrustBarItemProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function TrustBarItem({
  icon,
  title,
  description,
}: TrustBarItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        {icon}
      </div>

      <div>
        <p className="text-sm font-bold text-[var(--text-primary)]">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Complete financial management"
          title="Everything you need to build a stronger financial life"
          description="CASE Budget is more than a monthly spending plan. It brings the essential parts of your financial life together in one organized system."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {features.map(
            (
              feature,
            ) => (
              <FeatureCard
                key={
                  feature.title
                }
                feature={
                  feature
                }
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

type FeatureCardProps = {
  feature: Feature;
};

function FeatureCard({
  feature,
}: FeatureCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 sm:p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <FeatureIcon
          icon={
            feature.icon
          }
        />
      </div>

      <h3 className="mt-5 text-lg font-black tracking-tight text-[var(--text-primary)]">
        {feature.title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
        {feature.description}
      </p>
    </article>
  );
}

function BenefitsSection() {
  return (
    <section className="border-y border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:items-center lg:px-8 lg:py-24">
        <div>
          <SectionHeading
            eyebrow="A better way to plan"
            title="Your budget should support your life, not control it"
            description="CASE Budget helps you make intentional decisions while giving you the flexibility to adjust when life changes."
          />

          <div className="mt-8 space-y-4">
            {benefits.map(
              (
                benefit,
              ) => (
                <BenefitItem
                  key={
                    benefit.title
                  }
                  benefit={
                    benefit
                  }
                />
              ),
            )}
          </div>
        </div>

        <FinancialOverviewPreview />
      </div>
    </section>
  );
}

type BenefitItemProps = {
  benefit: Benefit;
};

function BenefitItem({
  benefit,
}: BenefitItemProps) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
        <CheckIcon />
      </span>

      <div>
        <h3 className="text-sm font-black text-[var(--text-primary)]">
          {benefit.title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          {benefit.description}
        </p>
      </div>
    </div>
  );
}

function FinancialOverviewPreview() {
  return (
    <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-xl shadow-black/5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
            Financial overview
          </p>

          <h3 className="mt-2 text-xl font-black text-[var(--text-primary)]">
            Your progress at a glance
          </h3>
        </div>

        <span className="rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--success)]">
          On track
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <OverviewCard
          label="Net worth"
          value="$127,450"
          detail="+$8,420 this year"
          icon={<TrendIcon />}
        />

        <OverviewCard
          label="Debt remaining"
          value="$24,780"
          detail="18% paid down"
          icon={<DebtIcon />}
        />

        <OverviewCard
          label="Savings goals"
          value="$14,620"
          detail="3 active goals"
          icon={<GoalIcon />}
        />

        <OverviewCard
          label="Upcoming bills"
          value="$1,460"
          detail="6 due this month"
          icon={<CalendarIcon />}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[var(--text-primary)]">
              Emergency fund
            </p>

            <p className="mt-1 text-xs text-[var(--text-muted)]">
              $10,800 of $15,000
            </p>
          </div>

          <p className="text-sm font-black text-[var(--success)]">
            72%
          </p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--surface-default)]">
          <div className="h-full w-[72%] rounded-full bg-[var(--success)]" />
        </div>
      </div>
    </div>
  );
}

type OverviewCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
};

function OverviewCard({
  label,
  value,
  detail,
  icon,
}: OverviewCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        {icon}
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {detail}
      </p>
    </div>
  );
}

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Simple from the start"
          title="Build a clear plan in three steps"
          description="CASE Budget keeps the process focused so you can spend less time managing software and more time improving your finances."
          centered
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {steps.map(
            (
              step,
            ) => (
              <StepCard
                key={
                  step.number
                }
                step={
                  step
                }
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

type StepCardProps = {
  step: Step;
};

function StepCard({
  step,
}: StepCardProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-6">
      <span className="text-5xl font-black text-[color-mix(in_srgb,var(--primary)_12%,transparent)]">
        {step.number}
      </span>

      <h3 className="mt-4 text-xl font-black tracking-tight text-[var(--text-primary)]">
        {step.title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
        {step.description}
      </p>
    </article>
  );
}

function SecuritySection() {
  return (
    <section
      id="security"
      className="scroll-mt-20 border-y border-[var(--border-subtle)] bg-[var(--surface-muted)]"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:items-center lg:px-8 lg:py-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
            Security and trust
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Your financial information
            deserves thoughtful
            protection
          </h2>

          <p className="mt-5 text-base leading-8 text-[var(--text-muted)]">
            CASE Budget is designed with
            authenticated access,
            protected workspaces,
            database-level permissions,
            and server-side security
            controls.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/legal/security"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]"
            >
              Review Security Practices

              <ArrowRightIcon />
            </Link>

            <Link
              href="/legal/privacy"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {trustItems.map(
            (
              item,
            ) => (
              <TrustItemCard
                key={
                  item.title
                }
                item={
                  item
                }
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

type TrustItemCardProps = {
  item: TrustItem;
};

function TrustItemCard({
  item,
}: TrustItemCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <TrustIcon
          icon={
            item.icon
          }
        />
      </div>

      <div>
        <h3 className="text-base font-black text-[var(--text-primary)]">
          {item.title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          {item.description}
        </p>
      </div>
    </div>
  );
}

function FinalCallToAction() {
  return (
    <section>
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-[var(--primary)] px-6 py-12 text-white sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-black/10 blur-3xl"
          />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                Start your financial plan
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Make every financial
                decision with greater
                clarity
              </h2>

              <p className="mt-5 text-base leading-7 text-white/80">
                Build your first budget,
                organize upcoming bills,
                and create a plan for the
                financial future you want.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/sign-up"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold !text-slate-950 outline-none transition hover:bg-white/90 hover:!text-slate-950 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--primary)]"
              >
                Create your account

                <ArrowRightIcon />
              </Link>

              <Link
                href="/sign-in"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 text-sm font-bold text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
};

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: SectionHeadingProps) {
  return (
    <div
      className={[
        "max-w-3xl",
        centered
          ? "mx-auto text-center"
          : "",
      ].join(" ")}
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
        {eyebrow}
      </p>

      <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
        {title}
      </h2>

      <p className="mt-5 text-base leading-8 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function HeroCheck({
  label,
}: {
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
        <CheckIcon />
      </span>

      {label}
    </span>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(140px,0.5fr))]">
          <div className="max-w-sm">
            <BrandMark />

            <p className="mt-5 text-sm leading-7 text-[var(--text-muted)]">
              A complete personal
              financial management
              platform for budgeting,
              planning, and building
              wealth with confidence.
            </p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              {
                label:
                  "Features",
                href:
                  "#features",
              },
              {
                label:
                  "How it works",
                href:
                  "#how-it-works",
              },
              {
                label:
                  "Security",
                href:
                  "#security",
              },
              {
                label:
                  "Support",
                href:
                  "/support",
              },
            ]}
          />

          <FooterColumn
            title="Account"
            links={[
              {
                label:
                  "Create account",
                href:
                  "/sign-up",
              },
              {
                label:
                  "Sign in",
                href:
                  "/sign-in",
              },
              {
                label:
                  "Reset password",
                href:
                  "/forgot-password",
              },
            ]}
          />

          <FooterColumn
            title="Legal"
            links={[
              {
                label:
                  "Legal Center",
                href:
                  "/legal",
              },
              {
                label:
                  "Privacy",
                href:
                  "/legal/privacy",
              },
              {
                label:
                  "Terms",
                href:
                  "/legal/terms",
              },
              {
                label:
                  "Contact Legal",
                href:
                  "/legal/contact",
              },
            ]}
          />
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-6 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 XilAire
            Technologies. All rights
            reserved.
          </p>

          <p>
            CASE Budget is not a bank or
            financial adviser.
          </p>
        </div>
      </div>
    </footer>
  );
}

type FooterLink = {
  label: string;
  href: string;
};

type FooterColumnProps = {
  title: string;
  links: FooterLink[];
};

function FooterColumn({
  title,
  links,
}: FooterColumnProps) {
  return (
    <div>
      <p className="text-sm font-black text-[var(--text-primary)]">
        {title}
      </p>

      <div className="mt-4 space-y-3">
        {links.map(
          (
            link,
          ) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={
                link.href
              }
              className="block w-fit text-sm text-[var(--text-muted)] outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {link.label}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="CASE Budget home"
      className="inline-flex items-center gap-3 rounded-xl text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    >
      <CaseBudgetLogo
        variant="auto"
        size="sm"
        alt="CASE Budget"
      />

      <span>
        <span className="block text-lg font-black tracking-tight">
          CASE Budget
        </span>

        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          XilAire Technologies
        </span>
      </span>
    </Link>
  );
}

type FeatureIconProps = {
  icon: FeatureIcon;
};

function FeatureIcon({
  icon,
}: FeatureIconProps) {
  switch (icon) {
    case "transactions":
      return (
        <TransactionsIcon />
      );

    case "bills":
      return (
        <CalendarIcon />
      );

    case "goals":
      return (
        <GoalIcon />
      );

    case "debt":
      return (
        <DebtIcon />
      );

    case "net-worth":
      return (
        <TrendIcon />
      );

    case "budget":
    default:
      return (
        <BudgetIcon />
      );
  }
}

function TrustIcon({
  icon,
}: {
  icon:
    TrustItem["icon"];
}) {
  switch (icon) {
    case "lock":
      return (
        <LockIcon />
      );

    case "users":
      return (
        <HouseholdIcon />
      );

    case "shield":
    default:
      return (
        <ShieldIcon />
      );
  }
}

function BudgetIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />

      <path d="M7 9h5" />
      <path d="M7 13h3" />
      <path d="M16 11h1" />
    </svg>
  );
}

function TransactionsIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 7h12" />
      <path d="m15 3 4 4-4 4" />
      <path d="M17 17H5" />
      <path d="m9 13-4 4 4 4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />

      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function GoalIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <circle
        cx="12"
        cy="12"
        r="5"
      />

      <circle
        cx="12"
        cy="12"
        r="1"
      />
    </svg>
  );
}

function DebtIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M6 3h12v18H6Z" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="10"
        width="16"
        height="10"
        rx="2"
      />

      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="7"
        y="2"
        width="10"
        height="20"
        rx="2"
      />

      <path d="M11 18h2" />
    </svg>
  );
}

function HouseholdIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="8"
        r="4"
      />

      <path d="M2 21a7 7 0 0 1 14 0" />
      <circle
        cx="17"
        cy="10"
        r="3"
      />
      <path d="M16 15a6 6 0 0 1 6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 12 4 4 8-8" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}