import type { Metadata } from "next";
import Link from "next/link";

import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about CASE University, our approach to investing education, and the learning path from market fundamentals through technical analysis and options.",
};

type Principle = {
  number: string;
  title: string;
  description: string;
};

type LearningStage = {
  step: string;
  title: string;
  description: string;
  topics: string[];
};

const principles: Principle[] = [
  {
    number: "01",
    title: "Build the foundation first",
    description:
      "Students begin by understanding investing, businesses, financial statements, earnings, valuation concepts, and the mechanics of the stock market before moving into trading strategies.",
  },
  {
    number: "02",
    title: "Learn how to analyze",
    description:
      "Technical analysis is taught as a structured decision-making process using price action, support and resistance, EMAs, VWAP, volume, MACD, RSI, and market context.",
  },
  {
    number: "03",
    title: "Understand risk before strategy",
    description:
      "Advanced strategies come after the underlying concepts. Options education includes contracts, pricing, Greeks, position risk, and trade management before scalps, swings, and LEAPS.",
  },
  {
    number: "04",
    title: "Progress should be measurable",
    description:
      "Courses are organized into modules and lessons with progress tracking so learners can see what they have completed and what comes next.",
  },
  {
    number: "05",
    title: "Completion should mean something",
    description:
      "Eligible completed courses can issue unique CASE University certificates that can be independently checked through the public credential verification system.",
  },
  {
    number: "06",
    title: "Education, not promises",
    description:
      "CASE University is built to improve knowledge and decision-making. It does not promise returns, eliminate market risk, or replace personalized professional financial advice.",
  },
];

const learningStages: LearningStage[] = [
  {
    step: "Stage 01",
    title: "Investing Foundations",
    description:
      "Learn what you are buying before learning how to trade it.",
    topics: [
      "Investing basics",
      "Stocks and the market",
      "Business fundamentals",
      "Income statements",
      "Balance sheets",
      "Cash flow statements",
      "Company analysis",
    ],
  },
  {
    step: "Stage 02",
    title: "Technical Analysis",
    description:
      "Develop a repeatable framework for reading price behavior and market structure.",
    topics: [
      "Price action",
      "Support and resistance",
      "EMAs",
      "Trend structure",
      "VWAP",
      "Volume",
      "MACD",
      "RSI",
    ],
  },
  {
    step: "Stage 03",
    title: "Options Trading",
    description:
      "Advance into derivatives only after developing the underlying market foundation.",
    topics: [
      "Options fundamentals",
      "Calls and puts",
      "Pricing and Greeks",
      "Risk management",
      "Scalping",
      "Swing trading",
      "LEAPS",
    ],
  },
];

function ArrowRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 3 3 5-7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.8 2.8 8.3 7 10 4.2-1.7 7-5.2 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <MarketingHeader />

      <main className="flex-1">
        <section
          className="
            relative
            overflow-hidden
            border-b
            border-[var(--border-subtle)]
            py-16
            sm:py-20
            lg:py-28
          "
        >
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              inset-0
              bg-[radial-gradient(circle_at_15%_20%,var(--primary-soft),transparent_30%),radial-gradient(circle_at_85%_70%,var(--achievement-soft),transparent_26%)]
            "
          />

          <div
            className="
              relative
              mx-auto
              grid
              w-full
              max-w-[1600px]
              gap-12
              px-4
              sm:px-6
              lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]
              lg:items-center
              lg:gap-16
              lg:px-8
            "
          >
            <div>
              <p
                className="
                  text-xs
                  font-extrabold
                  uppercase
                  tracking-[0.18em]
                  text-[var(--primary)]
                "
              >
                About CASE University
              </p>

              <h1
                className="
                  mt-4
                  max-w-4xl
                  text-4xl
                  font-black
                  tracking-[-0.04em]
                  text-[var(--text-primary)]
                  sm:text-5xl
                  lg:text-6xl
                "
              >
                Learn the market
                <span className="text-[var(--primary)]">
                  {" "}
                  before risking your capital.
                </span>
              </h1>

              <p
                className="
                  mt-6
                  max-w-3xl
                  text-base
                  leading-7
                  text-[var(--text-secondary)]
                  sm:text-lg
                  sm:leading-8
                "
              >
                CASE University is an investing education platform
                built around a simple principle: advanced strategies
                make more sense when the fundamentals underneath them
                are understood first.
              </p>

              <p
                className="
                  mt-4
                  max-w-3xl
                  text-base
                  leading-7
                  text-[var(--text-secondary)]
                "
              >
                The curriculum moves in sequence from investing and
                business fundamentals to technical analysis and,
                finally, options. The goal is to help learners develop
                knowledge, discipline, and a repeatable process for
                evaluating market decisions.
              </p>

              <div
                className="
                  mt-8
                  flex
                  flex-col
                  gap-3
                  sm:flex-row
                "
              >
                <Link
                  href="/courses"
                  className="
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[var(--primary)]
                    px-5
                    py-3
                    text-sm
                    font-bold
                    text-[var(--primary-foreground)]
                    shadow-[var(--shadow-primary)]
                    outline-none
                    transition
                    hover:bg-[var(--primary-hover)]
                    focus-visible:ring-2
                    focus-visible:ring-[var(--focus-ring)]
                  "
                >
                  Explore Courses

                  <ArrowRightIcon />
                </Link>

                <Link
                  href="/#how-it-works"
                  className="
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-[var(--border-default)]
                    bg-[var(--surface-default)]
                    px-5
                    py-3
                    text-sm
                    font-bold
                    text-[var(--text-primary)]
                    outline-none
                    transition
                    hover:bg-[var(--surface-hover)]
                    focus-visible:ring-2
                    focus-visible:ring-[var(--focus-ring)]
                  "
                >
                  How It Works
                </Link>
              </div>
            </div>

            <div
              className="
                rounded-[2rem]
                border
                border-[var(--border-default)]
                bg-[var(--surface-elevated)]
                p-4
                shadow-[var(--shadow-md)]
                sm:p-6
              "
            >
              <div
                className="
                  rounded-2xl
                  border
                  border-[var(--border-subtle)]
                  bg-[var(--surface-default)]
                  p-5
                  sm:p-6
                "
              >
                <p
                  className="
                    text-[10px]
                    font-extrabold
                    uppercase
                    tracking-[0.16em]
                    text-[var(--text-muted)]
                  "
                >
                  The CASE Learning Model
                </p>

                <h2
                  className="
                    mt-2
                    text-2xl
                    font-black
                    tracking-tight
                    text-[var(--text-primary)]
                  "
                >
                  Knowledge builds in layers.
                </h2>

                <div className="mt-6 grid gap-4">
                  <div
                    className="
                      flex
                      gap-4
                      rounded-2xl
                      border
                      border-[var(--primary-border)]
                      bg-[var(--primary-soft)]
                      p-4
                    "
                  >
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-[var(--surface-default)]
                        text-[var(--primary)]
                      "
                    >
                      <BookIcon />
                    </div>

                    <div>
                      <p
                        className="
                          text-[10px]
                          font-extrabold
                          uppercase
                          tracking-[0.12em]
                          text-[var(--primary)]
                        "
                      >
                        Foundation
                      </p>

                      <p
                        className="
                          mt-1
                          font-black
                          text-[var(--text-primary)]
                        "
                      >
                        Understand what you own.
                      </p>

                      <p
                        className="
                          mt-1
                          text-sm
                          leading-6
                          text-[var(--text-secondary)]
                        "
                      >
                        Markets, companies, earnings, and financial
                        statements.
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      gap-4
                      rounded-2xl
                      border
                      border-[var(--border-default)]
                      bg-[var(--surface-muted)]
                      p-4
                    "
                  >
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-[var(--surface-default)]
                        text-[var(--primary)]
                      "
                    >
                      <ChartIcon />
                    </div>

                    <div>
                      <p
                        className="
                          text-[10px]
                          font-extrabold
                          uppercase
                          tracking-[0.12em]
                          text-[var(--primary)]
                        "
                      >
                        Analysis
                      </p>

                      <p
                        className="
                          mt-1
                          font-black
                          text-[var(--text-primary)]
                        "
                      >
                        Learn how price behaves.
                      </p>

                      <p
                        className="
                          mt-1
                          text-sm
                          leading-6
                          text-[var(--text-secondary)]
                        "
                      >
                        Structure, levels, trends, indicators, and
                        market context.
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      gap-4
                      rounded-2xl
                      border
                      border-[var(--achievement-border)]
                      bg-[var(--achievement-soft)]
                      p-4
                    "
                  >
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-[var(--surface-default)]
                        text-[var(--achievement)]
                      "
                    >
                      <ShieldIcon />
                    </div>

                    <div>
                      <p
                        className="
                          text-[10px]
                          font-extrabold
                          uppercase
                          tracking-[0.12em]
                          text-[var(--achievement)]
                        "
                      >
                        Execution
                      </p>

                      <p
                        className="
                          mt-1
                          font-black
                          text-[var(--text-primary)]
                        "
                      >
                        Strategy comes after risk.
                      </p>

                      <p
                        className="
                          mt-1
                          text-sm
                          leading-6
                          text-[var(--text-secondary)]
                        "
                      >
                        Options mechanics, risk management, and
                        strategy selection.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="
            bg-[var(--surface-muted)]
            py-16
            sm:py-20
            lg:py-24
          "
        >
          <div
            className="
              mx-auto
              w-full
              max-w-[1600px]
              px-4
              sm:px-6
              lg:px-8
            "
          >
            <div className="mx-auto max-w-3xl text-center">
              <p
                className="
                  text-xs
                  font-extrabold
                  uppercase
                  tracking-[0.18em]
                  text-[var(--primary)]
                "
              >
                Our Approach
              </p>

              <h2
                className="
                  mt-3
                  text-3xl
                  font-black
                  tracking-[-0.03em]
                  text-[var(--text-primary)]
                  sm:text-4xl
                  lg:text-5xl
                "
              >
                Built around how investing should be learned.
              </h2>

              <p
                className="
                  mx-auto
                  mt-5
                  max-w-2xl
                  text-base
                  leading-7
                  text-[var(--text-secondary)]
                "
              >
                CASE University emphasizes sequence, understanding,
                risk awareness, and measurable progress instead of
                jumping directly into complex strategies.
              </p>
            </div>

            <div
              className="
                mt-12
                grid
                gap-5
                md:grid-cols-2
                xl:grid-cols-3
              "
            >
              {principles.map(
                (principle) => (
                  <article
                    key={principle.number}
                    className="
                      rounded-2xl
                      border
                      border-[var(--border-default)]
                      bg-[var(--surface-default)]
                      p-5
                      shadow-[var(--shadow-xs)]
                      transition
                      hover:-translate-y-1
                      hover:shadow-[var(--shadow-sm)]
                      sm:p-6
                    "
                  >
                    <div
                      className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        bg-[var(--primary-soft)]
                        text-xs
                        font-black
                        text-[var(--primary)]
                      "
                    >
                      {principle.number}
                    </div>

                    <h3
                      className="
                        mt-5
                        text-xl
                        font-black
                        tracking-tight
                        text-[var(--text-primary)]
                      "
                    >
                      {principle.title}
                    </h3>

                    <p
                      className="
                        mt-3
                        text-sm
                        leading-6
                        text-[var(--text-secondary)]
                      "
                    >
                      {principle.description}
                    </p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section
          className="
            border-y
            border-[var(--border-subtle)]
            bg-[var(--background)]
            py-16
            sm:py-20
            lg:py-24
          "
        >
          <div
            className="
              mx-auto
              w-full
              max-w-[1600px]
              px-4
              sm:px-6
              lg:px-8
            "
          >
            <div
              className="
                grid
                gap-10
                lg:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]
                lg:gap-16
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    font-extrabold
                    uppercase
                    tracking-[0.18em]
                    text-[var(--primary)]
                  "
                >
                  The Curriculum
                </p>

                <h2
                  className="
                    mt-3
                    text-3xl
                    font-black
                    tracking-[-0.03em]
                    text-[var(--text-primary)]
                    sm:text-4xl
                  "
                >
                  One path.
                  <br />
                  Three stages.
                </h2>

                <p
                  className="
                    mt-5
                    max-w-xl
                    text-base
                    leading-7
                    text-[var(--text-secondary)]
                  "
                >
                  Each stage builds on the knowledge developed in the
                  one before it, creating a progression from investor
                  to analyst to more advanced market participant.
                </p>

                <Link
                  href="/courses"
                  className="
                    mt-6
                    inline-flex
                    items-center
                    gap-2
                    text-sm
                    font-bold
                    text-[var(--primary)]
                    outline-none
                    transition
                    hover:underline
                    focus-visible:ring-2
                    focus-visible:ring-[var(--focus-ring)]
                  "
                >
                  View Full Curriculum

                  <ArrowRightIcon />
                </Link>
              </div>

              <div className="grid gap-5">
                {learningStages.map(
                  (stage, index) => (
                    <article
                      key={stage.step}
                      className="
                        grid
                        gap-5
                        rounded-2xl
                        border
                        border-[var(--border-default)]
                        bg-[var(--surface-default)]
                        p-5
                        shadow-[var(--shadow-xs)]
                        sm:p-6
                        md:grid-cols-[180px_minmax(0,1fr)]
                      "
                    >
                      <div>
                        <p
                          className={`
                            text-[10px]
                            font-extrabold
                            uppercase
                            tracking-[0.14em]
                            ${
                              index === 2
                                ? "text-[var(--achievement)]"
                                : "text-[var(--primary)]"
                            }
                          `}
                        >
                          {stage.step}
                        </p>

                        <h3
                          className="
                            mt-2
                            text-xl
                            font-black
                            tracking-tight
                            text-[var(--text-primary)]
                          "
                        >
                          {stage.title}
                        </h3>
                      </div>

                      <div>
                        <p
                          className="
                            text-sm
                            leading-6
                            text-[var(--text-secondary)]
                          "
                        >
                          {stage.description}
                        </p>

                        <div
                          className="
                            mt-4
                            flex
                            flex-wrap
                            gap-2
                          "
                        >
                          {stage.topics.map(
                            (topic) => (
                              <span
                                key={topic}
                                className="
                                  inline-flex
                                  items-center
                                  gap-1.5
                                  rounded-full
                                  border
                                  border-[var(--border-subtle)]
                                  bg-[var(--surface-muted)]
                                  px-3
                                  py-1.5
                                  text-xs
                                  font-semibold
                                  text-[var(--text-secondary)]
                                "
                              >
                                <span className="text-[var(--primary)]">
                                  <CheckIcon />
                                </span>

                                {topic}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    </article>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          className="
            bg-[var(--surface-muted)]
            py-16
            sm:py-20
            lg:py-24
          "
        >
          <div
            className="
              mx-auto
              w-full
              max-w-5xl
              px-4
              sm:px-6
              lg:px-8
            "
          >
            <div
              className="
                overflow-hidden
                rounded-[2rem]
                border
                border-[var(--achievement-border)]
                bg-[var(--surface-default)]
                shadow-[var(--shadow-md)]
              "
            >
              <div className="h-1.5 bg-[var(--achievement)]" />

              <div
                className="
                  p-6
                  sm:p-8
                  lg:p-10
                "
              >
                <div
                  className="
                    grid
                    gap-8
                    lg:grid-cols-[minmax(0,1fr)_auto]
                    lg:items-center
                  "
                >
                  <div>
                    <p
                      className="
                        text-xs
                        font-extrabold
                        uppercase
                        tracking-[0.16em]
                        text-[var(--achievement)]
                      "
                    >
                      A Better Starting Point
                    </p>

                    <h2
                      className="
                        mt-3
                        text-3xl
                        font-black
                        tracking-[-0.03em]
                        text-[var(--text-primary)]
                        sm:text-4xl
                      "
                    >
                      You don&apos;t need to know everything to begin.
                    </h2>

                    <p
                      className="
                        mt-4
                        max-w-3xl
                        text-base
                        leading-7
                        text-[var(--text-secondary)]
                      "
                    >
                      You need a clear place to start, a logical path
                      forward, and enough understanding to know why
                      you are making a decision before putting money
                      behind it.
                    </p>
                  </div>

                  <Link
                    href="/courses/investing-foundations"
                    className="
                      inline-flex
                      min-h-12
                      shrink-0
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-[var(--primary)]
                      px-5
                      py-3
                      text-sm
                      font-bold
                      text-[var(--primary-foreground)]
                      shadow-[var(--shadow-primary)]
                      outline-none
                      transition
                      hover:bg-[var(--primary-hover)]
                      focus-visible:ring-2
                      focus-visible:ring-[var(--focus-ring)]
                    "
                  >
                    Start With Foundations

                    <ArrowRightIcon />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}