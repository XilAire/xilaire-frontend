import type {
  Metadata,
} from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Contact Legal | CASE Budget",
  description:
    "Contact XilAire Technologies regarding CASE Budget legal notices, privacy requests, security concerns, licensing, abuse reports, and compliance matters.",
};

const LAST_UPDATED =
  "August 2, 2026";

const pageSections = [
  {
    href:
      "#overview",
    label:
      "Overview",
  },
  {
    href:
      "#contact-options",
    label:
      "Contact options",
  },
  {
    href:
      "#legal-notices",
    label:
      "Legal notices",
  },
  {
    href:
      "#privacy-requests",
    label:
      "Privacy requests",
  },
  {
    href:
      "#security-reports",
    label:
      "Security reports",
  },
  {
    href:
      "#abuse-reports",
    label:
      "Abuse reports",
  },
  {
    href:
      "#license-requests",
    label:
      "License requests",
  },
  {
    href:
      "#support",
    label:
      "Customer support",
  },
  {
    href:
      "#response-times",
    label:
      "Response times",
  },
  {
    href:
      "#required-information",
    label:
      "Information to include",
  },
  {
    href:
      "#sensitive-information",
    label:
      "Sensitive information",
  },
  {
    href:
      "#contact",
    label:
      "Contact directory",
  },
];

type ContactOption = {
  title: string;
  description: string;
  email: string;
  subject: string;
  icon:
    | "legal"
    | "privacy"
    | "security"
    | "abuse"
    | "license"
    | "support";
  responseLabel: string;
};

const contactOptions:
  ContactOption[] = [
    {
      title:
        "Legal and compliance",
      description:
        "Terms, contracts, legal notices, regulatory matters, subpoenas, and formal correspondence.",
      email:
        "legal@xilairetechnologies.com",
      subject:
        "CASE Budget Legal Inquiry",
      icon:
        "legal",
      responseLabel:
        "Legal review required",
    },
    {
      title:
        "Privacy and data rights",
      description:
        "Access, correction, deletion, portability, consent, and personal-information requests.",
      email:
        "privacy@xilairetechnologies.com",
      subject:
        "CASE Budget Privacy Request",
      icon:
        "privacy",
      responseLabel:
        "Identity verification may apply",
    },
    {
      title:
        "Security and vulnerabilities",
      description:
        "Account compromise, unauthorized access, suspected vulnerabilities, or security incidents.",
      email:
        "security@xilairetechnologies.com",
      subject:
        "CASE Budget Security Report",
      icon:
        "security",
      responseLabel:
        "Priority security review",
    },
    {
      title:
        "Abuse and policy violations",
      description:
        "Fraud, prohibited content, impersonation, phishing, harassment, or Acceptable Use Policy violations.",
      email:
        "abuse@xilairetechnologies.com",
      subject:
        "CASE Budget Abuse Report",
      icon:
        "abuse",
      responseLabel:
        "Investigation may be required",
    },
    {
      title:
        "Open-source licensing",
      description:
        "Attribution, license compliance, source-code requests, and third-party software notices.",
      email:
        "legal@xilairetechnologies.com",
      subject:
        "CASE Budget Open Source License Request",
      icon:
        "license",
      responseLabel:
        "Package details recommended",
    },
    {
      title:
        "Customer support",
      description:
        "Account access, subscriptions, billing, technical issues, and general CASE Budget assistance.",
      email:
        "support@xilairetechnologies.com",
      subject:
        "CASE Budget Support Request",
      icon:
        "support",
      responseLabel:
        "Use support for product help",
    },
  ];

type ResponseExpectation = {
  title: string;
  description: string;
  icon:
    | "received"
    | "verified"
    | "reviewed"
    | "resolved";
};

const responseExpectations:
  ResponseExpectation[] = [
    {
      title:
        "Request received",
      description:
        "Your message is reviewed and routed to the appropriate XilAire Technologies team.",
      icon:
        "received",
    },
    {
      title:
        "Identity verified",
      description:
        "Privacy, account, workspace, or data requests may require identity and authority verification.",
      icon:
        "verified",
    },
    {
      title:
        "Matter reviewed",
      description:
        "The appropriate legal, security, privacy, abuse, licensing, or support personnel review the request.",
      icon:
        "reviewed",
    },
    {
      title:
        "Response provided",
      description:
        "You receive a response, status update, request for more information, or final resolution.",
      icon:
        "resolved",
    },
  ];

