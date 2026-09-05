import Link from "next/link";

import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const learningPath = [
  {
    number: "01",
    title: "Investing Foundations",
    description:
      "Learn how markets work, how companies make money, and how to read the financial statements behind an investment.",
  },
  {
    number: "02",
    title: "Technical Analysis",
    description:
      "Build chart-reading skills with price action, support and resistance, EMAs, VWAP, volume, MACD, and RSI.",
  },
  {
    number: "03",
    title: "Options Trading",
    description:
      "Apply the foundation to options concepts and structured strategies for scalps, swings, and longer-term positions.",
  },
];

const platformFeatures = [
  {
    title: "Structured curriculum",
    description:
      "Courses are organized into modules and lessons so learners can build skills in the correct order.",
  },
  {
    title: "Knowledge checks",
    description:
      "Lesson assessments reinforce key concepts before learners move forward.",
  },
  {
    title: "Progress tracking",
    description:
      "Keep a clear record of completed lessons, course progress, and learning milestones.",
  },
  {
    title: "Course certificates",
    description:
      "Eligible learners can earn verifiable CASE University certificates after completing course requirements.",
  },
  {
    title: "Mobile-first learning",
    description:
      "Study across phones, tablets, desktops, and larger displays with a responsive learning experience.",
  },
  {
    title: "Built for real learners",
    description:
      "Clear explanations and practical examples help make market concepts approachable without removing important detail.",
  },
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--text-primary)]">
      <MarketingHeader isAuthenticated={Boolean(user)} />

      <main>
        <HeroSection />
        <LearningPathSection />
        <FeaturesSection />
        <EducationNotice />
        <CallToActionSection />
      </main>

      <MarketingFooter isAuthenticated={Boolean(user)} />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border-subtle)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_15%,transparent),transparent_42%),radial-gradient(circle_at_bottom_right,color-mix(in_srgb,var(--achievement)_12%,transparent),transparent_38%)]" />

      <div className="relative mx-auto grid w-full max-w-[1400px] gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8 lg:py-24">
        <div>
          <div className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-default)] px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)] shadow-[var(--shadow-xs)]">
            Learn • Practice • Build confidence
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
            Learn investing from the ground up.
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8">
            CASE University teaches the foundations behind investing, technical
            analysis, and options through structured courses designed to turn
            complex market concepts into a clear learning path.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/courses"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 text-sm font-extrabold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Browse courses
              <ArrowRightIcon />
            </Link>

            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-6 text-sm font-extrabold text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              View plans
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[var(--text-muted)]">
            <TrustItem text="Beginner-friendly foundation" />
            <TrustItem text="Self-paced learning" />
            <TrustItem text="Progress & assessments" />
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-lg)] sm:p-6">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5 sm:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">
              Your learning path
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-tight">
              Build skills in the right order.
            </h2>

            <div className="mt-6 space-y-4">
              {learningPath.map((item) => (
                <div
                  key={item.number}
                  className="flex gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-xs font-black text-[var(--primary)]">
                    {item.number}
                  </span>

                  <div>
                    <h3 className="font-extrabold text-[var(--text-primary)]">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LearningPathSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Curriculum"
          title="From fundamentals to advanced market concepts"
          description="CASE University is designed as a progressive curriculum. Each stage builds on the knowledge learned before it."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {learningPath.map((item) => (
            <article
              key={item.number}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-6 shadow-[var(--shadow-xs)]"
            >
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
                Course {item.number}
              </span>

              <h3 className="mt-3 text-xl font-black text-[var(--text-primary)]">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="border-y border-[var(--border-subtle)] bg-[var(--surface-muted)] py-16 sm:py-20">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Learning experience"
          title="More than a collection of articles"
          description="Courses, assessments, progress, and certificates work together as one learning system."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {platformFeatures.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <CheckIcon />
              </div>

              <h3 className="mt-4 font-extrabold text-[var(--text-primary)]">
                {feature.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EducationNotice() {
  return (
    <section className="py-12">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--achievement)]">
                Education first
              </p>

              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Learn the concepts. Make your own decisions.
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                CASE University provides educational content and does not
                provide personalized investment advice or recommendations.
                Investing and trading involve risk, including possible loss of
                principal.
              </p>
            </div>

            <Link
              href="/legal/disclaimer"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-5 text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Read disclosures
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CallToActionSection() {
  return (
    <section className="pb-16 pt-4 sm:pb-20">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--primary)] px-6 py-10 text-center text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] sm:px-10 sm:py-14">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-80">
            CASE University
          </p>

          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
            Start building your market knowledge today.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 opacity-85 sm:text-base">
            Begin with investing fundamentals and progress through a structured
            curriculum designed to build confidence one lesson at a time.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/courses"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-extrabold !text-[#172033] shadow-sm transition hover:bg-[#f8fafc] hover:!text-[#172033] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Explore courses
            </Link>

            <Link
              href="/legal"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-6 text-sm font-extrabold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Visit Legal Center
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">
        {eyebrow}
      </p>

      <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
        {title}
      </h2>

      <p className="mt-4 text-base leading-7 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function TrustItem({
  text,
}: {
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
        <CheckIcon />
      </span>
      {text}
    </span>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M4 10h12m-5-5 5 5-5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="m5 10 3 3 7-7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
