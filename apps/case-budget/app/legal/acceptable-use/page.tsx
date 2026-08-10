import type {
  Metadata,
} from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Acceptable Use Policy | CASE Budget",
  description:
    "Review the permitted and prohibited uses of CASE Budget accounts, workspaces, financial tools, integrations, and platform services.",
};

const LAST_UPDATED =
  "August 2, 2026";

const policySections = [
  {
    href: "#purpose",
    label: "Purpose",
  },
  {
    href: "#permitted-use",
    label: "Permitted use",
  },
  {
    href: "#account-security",
    label: "Account security",
  },
  {
    href: "#unauthorized-access",
    label: "Unauthorized access",
  },
  {
    href: "#illegal-activity",
    label: "Illegal activity",
  },
  {
    href: "#financial-abuse",
    label: "Financial abuse",
  },
  {
    href: "#harmful-content",
    label: "Harmful content",
  },
  {
    href: "#platform-abuse",
    label: "Platform abuse",
  },
  {
    href: "#automated-use",
    label: "Automated use",
  },
  {
    href: "#connected-services",
    label: "Connected services",
  },
  {
    href: "#financial-data",
    label: "Financial data",
  },
  {
    href: "#artificial-intelligence",
    label: "AI features",
  },
  {
    href: "#intellectual-property",
    label: "Intellectual property",
  },
  {
    href: "#workspace-responsibility",
    label: "Workspace responsibility",
  },
  {
    href: "#reporting",
    label: "Reporting violations",
  },
  {
    href: "#enforcement",
    label: "Enforcement",
  },
  {
    href: "#changes",
    label: "Policy changes",
  },
  {
    href: "#contact",
    label: "Contact",
  },
];

type PermittedUseCard = {
  title: string;
  description: string;
  icon:
    | "budget"
    | "household"
    | "business"
    | "analytics";
};

const permittedUseCards:
  PermittedUseCard[] = [
    {
      title:
        "Personal financial planning",
      description:
        "Create budgets, track income and expenses, manage bills, monitor savings goals, review debts, and organize financial records.",
      icon:
        "budget",
    },
    {
      title:
        "Household collaboration",
      description:
        "Share authorized financial-planning information with family or household members through supported workspace permissions.",
      icon:
        "household",
    },
    {
      title:
        "Business organization",
      description:
        "Use eligible business workspaces to organize authorized budgets, expenses, accounts, reports, and financial-planning information.",
      icon:
        "business",
    },
    {
      title:
        "Financial analysis",
      description:
        "Use reports, projections, summaries, and educational tools to better understand financial activity and planning progress.",
      icon:
        "analytics",
    },
  ];

type EnforcementAction = {
  title: string;
  description: string;
  icon:
    | "notice"
    | "restriction"
    | "suspension"
    | "termination";
};

const enforcementActions:
  EnforcementAction[] = [
    {
      title:
        "Warning or notice",
      description:
        "We may notify you about suspected misuse and require corrective action.",
      icon:
        "notice",
    },
    {
      title:
        "Feature restriction",
      description:
        "Specific functions, integrations, workspaces, or administrative actions may be limited.",
      icon:
        "restriction",
    },
    {
      title:
        "Account suspension",
      description:
        "Access may be temporarily suspended while a violation or security concern is reviewed.",
      icon:
        "suspension",
    },
    {
      title:
        "Account termination",
      description:
        "Serious, repeated, unlawful, or harmful conduct may result in permanent termination.",
      icon:
        "termination",
    },
  ];

