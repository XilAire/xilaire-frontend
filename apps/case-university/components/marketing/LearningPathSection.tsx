import Link from "next/link";

type LearningStage = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  duration: string;
  modules: string;
  lessons: string;
  topics: string[];
  accent: "primary" | "achievement";
};

const learningStages: LearningStage[] = [
  {
    number: "01",
    eyebrow: "Start Here",
    title: "Investing Foundations",
    description:
      "Build the knowledge every investor needs before moving into charts, strategies, or options. Learn how markets work, how businesses make money, and how to evaluate a company.",
    href: "/courses/investing-foundations",
    duration: "8 hours",
    modules: "6 modules",
    lessons: "32 lessons",
    topics: [
      "Investing basics",
      "Stocks & the market",
      "Business fundamentals",
      "Income statements",
      "Balance sheets & cash flow",
      "Company analysis",
    ],
    accent: "primary",
  },
  {
    number: "02",
    eyebrow: "Build Your Edge",
    title: "Technical Analysis",
    description:
      "Learn to read price action and understand what a chart is communicating. Build a repeatable technical workflow instead of relying on random indicators or guesswork.",
    href: "/courses/technical-analysis",
    duration: "9 hours",
    modules: "7 modules",
    lessons: "36 lessons",
    topics: [
      "Price action",
      "Support & resistance",
      "EMAs & trend structure",
      "VWAP",
      "Volume",
      "MACD & RSI",
    ],
    accent: "primary",
  },
  {
    number: "03",
    eyebrow: "Advance Your Skills",
    title: "Options Trading",
    description:
      "Move into options only after building the foundation. Learn how contracts work, how options are priced, how to manage risk, and how different trading timeframes change execution.",
    href: "/courses/options-trading",
    duration: "10 hours",
    modules: "7 modules",
    lessons: "40 lessons",
    topics: [
      "Options fundamentals",
      "Calls & puts",
      "Pricing & Greeks",
      "Risk management",
      "Options scalping",
      "Swing trading & LEAPS",
    ],
    accent: "achievement",
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

function ClockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      width="15"
      height="15"
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

function ModuleIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1"
      />
    </svg>
  );
}

