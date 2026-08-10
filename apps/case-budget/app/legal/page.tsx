import type {
  Metadata,
} from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Legal Center | CASE Budget",
  description:
    "Review CASE Budget legal policies, privacy information, security practices, subscription terms, financial disclaimers, and data rights.",
};

type LegalCategory =
  | "privacy"
  | "terms"
  | "company";

type LegalDocumentIcon =
  | "privacy"
  | "cookies"
  | "security"
  | "deletion"
  | "terms"
  | "acceptable-use"
  | "disclaimer"
  | "licenses"
  | "contact";

type LegalDocument = {
  title: string;
  description: string;
  href: string;
  category: LegalCategory;
  updatedAt: string;
  icon: LegalDocumentIcon;
};

const LAST_UPDATED =
  "August 2, 2026";

const legalDocuments:
  LegalDocument[] = [
    {
      title:
        "Privacy Policy",
      description:
        "Learn how CASE Budget collects, uses, stores, protects, retains, and shares personal and financial information.",
      href:
        "/legal/privacy",
      category:
        "privacy",
      updatedAt:
        LAST_UPDATED,
      icon:
        "privacy",
    },
    {
      title:
        "Cookie Policy",
      description:
        "Review how cookies and similar technologies support authentication, security, preferences, diagnostics, and analytics.",
      href:
        "/legal/cookies",
      category:
        "privacy",
      updatedAt:
        LAST_UPDATED,
      icon:
        "cookies",
    },
    {
      title:
        "Security Practices",
      description:
        "Understand the safeguards used to protect CASE Budget accounts, workspaces, sessions, and financial information.",
      href:
        "/legal/security",
      category:
        "privacy",
      updatedAt:
        LAST_UPDATED,
      icon:
        "security",
    },
    {
      title:
        "Data Deletion",
      description:
        "Learn how to request account closure, workspace deletion, connected-account removal, or deletion of eligible personal information.",
      href:
        "/legal/data-deletion",
      category:
        "privacy",
      updatedAt:
        LAST_UPDATED,
      icon:
        "deletion",
    },
    {
      title:
        "Terms of Service",
      description:
        "Review the agreement governing CASE Budget accounts, workspaces, subscriptions, payments, features, and permitted use.",
      href:
        "/legal/terms",
      category:
        "terms",
      updatedAt:
        LAST_UPDATED,
      icon:
        "terms",
    },
    {
      title:
        "Acceptable Use Policy",
      description:
        "Understand permitted uses, prohibited activities, platform-security requirements, and enforcement standards.",
      href:
        "/legal/acceptable-use",
      category:
        "terms",
      updatedAt:
        LAST_UPDATED,
      icon:
        "acceptable-use",
    },
    {
      title:
        "Financial Disclaimer",
      description:
        "Review limitations involving financial tools, projections, connected data, automated insights, and professional advice.",
      href:
        "/legal/disclaimer",
      category:
        "terms",
      updatedAt:
        LAST_UPDATED,
      icon:
        "disclaimer",
    },
    {
      title:
        "Open Source Licenses",
      description:
        "View third-party software notices, license information, attribution requirements, and source-code request guidance.",
      href:
        "/legal/licenses",
      category:
        "company",
      updatedAt:
        LAST_UPDATED,
      icon:
        "licenses",
    },
    {
      title:
        "Contact Legal",
      description:
        "Contact XilAire Technologies regarding legal, privacy, security, abuse, licensing, compliance, or support matters.",
      href:
        "/legal/contact",
      category:
        "company",
      updatedAt:
        LAST_UPDATED,
      icon:
        "contact",
    },
  ];

const privacyDocuments =
  legalDocuments.filter(
    (
      document,
    ) =>
      document.category ===
      "privacy",
  );

const termsDocuments =
  legalDocuments.filter(
    (
      document,
    ) =>
      document.category ===
      "terms",
  );

const companyDocuments =
  legalDocuments.filter(
    (
      document,
    ) =>
      document.category ===
      "company",
  );

export default function LegalCenterPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <LegalHeader />

      <LegalHero />

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <LegalStatusNotice />

        <div className="mt-12 space-y-14">
          <LegalCategorySection
            eyebrow="Privacy and data"
            title="Your information, privacy, and security"
            description="Learn how CASE Budget handles personal information, browser technologies, account security, financial records, and deletion requests."
            documents={
              privacyDocuments
            }
          />

          <LegalCategorySection
            eyebrow="Terms and usage"
            title="Rules for using CASE Budget"
            description="Review the agreements, responsibilities, restrictions, disclaimers, and subscription terms that apply when using CASE Budget."
            documents={
              termsDocuments
            }
          />

          <LegalCategorySection
            eyebrow="Company information"
            title="Notices and legal contact"
            description="Review third-party software notices and contact XilAire Technologies regarding legal, privacy, security, or compliance matters."
            documents={
              companyDocuments
            }
          />
        </div>
      </section>

      <LegalSupportSection />

      <LegalFooter />
    </main>
  );
}