export default function ContactLegalPage() {
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
              Contact Legal
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
              Contact XilAire Technologies
              regarding CASE Budget legal
              notices, privacy rights,
              security concerns, policy
              violations, open-source
              licensing, and compliance
              matters.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PolicyBadge
                label="Official contact directory"
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
            aria-label="Contact Legal sections"
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
              <EmailIcon />
            </div>

            <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
              General legal inquiries
            </p>

            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              Use the legal mailbox for
              formal notices and matters
              that do not fit another
              category.
            </p>

            <a
              href="mailto:legal@xilairetechnologies.com?subject=CASE%20Budget%20Legal%20Inquiry"
              className="mt-4 inline-flex break-all text-xs font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              legal@xilairetechnologies.com
            </a>
          </div>
        </aside>

        <article className="min-w-0 space-y-8">
          <ContactIntroduction />

          <PolicySection
            id="overview"
            number="1"
            title="Overview"
          >
            <p>
              XilAire Technologies maintains
              separate contact channels so
              CASE Budget inquiries can be
              directed to the appropriate team.
            </p>

            <p>
              Selecting the correct contact
              method helps us review requests
              efficiently and reduces delays
              caused by rerouting messages.
            </p>

            <PolicyNotice
              title="Use the correct mailbox"
              description="Security reports, privacy requests, abuse reports, legal notices, licensing questions, and customer-support issues may require different review and verification procedures."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="contact-options"
            number="2"
            title="Contact options"
          >
            <p>
              Choose the contact option that
              most closely matches your
              request.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {contactOptions.map(
                (
                  option,
                ) => (
                  <ContactOptionCard
                    key={`${option.email}-${option.title}`}
                    option={
                      option
                    }
                  />
                ),
              )}
            </div>
          </PolicySection>

          <PolicySection
            id="legal-notices"
            number="3"
            title="Legal notices and formal correspondence"
          >
            <p>
              Formal legal notices and
              correspondence regarding CASE
              Budget should be sent to the
              legal mailbox.
            </p>

            <PolicyList
              items={[
                "Contract or Terms of Service questions.",
                "Regulatory or compliance inquiries.",
                "Subpoenas, court orders, and legally authorized requests.",
                "Intellectual-property notices.",
                "Business or enterprise agreement questions.",
                "Dispute notices and formal claims.",
                "Questions regarding governing law or legal obligations.",
              ]}
            />

            <ContactAction
              email="legal@xilairetechnologies.com"
              subject="CASE Budget Legal Notice"
              label="Contact legal team"
              icon={
                <LegalIcon />
              }
            />

            <PolicyNotice
              title="Email may not satisfy every legal-notice requirement"
              description="A contract, law, regulation, or court rule may require delivery by a specific method or to a designated registered agent or address."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="privacy-requests"
            number="4"
            title="Privacy and data-rights requests"
          >
            <p>
              Contact the privacy team for
              requests involving personal
              information or data rights.
            </p>

            <PolicyList
              items={[
                "Access to personal information.",
                "Correction of inaccurate information.",
                "Deletion of eligible information.",
                "Account or workspace deletion.",
                "Data portability or export.",
                "Consent withdrawal.",
                "Processing objections or restrictions.",
                "Questions about the Privacy Policy or Cookie Policy.",
              ]}
            />

            <PolicySubsection
              title="Verification may be required"
            >
              <p>
                Privacy requests may require
                confirmation from the email
                address associated with the
                CASE Budget account, recent
                authentication, MFA, workspace
                ownership verification, or
                other reasonable identity
                checks.
              </p>
            </PolicySubsection>

            <div className="flex flex-col gap-3 sm:flex-row">
              <ContactAction
                email="privacy@xilairetechnologies.com"
                subject="CASE Budget Privacy Request"
                label="Contact privacy team"
                icon={
                  <PrivacyIcon />
                }
              />

              <Link
                href="/legal/data-deletion"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Review data deletion
              </Link>
            </div>
          </PolicySection>

          <PolicySection
            id="security-reports"
            number="5"
            title="Security reports"
          >
            <p>
              Report suspected vulnerabilities,
              account compromise, unauthorized
              access, exposed credentials, or
              security incidents to the
              security team.
            </p>

            <PolicyList
              items={[
                "Unauthorized access to an account or workspace.",
                "Unexpected password-reset, sign-in, or MFA activity.",
                "Suspected exposure of customer information.",
                "Authentication or authorization bypass.",
                "Potential Row Level Security failure.",
                "Exposed secret keys or administrative credentials.",
                "Malware, phishing, or fraudulent CASE Budget communications.",
                "Security vulnerabilities affecting CASE Budget.",
              ]}
            />

            <ContactAction
              email="security@xilairetechnologies.com"
              subject="CASE Budget Security Report"
              label="Contact security team"
              icon={
                <ShieldIcon />
              }
            />

            <PolicyNotice
              title="Do not perform unauthorized testing"
              description="Do not exploit, scan, probe, or test CASE Budget systems without prior written authorization from XilAire Technologies."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="abuse-reports"
            number="6"
            title="Abuse and policy-violation reports"
          >
            <p>
              Report suspected violations of
              the CASE Budget Acceptable Use
              Policy through the abuse mailbox.
            </p>

            <PolicyList
              items={[
                "Fraud, scams, phishing, or impersonation.",
                "Unauthorized financial information.",
                "Harassment, threats, exploitation, or harmful content.",
                "Malware or malicious attachments.",
                "Automated scraping or platform abuse.",
                "Subscription or access-control circumvention.",
                "Unauthorized account or workspace access.",
                "Other prohibited or unlawful activity.",
              ]}
            />

            <ContactAction
              email="abuse@xilairetechnologies.com"
              subject="CASE Budget Abuse Report"
              label="Report abuse"
              icon={
                <AbuseIcon />
              }
            />
          </PolicySection>

          <PolicySection
            id="license-requests"
            number="7"
            title="Open-source license and attribution requests"
          >
            <p>
              Contact the legal team for
              open-source licensing,
              attribution, or source-code
              obligations.
            </p>

            <PolicyList
              items={[
                "Questions about listed software licenses.",
                "Requests for required source code or modifications.",
                "Missing or inaccurate attribution notices.",
                "Package-license classification questions.",
                "Third-party trademark or copyright questions.",
                "Requests regarding distributed license files.",
              ]}
            />

            <PolicySubsection
              title="Include package information"
            >
              <p>
                Include the package name,
                version, license, relevant CASE
                Budget release, and the
                specific materials or
                correction requested.
              </p>
            </PolicySubsection>

            <div className="flex flex-col gap-3 sm:flex-row">
              <ContactAction
                email="legal@xilairetechnologies.com"
                subject="CASE Budget Open Source License Request"
                label="Submit license request"
                icon={
                  <CodeIcon />
                }
              />

              <Link
                href="/legal/licenses"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Review license notices
              </Link>
            </div>
          </PolicySection>

          <PolicySection
            id="support"
            number="8"
            title="Customer support and product assistance"
          >
            <p>
              General product, account,
              subscription, billing, and
              technical issues should be sent
              to customer support rather than
              the legal or privacy teams.
            </p>

            <PolicyList
              items={[
                "Unable to sign in.",
                "Password-reset or confirmation-email issues.",
                "Subscription and billing questions.",
                "Feature-access or plan questions.",
                "Workspace or member-management issues.",
                "Transaction, bill, budget, or account problems.",
                "Application errors or unexpected behavior.",
                "General product questions.",
              ]}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <ContactAction
                email="support@xilairetechnologies.com"
                subject="CASE Budget Support Request"
                label="Contact support"
                icon={
                  <SupportIcon />
                }
              />

              <Link
                href="/support"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Visit Support Center
              </Link>
            </div>

            <PolicyNotice
              title="Do not use support for emergencies"
              description="Customer support is not an emergency service. Contact your bank, creditor, broker, emergency services, attorney, tax authority, or other appropriate organization for urgent matters."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="response-times"
            number="9"
            title="Review and response process"
          >
            <p>
              Response timing depends on the
              nature, urgency, complexity, and
              verification requirements of the
              request.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {responseExpectations.map(
                (
                  expectation,
                ) => (
                  <ResponseExpectationCard
                    key={
                      expectation.title
                    }
                    expectation={
                      expectation
                    }
                  />
                ),
              )}
            </div>

            <PolicyList
              items={[
                "Security reports involving active risk may receive priority review.",
                "Privacy requests may require identity verification before processing begins.",
                "Legal notices may require review by counsel.",
                "Abuse reports may require investigation and preservation of evidence.",
                "License requests may require package and release verification.",
                "Complex or third-party matters may take additional time.",
                "We may request more information before providing a complete response.",
              ]}
            />

            <p>
              Sending repeated messages about
              the same issue may not accelerate
              review and may create delays.
            </p>
          </PolicySection>

          <PolicySection
            id="required-information"
            number="10"
            title="Information to include"
          >
            <p>
              Include enough information for
              the appropriate team to identify,
              understand, and investigate the
              matter.
            </p>

            <PolicyList
              items={[
                "Your full name.",
                "The email address associated with your CASE Budget account.",
                "The relevant workspace name or identifier.",
                "A clear description of the request or issue.",
                "The affected page, feature, policy, account, or record.",
                "Relevant dates and approximate times.",
                "Steps to reproduce a technical or security issue.",
                "Screenshots with unnecessary sensitive information removed.",
                "The result or resolution you are requesting.",
                "A safe method for contacting you.",
              ]}
            />

            <PolicyNotice
              title="Be specific"
              description="Clear subject lines, relevant dates, workspace information, and concise descriptions help reduce delays and unnecessary follow-up."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="sensitive-information"
            number="11"
            title="Do not send sensitive authentication or financial information"
          >
            <p>
              Never include secrets or complete
              financial credentials in an
              initial email or contact request.
            </p>

            <PolicyList
              items={[
                "Passwords.",
                "Multi-factor authentication codes.",
                "Password-reset links.",
                "Authentication cookies or session tokens.",
                "Supabase service-role keys or other private API keys.",
                "Full payment-card numbers.",
                "Financial institution passwords.",
                "Complete bank or brokerage account numbers.",
                "Social Security numbers or full tax identifiers.",
                "Private information belonging to another user unless necessary and legally authorized.",
              ]}
            />

            <PolicyNotice
              title="XilAire Technologies should not request your password"
              description="Support, legal, privacy, abuse, and security personnel should not ask you to provide your CASE Budget password by email."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="contact"
            number="12"
            title="Contact directory"
          >
            <p>
              Use the directory below to route
              your request.
            </p>

            <div className="space-y-4">
              <DirectoryRow
                department="Legal and compliance"
                email="legal@xilairetechnologies.com"
                description="Formal legal, contract, compliance, licensing, and regulatory matters."
              />

              <DirectoryRow
                department="Privacy and data protection"
                email="privacy@xilairetechnologies.com"
                description="Privacy rights, access, correction, deletion, portability, and policy questions."
              />

              <DirectoryRow
                department="Security"
                email="security@xilairetechnologies.com"
                description="Vulnerabilities, account compromise, unauthorized access, and security incidents."
              />

              <DirectoryRow
                department="Abuse"
                email="abuse@xilairetechnologies.com"
                description="Fraud, prohibited content, misuse, impersonation, and Acceptable Use Policy violations."
              />

              <DirectoryRow
                department="Customer support"
                email="support@xilairetechnologies.com"
                description="Account, billing, subscription, technical, and product assistance."
              />
            </div>
          </PolicySection>

          <DocumentNavigation />
        </article>
      </div>

      <LegalFooter />
    </main>
  );
}

