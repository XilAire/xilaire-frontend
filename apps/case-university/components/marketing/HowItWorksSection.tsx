import Link from "next/link";

type Step = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    number: "01",
    eyebrow: "Choose Your Path",
    title: "Start with the right course.",
    description:
      "Begin with Investing Foundations, continue into Technical Analysis, and advance into Options Trading as your knowledge grows.",
  },
  {
    number: "02",
    eyebrow: "Learn at Your Pace",
    title: "Work through lessons step by step.",
    description:
      "Each course is organized into structured modules and lessons so you can focus on one concept at a time instead of jumping between disconnected topics.",
  },
  {
    number: "03",
    eyebrow: "Track Progress",
    title: "See exactly where you stand.",
    description:
      "Your learning dashboard tracks enrollments, completed lessons, course progress, and the next step in your learning path.",
  },
  {
    number: "04",
    eyebrow: "Complete the Course",
    title: "Finish every required lesson.",
    description:
      "Complete the full course curriculum before advancing to the certificate stage, helping ensure the credential represents real course completion.",
  },
  {
    number: "05",
    eyebrow: "Earn Your Credential",
    title: "Receive a verifiable certificate.",
    description:
      "Eligible completed courses can issue a CASE University certificate with a unique certificate number and a public verification record.",
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

function BookIcon() {
  return (
    <svg
      width="20"
      height="20"
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

function ProgressIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19H2" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg
      width="20"
      height="20"
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

function ShieldCheckIcon() {
  return (
    <svg
      width="20"
      height="20"
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

const highlights = [
  {
    title: "Structured curriculum",
    description:
      "Courses are organized into modules and lessons that build on each other.",
    icon: BookIcon,
  },
  {
    title: "Visible progress",
    description:
      "See completed lessons, current progress, and what comes next.",
    icon: ProgressIcon,
  },
  {
    title: "Completion-based credentials",
    description:
      "Certificates are tied to completed course requirements.",
    icon: AwardIcon,
  },
  {
    title: "Public verification",
    description:
      "Each issued certificate can be validated through its public verification record.",
    icon: ShieldCheckIcon,
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
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
            How CASE University Works
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
            A clear path from lesson one to certification.
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
            CASE University is designed to make progress visible.
            Learn in sequence, complete the curriculum, and build a
            record of what you&apos;ve accomplished.
          </p>
        </div>

        <div
          className="
            relative
            mx-auto
            mt-12
            max-w-6xl
            lg:mt-16
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              bottom-10
              left-7
              top-10
              hidden
              w-px
              bg-[var(--border-default)]
              md:block
            "
          />

          <div className="grid gap-4">
            {steps.map(
              (
                step,
                index,
              ) => (
                <article
                  key={step.number}
                  className="
                    group
                    relative
                    grid
                    gap-4
                    rounded-2xl
                    border
                    border-[var(--border-default)]
                    bg-[var(--surface-default)]
                    p-5
                    shadow-[var(--shadow-xs)]
                    transition
                    hover:border-[var(--primary-border)]
                    hover:shadow-[var(--shadow-sm)]
                    md:grid-cols-[56px_minmax(0,1fr)_auto]
                    md:items-center
                    md:gap-6
                    md:p-6
                  "
                >
                  <div
                    className="
                      relative
                      z-10
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-[var(--primary-border)]
                      bg-[var(--primary-soft)]
                      font-mono
                      text-sm
                      font-black
                      text-[var(--primary)]
                    "
                  >
                    {step.number}
                  </div>

                  <div className="min-w-0">
                    <p
                      className="
                        text-[10px]
                        font-extrabold
                        uppercase
                        tracking-[0.16em]
                        text-[var(--primary)]
                      "
                    >
                      {step.eyebrow}
                    </p>

                    <h3
                      className="
                        mt-1.5
                        text-xl
                        font-black
                        tracking-tight
                        text-[var(--text-primary)]
                        sm:text-2xl
                      "
                    >
                      {step.title}
                    </h3>

                    <p
                      className="
                        mt-2
                        max-w-3xl
                        text-sm
                        leading-6
                        text-[var(--text-secondary)]
                        sm:text-base
                      "
                    >
                      {step.description}
                    </p>
                  </div>

                  <div
                    className="
                      hidden
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-xl
                      bg-[var(--surface-muted)]
                      text-xs
                      font-black
                      text-[var(--text-muted)]
                      md:flex
                    "
                  >
                    {index + 1}
                  </div>
                </article>
              ),
            )}
          </div>
        </div>

        <div
          className="
            mx-auto
            mt-12
            grid
            max-w-6xl
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          {highlights.map(
            ({
              title,
              description,
              icon: Icon,
            }) => (
              <div
                key={title}
                className="
                  rounded-2xl
                  border
                  border-[var(--border-subtle)]
                  bg-[var(--surface-default)]
                  p-5
                  shadow-[var(--shadow-xs)]
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
                    bg-[var(--primary-soft)]
                    text-[var(--primary)]
                  "
                >
                  <Icon />
                </div>

                <h3
                  className="
                    mt-4
                    text-base
                    font-black
                    text-[var(--text-primary)]
                  "
                >
                  {title}
                </h3>

                <p
                  className="
                    mt-2
                    text-sm
                    leading-6
                    text-[var(--text-secondary)]
                  "
                >
                  {description}
                </p>
              </div>
            ),
          )}
        </div>

        <div
          className="
            mx-auto
            mt-10
            flex
            max-w-4xl
            flex-col
            items-center
            justify-between
            gap-5
            rounded-2xl
            border
            border-[var(--primary-border)]
            bg-[var(--primary-soft)]
            px-5
            py-6
            text-center
            sm:px-6
            md:flex-row
            md:text-left
          "
        >
          <div>
            <p
              className="
                text-base
                font-black
                text-[var(--text-primary)]
              "
            >
              Ready to begin?
            </p>

            <p
              className="
                mt-1
                text-sm
                leading-6
                text-[var(--text-secondary)]
              "
            >
              Start with Investing Foundations and build your way
              through the CASE University curriculum.
            </p>
          </div>

          <Link
            href="/courses/investing-foundations"
            className="
              inline-flex
              min-h-11
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[var(--primary)]
              px-5
              py-2.5
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
            Start Learning

            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}