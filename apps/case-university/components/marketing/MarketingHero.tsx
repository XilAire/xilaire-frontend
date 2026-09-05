import Link from "next/link";

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

function PlayIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m8 5 11 7-11 7V5Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
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

function TrendIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      width="22"
      height="22"
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

function AwardIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="5" />
      <path d="m8.5 12.5-1.5 8 5-3 5 3-1.5-8" />
    </svg>
  );
}

const trustItems = [
  "Built for beginners and active traders",
  "Progress from fundamentals to options",
  "Earn verifiable course certificates",
];

const journeySteps = [
  {
    label: "Foundation",
    title: "Understand the market",
    description:
      "Learn stocks, financial statements, company analysis, and how the market works.",
    icon: BookIcon,
  },
  {
    label: "Analysis",
    title: "Read price action",
    description:
      "Build technical skills with support, resistance, EMAs, VWAP, volume, MACD, and RSI.",
    icon: TrendIcon,
  },
  {
    label: "Execution",
    title: "Learn options",
    description:
      "Progress into options fundamentals, risk management, scalps, swings, and LEAPS.",
    icon: AwardIcon,
  },
];

export default function MarketingHero() {
  return (
    <section
      className="
        relative
        overflow-hidden
        border-b
        border-[var(--border-subtle)]
        bg-[var(--background)]
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_top_left,var(--primary-soft),transparent_34%),radial-gradient(circle_at_85%_15%,var(--achievement-soft),transparent_25%)]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[var(--primary-border)]
          to-transparent
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
          py-14
          sm:px-6
          sm:py-18
          lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]
          lg:items-center
          lg:gap-16
          lg:px-8
          lg:py-24
          xl:gap-20
          xl:py-28
        "
      >
        <div className="min-w-0">
          <div
            className="
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-[var(--primary-border)]
              bg-[var(--primary-soft)]
              px-3.5
              py-2
              text-xs
              font-extrabold
              uppercase
              tracking-[0.16em]
              text-[var(--primary)]
            "
          >
            <span
              className="
                h-2
                w-2
                rounded-full
                bg-[var(--primary)]
              "
            />

            Investing education built for progression
          </div>

          <h1
            className="
              mt-7
              max-w-4xl
              text-4xl
              font-black
              leading-[1.02]
              tracking-[-0.04em]
              text-[var(--text-primary)]
              sm:text-5xl
              md:text-6xl
              lg:text-[4rem]
              xl:text-[4.6rem]
            "
          >
            Learn investing.
            <br />

            <span className="text-[var(--primary)]">
              Build confidence.
            </span>

            <br />

            Trade smarter.
          </h1>

          <p
            className="
              mt-6
              max-w-2xl
              text-base
              leading-7
              text-[var(--text-secondary)]
              sm:text-lg
              sm:leading-8
            "
          >
            CASE University gives you a structured path from investing fundamentals to technical analysis and options trading, so you can build real market knowledge before putting capital at risk.
          </p>

          <div
            className="
              mt-8
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
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
                hover:-translate-y-0.5
                hover:bg-[var(--primary-hover)]
                focus-visible:ring-2
                focus-visible:ring-[var(--focus-ring)]
              "
            >
              Explore Courses

              <ArrowRightIcon />
            </Link>

            <Link
              href="/about"
              className="
                inline-flex
                min-h-12
                items-center
                justify-center
                gap-2
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
              <PlayIcon />

              See How It Works
            </Link>
          </div>

          <div
            className="
              mt-8
              grid
              gap-3
              sm:grid-cols-3
            "
          >
            {trustItems.map(
              (item) => (
                <div
                  key={item}
                  className="
                    flex
                    items-start
                    gap-2
                    rounded-xl
                    border
                    border-[var(--border-subtle)]
                    bg-[var(--surface-default)]
                    px-3.5
                    py-3
                    text-xs
                    font-semibold
                    leading-5
                    text-[var(--text-secondary)]
                    shadow-[var(--shadow-xs)]
                  "
                >
                  <span
                    className="
                      mt-0.5
                      flex
                      h-5
                      w-5
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-[var(--primary-soft)]
                      text-[var(--primary)]
                    "
                  >
                    <CheckIcon />
                  </span>

                  {item}
                </div>
              ),
            )}
          </div>
        </div>

        <div
          className="
            relative
            mx-auto
            w-full
            max-w-2xl
            lg:max-w-none
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              -inset-6
              rounded-[2rem]
              bg-[var(--primary-soft)]
              opacity-70
              blur-3xl
            "
          />

          <div
            className="
              relative
              overflow-hidden
              rounded-3xl
              border
              border-[var(--border-default)]
              bg-[var(--surface-elevated)]
              p-4
              shadow-[var(--shadow-md)]
              sm:p-5
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                border-b
                border-[var(--border-subtle)]
                pb-4
              "
            >
              <div>
                <p
                  className="
                    text-[10px]
                    font-extrabold
                    uppercase
                    tracking-[0.16em]
                    text-[var(--primary)]
                  "
                >
                  CASE University
                </p>

                <h2
                  className="
                    mt-1
                    text-lg
                    font-black
                    tracking-tight
                    text-[var(--text-primary)]
                  "
                >
                  Your learning path
                </h2>
              </div>

              <div
                className="
                  rounded-full
                  border
                  border-[var(--primary-border)]
                  bg-[var(--primary-soft)]
                  px-3
                  py-1.5
                  text-[10px]
                  font-extrabold
                  uppercase
                  tracking-[0.12em]
                  text-[var(--primary)]
                "
              >
                3 stages
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {journeySteps.map(
                ({
                  label,
                  title,
                  description,
                  icon: Icon,
                },
                index) => (
                  <div
                    key={title}
                    className="
                      group
                      relative
                      overflow-hidden
                      rounded-2xl
                      border
                      border-[var(--border-subtle)]
                      bg-[var(--surface-default)]
                      p-4
                      transition
                      hover:border-[var(--primary-border)]
                      hover:bg-[var(--surface-hover)]
                    "
                  >
                    <div
                      className="
                        flex
                        gap-4
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
                          bg-[var(--primary-soft)]
                          text-[var(--primary)]
                        "
                      >
                        <Icon />
                      </div>

                      <div className="min-w-0">
                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-2
                          "
                        >
                          <span
                            className="
                              text-[10px]
                              font-extrabold
                              uppercase
                              tracking-[0.15em]
                              text-[var(--text-muted)]
                            "
                          >
                            Stage {index + 1}
                          </span>

                          <span
                            aria-hidden="true"
                            className="
                              h-1
                              w-1
                              rounded-full
                              bg-[var(--border-strong)]
                            "
                          />

                          <span
                            className="
                              text-[10px]
                              font-extrabold
                              uppercase
                              tracking-[0.15em]
                              text-[var(--primary)]
                            "
                          >
                            {label}
                          </span>
                        </div>

                        <h3
                          className="
                            mt-1
                            text-base
                            font-black
                            tracking-tight
                            text-[var(--text-primary)]
                          "
                        >
                          {title}
                        </h3>

                        <p
                          className="
                            mt-1.5
                            text-sm
                            leading-6
                            text-[var(--text-secondary)]
                          "
                        >
                          {description}
                        </p>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>

            <div
              className="
                mt-4
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
                  items-start
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--surface-default)]
                    text-[var(--achievement)]
                    shadow-[var(--shadow-xs)]
                  "
                >
                  <AwardIcon />
                </div>

                <div>
                  <p
                    className="
                      text-xs
                      font-extrabold
                      uppercase
                      tracking-[0.14em]
                      text-[var(--achievement)]
                    "
                  >
                    Finish with proof
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-bold
                      leading-6
                      text-[var(--text-primary)]
                    "
                  >
                    Complete eligible courses and earn a verifiable CASE University certificate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}