export default function AcceptableUsePolicyPage() {
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
              Acceptable Use Policy
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
              This Acceptable Use Policy
              explains how CASE Budget may be
              used and identifies activities
              that are prohibited because they
              could harm users, financial
              institutions, service providers,
              XilAire Technologies, or the
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
            aria-label="Acceptable Use Policy sections"
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4"
          >
            <p className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              On this page
            </p>

            <div className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto pr-1">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]">
              <ShieldAlertIcon />
            </div>

            <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
              Report misuse
            </p>

            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              Report suspected fraud,
              unauthorized access, abuse,
              or security concerns to
              XilAire Technologies.
            </p>

            <a
              href="mailto:abuse@xilairetechnologies.com?subject=CASE%20Budget%20Acceptable%20Use%20Report"
              className="mt-4 inline-flex break-all text-xs font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              abuse@xilairetechnologies.com
            </a>
          </div>
        </aside>

        <article className="min-w-0 space-y-8">
          <AcceptableUseIntroduction />

          <PolicySection
            id="purpose"
            number="1"
            title="Purpose"
          >
            <p>
              CASE Budget is intended to help
              individuals, households,
              businesses, and organizations
              organize authorized financial
              information and make informed
              financial-planning decisions.
            </p>

            <p>
              This policy is intended to protect:
            </p>

            <PolicyList
              items={[
                "CASE Budget users and workspace members.",
                "Personal and financial information stored within the platform.",
                "XilAire Technologies systems, employees, contractors, and service providers.",
                "Financial institutions and connected-data providers.",
                "The availability, integrity, security, and reputation of CASE Budget.",
              ]}
            />

            <PolicyNotice
              title="Related policies"
              description="This policy forms part of the CASE Budget Terms of Service and should be read together with the Privacy Policy, Security Practices, and other Legal Center documents."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="permitted-use"
            number="2"
            title="Permitted use"
          >
            <p>
              You may use CASE Budget for lawful,
              authorized, and legitimate
              financial-management purposes
              supported by your subscription,
              workspace permissions, and account
              role.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {permittedUseCards.map(
                (
                  card,
                ) => (
                  <PermittedUseCard
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

            <PolicyList
              items={[
                "Create and manage personal or authorized shared budgets.",
                "Record income, expenses, transactions, bills, savings goals, debts, assets, investments, and net-worth information.",
                "Import supported financial information from accounts you are authorized to access.",
                "Invite authorized users to supported household, business, or organization workspaces.",
                "Generate reports, projections, summaries, and other permitted financial-planning materials.",
                "Use administrative tools only within the permissions assigned to your account.",
                "Contact customer support for legitimate account, subscription, security, and technical assistance.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="account-security"
            number="3"
            title="Account and credential security"
          >
            <p>
              You must protect your CASE Budget
              credentials and use account-access
              features responsibly.
            </p>

            <PolicyList
              items={[
                "Use an individual account for each person accessing CASE Budget.",
                "Maintain a strong and unique password.",
                "Enable multi-factor authentication when available or required.",
                "Protect recovery links, authentication codes, session information, and security keys.",
                "Keep your email account and devices secure.",
                "Promptly revoke access for former household, business, or organization members.",
                "Notify XilAire Technologies if you suspect account compromise.",
              ]}
            />

            <PolicySubsection
              title="Credential sharing"
            >
              <p>
                You may not share passwords,
                authentication cookies, recovery
                links, MFA codes, security keys,
                or other private authentication
                information with another person.
              </p>

              <p>
                Shared access must be provided
                through supported workspace
                invitations and role-based
                permissions.
              </p>
            </PolicySubsection>

            <PolicyNotice
              title="You are responsible for your account"
              description="You are responsible for activity performed through your account when caused by your failure to protect credentials or remove unauthorized access."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="unauthorized-access"
            number="4"
            title="Unauthorized access and security interference"
          >
            <p>
              You must not attempt to access
              accounts, workspaces, systems,
              records, features, APIs, or
              infrastructure without
              authorization.
            </p>

            <PolicyList
              items={[
                "Access or attempt to access another user's account without permission.",
                "View, modify, export, delete, or disclose records outside your authorized workspace access.",
                "Bypass authentication, MFA, role checks, Row Level Security, or workspace permissions.",
                "Use stolen, leaked, guessed, or otherwise unauthorized credentials.",
                "Intercept authentication cookies, tokens, recovery links, or session data.",
                "Escalate your privileges or assign yourself an unauthorized role.",
                "Attempt to gain support-admin, platform-admin, or master-admin access without authorization.",
                "Probe, scan, test, or exploit CASE Budget systems without written permission.",
                "Circumvent rate limits, subscription controls, feature restrictions, or usage limits.",
                "Interfere with logging, monitoring, audit records, or security controls.",
              ]}
            />

            <PolicyNotice
              title="Security research requires written authorization"
              description="Do not perform vulnerability testing, penetration testing, automated scanning, or exploit research against CASE Budget without prior written authorization from XilAire Technologies."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="illegal-activity"
            number="5"
            title="Illegal, deceptive, or fraudulent activity"
          >
            <p>
              CASE Budget must not be used to
              facilitate, conceal, promote, or
              support unlawful, fraudulent, or
              deceptive activity.
            </p>

            <PolicyList
              items={[
                "Fraud, theft, identity theft, forgery, or false representation.",
                "Money laundering, sanctions evasion, terrorist financing, or unlawful movement of funds.",
                "Tax evasion, falsification of financial records, or concealment of legally required information.",
                "Creating fake financial institutions, lenders, investment services, charities, or payment services.",
                "Operating phishing, impersonation, credential-harvesting, or social-engineering schemes.",
                "Creating misleading financial statements, account histories, invoices, receipts, or reports for unlawful purposes.",
                "Using stolen bank, payment, identity, employment, tax, or credit information.",
                "Participating in unlawful gambling, illegal lending, or prohibited financial services.",
                "Misrepresenting ownership, authority, income, assets, liabilities, or credit information.",
              ]}
            />

            <p>
              We may preserve and disclose
              information when legally required
              to investigate suspected unlawful
              activity or respond to valid legal
              process.
            </p>
          </PolicySection>

          <PolicySection
            id="financial-abuse"
            number="6"
            title="Financial scams and abusive financial activity"
          >
            <p>
              You may not use CASE Budget to
              create, support, operate, or
              promote fraudulent or abusive
              financial schemes.
            </p>

            <PolicyList
              items={[
                "Investment scams, Ponzi schemes, pyramid schemes, or false profit guarantees.",
                "Fake loans, advance-fee schemes, predatory lending, or unauthorized debt collection.",
                "Cryptocurrency, token, foreign-exchange, or trading scams.",
                "False fundraising, donation, crowdfunding, or charity campaigns.",
                "Deceptive credit-repair, debt-relief, insurance, tax, or financial-advice services.",
                "Manipulation or fabrication of financial reports to mislead investors, lenders, employers, governments, or other parties.",
                "Unauthorized pooling, custody, transfer, or management of another person's funds.",
                "Use of CASE Budget to conceal stolen funds, criminal proceeds, or unauthorized transactions.",
              ]}
            />

            <PolicyNotice
              title="CASE Budget is not a payment or custody service"
              description="Unless a future feature expressly states otherwise, CASE Budget does not hold customer funds, provide custody, execute trades, originate loans, or transfer money."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="harmful-content"
            number="7"
            title="Harmful, abusive, or prohibited content"
          >
            <p>
              You must not upload, store, share,
              or transmit content that is
              unlawful, harmful, threatening,
              exploitative, or abusive.
            </p>

            <PolicyList
              items={[
                "Content that threatens, harasses, intimidates, stalks, or targets another person.",
                "Content promoting hatred, violence, or discrimination against protected groups.",
                "Content supporting terrorism, violent extremism, or criminal organizations.",
                "Child sexual abuse material, child exploitation, or content that endangers minors.",
                "Non-consensual intimate content, sexual exploitation, trafficking, or coercion.",
                "Malware, ransomware, spyware, viruses, destructive code, or malicious attachments.",
                "Phishing pages, credential-harvesting forms, or deceptive account notices.",
                "Private or sensitive information disclosed without authorization.",
                "Content that infringes copyright, trademark, privacy, publicity, or other legal rights.",
              ]}
            />

            <p>
              Financial notes, descriptions,
              attachments, workspace names, and
              support submissions are all
              subject to this policy.
            </p>
          </PolicySection>

          <PolicySection
            id="platform-abuse"
            number="8"
            title="Platform abuse and disruption"
          >
            <p>
              You must not interfere with the
              availability, integrity,
              performance, or normal operation of
              CASE Budget.
            </p>

            <PolicyList
              items={[
                "Overload, flood, disrupt, degrade, or disable the platform.",
                "Send excessive requests or intentionally trigger costly operations.",
                "Exploit bugs, race conditions, configuration errors, or unintended feature behavior.",
                "Upload files or data designed to exhaust storage, memory, processing, or bandwidth.",
                "Interfere with another user's access or workspace operations.",
                "Create excessive accounts, workspaces, records, or subscriptions to avoid limits.",
                "Use CASE Budget to distribute spam, bulk unsolicited messages, or abusive invitations.",
                "Attempt to remove, modify, obscure, or disable security, copyright, or attribution notices.",
                "Use the service in a way that creates unreasonable operational, legal, or security risk.",
              ]}
            />

            <PolicyNotice
              title="Fair use of shared resources"
              description="CASE Budget may enforce reasonable technical and usage limits to protect performance, reliability, and access for all users."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="automated-use"
            number="9"
            title="Automated access, scraping, and API use"
          >
            <p>
              Automated use is permitted only
              through approved features,
              documented APIs, authorized
              integrations, or written
              permission from XilAire
              Technologies.
            </p>

            <PolicyList
              items={[
                "Do not scrape pages, records, reports, or user information without authorization.",
                "Do not use bots, crawlers, scripts, or browser automation to bypass normal controls.",
                "Do not reverse engineer private APIs or undocumented application behavior.",
                "Do not collect user information for advertising, profiling, resale, or unauthorized analytics.",
                "Do not automate account creation, invitations, support requests, or subscription actions for abusive purposes.",
                "Do not use multiple accounts, IP addresses, devices, or identities to evade limits.",
                "Do not interfere with API authentication, signatures, request validation, or rate limits.",
              ]}
            />

            <PolicySubsection
              title="Approved integrations"
            >
              <p>
                Approved integrations must use
                authorized credentials, follow
                documented limits, protect
                customer information, and stop
                accessing data when authorization
                is revoked.
              </p>
            </PolicySubsection>
          </PolicySection>

          <PolicySection
            id="connected-services"
            number="10"
            title="Connected financial institutions and services"
          >
            <p>
              You may connect only accounts,
              institutions, and services that
              you are legally authorized to
              access.
            </p>

            <PolicyList
              items={[
                "Do not connect another person's financial account without authorization.",
                "Do not use stolen or improperly obtained bank credentials.",
                "Do not impersonate an account holder or institution representative.",
                "Do not interfere with a financial institution's authentication or security controls.",
                "Do not repeatedly reconnect accounts to evade provider limits or access restrictions.",
                "Do not use imported information for identity theft, fraud, harassment, or unauthorized surveillance.",
                "Comply with the terms and policies of connected financial institutions and service providers.",
                "Disconnect integrations when your authorization ends.",
              ]}
            />

            <PolicyNotice
              title="Authorization is required"
              description="Your ability to view an account does not always mean you are authorized to import, share, or manage that account's information."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="financial-data"
            number="11"
            title="Financial data requirements"
          >
            <p>
              Information entered, imported, or
              shared through CASE Budget must be
              lawfully obtained and used.
            </p>

            <PolicyList
              items={[
                "Enter information accurately when it may affect other users or business records.",
                "Do not knowingly fabricate balances, transactions, income, expenses, debts, assets, invoices, or reports for deceptive purposes.",
                "Do not upload stolen financial records or identity information.",
                "Do not disclose account numbers, tax records, payroll information, or sensitive documents without authorization.",
                "Do not use financial information to harass, discriminate against, exploit, or harm another person.",
                "Apply appropriate workspace permissions before sharing sensitive records.",
                "Remove or correct information when you no longer have authority to store or share it.",
              ]}
            />

            <PolicySubsection
              title="Business and organization records"
            >
              <p>
                Business and organization users
                are responsible for ensuring
                that information uploaded to CASE
                Budget complies with their own
                legal, regulatory, contractual,
                accounting, employment, and
                privacy obligations.
              </p>
            </PolicySubsection>
          </PolicySection>

          <PolicySection
            id="artificial-intelligence"
            number="12"
            title="Artificial intelligence features"
          >
            <p>
              CASE Budget may introduce
              AI-assisted categorization,
              summaries, recommendations,
              explanations, forecasts, or other
              automated features.
            </p>

            <PolicyList
              items={[
                "Use AI features only for lawful and authorized purposes.",
                "Review AI-generated outputs before relying on them.",
                "Do not submit passwords, MFA codes, secret keys, or unnecessary sensitive information to AI features.",
                "Do not attempt to use prompt injection or other techniques to access system instructions, private data, or restricted tools.",
                "Do not use AI features to generate fraud, phishing, malware, scams, harassment, or prohibited content.",
                "Do not attempt to bypass safety controls, rate limits, permissions, or subscription restrictions.",
                "Do not represent AI-generated financial information as guaranteed, verified, or professional advice.",
                "Do not use AI outputs to make decisions about another person without appropriate authority and human review.",
              ]}
            />

            <PolicyNotice
              title="AI output may be incorrect"
              description="AI-generated classifications, explanations, and recommendations may be incomplete, inaccurate, outdated, or inappropriate for your circumstances."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="intellectual-property"
            number="13"
            title="Intellectual property and proprietary rights"
          >
            <p>
              You must respect the intellectual
              property and proprietary rights of
              XilAire Technologies, CASE Budget
              users, licensors, and third
              parties.
            </p>

            <PolicyList
              items={[
                "Do not copy, distribute, resell, sublicense, or commercially exploit CASE Budget without authorization.",
                "Do not remove copyright, trademark, branding, license, or attribution notices.",
                "Do not create confusingly similar CASE Budget websites, applications, or services.",
                "Do not use XilAire Technologies trademarks without permission.",
                "Do not upload content that infringes copyright, trademark, patent, trade-secret, privacy, or publicity rights.",
                "Do not reverse engineer, decompile, or attempt to extract protected source code except where such restrictions are prohibited by law.",
                "Open-source components remain governed by their applicable licenses.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="workspace-responsibility"
            number="14"
            title="Workspace owners and administrators"
          >
            <p>
              Workspace owners and
              administrators have additional
              responsibilities because they may
              control access to sensitive
              financial information.
            </p>

            <PolicyList
              items={[
                "Invite only authorized users.",
                "Assign the minimum permissions needed.",
                "Review members and roles regularly.",
                "Remove access promptly when employment, household membership, or authorization ends.",
                "Protect information belonging to other workspace members.",
                "Do not use administrative access for personal gain, harassment, retaliation, or unauthorized surveillance.",
                "Do not conceal administrative actions or manipulate audit information.",
                "Comply with applicable business, employment, privacy, and record-retention requirements.",
                "Respond appropriately to suspected compromise or misuse.",
              ]}
            />

            <PolicyNotice
              title="Workspace access creates responsibility"
              description="Owners and administrators may be responsible for misuse caused by knowingly granting inappropriate access or failing to remove unauthorized members."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="reporting"
            number="15"
            title="Reporting suspected violations"
          >
            <p>
              Report suspected violations,
              fraud, unauthorized access,
              harmful content, or abuse to
              XilAire Technologies.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <ReportStep
                number="1"
                title="Describe"
                description="Explain the suspected violation and the affected CASE Budget area."
              />

              <ReportStep
                number="2"
                title="Document"
                description="Provide relevant dates, account details, or screenshots with sensitive values removed."
              />

              <ReportStep
                number="3"
                title="Submit"
                description="Send the report to the abuse or security contact that best matches the issue."
              />
            </div>

            <PolicySubsection
              title="General abuse reports"
            >
              <a
                href="mailto:abuse@xilairetechnologies.com?subject=CASE%20Budget%20Acceptable%20Use%20Report"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
              >
                Email abuse team

                <EmailIcon />
              </a>
            </PolicySubsection>

            <PolicySubsection
              title="Security vulnerabilities or account compromise"
            >
              <a
                href="mailto:security@xilairetechnologies.com?subject=CASE%20Budget%20Security%20Report"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Email security team

                <ShieldIcon />
              </a>
            </PolicySubsection>

            <PolicyNotice
              title="Do not include secrets"
              description="Do not send passwords, MFA codes, session tokens, private keys, full payment details, or full financial account numbers in an initial report."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="enforcement"
            number="16"
            title="Investigation and enforcement"
          >
            <p>
              XilAire Technologies may
              investigate suspected violations
              and take reasonable action to
              protect users, service providers,
              financial institutions, and the
              platform.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {enforcementActions.map(
                (
                  action,
                ) => (
                  <EnforcementCard
                    key={
                      action.title
                    }
                    action={
                      action
                    }
                  />
                ),
              )}
            </div>

            <PolicyList
              items={[
                "Request additional information or identity verification.",
                "Remove or restrict prohibited content.",
                "Revoke sessions, integrations, API access, or workspace permissions.",
                "Limit features, connected accounts, invitations, or administrative actions.",
                "Suspend or terminate accounts and workspaces.",
                "Preserve evidence and audit records.",
                "Notify affected users, organizations, service providers, or financial institutions.",
                "Refer suspected unlawful activity to authorities when required or appropriate.",
                "Seek reimbursement or legal remedies for losses caused by prohibited conduct.",
              ]}
            />

            <p>
              Enforcement decisions may consider
              the severity, frequency, intent,
              impact, history, and legal risk of
              the conduct.
            </p>

            <PolicyNotice
              title="Immediate action may be required"
              description="We may act without advance notice when necessary to contain a security incident, protect users, comply with law, or prevent significant harm."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="changes"
            number="17"
            title="Changes to this policy"
          >
            <p>
              XilAire Technologies may update
              this Acceptable Use Policy as CASE
              Budget features, integrations,
              security risks, business
              operations, or legal requirements
              change.
            </p>

            <p>
              Updated versions will display a
              new last-updated date. Material
              changes may also be communicated
              through CASE Budget, email, or
              another appropriate method.
            </p>
          </PolicySection>

          <PolicySection
            id="contact"
            number="18"
            title="Contact us"
          >
            <p>
              Questions about this policy or
              reports of suspected misuse may be
              directed to XilAire Technologies.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <ContactCard
                title="Abuse and policy reports"
                description="Report suspected fraud, prohibited content, platform misuse, or other policy violations."
                email="abuse@xilairetechnologies.com"
              />

              <ContactCard
                title="Security reports"
                description="Report suspected vulnerabilities, account compromise, unauthorized access, or security incidents."
                email="security@xilairetechnologies.com"
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

function AcceptableUseIntroduction() {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--primary)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--surface-default))] p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
          <ShieldCheckIcon />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Use CASE Budget responsibly
          </h2>

          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            CASE Budget is built for
            legitimate financial
            organization, planning, and
            collaboration. Users must
            respect account boundaries,
            workspace permissions,
            financial-data ownership,
            security controls, and the
            rights of others.
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

type PermittedUseCardProps = {
  card: PermittedUseCard;
};

function PermittedUseCard({
  card,
}: PermittedUseCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
        <PermittedUseIcon
          icon={
            card.icon
          }
        />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        {card.title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {card.description}
      </p>
    </div>
  );
}

type ReportStepProps = {
  number: string;
  title: string;
  description: string;
};

function ReportStep({
  number,
  title,
  description,
}: ReportStepProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-xs font-black text-white">
        {number}
      </span>

      <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {title}
      </p>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

type EnforcementCardProps = {
  action: EnforcementAction;
};

function EnforcementCard({
  action,
}: EnforcementCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_13%,transparent)] text-[var(--warning)]">
        <EnforcementIcon
          icon={
            action.icon
          }
        />
      </div>

      <h3 className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {action.title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {action.description}
      </p>
    </div>
  );
}

type ContactCardProps = {
  title: string;
  description: string;
  email: string;
};

function ContactCard({
  title,
  description,
  email,
}: ContactCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <EmailIcon />
      </div>

      <h3 className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>

      <a
        href={`mailto:${email}`}
        className="mt-4 inline-flex break-all text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        {email}
      </a>
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
        href="/legal/terms"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Previous
        </p>

        <div className="mt-3 flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <ArrowLeftIcon />

          Terms of Service
        </div>
      </Link>

      <Link
        href="/legal/disclaimer"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 text-right outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Next
        </p>

        <div className="mt-3 flex items-center justify-end gap-2 font-bold text-[var(--text-primary)]">
          Financial Disclaimer

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
          aria-label="Acceptable Use Policy navigation"
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

type PermittedUseIconProps = {
  icon:
    PermittedUseCard["icon"];
};

function PermittedUseIcon({
  icon,
}: PermittedUseIconProps) {
  switch (icon) {
    case "household":
      return (
        <HouseholdIcon />
      );

    case "business":
      return (
        <BusinessIcon />
      );

    case "analytics":
      return (
        <ChartIcon />
      );

    case "budget":
    default:
      return (
        <BudgetIcon />
      );
  }
}

type EnforcementIconProps = {
  icon:
    EnforcementAction["icon"];
};

function EnforcementIcon({
  icon,
}: EnforcementIconProps) {
  switch (icon) {
    case "restriction":
      return (
        <LockIcon />
      );

    case "suspension":
      return (
        <PauseIcon />
      );

    case "termination":
      return (
        <BanIcon />
      );

    case "notice":
    default:
      return (
        <NoticeIcon />
      );
  }
}

function ShieldCheckIcon() {
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
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ShieldAlertIcon() {
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
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function ShieldIcon() {
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
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function BudgetIcon() {
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
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path d="M7 9h5" />
      <path d="M7 13h3" />
      <path d="M16 11h1" />
    </svg>
  );
}

function HouseholdIcon() {
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
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <circle
        cx="9"
        cy="13"
        r="2"
      />
      <path d="M6 18a3 3 0 0 1 6 0" />
      <circle
        cx="16"
        cy="14"
        r="1.5"
      />
    </svg>
  );
}

function BusinessIcon() {
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
      <rect
        x="3"
        y="6"
        width="18"
        height="14"
        rx="2"
      />
      <path d="M8 6V4h8v2" />
      <path d="M3 11h18" />
      <path d="M10 11v2h4v-2" />
    </svg>
  );
}

function ChartIcon() {
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
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

function NoticeIcon() {
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
      <path d="M6 3h12v18H6Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function LockIcon() {
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
      <rect
        x="4"
        y="10"
        width="16"
        height="10"
        rx="2"
      />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function PauseIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M10 9v6" />
      <path d="M14 9v6" />
    </svg>
  );
}

function BanIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="m6 6 12 12" />
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