import type {
  Metadata,
} from "next";
import Link from "next/link";

import CaseBudgetLogo from "@/components/branding/CaseBudgetLogo";

export const metadata: Metadata = {
  title:
    "Cookie Policy | CASE Budget",
  description:
    "Review how CASE Budget and XilAire Technologies use cookies and similar technologies for authentication, security, preferences, and platform operation.",
};

const LAST_UPDATED =
  "August 2, 2026";

const policySections = [
  {
    href: "#overview",
    label: "Overview",
  },
  {
    href: "#what-are-cookies",
    label: "What cookies are",
  },
  {
    href: "#cookies-we-use",
    label: "Cookies we use",
  },
  {
    href: "#essential-cookies",
    label: "Essential cookies",
  },
  {
    href: "#preference-cookies",
    label: "Preference cookies",
  },
  {
    href: "#analytics-cookies",
    label: "Analytics cookies",
  },
  {
    href: "#third-parties",
    label: "Third-party services",
  },
  {
    href: "#managing-cookies",
    label: "Managing cookies",
  },
  {
    href: "#do-not-track",
    label: "Do Not Track",
  },
  {
    href: "#changes",
    label: "Policy changes",
  },
  {
    href: "#contact",
    label: "Contact us",
  },
];

type CookieCategory = {
  name: string;
  purpose: string;
  examples: string[];
  required: boolean;
  retention: string;
};

