import type {
  Metadata,
} from "next";
import Link from "next/link";

import CaseBudgetLogo from "@/components/branding/CaseBudgetLogo";

export const metadata: Metadata = {
  title:
    "Open Source Licenses | CASE Budget",
  description:
    "Review open-source software notices, third-party license information, attribution requirements, and related acknowledgments for CASE Budget.",
};

const LAST_UPDATED =
  "August 2, 2026";

const pageSections = [
  {
    href: "#overview",
    label: "Overview",
  },
  {
    href: "#third-party-software",
    label: "Third-party software",
  },
  {
    href: "#license-obligations",
    label: "License obligations",
  },
  {
    href: "#included-packages",
    label: "Included packages",
  },
  {
    href: "#trademarks",
    label: "Trademarks",
  },
  {
    href: "#source-code",
    label: "Source code requests",
  },
  {
    href: "#updates",
    label: "License updates",
  },
  {
    href: "#contact",
    label: "Contact",
  },
];

type LicenseCategory = {
  title: string;
  description: string;
  icon:
    | "framework"
    | "database"
    | "interface"
    | "utility";
};

const licenseCategories:
  LicenseCategory[] = [
    {
      title:
        "Application frameworks",
      description:
        "Frameworks and runtime libraries used to build and deliver the CASE Budget web application.",
      icon:
        "framework",
    },
    {
      title:
        "Database and authentication",
      description:
        "Libraries used for Supabase connectivity, authentication, sessions, and database operations.",
      icon:
        "database",
    },
    {
      title:
        "Interface components",
      description:
        "Libraries and tools used to build responsive forms, layouts, icons, and accessible user experiences.",
      icon:
        "interface",
    },
    {
      title:
        "Development utilities",
      description:
        "Build tools, type definitions, linting tools, formatting utilities, and supporting development packages.",
      icon:
        "utility",
    },
  ];

type SoftwareNotice = {
  name: string;
  purpose: string;
  license:
    | "MIT"
    | "Apache-2.0"
    | "ISC"
    | "BSD-2-Clause"
    | "BSD-3-Clause"
    | "Other";
  website: string;
  copyrightNotice?: string;
  productionUse: boolean;
};

const softwareNotices:
  SoftwareNotice[] = [
    {
      name:
        "Next.js",
      purpose:
        "React framework used to build and render the CASE Budget application.",
      license:
        "MIT",
      website:
        "https://nextjs.org",
      copyrightNotice:
        "Copyright Vercel, Inc.",
      productionUse:
        true,
    },
    {
      name:
        "React",
      purpose:
        "User-interface library used to build interactive CASE Budget components.",
      license:
        "MIT",
      website:
        "https://react.dev",
      copyrightNotice:
        "Copyright Meta Platforms, Inc. and affiliates.",
      productionUse:
        true,
    },
    {
      name:
        "React DOM",
      purpose:
        "React package used to render application interfaces in web browsers.",
      license:
        "MIT",
      website:
        "https://react.dev",
      copyrightNotice:
        "Copyright Meta Platforms, Inc. and affiliates.",
      productionUse:
        true,
    },
    {
      name:
        "Supabase JavaScript Client",
      purpose:
        "Client library used for Supabase authentication, database, and service access.",
      license:
        "MIT",
      website:
        "https://supabase.com",
      copyrightNotice:
        "Copyright Supabase, Inc.",
      productionUse:
        true,
    },
    {
      name:
        "Supabase SSR",
      purpose:
        "Server-side rendering helpers used to manage Supabase authentication sessions.",
      license:
        "MIT",
      website:
        "https://supabase.com",
      copyrightNotice:
        "Copyright Supabase, Inc.",
      productionUse:
        true,
    },
    {
      name:
        "Tailwind CSS",
      purpose:
        "Utility-first CSS framework used to style CASE Budget interfaces.",
      license:
        "MIT",
      website:
        "https://tailwindcss.com",
      copyrightNotice:
        "Copyright Tailwind Labs, Inc.",
      productionUse:
        true,
    },
    {
      name:
        "TypeScript",
      purpose:
        "Programming language and compiler used for typed application development.",
      license:
        "Apache-2.0",
      website:
        "https://www.typescriptlang.org",
      copyrightNotice:
        "Copyright Microsoft Corporation.",
      productionUse:
        false,
    },
    {
      name:
        "ESLint",
      purpose:
        "Static-analysis tool used to identify coding problems and enforce development standards.",
      license:
        "MIT",
      website:
        "https://eslint.org",
      copyrightNotice:
        "Copyright OpenJS Foundation and other contributors.",
      productionUse:
        false,
    },
  ];