export default function LearningPathSection() {
  return (
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
        <div
          className="
            mx-auto
            max-w-3xl
            text-center
          "
        >
          <p
            className="
              text-xs
              font-extrabold
              uppercase
              tracking-[0.18em]
              text-[var(--primary)]
            "
          >
            Your Learning Path
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
            Learn in the right order.
          </h2>

          <p
            className="
              mx-auto
              mt-5
              max-w-2xl
              text-base
              leading-7
              text-[var(--text-secondary)]
              sm:text-lg
              sm:leading-8
            "
          >
            CASE University is designed as a progression. Start with
            investing fundamentals, learn how to analyze price, and
            then advance into options with a stronger understanding
            of the market beneath every trade.
          </p>
        </div>

        <div
          className="
            relative
            mt-12
            lg:mt-16
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              left-[16.666%]
              right-[16.666%]
              top-8
              hidden
              h-px
              bg-[var(--border-default)]
              lg:block
            "
          />

          <div
            className="
              relative
              grid
              gap-5
              lg:grid-cols-3
              lg:gap-6
            "
          >
            {learningStages.map(
              (
                stage,
                index,
              ) => {
                const isAchievement =
                  stage.accent ===
                  "achievement";

                return (
                  <article
                    key={stage.title}
                    className="
                      group
                      relative
                      flex
                      min-w-0
                      flex-col
                    "
                  >
                    <div
                      className="
                        relative
                        z-10
                        mx-auto
                        mb-5
                        flex
                        h-16
                        w-16
                        items-center
                        justify-center
                        rounded-2xl
                        border
                        border-[var(--primary-border)]
                        bg-[var(--surface-default)]
                        font-mono
                        text-lg
                        font-black
                        text-[var(--primary)]
                        shadow-[var(--shadow-sm)]
                        transition
                        group-hover:-translate-y-1
                        group-hover:shadow-[var(--shadow-md)]
                      "
                    >
                      {stage.number}
                    </div>

                    <div
                      className={`
                        flex
                        flex-1
                        flex-col
                        overflow-hidden
                        rounded-3xl
                        border
                        bg-[var(--surface-default)]
                        shadow-[var(--shadow-sm)]
                        transition
                        group-hover:-translate-y-1
                        group-hover:shadow-[var(--shadow-md)]
                        ${
                          isAchievement
                            ? "border-[var(--achievement-border)]"
                            : "border-[var(--border-default)]"
                        }
                      `}
                    >
                      <div
                        className={`
                          h-1.5
                          w-full
                          ${
                            isAchievement
                              ? "bg-[var(--achievement)]"
                              : "bg-[var(--primary)]"
                          }
                        `}
                      />

                      <div
                        className="
                          flex
                          flex-1
                          flex-col
                          p-5
                          sm:p-6
                        "
                      >
                        <div
                          className="
                            flex
                            items-start
                            justify-between
                            gap-4
                          "
                        >
                          <div>
                            <p
                              className={`
                                text-[10px]
                                font-extrabold
                                uppercase
                                tracking-[0.16em]
                                ${
                                  isAchievement
                                    ? "text-[var(--achievement)]"
                                    : "text-[var(--primary)]"
                                }
                              `}
                            >
                              {stage.eyebrow}
                            </p>

                            <p
                              className="
                                mt-1
                                text-[10px]
                                font-bold
                                uppercase
                                tracking-[0.12em]
                                text-[var(--text-muted)]
                              "
                            >
                              Stage {index + 1} of 3
                            </p>
                          </div>

                          <span
                            className={`
                              rounded-full
                              border
                              px-2.5
                              py-1
                              text-[10px]
                              font-extrabold
                              uppercase
                              tracking-[0.1em]
                              ${
                                isAchievement
                                  ? `
                                    border-[var(--achievement-border)]
                                    bg-[var(--achievement-soft)]
                                    text-[var(--achievement)]
                                  `
                                  : `
                                    border-[var(--primary-border)]
                                    bg-[var(--primary-soft)]
                                    text-[var(--primary)]
                                  `
                              }
                            `}
                          >
                            {index === 0
                              ? "Beginner"
                              : index === 1
                                ? "Intermediate"
                                : "Advanced"}
                          </span>
                        </div>

                        <h3
                          className="
                            mt-5
                            text-2xl
                            font-black
                            tracking-tight
                            text-[var(--text-primary)]
                          "
                        >
                          {stage.title}
                        </h3>

                        <p
                          className="
                            mt-3
                            text-sm
                            leading-6
                            text-[var(--text-secondary)]
                          "
                        >
                          {stage.description}
                        </p>

                        <div
                          className="
                            mt-5
                            grid
                            grid-cols-3
                            gap-2
                          "
                        >
                          <div
                            className="
                              rounded-xl
                              bg-[var(--surface-muted)]
                              px-2
                              py-3
                              text-center
                            "
                          >
                            <ClockIcon />

                            <p
                              className="
                                mt-1.5
                                text-xs
                                font-bold
                                text-[var(--text-primary)]
                              "
                            >
                              {stage.duration}
                            </p>
                          </div>

                          <div
                            className="
                              rounded-xl
                              bg-[var(--surface-muted)]
                              px-2
                              py-3
                              text-center
                            "
                          >
                            <span
                              className="
                                flex
                                justify-center
                              "
                            >
                              <ModuleIcon />
                            </span>

                            <p
                              className="
                                mt-1.5
                                text-xs
                                font-bold
                                text-[var(--text-primary)]
                              "
                            >
                              {stage.modules}
                            </p>
                          </div>

                          <div
                            className="
                              rounded-xl
                              bg-[var(--surface-muted)]
                              px-2
                              py-3
                              text-center
                            "
                          >
                            <span
                              className="
                                flex
                                justify-center
                              "
                            >
                              <BookIcon />
                            </span>

                            <p
                              className="
                                mt-1.5
                                text-xs
                                font-bold
                                text-[var(--text-primary)]
                              "
                            >
                              {stage.lessons}
                            </p>
                          </div>
                        </div>

                        <div
                          className="
                            mt-6
                            border-t
                            border-[var(--border-subtle)]
                            pt-5
                          "
                        >
                          <p
                            className="
                              text-[10px]
                              font-extrabold
                              uppercase
                              tracking-[0.14em]
                              text-[var(--text-muted)]
                            "
                          >
                            What you&apos;ll learn
                          </p>

                          <div
                            className="
                              mt-3
                              grid
                              gap-2
                            "
                          >
                            {stage.topics.map(
                              (topic) => (
                                <div
                                  key={topic}
                                  className="
                                    flex
                                    items-center
                                    gap-2.5
                                    text-sm
                                    font-semibold
                                    text-[var(--text-secondary)]
                                  "
                                >
                                  <span
                                    className={`
                                      flex
                                      h-5
                                      w-5
                                      shrink-0
                                      items-center
                                      justify-center
                                      rounded-full
                                      ${
                                        isAchievement
                                          ? `
                                            bg-[var(--achievement-soft)]
                                            text-[var(--achievement)]
                                          `
                                          : `
                                            bg-[var(--primary-soft)]
                                            text-[var(--primary)]
                                          `
                                      }
                                    `}
                                  >
                                    <CheckIcon />
                                  </span>

                                  {topic}
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        <div className="mt-auto pt-6">
                          <Link
                            href={stage.href}
                            className={`
                              inline-flex
                              min-h-11
                              w-full
                              items-center
                              justify-center
                              gap-2
                              rounded-xl
                              px-4
                              py-2.5
                              text-sm
                              font-bold
                              outline-none
                              transition
                              hover:-translate-y-0.5
                              focus-visible:ring-2
                              focus-visible:ring-[var(--focus-ring)]
                              ${
                                isAchievement
                                  ? `
                                    border
                                    border-[var(--achievement-border)]
                                    bg-[var(--achievement-soft)]
                                    text-[var(--achievement)]
                                  `
                                  : `
                                    bg-[var(--primary)]
                                    text-[var(--primary-foreground)]
                                    shadow-[var(--shadow-primary)]
                                    hover:bg-[var(--primary-hover)]
                                  `
                              }
                            `}
                          >
                            Explore Course

                            <ArrowRightIcon />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        </div>

        <div
          className="
            mx-auto
            mt-10
            max-w-3xl
            rounded-2xl
            border
            border-[var(--border-subtle)]
            bg-[var(--surface-default)]
            px-5
            py-5
            text-center
            shadow-[var(--shadow-xs)]
            sm:px-6
          "
        >
          <p
            className="
              text-sm
              font-bold
              leading-6
              text-[var(--text-primary)]
            "
          >
            One structured path.{" "}
            <span className="text-[var(--primary)]">
              20 modules, 108 lessons, and 27 hours of planned
              investing education.
            </span>
          </p>

          <p
            className="
              mt-1
              text-xs
              leading-5
              text-[var(--text-muted)]
            "
          >
            Learn at your own pace and build on each skill before
            advancing to the next stage.
          </p>
        </div>
      </div>
    </section>
  );
}