function ContactIntroduction() {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--primary)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--surface-default))] p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
          <EmailIcon />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Route your request correctly
          </h2>

          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            Legal, privacy, security,
            abuse, licensing, and customer
            support requests involve
            different responsibilities and
            review procedures. Use the
            contact method that best fits
            your request.
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

type ContactOptionCardProps = {
  option: ContactOption;
};

function ContactOptionCard({
  option,
}: ContactOptionCardProps) {
  const mailtoHref =
    createMailtoHref(
      option.email,
      option.subject,
    );

  return (
    <article className="flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <ContactOptionIcon
            icon={
              option.icon
            }
          />
        </div>

        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-default)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          {
            option.responseLabel
          }
        </span>
      </div>

      <h3 className="mt-5 text-base font-bold text-[var(--text-primary)]">
        {option.title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        {option.description}
      </p>

      <div className="mt-auto pt-5">
        <a
          href={
            mailtoHref
          }
          className="inline-flex break-all text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {option.email}
        </a>
      </div>
    </article>
  );
}

type ContactActionProps = {
  email: string;
  subject: string;
  label: string;
  icon: React.ReactNode;
};

function ContactAction({
  email,
  subject,
  label,
  icon,
}: ContactActionProps) {
  return (
    <a
      href={createMailtoHref(
        email,
        subject,
      )}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
    >
      {label}

      {icon}
    </a>
  );
}