export default function OpenSourceLicensesPage() {
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
              Company information
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Open Source Licenses
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
              CASE Budget includes
              open-source software created and
              maintained by third-party
              developers and organizations.
              This page provides attribution
              and license information for
              important software used by the
              platform.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PolicyBadge
                label="Current notices"
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
            aria-label="Open Source Licenses sections"
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4"
          >
            <p className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              On this page
            </p>

            <div className="mt-3 space-y-1">
              {pageSections.map(
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
              <CodeIcon />
            </div>

            <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
              License question?
            </p>

            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              Contact XilAire
              Technologies regarding
              attribution, license
              notices, or source-code
              requests.
            </p>

            <a
              href="mailto:legal@xilairetechnologies.com?subject=CASE%20Budget%20Open%20Source%20License%20Question"
              className="mt-4 inline-flex break-all text-xs font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              legal@xilairetechnologies.com
            </a>
          </div>
        </aside>

        <article className="min-w-0 space-y-8">
          <LicenseIntroduction />

          <PolicySection
            id="overview"
            number="1"
            title="Overview"
          >
            <p>
              CASE Budget is proprietary
              software owned by XilAire
              Technologies, but it depends on
              open-source software distributed
              under separate third-party
              licenses.
            </p>

            <p>
              Open-source components remain
              subject to the terms of their
              respective licenses. Nothing in
              the CASE Budget Terms of Service
              replaces, limits, or expands the
              rights granted by an applicable
              open-source license.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {licenseCategories.map(
                (
                  category,
                ) => (
                  <LicenseCategoryCard
                    key={
                      category.title
                    }
                    category={
                      category
                    }
                  />
                ),
              )}
            </div>

            <PolicyNotice
              title="Separate license rights"
              description="The licenses listed on this page apply only to the identified third-party software and do not grant rights to CASE Budget proprietary code, branding, content, or services."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="third-party-software"
            number="2"
            title="Third-party software"
          >
            <p>
              CASE Budget may incorporate,
              depend on, interact with, or be
              distributed alongside software
              created by third parties.
            </p>

            <PolicyList
              items={[
                "Application frameworks and rendering libraries.",
                "Authentication and database client libraries.",
                "CSS frameworks and interface utilities.",
                "Build tools and compilers.",
                "Type definitions and development dependencies.",
                "Testing, linting, and code-quality tools.",
                "Transitive dependencies installed through package managers.",
              ]}
            />

            <p>
              The list on this page highlights
              important direct dependencies but
              may not include every transitive,
              development-only, platform, or
              infrastructure dependency.
            </p>
          </PolicySection>

          <PolicySection
            id="license-obligations"
            number="3"
            title="License obligations and attribution"
          >
            <p>
              XilAire Technologies intends to
              comply with the license
              obligations applicable to
              open-source software used by CASE
              Budget.
            </p>

            <PolicyList
              items={[
                "Preserve required copyright notices.",
                "Preserve license text when required.",
                "Provide attribution when required by the applicable license.",
                "Make source code available when required by a reciprocal license.",
                "Document material modifications when required.",
                "Avoid using third-party trademarks in a way that implies endorsement.",
                "Comply with restrictions and conditions contained in each license.",
              ]}
            />

            <PolicyNotice
              title="Repository license files control"
              description="When this page differs from a package's official license file or source repository, the official license text distributed with that package controls."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="included-packages"
            number="4"
            title="Important included packages"
          >
            <p>
              The following packages are
              currently expected to be used in
              CASE Budget. This list should be
              updated whenever production
              dependencies materially change.
            </p>

            <div className="space-y-4">
              {softwareNotices.map(
                (
                  software,
                ) => (
                  <SoftwareNoticeCard
                    key={
                      software.name
                    }
                    software={
                      software
                    }
                  />
                ),
              )}
            </div>

            <PolicyNotice
              title="Verify before production release"
              description="Package names, versions, license types, and notices should be generated or verified against the final production lockfile before launch."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="trademarks"
            number="5"
            title="Third-party names and trademarks"
          >
            <p>
              Product names, project names,
              logos, service names, and
              trademarks referenced on this
              page belong to their respective
              owners.
            </p>

            <PolicyList
              items={[
                "Use of a third-party name does not imply sponsorship or endorsement.",
                "XilAire Technologies does not claim ownership of third-party trademarks.",
                "Third-party trademark rights are separate from open-source copyright licenses.",
                "CASE Budget branding may not be used without authorization from XilAire Technologies.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="source-code"
            number="6"
            title="Source-code and license requests"
          >
            <p>
              Most permissively licensed
              dependencies are available from
              their public repositories or
              package registries.
            </p>

            <p>
              When a third-party license
              requires XilAire Technologies to
              provide source code, modifications,
              build instructions, or related
              materials, eligible requests may
              be submitted to the legal team.
            </p>

            <PolicySubsection
              title="Include in your request"
            >
              <PolicyList
                items={[
                  "The name of the CASE Budget product or application.",
                  "The relevant software package or component.",
                  "The version or release date when known.",
                  "The license obligation you believe applies.",
                  "Your name and contact information.",
                  "A description of the materials requested.",
                ]}
              />
            </PolicySubsection>

            <a
              href="mailto:legal@xilairetechnologies.com?subject=CASE%20Budget%20Source%20Code%20Request"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
            >
              Submit license request

              <EmailIcon />
            </a>
          </PolicySection>

          <PolicySection
            id="updates"
            number="7"
            title="Updates to these notices"
          >
            <p>
              Open-source dependencies may
              change as CASE Budget features,
              security requirements, build
              tools, and infrastructure evolve.
            </p>

            <PolicyList
              items={[
                "New dependencies may be added.",
                "Existing packages may be upgraded, replaced, or removed.",
                "License classifications may change between versions.",
                "Attribution notices may be updated.",
                "Separate mobile, desktop, API, or service components may have additional notices.",
              ]}
            />

            <p>
              The last-updated date indicates
              when this page was most recently
              revised. It does not necessarily
              represent the installation date of
              every package.
            </p>
          </PolicySection>

          <PolicySection
            id="contact"
            number="8"
            title="Contact us"
          >
            <p>
              Questions regarding third-party
              software, attribution, licensing,
              or source-code obligations may be
              directed to XilAire Technologies.
            </p>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                  <CodeIcon />
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-[var(--text-primary)]">
                    XilAire Technologies
                  </p>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Legal and Open Source
                    Compliance
                  </p>

                  <a
                    href="mailto:legal@xilairetechnologies.com"
                    className="mt-3 inline-flex break-all font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  >
                    legal@xilairetechnologies.com
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

function LicenseIntroduction() {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--primary)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--surface-default))] p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
          <CodeIcon />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Built with open-source
            software
          </h2>

          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            CASE Budget benefits from
            open-source communities and
            software projects. XilAire
            Technologies recognizes the
            developers and organizations
            whose work helps make the
            platform possible.
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

type LicenseCategoryCardProps = {
  category: LicenseCategory;
};

function LicenseCategoryCard({
  category,
}: LicenseCategoryCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <LicenseCategoryIcon
          icon={
            category.icon
          }
        />
      </div>

      <h3 className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {category.title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {category.description}
      </p>
    </div>
  );
}

type SoftwareNoticeCardProps = {
  software: SoftwareNotice;
};

function SoftwareNoticeCard({
  software,
}: SoftwareNoticeCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            {software.name}
          </h3>

          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {software.purpose}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <LicenseBadge
            label={
              software.license
            }
          />

          <UsageBadge
            productionUse={
              software.productionUse
            }
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-primary)]">
            Project website
          </p>

          <a
            href={
              software.website
            }
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 break-all text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {software.website}

            <ExternalLinkIcon />
          </a>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-primary)]">
            Copyright notice
          </p>

          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {software.copyrightNotice ??
              "See the package repository and distributed license files."}
          </p>
        </div>
      </div>
    </div>
  );
}