const cookieCategories:
  CookieCategory[] = [
    {
      name:
        "Authentication and session",
      purpose:
        "Maintain secure sign-in sessions, refresh authentication tokens, and protect access to authenticated CASE Budget pages.",
      examples: [
        "Supabase authentication session cookies",
        "Secure refresh-token cookies",
        "Session verification values",
      ],
      required: true,
      retention:
        "Session-based or until the authentication session expires or is revoked.",
    },
    {
      name:
        "Security and fraud prevention",
      purpose:
        "Help identify suspicious activity, reduce unauthorized access, enforce security controls, and protect forms and requests.",
      examples: [
        "Security challenge values",
        "Request-integrity tokens",
        "Rate-limit and abuse-prevention identifiers",
      ],
      required: true,
      retention:
        "Varies by security purpose and may continue for a limited period after a session ends.",
    },
    {
      name:
        "Preferences and appearance",
      purpose:
        "Remember interface settings and user choices so CASE Budget behaves consistently across visits.",
      examples: [
        "Theme selection",
        "Sidebar display state",
        "Language and locale preferences",
        "Previously selected workspace",
      ],
      required: false,
      retention:
        "Typically retained until removed by the user, replaced by a newer value, or expired by the browser.",
    },
    {
      name:
        "Performance and diagnostics",
      purpose:
        "Help identify errors, measure application reliability, and improve page performance and product quality.",
      examples: [
        "Error-correlation identifiers",
        "Application-performance measurements",
        "Anonymous diagnostic preferences",
      ],
      required: false,
      retention:
        "Depends on the diagnostic provider and configured retention period.",
    },
    {
      name:
        "Analytics",
      purpose:
        "Help us understand how features are used and how users navigate CASE Budget, when analytics features are enabled.",
      examples: [
        "Page-view identifiers",
        "Feature-use events",
        "Anonymous or pseudonymous visitor identifiers",
      ],
      required: false,
      retention:
        "Depends on the analytics provider and consent configuration.",
    },
  ];

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <LegalHeader />

      <section className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <Link
              href="/legal"
              className="inline-flex items-center gap-2 rounded-lg text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <ArrowLeftIcon />

              Back to Legal Center
            </Link>

            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
              Privacy and data
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Cookie Policy
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
              This Cookie Policy explains how
              CASE Budget and XilAire Technologies
              use cookies and similar browser
              technologies to operate, secure,
              personalize, and improve the
              platform.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PolicyBadge
                label="Current policy"
                tone="success"
              />

              <PolicyBadge
                label={`Last updated ${LAST_UPDATED}`}
                tone="neutral"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 lg:py-14">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav
            aria-label="Cookie policy sections"
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4"
          >
            <p className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              On this page
            </p>

            <div className="mt-3 space-y-1">
              {policySections.map(
                (
                  section,
                ) => (
                  <a
                    key={
                      section.href
                    }
                    href={
                      section.href
                    }
                    className="block rounded-lg px-2 py-2 text-sm font-medium text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  >
                    {
                      section.label
                    }
                  </a>
                ),
              )}
            </div>
          </nav>

          <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
              <CookieIcon />
            </div>

            <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
              Cookie preferences
            </p>

            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              A cookie-preference
              center can be added when
              optional analytics or
              marketing technologies
              are enabled.
            </p>
          </div>
        </aside>

        <article className="min-w-0 space-y-8">
          <PolicyIntroduction />

          <PolicySection
            id="overview"
            number="1"
            title="Overview"
          >
            <p>
              CASE Budget uses cookies and
              related technologies to provide
              core application functionality,
              maintain secure sessions, remember
              user preferences, and support
              diagnostics and analytics when
              those capabilities are enabled.
            </p>

            <p>
              Some cookies are strictly
              necessary for CASE Budget to
              function. Other cookies may be
              optional and may depend on your
              browser settings, consent choices,
              subscription features, or the
              services enabled by XilAire
              Technologies.
            </p>

            <PolicyNotice
              title="Essential cookies cannot always be disabled"
              description="Cookies required for authentication, security, session management, and core platform operation may be necessary for CASE Budget to work correctly."
            />
          </PolicySection>

          <PolicySection
            id="what-are-cookies"
            number="2"
            title="What cookies and similar technologies are"
          >
            <p>
              Cookies are small text files that
              a website stores on your browser
              or device. They can help a website
              recognize a browser, maintain a
              session, remember preferences, and
              support security and performance.
            </p>

            <p>
              CASE Budget may also use similar
              technologies, including:
            </p>

            <PolicyList
              items={[
                "Local storage for interface preferences and selected application state.",
                "Session storage for temporary browser-session information.",
                "Secure authentication tokens stored through supported server-side cookie mechanisms.",
                "Pixels, tags, or software development kit events if analytics features are enabled in the future.",
                "Server logs and request identifiers used for diagnostics and security.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="cookies-we-use"
            number="3"
            title="Cookie categories we may use"
          >
            <p>
              The categories below describe the
              types of cookies and related
              technologies that CASE Budget may
              use.
            </p>

            <div className="space-y-4">
              {cookieCategories.map(
                (
                  category,
                ) => (
                  <CookieCategoryCard
                    key={
                      category.name
                    }
                    category={
                      category
                    }
                  />
                ),
              )}
            </div>
          </PolicySection>

          <PolicySection
            id="essential-cookies"
            number="4"
            title="Essential cookies"
          >
            <p>
              Essential cookies are required to
              provide core CASE Budget features.
              These cookies may be set without a
              separate consent choice where
              permitted by law because the
              platform cannot operate reliably
              without them.
            </p>

            <PolicyList
              items={[
                "Maintaining authenticated sessions.",
                "Refreshing secure authentication tokens.",
                "Protecting account recovery and email-confirmation flows.",
                "Preventing request forgery, abuse, and unauthorized access.",
                "Routing users to the correct authenticated workspace.",
                "Remembering security-critical session state.",
                "Supporting load balancing, availability, and error recovery.",
              ]}
            />

            <p>
              Blocking essential cookies may
              prevent you from signing in,
              accessing protected pages,
              completing password recovery, or
              using other core CASE Budget
              features.
            </p>
          </PolicySection>

          <PolicySection
            id="preference-cookies"
            number="5"
            title="Preference cookies"
          >
            <p>
              Preference cookies and local
              storage values help CASE Budget
              remember choices that affect the
              way the application looks or
              behaves.
            </p>

            <PolicyList
              items={[
                "Light, dark, or system appearance preferences.",
                "Sidebar expansion or collapse state.",
                "Recently selected workspace.",
                "Locale, date format, currency format, or timezone preferences.",
                "Dismissed notifications, banners, or onboarding messages.",
                "Display density and interface customization choices.",
              ]}
            />

            <p>
              Removing these values generally
              does not prevent access to CASE
              Budget, but some preferences may
              return to their default settings.
            </p>
          </PolicySection>

          <PolicySection
            id="analytics-cookies"
            number="6"
            title="Analytics and performance technologies"
          >
            <p>
              CASE Budget may use analytics or
              performance technologies to
              understand how the platform is
              used, identify unreliable features,
              and improve user experience.
            </p>

            <PolicyList
              items={[
                "Page and feature usage measurements.",
                "Navigation paths and interaction events.",
                "Application performance and page-load timing.",
                "Error frequency and diagnostic context.",
                "Device category, browser type, and operating system.",
                "Anonymous or pseudonymous usage identifiers.",
              ]}
            />

            <p>
              Analytics technologies should not
              be used to store sensitive
              financial values such as transaction
              amounts, account balances, debt
              balances, or detailed budget
              records unless specifically
              required for support and protected
              by appropriate safeguards.
            </p>

            <PolicyNotice
              title="Optional analytics"
              description="When optional analytics are enabled, CASE Budget may provide a consent or preference mechanism where required by applicable law."
            />
          </PolicySection>

          <PolicySection
            id="third-parties"
            number="7"
            title="Third-party services"
          >
            <p>
              CASE Budget may rely on third-party
              providers that set or process
              cookies and related identifiers
              when providing services to XilAire
              Technologies.
            </p>

            <PolicyList
              items={[
                "Supabase for authentication, secure sessions, and database services.",
                "Cloud hosting providers for application delivery and infrastructure.",
                "Email providers for confirmation, recovery, and transactional messages.",
                "Payment providers for subscription and billing workflows.",
                "Monitoring providers for error reporting, diagnostics, and performance.",
                "Financial data providers for future bank-connectivity features.",
                "Customer-support platforms for support and communication workflows.",
              ]}
            />

            <p>
              Third-party providers may process
              information according to their own
              privacy and cookie policies in
              addition to their agreements with
              XilAire Technologies.
            </p>
          </PolicySection>

          <PolicySection
            id="managing-cookies"
            number="8"
            title="Managing cookies"
          >
            <p>
              You can manage cookies through
              your browser settings. Most
              browsers allow you to view, block,
              delete, or limit cookies.
            </p>

            <PolicyList
              items={[
                "Delete cookies already stored by CASE Budget.",
                "Block all cookies or cookies from selected websites.",
                "Allow only first-party cookies.",
                "Clear local storage and session storage.",
                "Use private or incognito browsing modes.",
                "Configure the browser to notify you when a cookie is being set.",
              ]}
            />

            <p>
              Browser controls vary by browser
              and device. Consult your browser
              documentation for instructions.
            </p>

            <PolicyNotice
              title="Impact of blocking cookies"
              description="Blocking or deleting authentication and security cookies may sign you out, interrupt account recovery, prevent session refresh, or make authenticated features unavailable."
            />
          </PolicySection>

          <PolicySection
            id="do-not-track"
            number="9"
            title="Do Not Track signals"
          >
            <p>
              Some browsers provide a
              &quot;Do Not Track&quot; setting.
              There is currently no universally
              accepted technical or legal
              standard for responding to these
              signals.
            </p>

            <p>
              CASE Budget may not respond to all
              Do Not Track signals. We will
              update this policy if a consistent
              standard is adopted or if our
              practices materially change.
            </p>
          </PolicySection>

          <PolicySection
            id="changes"
            number="10"
            title="Changes to this Cookie Policy"
          >
            <p>
              We may update this Cookie Policy
              when CASE Budget adds new
              technologies, providers, analytics
              capabilities, consent controls, or
              security features.
            </p>

            <p>
              The revised policy will display a
              new last-updated date. We may
              provide additional notice when a
              material change affects how
              optional cookies or similar
              technologies are used.
            </p>
          </PolicySection>

          <PolicySection
            id="contact"
            number="11"
            title="Contact us"
          >
            <p>
              Questions about this Cookie Policy
              or CASE Budget privacy practices
              may be directed to XilAire
              Technologies.
            </p>

            <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                  <EmailIcon />
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-[var(--text-primary)]">
                    XilAire Technologies
                  </p>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Privacy and Data
                    Protection
                  </p>

                  <a
                    href="mailto:privacy@xilairetechnologies.com"
                    className="mt-3 inline-flex break-all font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  >
                    privacy@xilairetechnologies.com
                  </a>
                </div>
              </div>
            </div>
          </PolicySection>

          <DocumentNavigation />
        </article>
      </div>

      <LegalFooter />
    </main>
  );
}

