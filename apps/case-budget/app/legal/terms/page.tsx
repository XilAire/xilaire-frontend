import type {
  Metadata,
} from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Terms of Service | CASE Budget",
  description:
    "Review the terms governing access to and use of CASE Budget services, accounts, subscriptions, workspaces, and financial-planning features.",
};

const LAST_UPDATED =
  "August 2, 2026";

const termsSections = [
  {
    href:
      "#agreement",
    label:
      "Agreement to terms",
  },
  {
    href:
      "#eligibility",
    label:
      "Eligibility",
  },
  {
    href:
      "#accounts",
    label:
      "Accounts",
  },
  {
    href:
      "#workspaces",
    label:
      "Workspaces",
  },
  {
    href:
      "#subscriptions",
    label:
      "Subscriptions",
  },
  {
    href:
      "#payments",
    label:
      "Payments",
  },
  {
    href:
      "#acceptable-use",
    label:
      "Acceptable use",
  },
  {
    href:
      "#financial-tools",
    label:
      "Financial tools",
  },
  {
    href:
      "#connected-services",
    label:
      "Connected services",
  },
  {
    href:
      "#content",
    label:
      "User content",
  },
  {
    href:
      "#intellectual-property",
    label:
      "Intellectual property",
  },
  {
    href:
      "#privacy",
    label:
      "Privacy",
  },
  {
    href:
      "#availability",
    label:
      "Availability",
  },
  {
    href:
      "#termination",
    label:
      "Termination",
  },
  {
    href:
      "#disclaimers",
    label:
      "Disclaimers",
  },
  {
    href:
      "#liability",
    label:
      "Liability",
  },
  {
    href:
      "#indemnification",
    label:
      "Indemnification",
  },
  {
    href:
      "#disputes",
    label:
      "Disputes",
  },
  {
    href:
      "#changes",
    label:
      "Changes",
  },
  {
    href:
      "#contact",
    label:
      "Contact",
  },
];

type TermsSummaryCard = {
  title: string;
  description: string;
  icon:
    | "account"
    | "workspace"
    | "subscription"
    | "finance";
};

const termsSummaryCards:
  TermsSummaryCard[] = [
    {
      title:
        "Your account",
      description:
        "You are responsible for accurate registration information, secure credentials, and activity performed through your account.",
      icon:
        "account",
    },
    {
      title:
        "Your workspaces",
      description:
        "Workspace owners and administrators are responsible for membership, permissions, shared records, and authorized use.",
      icon:
        "workspace",
    },
    {
      title:
        "Your subscription",
      description:
        "Paid features, billing cycles, usage limits, renewals, and cancellations depend on the selected subscription plan.",
      icon:
        "subscription",
    },
    {
      title:
        "Your financial decisions",
      description:
        "CASE Budget provides organizational and educational tools, not individualized financial, tax, legal, or investment advice.",
      icon:
        "finance",
    },
  ];

