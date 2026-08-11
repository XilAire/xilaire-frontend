import type {
  Metadata,
} from "next";
import Link from "next/link";

import CaseBudgetLogo from "@/components/branding/CaseBudgetLogo";

export const metadata: Metadata = {
  title:
    "Privacy Policy | CASE Budget",
  description:
    "Review how CASE Budget and XilAire Technologies collect, use, protect, retain, and share personal information.",
};

const LAST_UPDATED =
  "August 2, 2026";

const policySections = [
  {
    href:
      "#information-we-collect",
    label:
      "Information we collect",
  },
  {
    href:
      "#how-we-use-information",
    label:
      "How we use information",
  },
  {
    href:
      "#financial-information",
    label:
      "Financial information",
  },
  {
    href:
      "#workspaces",
    label:
      "Shared workspaces",
  },
  {
    href:
      "#service-providers",
    label:
      "Service providers",
  },
  {
    href:
      "#information-sharing",
    label:
      "Information sharing",
  },
  {
    href:
      "#security",
    label:
      "Security",
  },
  {
    href:
      "#retention",
    label:
      "Data retention",
  },
  {
    href:
      "#rights",
    label:
      "Your rights",
  },
  {
    href:
      "#children",
    label:
      "Children's privacy",
  },
  {
    href:
      "#changes",
    label:
      "Policy changes",
  },
  {
    href:
      "#contact",
    label:
      "Contact us",
  },
];

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
              This Privacy Policy explains how
              XilAire Technologies collects,
              uses, stores, protects, and shares
              information when you create an
              account or use CASE Budget.
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
            aria-label="Privacy policy sections"
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
              <ShieldIcon />
            </div>

            <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
              Privacy question?
            </p>

            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              Contact the XilAire
              Technologies privacy team
              for policy questions or
              data requests.
            </p>

            <a
              href="mailto:privacy@xilairetechnologies.com"
              className="mt-4 inline-flex text-xs font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              privacy@xilairetechnologies.com
            </a>
          </div>
        </aside>

        <article className="min-w-0 space-y-8">
          <PolicyIntroduction />

          <PolicySection
            id="information-we-collect"
            number="1"
            title="Information we collect"
          >
            <p>
              We collect information that you
              provide directly when you create,
              configure, or use a CASE Budget
              account.
            </p>

            <PolicySubsection
              title="Account and profile information"
            >
              <PolicyList
                items={[
                  "First name, last name, display name, and email address.",
                  "Phone number, profile image, timezone, locale, and account preferences.",
                  "Authentication information, password-reset activity, multi-factor authentication settings, and security events.",
                  "Account status, onboarding progress, and recent sign-in information.",
                ]}
              />
            </PolicySubsection>

            <PolicySubsection
              title="Workspace and membership information"
            >
              <PolicyList
                items={[
                  "Workspace names, descriptions, logos, types, and identifiers.",
                  "Household, business, or organization membership information.",
                  "Workspace roles, permissions, invitations, and membership status.",
                  "Information about users who invite, suspend, remove, or manage workspace members.",
                ]}
              />
            </PolicySubsection>

            <PolicySubsection
              title="Financial planning information"
            >
              <PolicyList
                items={[
                  "Income sources and expected income.",
                  "Budget groups, budget items, assigned amounts, and spending activity.",
                  "Transactions, merchants, notes, dates, categories, and account references.",
                  "Bills, payment schedules, reminder preferences, payment status, and recurring details.",
                  "Savings goals, debt balances, payoff plans, assets, liabilities, investments, and net-worth records.",
                  "Financial reports, projections, preferences, and planning notes.",
                ]}
              />
            </PolicySubsection>

            <PolicySubsection
              title="Support and communication information"
            >
              <PolicyList
                items={[
                  "Messages, screenshots, attachments, and details submitted through customer support.",
                  "Feedback, survey responses, feature requests, and issue reports.",
                  "Email delivery status and communication preferences.",
                ]}
              />
            </PolicySubsection>

            <PolicySubsection
              title="Technical and usage information"
            >
              <PolicyList
                items={[
                  "Browser type, operating system, device type, and application version.",
                  "IP address, approximate region, session identifiers, and request timestamps.",
                  "Pages viewed, actions performed, feature usage, and application navigation.",
                  "Performance metrics, error reports, diagnostics, and security logs.",
                ]}
              />
            </PolicySubsection>
          </PolicySection>

          <PolicySection
            id="how-we-use-information"
            number="2"
            title="How we use information"
          >
            <p>
              We use information collected
              through CASE Budget to operate,
              protect, support, and improve the
              platform.
            </p>

            <PolicyList
              items={[
                "Create, authenticate, maintain, and secure user accounts.",
                "Provision personal, household, business, and organization workspaces.",
                "Provide budgeting, transaction, bill, savings, debt, reporting, investment, and net-worth features.",
                "Synchronize activity across authorized users and shared workspaces.",
                "Apply subscription plans, usage limits, workspace limits, and feature availability.",
                "Process account confirmations, password resets, security alerts, and transactional messages.",
                "Provide customer support and investigate reported issues.",
                "Detect unauthorized access, fraud, abuse, platform attacks, and suspicious activity.",
                "Monitor reliability, diagnose errors, and improve application performance.",
                "Develop, test, and enhance new features and services.",
                "Comply with legal, regulatory, accounting, tax, security, and contractual obligations.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="financial-information"
            number="3"
            title="Financial and connected-account information"
          >
            <p>
              CASE Budget may allow you to enter
              financial information manually or
              connect supported financial
              institutions through an approved
              third-party data provider.
            </p>

            <PolicySubsection
              title="Manual financial records"
            >
              <p>
                Information that you enter
                manually may be stored in your
                CASE Budget workspace so the
                application can calculate
                budgets, balances, spending,
                reports, goals, debt progress,
                and net worth.
              </p>
            </PolicySubsection>

            <PolicySubsection
              title="Connected financial institutions"
            >
              <p>
                When bank connectivity is
                available, CASE Budget should not
                request or store your financial
                institution password directly.
                Authentication credentials are
                handled by the approved connection
                provider according to that
                provider&apos;s security and
                privacy practices.
              </p>

              <PolicyList
                items={[
                  "Account names, account types, balances, and masked account identifiers.",
                  "Transaction descriptions, dates, amounts, merchants, and categories.",
                  "Institution names and connection status.",
                  "Connection errors, synchronization timestamps, and consent status.",
                ]}
              />
            </PolicySubsection>

            <PolicyNotice
              title="CASE Budget is not a bank"
              description="CASE Budget is a financial planning and organization platform. It does not hold customer deposits, issue bank accounts, or independently execute bank transactions unless a future feature explicitly states otherwise."
            />
          </PolicySection>

          <PolicySection
            id="workspaces"
            number="4"
            title="Shared workspaces and collaboration"
          >
            <p>
              CASE Budget may allow you to share
              a household, business, or
              organization workspace with other
              users.
            </p>

            <PolicyList
              items={[
                "Workspace owners and administrators may be able to view or manage information stored in the workspace.",
                "Members may be able to create, edit, or view financial information depending on their assigned role.",
                "Viewers may have read-only access to eligible information.",
                "Workspace owners may invite, suspend, remove, or change permissions for other members.",
                "Information entered into a shared workspace may remain visible to other authorized members even if your personal membership later ends.",
              ]}
            />

            <p>
              You should only place information
              in a shared workspace when you are
              authorized to share it with all
              users who have access to that
              workspace.
            </p>
          </PolicySection>

          <PolicySection
            id="service-providers"
            number="5"
            title="Service providers"
          >
            <p>
              XilAire Technologies may use
              service providers to operate and
              support CASE Budget. These
              providers may process information
              only as reasonably necessary to
              perform contracted services.
            </p>

            <PolicyList
              items={[
                "Cloud infrastructure and database hosting.",
                "Authentication, session management, and account-security services.",
                "Email delivery and transactional communication services.",
                "Payment processing and subscription-management services.",
                "Financial account connectivity and transaction-data providers.",
                "Error monitoring, logging, analytics, and performance tools.",
                "Customer-support, help desk, and communication platforms.",
                "Fraud prevention, security monitoring, and incident-response services.",
              ]}
            />

            <p>
              Service providers are expected to
              protect information and use it only
              for authorized purposes, subject to
              their agreements with XilAire
              Technologies and applicable law.
            </p>
          </PolicySection>

          <PolicySection
            id="information-sharing"
            number="6"
            title="How information may be shared"
          >
            <p>
              We do not sell your personal
              information. Information may be
              shared only when reasonably
              necessary for platform operation,
              user-requested collaboration,
              security, legal compliance, or
              business continuity.
            </p>

            <PolicyList
              items={[
                "With service providers acting on behalf of XilAire Technologies.",
                "With workspace members when you intentionally join or share a workspace.",
                "With authorized XilAire Technologies support personnel when necessary to resolve a support, security, billing, or platform issue.",
                "With professional advisers such as attorneys, auditors, accountants, or insurers when reasonably necessary.",
                "When required by law, subpoena, court order, regulatory request, or other valid legal process.",
                "When necessary to protect users, XilAire Technologies, the public, or the integrity of CASE Budget.",
                "As part of a merger, acquisition, financing, reorganization, sale, or transfer of all or part of the business, subject to appropriate safeguards.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="security"
            number="7"
            title="Security"
          >
            <p>
              We use administrative, technical,
              and organizational safeguards
              designed to protect information
              against unauthorized access,
              alteration, loss, misuse, or
              disclosure.
            </p>

            <PolicyList
              items={[
                "Encrypted network communications.",
                "Supabase authentication and secure session handling.",
                "Optional multi-factor authentication.",
                "Role-based platform and workspace permissions.",
                "Database Row Level Security policies.",
                "Server-only administrative credentials and service-role isolation.",
                "Access logging, security monitoring, and incident investigation.",
                "Restricted customer-support and administrative access.",
                "Account recovery controls and time-limited password-reset sessions.",
                "Backups and operational continuity controls.",
              ]}
            />

            <PolicyNotice
              title="Your security responsibilities"
              description="You are responsible for using a strong password, protecting your devices, securing your email account, enabling multi-factor authentication when available, and promptly reporting suspected unauthorized access."
            />

            <p>
              No information system can
              guarantee absolute security. We
              cannot promise that unauthorized
              access, data loss, or other
              security incidents will never
              occur.
            </p>
          </PolicySection>

          <PolicySection
            id="retention"
            number="8"
            title="Data retention"
          >
            <p>
              We retain information for as long
              as reasonably necessary to provide
              CASE Budget, maintain security and
              audit records, satisfy legal
              obligations, resolve disputes, and
              enforce agreements.
            </p>

            <PolicyList
              items={[
                "Active account and workspace information may be retained while the account or workspace remains in use.",
                "Financial records may be retained until deleted by an authorized user or removed through an account-deletion process.",
                "Subscription, payment, tax, and accounting records may be retained for legally required periods.",
                "Security logs, audit records, and fraud-prevention data may be retained after account closure.",
                "Backup copies may remain temporarily after information is removed from active systems.",
                "Information subject to a legal hold, investigation, dispute, or regulatory requirement may be retained longer.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="rights"
            number="9"
            title="Your rights and choices"
          >
            <p>
              Depending on your location and
              applicable law, you may have
              certain rights regarding your
              personal information.
            </p>

            <PolicyList
              items={[
                "Access certain personal information associated with your account.",
                "Correct inaccurate or incomplete profile information.",
                "Request deletion of eligible personal information.",
                "Request a portable copy of eligible account or financial data.",
                "Object to or restrict certain processing.",
                "Withdraw consent where processing relies on consent.",
                "Manage account, communication, and security preferences.",
                "Disconnect supported financial institutions.",
                "Leave shared workspaces when your role permits.",
                "Close your CASE Budget account.",
              ]}
            />

            <p>
              We may need to verify your identity
              before completing a request. Some
              information may not be deleted when
              retention is required for security,
              billing, legal, fraud-prevention,
              audit, or legitimate business
              purposes.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/legal/data-deletion"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
              >
                Review data deletion
              </Link>

              <a
                href="mailto:privacy@xilairetechnologies.com"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Contact privacy team
              </a>
            </div>
          </PolicySection>

          <PolicySection
            id="children"
            number="10"
            title="Children's privacy"
          >
            <p>
              CASE Budget is not intended for
              children under 13, and we do not
              knowingly collect personal
              information directly from children
              under 13.
            </p>

            <p>
              A parent or legal guardian who
              believes that a child provided
              personal information should contact
              us. We will take reasonable steps
              to investigate and remove eligible
              information.
            </p>
          </PolicySection>

          <PolicySection
            id="changes"
            number="11"
            title="Changes to this Privacy Policy"
          >
            <p>
              We may update this Privacy Policy
              as CASE Budget changes or as legal,
              technical, operational, and
              security requirements evolve.
            </p>

            <p>
              The revised policy will display a
              new last-updated date. We may also
              provide additional notice for
              material changes through CASE
              Budget, email, or another
              appropriate method.
            </p>
          </PolicySection>

          <PolicySection
            id="contact"
            number="12"
            title="Contact us"
          >
            <p>
              Questions, privacy requests, or
              concerns regarding this Privacy
              Policy may be directed to XilAire
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
          <PrivacyIcon />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Our commitment to privacy
          </h2>

          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            CASE Budget is designed to
            help individuals,
            households, businesses, and
            organizations manage
            sensitive financial
            information. XilAire
            Technologies is committed
            to handling that information
            responsibly and using it
            only for legitimate
            platform, security, support,
            and legal purposes.
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

type PolicySubsectionProps = {
  title: string;
  children: React.ReactNode;
};

function PolicySubsection({
  title,
  children,
}: PolicySubsectionProps) {
  return (
    <div>
      <h3 className="text-base font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <div className="mt-3 space-y-4">
        {children}
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
        href="/legal"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Previous
        </p>

        <div className="mt-3 flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <ArrowLeftIcon />

          Legal Center
        </div>
      </Link>

      <Link
        href="/legal/cookies"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 text-right outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Next
        </p>

        <div className="mt-3 flex items-center justify-end gap-2 font-bold text-[var(--text-primary)]">
          Cookie Policy

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
          aria-label="Privacy page navigation"
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

          <Link
            href="/sign-in"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Sign in
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

function PrivacyIcon() {
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

      <circle
        cx="12"
        cy="11"
        r="2"
      />

      <path d="M9 17c.7-1.5 1.7-2 3-2s2.3.5 3 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="20"
      height="20"
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