function PolicyIntroduction() {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--primary)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--surface-default))] p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
          <CookieIcon />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Clear information about
            browser technologies
          </h2>

          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            CASE Budget uses browser
            technologies primarily to
            keep accounts secure,
            maintain authenticated
            sessions, remember
            preferences, and improve
            platform reliability.
          </p>
        </div>
      </div>
    </section>
  );
}

type PolicySectionProps = {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
};

function PolicySection({
  id,
  number,
  title,
  children,
}: PolicySectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-7"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-sm font-black text-[var(--primary)]">
          {number}
        </span>

        <h2 className="pt-1 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
          {title}
        </h2>
      </div>

      <div className="mt-5 space-y-5 text-sm leading-7 text-[var(--text-muted)]">
        {children}
      </div>
    </section>
  );
}

type CookieCategoryCardProps = {
  category: CookieCategory;
};

function CookieCategoryCard({
  category,
}: CookieCategoryCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            {category.name}
          </h3>

          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {category.purpose}
          </p>
        </div>

        <span
          className={[
            "inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
            category.required
              ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
              : "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
          ].join(" ")}
        >
          {category.required
            ? "Required"
            : "Optional"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-primary)]">
            Examples
          </p>

          <ul className="mt-2 space-y-2 text-xs leading-5 text-[var(--text-muted)]">
            {category.examples.map(
              (
                example,
              ) => (
                <li
                  key={
                    example
                  }
                  className="flex items-start gap-2"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]"
                  />

                  <span>
                    {example}
                  </span>
                </li>
              ),
            )}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-primary)]">
            Typical retention
          </p>

          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
            {category.retention}
          </p>
        </div>
      </div>
    </div>
  );
}