export default function TermsOfServicePage() {
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
              Terms and usage
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Terms of Service
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
              These Terms of Service
              govern your access to and
              use of CASE Budget,
              including accounts,
              workspaces, subscriptions,
              financial-planning tools,
              integrations, and related
              services provided by
              XilAire Technologies.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PolicyBadge
                label="Current terms"
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
            aria-label="Terms of Service sections"
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4"
          >
            <p className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              On this page
            </p>

            <div className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto pr-1">
              {termsSections.map(
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
              <DocumentIcon />
            </div>

            <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
              Questions about these
              terms?
            </p>

            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              Contact XilAire
              Technologies regarding
              legal, contractual, or
              subscription questions.
            </p>

            <a
              href="mailto:legal@xilairetechnologies.com"
              className="mt-4 inline-flex break-all text-xs font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              legal@xilairetechnologies.com
            </a>
          </div>
        </aside>

        <article className="min-w-0 space-y-8">
          <TermsIntroduction />

          <PolicySection
            id="agreement"
            number="1"
            title="Agreement to these Terms"
          >
            <p>
              By accessing, registering
              for, subscribing to, or
              using CASE Budget, you
              agree to these Terms of
              Service and any policies
              incorporated by reference.
            </p>

            <p>
              If you do not agree to
              these Terms, you must not
              access or use CASE Budget.
            </p>

            <p>
              If you use CASE Budget on
              behalf of a business,
              household, organization,
              or other entity, you
              represent that you have
              authority to accept these
              Terms on its behalf.
            </p>

            <PolicyNotice
              title="Important agreement"
              description="These Terms create a binding agreement between you and XilAire Technologies regarding your use of CASE Budget."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="eligibility"
            number="2"
            title="Eligibility"
          >
            <p>
              You may use CASE Budget
              only if you can legally
              enter into a binding
              agreement and are not
              prohibited from using the
              service under applicable
              law.
            </p>

            <PolicyList
              items={[
                "You must be at least 18 years old or the age of legal majority in your jurisdiction.",
                "You must provide accurate and complete registration information.",
                "You must use CASE Budget only for lawful purposes.",
                "You must not use CASE Budget if your account has been permanently suspended unless XilAire Technologies authorizes renewed access.",
                "Business or organization users must have authority to act for the relevant entity.",
              ]}
            />

            <p>
              CASE Budget is not intended
              for children under 13.
            </p>
          </PolicySection>

          <PolicySection
            id="accounts"
            number="3"
            title="Accounts and account security"
          >
            <p>
              Certain CASE Budget
              features require a user
              account. You are
              responsible for maintaining
              accurate account
              information and protecting
              your credentials.
            </p>

            <PolicyList
              items={[
                "Maintain a valid email address associated with your account.",
                "Use a strong and unique password.",
                "Protect password-reset links, authentication codes, and multi-factor authentication information.",
                "Do not share your account with unauthorized users.",
                "Notify XilAire Technologies promptly if you suspect unauthorized access.",
                "Keep profile and billing information current.",
                "Accept responsibility for activity performed through your account unless caused by XilAire Technologies.",
              ]}
            />

            <PolicySubsection
              title="Multi-factor authentication"
            >
              <p>
                CASE Budget may offer or
                require multi-factor
                authentication for
                certain accounts,
                privileged roles, or
                sensitive actions.
              </p>

              <p>
                You are responsible for
                maintaining access to
                enrolled authentication
                methods and securely
                storing any recovery
                information.
              </p>
            </PolicySubsection>

            <PolicyNotice
              title="Account sharing is restricted"
              description="Each person should use an individual CASE Budget account. Shared financial access should be provided through workspace membership and permissions."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="workspaces"
            number="4"
            title="Workspaces and collaboration"
          >
            <p>
              CASE Budget may provide
              personal, household,
              business, and organization
              workspaces. Workspace
              access and permissions
              depend on assigned roles.
            </p>

            <PolicySubsection
              title="Workspace owners"
            >
              <PolicyList
                items={[
                  "Manage workspace settings and membership.",
                  "Assign or remove roles and permissions.",
                  "Control eligible workspace deletion and ownership transfer.",
                  "Maintain responsibility for authorized use of the workspace.",
                  "Ensure members have permission to access information placed in the workspace.",
                ]}
              />
            </PolicySubsection>

            <PolicySubsection
              title="Workspace administrators"
            >
              <PolicyList
                items={[
                  "May manage eligible workspace features and members.",
                  "Must act within the authority granted by the workspace owner.",
                  "Must not use administrative access for unauthorized personal purposes.",
                ]}
              />
            </PolicySubsection>

            <PolicySubsection
              title="Members and viewers"
            >
              <PolicyList
                items={[
                  "May access information based on their assigned role.",
                  "Must protect shared financial and personal information.",
                  "Must not export, disclose, or misuse workspace information without authorization.",
                ]}
              />
            </PolicySubsection>

            <PolicyNotice
              title="Shared workspace visibility"
              description="Information entered into a shared workspace may be visible to other authorized workspace members."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="subscriptions"
            number="5"
            title="Subscriptions and feature access"
          >
            <p>
              CASE Budget may offer free
              and paid subscription
              plans. Plans may differ by
              feature access, workspace
              limits, member limits,
              connected accounts,
              reporting capabilities,
              support options, storage,
              and other usage limits.
            </p>

            <PolicyList
              items={[
                "Feature access depends on the active subscription assigned to the relevant account or workspace.",
                "Features unavailable under a plan may be hidden, disabled, or restricted.",
                "Subscription limits may apply to members, workspaces, transactions, accounts, reports, integrations, or other resources.",
                "Plan features and limits may change with reasonable notice.",
                "Promotional, trial, beta, or discounted plans may have additional terms.",
                "Organization subscriptions may be governed by a separate order form or agreement.",
              ]}
            />

            <PolicySubsection
              title="Trials"
            >
              <p>
                A trial may automatically
                expire or convert to a
                paid subscription if
                disclosed during
                enrollment. You are
                responsible for
                canceling before the
                stated conversion date
                when you do not want a
                paid plan.
              </p>
            </PolicySubsection>

            <PolicyNotice
              title="Subscription access may change"
              description="Downgrading, canceling, or failing to pay may cause paid features to become unavailable while stored data remains subject to applicable retention rules."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="payments"
            number="6"
            title="Payments, renewals, and refunds"
          >
            <p>
              Paid subscriptions may be
              processed through an
              approved third-party
              payment provider.
            </p>

            <PolicyList
              items={[
                "You authorize charges for the selected plan, billing cycle, taxes, and disclosed fees.",
                "Subscriptions may renew automatically until canceled.",
                "You must maintain a valid payment method when required.",
                "Failed payments may result in retries, restricted access, downgrade, suspension, or cancellation.",
                "Prices may change with reasonable advance notice.",
                "Taxes may be charged based on billing information and applicable law.",
                "Payment-provider terms may also apply.",
              ]}
            />

            <PolicySubsection
              title="Cancellation"
            >
              <p>
                Cancellation generally
                stops future renewal but
                does not necessarily
                provide a refund for the
                current billing period.
              </p>
            </PolicySubsection>

            <PolicySubsection
              title="Refunds"
            >
              <p>
                Unless required by law
                or stated in a separate
                refund policy, fees are
                generally nonrefundable
                after a paid billing
                period begins.
              </p>
            </PolicySubsection>

            <PolicyNotice
              title="Deleting an account does not automatically resolve billing"
              description="Cancel active subscriptions and review outstanding charges before requesting account or workspace deletion."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="acceptable-use"
            number="7"
            title="Acceptable use"
          >
            <p>
              You must use CASE Budget
              lawfully and in a manner
              that does not harm users,
              XilAire Technologies,
              service providers, or the
              platform.
            </p>

            <PolicyList
              items={[
                "Do not access another user's account or workspace without authorization.",
                "Do not attempt to bypass subscriptions, permissions, MFA, security controls, or usage limits.",
                "Do not probe, scan, test, attack, or disrupt CASE Budget systems without written authorization.",
                "Do not upload malware, malicious code, or harmful content.",
                "Do not use automated tools to overload, scrape, or interfere with the service.",
                "Do not impersonate another person or misrepresent your authority.",
                "Do not use CASE Budget for fraud, money laundering, theft, unlawful surveillance, or other illegal activity.",
                "Do not upload information you are not authorized to possess or share.",
                "Do not reverse engineer protected portions of CASE Budget except where such restriction is prohibited by law.",
                "Do not resell or commercially exploit CASE Budget without written authorization.",
              ]}
            />

            <p>
              Additional restrictions
              may appear in the{" "}
              <Link
                href="/legal/acceptable-use"
                className="font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Acceptable Use Policy
              </Link>
              .
            </p>
          </PolicySection>

          <PolicySection
            id="financial-tools"
            number="8"
            title="Financial-planning tools and information"
          >
            <p>
              CASE Budget provides tools
              for organizing financial
              information, building
              budgets, tracking
              transactions, monitoring
              bills, planning savings,
              reviewing debt, and
              estimating financial
              progress.
            </p>

            <PolicyList
              items={[
                "Calculations depend on information entered or imported into CASE Budget.",
                "Reports, forecasts, projections, and estimates may be incomplete or inaccurate.",
                "Automatic categorization may require review and correction.",
                "Balances and transactions may be delayed or unavailable.",
                "Financial outcomes are not guaranteed.",
                "CASE Budget does not independently verify all user-entered or imported information.",
              ]}
            />

            <PolicyNotice
              title="Not professional advice"
              description="CASE Budget does not provide individualized financial, investment, legal, accounting, tax, credit, insurance, or banking advice."
              tone="danger"
            />

            <p>
              You remain responsible for
              reviewing information and
              making your own financial
              decisions. Consult a
              qualified professional when
              appropriate.
            </p>
          </PolicySection>

          <PolicySection
            id="connected-services"
            number="9"
            title="Connected accounts and third-party services"
          >
            <p>
              CASE Budget may connect to
              financial institutions,
              payment providers, email
              services, analytics tools,
              authentication providers,
              and other third-party
              services.
            </p>

            <PolicyList
              items={[
                "Third-party services may require separate terms, privacy policies, and consent.",
                "CASE Budget does not control every third-party service.",
                "Connections may be delayed, interrupted, unavailable, or inaccurate.",
                "You authorize CASE Budget and approved providers to access and process information needed for the requested integration.",
                "You may need to reconnect or reauthorize expired connections.",
                "Disconnecting a service may stop future synchronization without deleting previously imported data.",
                "You remain responsible for complying with the terms of connected providers and financial institutions.",
              ]}
            />

            <PolicyNotice
              title="CASE Budget is not your financial institution"
              description="Connecting an account does not give CASE Budget ownership or control over funds held by a bank, broker, lender, or other financial provider."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="content"
            number="10"
            title="User content and financial records"
          >
            <p>
              You retain ownership of
              information and content you
              submit to CASE Budget,
              subject to these Terms and
              any rights held by other
              workspace members or
              organizations.
            </p>

            <p>
              You grant XilAire
              Technologies a limited
              right to host, process,
              transmit, display, copy,
              back up, and otherwise use
              your content as necessary
              to provide, protect,
              support, and improve CASE
              Budget.
            </p>

            <PolicyList
              items={[
                "You must have authority to submit and share the information.",
                "Your content must not violate law or third-party rights.",
                "Shared workspace content may remain available to authorized workspace members.",
                "Organization-controlled content may be managed according to the organization's instructions.",
                "XilAire Technologies may remove content that violates these Terms or creates security or legal risk.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="intellectual-property"
            number="11"
            title="Intellectual property"
          >
            <p>
              CASE Budget, including its
              software, design, branding,
              documentation, interface,
              features, and original
              content, is owned by
              XilAire Technologies or its
              licensors and is protected
              by applicable intellectual
              property laws.
            </p>

            <PolicyList
              items={[
                "You receive a limited, nonexclusive, nontransferable, revocable right to use CASE Budget under these Terms.",
                "You may not copy, modify, distribute, sell, lease, sublicense, or create unauthorized derivative works from CASE Budget.",
                "You may not remove copyright, trademark, or proprietary notices.",
                "Open-source software remains governed by its applicable licenses.",
                "Feedback may be used by XilAire Technologies without restriction or compensation, unless prohibited by law.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="privacy"
            number="12"
            title="Privacy and data protection"
          >
            <p>
              Our collection and use of
              personal information is
              described in the{" "}
              <Link
                href="/legal/privacy"
                className="font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Privacy Policy
              </Link>
              .
            </p>

            <p>
              Additional information
              appears in the{" "}
              <Link
                href="/legal/cookies"
                className="font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Cookie Policy
              </Link>
              ,{" "}
              <Link
                href="/legal/security"
                className="font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Security Practices
              </Link>
              , and{" "}
              <Link
                href="/legal/data-deletion"
                className="font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Data Deletion
              </Link>{" "}
              pages.
            </p>
          </PolicySection>

          <PolicySection
            id="availability"
            number="13"
            title="Service availability and changes"
          >
            <p>
              CASE Budget may change,
              suspend, limit, or
              discontinue features,
              integrations, plans, or
              services.
            </p>

            <PolicyList
              items={[
                "Scheduled maintenance may temporarily interrupt access.",
                "Unexpected outages, provider failures, security incidents, or internet disruptions may affect availability.",
                "Beta and preview features may change or be discontinued without notice.",
                "Features may differ by plan, region, device, account type, or workspace type.",
                "XilAire Technologies may impose reasonable limits to protect reliability and security.",
                "We do not guarantee uninterrupted, error-free, or permanent availability.",
              ]}
            />

            <p>
              We may provide advance
              notice of material changes
              when reasonably practical.
            </p>
          </PolicySection>

          <PolicySection
            id="termination"
            number="14"
            title="Suspension and termination"
          >
            <p>
              You may stop using CASE
              Budget and cancel eligible
              subscriptions subject to
              these Terms.
            </p>

            <p>
              XilAire Technologies may
              restrict, suspend, or
              terminate access when
              reasonably necessary.
            </p>

            <PolicyList
              items={[
                "Violation of these Terms or related policies.",
                "Fraudulent, abusive, harmful, or unlawful activity.",
                "Unauthorized access or attempted security circumvention.",
                "Failure to pay required fees.",
                "Risk to users, data, infrastructure, or service providers.",
                "Legal, regulatory, or contractual requirements.",
                "Extended inactivity where permitted and reasonably disclosed.",
                "Discontinuation of CASE Budget or a material service component.",
              ]}
            />

            <p>
              After termination, some
              provisions remain effective,
              including intellectual
              property, disclaimers,
              liability limits,
              indemnification, dispute
              provisions, and obligations
              that by their nature should
              survive.
            </p>
          </PolicySection>

          <PolicySection
            id="disclaimers"
            number="15"
            title="Disclaimers"
          >
            <p>
              To the fullest extent
              permitted by law, CASE
              Budget is provided on an
              &quot;as is&quot; and
              &quot;as available&quot;
              basis.
            </p>

            <PolicyList
              items={[
                "XilAire Technologies does not guarantee that CASE Budget will always be available, secure, accurate, complete, or error-free.",
                "Financial calculations, projections, categorizations, and reports may contain errors or omissions.",
                "Third-party data may be delayed, incomplete, unavailable, or inaccurate.",
                "CASE Budget does not guarantee savings, debt reduction, investment performance, credit improvement, tax results, or other financial outcomes.",
                "You are responsible for independently reviewing important financial information.",
              ]}
            />

            <PolicyNotice
              title="Review important records independently"
              description="Do not rely on CASE Budget as the sole source for payment deadlines, account balances, tax filings, investment decisions, or legally required records."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="liability"
            number="16"
            title="Limitation of liability"
          >
            <p>
              To the fullest extent
              permitted by law, XilAire
              Technologies and its
              affiliates, officers,
              employees, contractors,
              licensors, and service
              providers will not be
              liable for indirect,
              incidental, special,
              consequential, exemplary,
              or punitive damages.
            </p>

            <PolicyList
              items={[
                "Loss of profits, revenue, business, savings, opportunities, or goodwill.",
                "Loss, corruption, or unavailability of data.",
                "Missed payments, fees, penalties, interest, or financial losses.",
                "Decisions made using inaccurate or incomplete information.",
                "Unauthorized account access not caused by XilAire Technologies.",
                "Third-party service failures, financial institution errors, or internet disruptions.",
              ]}
            />

            <p>
              Where liability cannot be
              excluded, aggregate
              liability will be limited
              to the greater of the
              amount you paid for CASE
              Budget during the twelve
              months preceding the claim
              or one hundred U.S.
              dollars, unless applicable
              law requires otherwise.
            </p>
          </PolicySection>

          <PolicySection
            id="indemnification"
            number="17"
            title="Indemnification"
          >
            <p>
              To the extent permitted by
              law, you agree to defend,
              indemnify, and hold
              harmless XilAire
              Technologies and its
              affiliates from claims,
              damages, losses,
              liabilities, costs, and
              expenses arising from:
            </p>

            <PolicyList
              items={[
                "Your violation of these Terms.",
                "Your unlawful or unauthorized use of CASE Budget.",
                "Your content or financial records.",
                "Your violation of another person's rights.",
                "Your management of a shared workspace.",
                "Activity performed through your account when caused by your failure to protect credentials.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="disputes"
            number="18"
            title="Governing law and disputes"
          >
            <p>
              These Terms are governed by
              the laws of the State of
              Florida, without regard to
              conflict-of-law rules,
              unless another law must
              apply.
            </p>

            <p>
              Before filing a formal
              legal claim, you agree to
              contact XilAire
              Technologies and attempt
              to resolve the matter
              informally for at least
              thirty days.
            </p>

            <p>
              Unless prohibited by law or
              governed by a separate
              written agreement, disputes
              may be brought in the state
              or federal courts located
              in Palm Beach County,
              Florida.
            </p>

            <PolicyNotice
              title="Organization agreements"
              description="A separate signed agreement, order form, or enterprise contract may contain different governing-law, dispute, service-level, payment, or liability provisions."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="changes"
            number="19"
            title="Changes to these Terms"
          >
            <p>
              XilAire Technologies may
              update these Terms when
              CASE Budget features,
              subscriptions, legal
              requirements, business
              operations, or security
              practices change.
            </p>

            <p>
              Updated Terms will display
              a new last-updated date.
              Material changes may also
              be communicated through
              CASE Budget, email, or
              another appropriate method.
            </p>

            <p>
              Continued use after the
              effective date of updated
              Terms constitutes
              acceptance where permitted
              by law.
            </p>
          </PolicySection>

          <PolicySection
            id="contact"
            number="20"
            title="Contact us"
          >
            <p>
              Questions about these
              Terms may be directed to
              XilAire Technologies.
            </p>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                  <EmailIcon />
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-[var(--text-primary)]">
                    XilAire Technologies
                  </p>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Legal and
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

function TermsIntroduction() {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--primary)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--surface-default))] p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
          <DocumentCheckIcon />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Understand your agreement
          </h2>

          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            These Terms explain your
            responsibilities, the
            services CASE Budget
            provides, subscription and
            workspace rules, important
            financial disclaimers, and
            limits that apply when using
            the platform.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {termsSummaryCards.map(
          (
            card,
          ) => (
            <TermsSummary
              key={
                card.title
              }
              card={
                card
              }
            />
          ),
        )}
      </div>
    </section>
  );
}

type TermsSummaryProps = {
  card: TermsSummaryCard;
};

function TermsSummary({
  card,
}: TermsSummaryProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <TermsSummaryIcon
          icon={
            card.icon
          }
        />
      </div>

      <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {card.title}
      </p>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {card.description}
      </p>
    </div>
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
            <AlertIcon />
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
        href="/legal/data-deletion"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Previous
        </p>

        <div className="mt-3 flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <ArrowLeftIcon />

          Data Deletion
        </div>
      </Link>

      <Link
        href="/legal/acceptable-use"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 text-right outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Next
        </p>

        <div className="mt-3 flex items-center justify-end gap-2 font-bold text-[var(--text-primary)]">
          Acceptable Use

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
          aria-label="Terms navigation"
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

type TermsSummaryIconProps = {
  icon:
    TermsSummaryCard["icon"];
};

function TermsSummaryIcon({
  icon,
}: TermsSummaryIconProps) {
  switch (icon) {
    case "workspace":
      return (
        <WorkspaceIcon />
      );

    case "subscription":
      return (
        <CardIcon />
      );

    case "finance":
      return (
        <ChartIcon />
      );

    case "account":
    default:
      return (
        <UserIcon />
      );
  }
}

function DocumentCheckIcon() {
  return (
    <svg
      width="22"
      height="22"
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
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

function DocumentIcon() {
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
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function UserIcon() {
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
      <circle
        cx="12"
        cy="8"
        r="4"
      />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function WorkspaceIcon() {
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
        y="4"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M8 4v16" />
      <path d="M8 10h13" />
    </svg>
  );
}

function CardIcon() {
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
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function ChartIcon() {
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
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
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

function AlertIcon() {
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