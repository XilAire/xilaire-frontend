import Link from "next/link";

type PricingTier = {
  name: string;
  description: string;
  price: string;
  cadence: string;
  featured?: boolean;
  badge?: string;
  features: string[];
  cta: string;
  href: string;
};

const tiers: PricingTier[] = [
  {
    name: "Free",
    description:
      "Start learning the fundamentals and explore the CASE University experience.",
    price: "$0",
    cadence: "forever",
    features: [
      "Access to selected introductory lessons",
      "Basic course progress tracking",
      "Public course catalog",
      "Learning dashboard",
    ],
    cta: "Start Free",
    href: "/courses",
  },
  {
    name: "Plus",
    description:
      "Unlock the complete learning path and build your investing skills in sequence.",
    price: "Coming Soon",
    cadence: "pricing to be announced",
    featured: true,
    badge: "Most Popular",
    features: [
      "Full Investing Foundations course",
      "Full Technical Analysis course",
      "Complete lesson progress tracking",
      "Course completion certificates",
      "Public certificate verification",
      "Downloadable course resources",
    ],
    cta: "Explore Plus",
    href: "/pricing",
  },
  {
    name: "Pro",
    description:
      "For learners who want the complete CASE University curriculum, including advanced options education.",
    price: "Coming Soon",
    cadence: "pricing to be announced",
    features: [
      "Everything in Plus",
      "Full Options Trading course",
      "Advanced trading curriculum",
      "Options scalping education",
      "Swing trading education",
      "LEAPS education",
      "Future advanced learning tools",
    ],
    cta: "Explore Pro",
    href: "/pricing",
  },
];

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

export default function PricingPreviewSection() {
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
            Simple Learning Plans
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
            Start free. Advance when you&apos;re ready.
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
            CASE University is being designed with Free, Plus, and
            Pro learning tiers so students can begin with the basics
            and unlock more advanced education as they progress.
          </p>
        </div>

        <div
          className="
            mt-12
            grid
            gap-5
            lg:mt-16
            lg:grid-cols-3
            lg:items-stretch
            xl:gap-6
          "
        >
          {tiers.map(
            (tier) => (
              <article
                key={tier.name}
                className={`
                  relative
                  flex
                  h-full
                  flex-col
                  overflow-hidden
                  rounded-3xl
                  border
                  bg-[var(--surface-default)]
                  shadow-[var(--shadow-sm)]
                  ${
                    tier.featured
                      ? `
                        border-[var(--primary-border)]
                        lg:-translate-y-2
                        lg:shadow-[var(--shadow-md)]
                      `
                      : `
                        border-[var(--border-default)]
                      `
                  }
                `}
              >
                <div
                  className={`
                    h-1.5
                    w-full
                    ${
                      tier.featured
                        ? "bg-[var(--primary)]"
                        : "bg-[var(--border-strong)]"
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
                        className="
                          text-xs
                          font-extrabold
                          uppercase
                          tracking-[0.14em]
                          text-[var(--primary)]
                        "
                      >
                        {tier.name}
                      </p>

                      <h3
                        className="
                          mt-2
                          text-2xl
                          font-black
                          tracking-tight
                          text-[var(--text-primary)]
                        "
                      >
                        {tier.name} Plan
                      </h3>
                    </div>

                    {tier.badge ? (
                      <span
                        className="
                          rounded-full
                          border
                          border-[var(--primary-border)]
                          bg-[var(--primary-soft)]
                          px-3
                          py-1
                          text-[10px]
                          font-extrabold
                          uppercase
                          tracking-[0.11em]
                          text-[var(--primary)]
                        "
                      >
                        {tier.badge}
                      </span>
                    ) : null}
                  </div>

                  <p
                    className="
                      mt-4
                      min-h-[72px]
                      text-sm
                      leading-6
                      text-[var(--text-secondary)]
                    "
                  >
                    {tier.description}
                  </p>

                  <div
                    className="
                      mt-6
                      border-y
                      border-[var(--border-subtle)]
                      py-5
                    "
                  >
                    <p
                      className={`
                        font-black
                        tracking-tight
                        text-[var(--text-primary)]
                        ${
                          tier.price ===
                          "Coming Soon"
                            ? "text-2xl"
                            : "text-4xl"
                        }
                      `}
                    >
                      {tier.price}
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        font-semibold
                        text-[var(--text-muted)]
                      "
                    >
                      {tier.cadence}
                    </p>
                  </div>

                  <div className="mt-6">
                    <p
                      className="
                        text-[10px]
                        font-extrabold
                        uppercase
                        tracking-[0.15em]
                        text-[var(--text-muted)]
                      "
                    >
                      Includes
                    </p>

                    <div className="mt-4 grid gap-3">
                      {tier.features.map(
                        (feature) => (
                          <div
                            key={feature}
                            className="
                              flex
                              items-start
                              gap-3
                              text-sm
                              leading-6
                              text-[var(--text-secondary)]
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

                            <span>
                              {feature}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-8">
                    <Link
                      href={tier.href}
                      className={`
                        inline-flex
                        min-h-12
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        px-5
                        py-3
                        text-sm
                        font-bold
                        outline-none
                        transition
                        focus-visible:ring-2
                        focus-visible:ring-[var(--focus-ring)]
                        ${
                          tier.featured
                            ? `
                              bg-[var(--primary)]
                              text-[var(--primary-foreground)]
                              shadow-[var(--shadow-primary)]
                              hover:bg-[var(--primary-hover)]
                            `
                            : `
                              border
                              border-[var(--border-default)]
                              bg-[var(--surface-default)]
                              text-[var(--text-primary)]
                              hover:bg-[var(--surface-hover)]
                            `
                        }
                      `}
                    >
                      {tier.cta}

                      <ArrowRightIcon />
                    </Link>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>

        <div
          className="
            mx-auto
            mt-10
            max-w-3xl
            text-center
          "
        >
          <p
            className="
              text-sm
              leading-6
              text-[var(--text-muted)]
            "
          >
            Final pricing, feature limits, and availability will be
            published before paid CASE University plans launch.
          </p>

          <Link
            href="/pricing"
            className="
              mt-4
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
            Compare Plans

            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}