type PolicyListProps = {
  items: string[];
};

function PolicyList({
  items,
}: PolicyListProps) {
  return (
    <ul className="space-y-3">
      {items.map(
        (
          item,
        ) => (
          <li
            key={item}
            className="flex items-start gap-3"
          >
            <span
              aria-hidden="true"
              className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
            />

            <span>
              {item}
            </span>
          </li>
        ),
      )}
    </ul>
  );
}

type PolicyNoticeProps = {
  title: string;
  description: string;
};

function PolicyNotice({
  title,
  description,
}: PolicyNoticeProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <InformationIcon />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

type PolicyBadgeProps = {
  label: string;
  tone:
    | "success"
    | "neutral";
};

function PolicyBadge({
  label,
  tone,
}: PolicyBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
        tone ===
        "success"
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : "border border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-muted)]",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "h-1.5 w-1.5 rounded-full",
          tone ===
          "success"
            ? "bg-[var(--success)]"
            : "bg-[var(--text-muted)]",
        ].join(" ")}
      />

      {label}
    </span>
  );
}

function DocumentNavigation() {
  return (
    <nav
      aria-label="Legal document navigation"
      className="grid gap-4 sm:grid-cols-2"
    >
      <Link
        href="/legal/privacy"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Previous
        </p>

        <div className="mt-3 flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <ArrowLeftIcon />

          Privacy Policy
        </div>
      </Link>

      <Link
        href="/legal/security"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 text-right outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Next
        </p>

        <div className="mt-3 flex items-center justify-end gap-2 font-bold text-[var(--text-primary)]">
          Security Practices

          <ArrowRightIcon />
        </div>
      </Link>
    </nav>
  );
}

function LegalHeader() {
  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <BrandMark />

        <nav
          aria-label="Cookie policy navigation"
          className="flex items-center gap-2"
        >
          <Link
            href="/legal"
            className="hidden min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:inline-flex"
          >
            Legal Center
          </Link>

          <Link
            href="/sign-in"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

function LegalFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-7 text-sm text-[var(--text-muted)] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>
          © 2026 XilAire
          Technologies. All rights
          reserved.
        </p>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <Link
            href="/legal"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Legal Center
          </Link>

          <Link
            href="/legal/privacy"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Privacy
          </Link>

          <Link
            href="/legal/terms"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Terms
          </Link>

          <Link
            href="/support"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Support
          </Link>
        </nav>
      </div>
    </footer>
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

function CookieIcon() {
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
      <path d="M19.5 12.5A4.5 4.5 0 0 1 14 7a4.5 4.5 0 0 1-5-4A9 9 0 1 0 21 15a4.5 4.5 0 0 1-1.5-2.5Z" />

      <circle
        cx="8.5"
        cy="11.5"
        r=".75"
        fill="currentColor"
        stroke="none"
      />

      <circle
        cx="12"
        cy="16"
        r=".75"
        fill="currentColor"
        stroke="none"
      />

      <circle
        cx="7"
        cy="17"
        r=".75"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function InformationIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      width="19"
      height="19"
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

      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function ArrowLeftIcon() {
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
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
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