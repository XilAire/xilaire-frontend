import Link from "next/link";

const baseLearningLinks = [
  {
    href: "/courses",
    label: "Courses",
  },
  {
    href: "/pricing",
    label: "Pricing",
  },
  {
    href: "/about",
    label: "About",
  },
];

const legalLinks = [
  {
    href: "/legal",
    label: "Legal Center",
  },
  {
    href: "/legal/privacy",
    label: "Privacy Policy",
  },
  {
    href: "/legal/terms",
    label: "Terms of Service",
  },
  {
    href: "/legal/disclaimer",
    label: "Investment Disclaimer",
  },
  {
    href: "/legal/security",
    label: "Security",
  },
  {
    href: "/legal/data-deletion",
    label: "Data Deletion",
  },
];

const companyLinks = [
  {
    href: "/legal/cookies",
    label: "Cookie Policy",
  },
  {
    href: "/legal/acceptable-use",
    label: "Acceptable Use",
  },
  {
    href: "/legal/licenses",
    label: "Licenses",
  },
  {
    href: "/legal/contact",
    label: "Legal Contact",
  },
];

type MarketingFooterProps = {
  isAuthenticated?: boolean;
};

export default function MarketingFooter({
  isAuthenticated = false,
}: MarketingFooterProps) {
  const learningLinks = [
    ...baseLearningLinks,
    isAuthenticated
      ? {
          href: "/dashboard",
          label: "Dashboard",
        }
      : {
          href: "/auth/signin",
          label: "Sign in",
        },
  ];

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-md">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-black text-[var(--primary-foreground)] shadow-[var(--shadow-primary)]">
                CU
              </span>

              <span>
                <span className="block text-sm font-extrabold tracking-tight text-[var(--text-primary)]">
                  CASE University
                </span>

                <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Investing Academy
                </span>
              </span>
            </Link>

            <p className="mt-5 text-sm leading-6 text-[var(--text-muted)]">
              Build investing knowledge from fundamentals through technical
              analysis and options education with structured lessons,
              assessments, progress tracking, and certificates.
            </p>

            <div className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 text-xs leading-5 text-[var(--text-muted)]">
              CASE University provides educational content only. Nothing on the
              platform is personalized investment, financial, legal, accounting,
              or tax advice.
            </div>
          </div>

          <FooterColumn
            title="Learn"
            links={learningLinks}
          />

          <FooterColumn
            title="Legal"
            links={legalLinks}
          />

          <FooterColumn
            title="Policies"
            links={companyLinks}
          />
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-6 text-xs leading-5 text-[var(--text-muted)] md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} CASE University. All rights reserved.
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href="/legal"
              className="font-semibold transition hover:text-[var(--primary)]"
            >
              Legal Center
            </Link>

            <Link
              href="/legal/privacy"
              className="font-semibold transition hover:text-[var(--primary)]"
            >
              Privacy
            </Link>

            <Link
              href="/legal/terms"
              className="font-semibold transition hover:text-[var(--primary)]"
            >
              Terms
            </Link>

            <Link
              href="/legal/disclaimer"
              className="font-semibold transition hover:text-[var(--primary)]"
            >
              Disclosures
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{
    href: string;
    label: string;
  }>;
}) {
  return (
    <div>
      <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-primary)]">
        {title}
      </h2>

      <ul className="mt-4 space-y-3">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--primary)]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