type ResponseExpectationCardProps = {
  expectation: ResponseExpectation;
};

function ResponseExpectationCard({
  expectation,
}: ResponseExpectationCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <ResponseExpectationIcon
          icon={
            expectation.icon
          }
        />
      </div>

      <h3 className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {expectation.title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {expectation.description}
      </p>
    </div>
  );
}

type DirectoryRowProps = {
  department: string;
  email: string;
  description: string;
};

function DirectoryRow({
  department,
  email,
  description,
}: DirectoryRowProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] md:items-start">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {department}
          </p>

          <a
            href={`mailto:${email}`}
            className="mt-2 inline-flex break-all text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {email}
          </a>
        </div>

        <p className="text-sm leading-6 text-[var(--text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

type PolicyNoticeProps = {
  title: string;
  description: string;
  tone:
    | "primary"
    | "warning"
    | "danger";
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
        "danger"
          ? "border-[color-mix(in_srgb,var(--danger)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface-muted))]"
          : tone ===
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
            "danger"
              ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
              : tone ===
                  "warning"
                ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
                : "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
          ].join(" ")}
        >
          {tone ===
          "danger" ? (
            <ShieldAlertIcon />
          ) : tone ===
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
        href="/legal/licenses"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Previous
        </p>

        <div className="mt-3 flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <ArrowLeftIcon />

          Open Source Licenses
        </div>
      </Link>

      <Link
        href="/legal"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 text-right outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Return
        </p>

        <div className="mt-3 flex items-center justify-end gap-2 font-bold text-[var(--text-primary)]">
          Legal Center

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
          aria-label="Contact Legal navigation"
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

function createMailtoHref(
  email: string,
  subject: string,
) {
  const searchParams =
    new URLSearchParams();

  searchParams.set(
    "subject",
    subject,
  );

  return `mailto:${email}?${searchParams.toString()}`;
}

type ContactOptionIconProps = {
  icon:
    ContactOption["icon"];
};

function ContactOptionIcon({
  icon,
}: ContactOptionIconProps) {
  switch (icon) {
    case "privacy":
      return (
        <PrivacyIcon />
      );

    case "security":
      return (
        <ShieldIcon />
      );

    case "abuse":
      return (
        <AbuseIcon />
      );

    case "license":
      return (
        <CodeIcon />
      );

    case "support":
      return (
        <SupportIcon />
      );

    case "legal":
    default:
      return (
        <LegalIcon />
      );
  }
}

type ResponseExpectationIconProps = {
  icon:
    ResponseExpectation["icon"];
};

function ResponseExpectationIcon({
  icon,
}: ResponseExpectationIconProps) {
  switch (icon) {
    case "verified":
      return (
        <VerifiedIcon />
      );

    case "reviewed":
      return (
        <ReviewIcon />
      );

    case "resolved":
      return (
        <ResolvedIcon />
      );

    case "received":
    default:
      return (
        <ReceivedIcon />
      );
  }
}

function LegalIcon() {
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
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function PrivacyIcon() {
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
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function AbuseIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function CodeIcon() {
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
      <path d="m8 9-4 3 4 3" />
      <path d="m16 9 4 3-4 3" />
      <path d="m14 5-4 14" />
    </svg>
  );
}

function SupportIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M9.5 9a2.7 2.7 0 1 1 4.7 1.8c-.9.8-2.2 1.3-2.2 2.7" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ReceivedIcon() {
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

function VerifiedIcon() {
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
      <circle
        cx="12"
        cy="8"
        r="4"
      />
      <path d="M4 21a8 8 0 0 1 13.5-5.8" />
      <path d="m16 19 2 2 4-4" />
    </svg>
  );
}

function ReviewIcon() {
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
      <circle
        cx="11"
        cy="11"
        r="7"
      />
      <path d="m20 20-4-4" />
      <path d="M8 11h6" />
      <path d="M11 8v6" />
    </svg>
  );
}

function ResolvedIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="m8 12 2.5 2.5L16 9" />
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

function ShieldAlertIcon() {
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
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
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