function LicenseBadge({
  label,
}: {
  label: SoftwareNotice["license"];
}) {
  return (
    <span className="inline-flex h-fit rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
      {label}
    </span>
  );
}

function UsageBadge({
  productionUse,
}: {
  productionUse: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex h-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
        productionUse
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : "bg-[var(--surface-default)] text-[var(--text-muted)]",
      ].join(" ")}
    >
      {productionUse
        ? "Production"
        : "Development"}
    </span>
  );
}

type PolicyNoticeProps = {
  title: string;
  description: string;
  tone:
    | "primary"
    | "warning";
};

function PolicyNotice({
  title,
  description,
  tone,
}: PolicyNoticeProps) {
  return (
    <div
      className={[
        "rounded-xl border p-4",
        tone ===
        "warning"
          ? "border-[color-mix(in_srgb,var(--warning)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--warning)_7%,var(--surface-muted))]"
          : "border-[color-mix(in_srgb,var(--primary)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--surface-muted))]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            tone ===
            "warning"
              ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
              : "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
          ].join(" ")}
        >
          {tone ===
          "warning" ? (
            <WarningIcon />
          ) : (
            <InformationIcon />
          )}
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
        href="/legal/disclaimer"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Previous
        </p>

        <div className="mt-3 flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <ArrowLeftIcon />

          Financial Disclaimer
        </div>
      </Link>

      <Link
        href="/legal/contact"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 text-right outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Next
        </p>

        <div className="mt-3 flex items-center justify-end gap-2 font-bold text-[var(--text-primary)]">
          Contact Legal

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
          aria-label="Open Source Licenses navigation"
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
            href="/legal/security"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Security
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

type LicenseCategoryIconProps = {
  icon:
    LicenseCategory["icon"];
};

function LicenseCategoryIcon({
  icon,
}: LicenseCategoryIconProps) {
  switch (icon) {
    case "database":
      return (
        <DatabaseIcon />
      );

    case "interface":
      return (
        <InterfaceIcon />
      );

    case "utility":
      return (
        <ToolIcon />
      );

    case "framework":
    default:
      return (
        <FrameworkIcon />
      );
  }
}

function CodeIcon() {
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
      <path d="m8 9-4 3 4 3" />
      <path d="m16 9 4 3-4 3" />
      <path d="m14 5-4 14" />
    </svg>
  );
}

function FrameworkIcon() {
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
        y="4"
        width="18"
        height="16"
        rx="2"
      />

      <path d="M3 9h18" />
      <path d="M8 9v11" />
    </svg>
  );
}

function DatabaseIcon() {
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
      <ellipse
        cx="12"
        cy="5"
        rx="8"
        ry="3"
      />

      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />

      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}

function InterfaceIcon() {
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
        y="4"
        width="18"
        height="16"
        rx="2"
      />

      <path d="M7 8h10" />
      <path d="M7 12h4" />
      <path d="M7 16h7" />
    </svg>
  );
}

function ToolIcon() {
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
      <path d="M14.7 6.3a4 4 0 0 0-5-5l2.2 2.2-3.4 3.4-2.2-2.2a4 4 0 0 0 5 5L18 16.4a2.1 2.1 0 1 0 3-3Z" />
    </svg>
  );
}

function ExternalLinkIcon() {
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
      <path d="M15 3h6v6" />
      <path d="m10 14 11-11" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
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

function WarningIcon() {
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
      <path d="m12 3 9 16H3Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      width="18"
      height="18"
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