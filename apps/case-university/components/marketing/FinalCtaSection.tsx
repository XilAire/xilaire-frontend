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

const benefits = [
  "Start with investing fundamentals",
  "Progress into technical analysis",
  "Advance into options education",
  "Track your learning progress",
  "Earn verifiable course certificates",
];

export default function FinalCtaSection() {
  return (
    <section
      className="
        relative
        overflow-hidden
        border-y
        border-[var(--border-subtle)]
        bg-[var(--background)]
        py-16
        sm:py-20
        lg:py-24
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_20%_20%,var(--primary-soft),transparent_30%),radial-gradient(circle_at_80%_80%,var(--achievement-soft),transparent_28%)]
        "
      />

      <div
        className="
          relative
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
            relative
            overflow-hidden
            rounded-[2rem]
            border
            border-[var(--primary-border)]
            bg-[var(--surface-elevated)]
            px-5
            py-10
            shadow-[var(--shadow-md)]
            sm:px-8
            sm:py-12
            lg:px-12
            lg:py-14
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              inset-x-0
              top-0
              h-1.5
              bg-[var(--primary)]
            "
          />

          <div
            className="
              grid
              gap-10
              lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.65fr)]
              lg:items-center
              lg:gap-14
            "
          >
            <div className="min-w-0">
              <p
                className="
                  text-xs
                  font-extrabold
                  uppercase
                  tracking-[0.18em]
                  text-[var(--primary)]
                "
              >
                Start Building Your Edge
              </p>

              <h2
                className="
                  mt-3
                  max-w-4xl
                  text-3xl
                  font-black
                  tracking-[-0.03em]
                  text-[var(--text-primary)]
                  sm:text-4xl
                  lg:text-5xl
                "
              >
                Better decisions begin with better market education.
              </h2>

              <p
                className="
                  mt-5
                  max-w-3xl
                  text-base
                  leading-7
                  text-[var(--text-secondary)]
                  sm:text-lg
                  sm:leading-8
                "
              >
                Build your investing knowledge in sequence, develop a
                repeatable analysis process, and learn advanced
                strategies only after you understand the fundamentals
                underneath them.
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
                  href="/auth/signin"
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
                  Sign In
                </Link>
              </div>
            </div>

            <div
              className="
                rounded-2xl
                border
                border-[var(--border-default)]
                bg-[var(--surface-default)]
                p-5
                shadow-[var(--shadow-sm)]
                sm:p-6
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-3
                  border-b
                  border-[var(--border-subtle)]
                  pb-4
                "
              >
                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--primary)]
                    text-sm
                    font-black
                    text-[var(--primary-foreground)]
                  "
                >
                  CU
                </div>

                <div>
                  <p
                    className="
                      text-sm
                      font-black
                      text-[var(--text-primary)]
                    "
                  >
                    CASE University
                  </p>

                  <p
                    className="
                      text-xs
                      text-[var(--text-muted)]
                    "
                  >
                    Structured investing education
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {benefits.map(
                  (benefit) => (
                    <div
                      key={benefit}
                      className="
                        flex
                        items-center
                        gap-3
                        text-sm
                        font-semibold
                        leading-6
                        text-[var(--text-secondary)]
                      "
                    >
                      <span
                        className="
                          flex
                          h-6
                          w-6
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

                      {benefit}
                    </div>
                  ),
                )}
              </div>

              <div
                className="
                  mt-6
                  rounded-xl
                  border
                  border-[var(--achievement-border)]
                  bg-[var(--achievement-soft)]
                  px-4
                  py-3
                "
              >
                <p
                  className="
                    text-xs
                    font-extrabold
                    uppercase
                    tracking-[0.12em]
                    text-[var(--achievement)]
                  "
                >
                  Learn before you risk capital
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    leading-6
                    text-[var(--text-secondary)]
                  "
                >
                  Build knowledge first, then make more informed
                  decisions about how and when to participate in the
                  market.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}