function LegalHero() {
  return (
    <section className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
            Legal Center
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
            Policies, terms, and
            trust information
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
            Review the policies that
            govern CASE Budget, learn
            how information is protected,
            and understand your rights
            and responsibilities when
            using the platform.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <StatusBadge
              label="All documents available"
              tone="success"
            />

            <StatusBadge
              label={`Last updated ${LAST_UPDATED}`}
              tone="neutral"
            />
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <LegalMetric
            value={String(
              legalDocuments.length,
            )}
            label="Legal documents"
          />

          <LegalMetric
            value="9"
            label="Currently available"
          />

          <LegalMetric
            value="2026"
            label="Current policy year"
          />
        </div>
      </div>
    </section>
  );
}

function LegalStatusNotice() {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--success)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--success)_7%,var(--surface-default))] p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]">
          <CheckShieldIcon />
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            CASE Budget legal
            documents are available
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            The Legal Center now
            includes the primary privacy,
            security, data, usage,
            financial, licensing, and
            contact documents for CASE
            Budget. These documents
            should receive qualified
            legal review before public
            production launch.
          </p>
        </div>
      </div>
    </section>
  );
}

type LegalMetricProps = {
  value: string;
  label: string;
};

function LegalMetric({
  value,
  label,
}: LegalMetricProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5">
      <p className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}

type LegalCategorySectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  documents: LegalDocument[];
};

function LegalCategorySection({
  eyebrow,
  title,
  description,
  documents,
}: LegalCategorySectionProps) {
  return (
    <section>
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
          {eyebrow}
        </p>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          {description}
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {documents.map(
          (
            document,
          ) => (
            <LegalDocumentCard
              key={
                document.href
              }
              document={
                document
              }
            />
          ),
        )}
      </div>
    </section>
  );
}

type LegalDocumentCardProps = {
  document: LegalDocument;
};

function LegalDocumentCard({
  document,
}: LegalDocumentCardProps) {
  return (
    <Link
      href={
        document.href
      }
      className="group flex min-h-[310px] flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 outline-none transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_32%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] transition group-hover:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]">
          <LegalDocumentIcon
            icon={
              document.icon
            }
          />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--success)]">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-[var(--success)]"
          />

          Available
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
          {document.title}
        </h3>

        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          {document.description}
        </p>
      </div>

      <div className="mt-auto pt-6">
        <p className="text-xs font-medium text-[var(--text-muted)]">
          Updated{" "}
          {
            document.updatedAt
          }
        </p>

        <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          Read document

          <span className="transition-transform group-hover:translate-x-1">
            <ArrowRightIcon />
          </span>
        </div>
      </div>
    </Link>
  );
}

function LegalSupportSection() {
  return (
    <section className="border-y border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
            Questions or requests
          </p>

          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Contact XilAire
            Technologies
          </h2>

          <p className="mt-4 text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            Contact us regarding
            privacy rights, legal
            notices, security issues,
            policy violations, account
            data, licensing, or CASE
            Budget policies.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            href="/legal/contact"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]"
          >
            View contact directory

            <ArrowRightIcon />
          </Link>

          <Link
            href="/support"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Visit Support Center
          </Link>
        </div>
      </div>
    </section>
  );
}

function LegalHeader() {
  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <BrandMark />

        <nav
          aria-label="Legal Center navigation"
          className="flex items-center gap-2"
        >
          <Link
            href="/support"
            className="hidden min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:inline-flex"
          >
            Support
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
    <footer className="bg-[var(--surface-default)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-7 text-sm text-[var(--text-muted)] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>
          © 2026 XilAire
          Technologies. All rights
          reserved.
        </p>

        <nav
          aria-label="Legal Center footer navigation"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
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
            href="/legal/security"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Security
          </Link>

          <Link
            href="/legal/contact"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Contact Legal
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
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-black text-white">
        CB
      </span>

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

type StatusBadgeProps = {
  label: string;
  tone:
    | "success"
    | "neutral";
};

function StatusBadge({
  label,
  tone,
}: StatusBadgeProps) {
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

type LegalDocumentIconProps = {
  icon: LegalDocumentIcon;
};

function LegalDocumentIcon({
  icon,
}: LegalDocumentIconProps) {
  switch (icon) {
    case "privacy":
      return (
        <PrivacyIcon />
      );

    case "cookies":
      return (
        <CookieIcon />
      );

    case "security":
      return (
        <ShieldIcon />
      );

    case "deletion":
      return (
        <TrashIcon />
      );

    case "terms":
      return (
        <DocumentIcon />
      );

    case "acceptable-use":
      return (
        <CheckCircleIcon />
      );

    case "disclaimer":
      return (
        <WarningIcon />
      );

    case "licenses":
      return (
        <CodeIcon />
      );

    case "contact":
      return (
        <EmailIcon />
      );

    default:
      return (
        <DocumentIcon />
      );
  }
}

function CheckShieldIcon() {
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
      <path d="m9 12 2 2 4-4" />
    </svg>
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

function ShieldIcon() {
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
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M4 7h16" />
      <path d="M9 3h6l1 4H8Z" />
      <path d="m7 7 1 14h8l1-14" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function DocumentIcon() {
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
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function CheckCircleIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function WarningIcon() {
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
      <path d="m12 3 9 16H3Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function CodeIcon() {
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
      <path d="m8 9-4 3 4 3" />
      <path d="m16 9 4 3-4 3" />
      <path d="m14 5-4 14" />
    </svg>
  );
}

function EmailIcon() {
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