import type {
  Metadata,
} from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Security Practices | CASE Budget",
  description:
    "Review the security practices used by CASE Budget and XilAire Technologies to protect accounts, workspaces, sessions, and financial information.",
};

const LAST_UPDATED =
  "August 2, 2026";

const securitySections = [
  {
    href:
      "#security-overview",
    label:
      "Security overview",
  },
  {
    href:
      "#account-security",
    label:
      "Account security",
  },
  {
    href:
      "#authentication",
    label:
      "Authentication",
  },
  {
    href:
      "#access-controls",
    label:
      "Access controls",
  },
  {
    href:
      "#data-protection",
    label:
      "Data protection",
  },
  {
    href:
      "#application-security",
    label:
      "Application security",
  },
  {
    href:
      "#infrastructure",
    label:
      "Infrastructure",
  },
  {
    href:
      "#monitoring",
    label:
      "Monitoring",
  },
  {
    href:
      "#support-access",
    label:
      "Support access",
  },
  {
    href:
      "#incident-response",
    label:
      "Incident response",
  },
  {
    href:
      "#user-responsibilities",
    label:
      "Your responsibilities",
  },
  {
    href:
      "#reporting",
    label:
      "Report a concern",
  },
];

type SecurityControl = {
  title: string;
  description: string;
  icon:
    | "shield"
    | "lock"
    | "database"
    | "monitor"
    | "users"
    | "key";
};

const securityControls:
  SecurityControl[] = [
    {
      title:
        "Secure authentication",
      description:
        "Account sessions are managed through supported authentication services with protected cookies and server-side session handling.",
      icon:
        "lock",
    },
    {
      title:
        "Multi-factor authentication",
      description:
        "CASE Budget is designed to support optional MFA for customers and stronger requirements for privileged administrative roles.",
      icon:
        "key",
    },
    {
      title:
        "Row Level Security",
      description:
        "Database policies restrict users to records they are authorized to access within their account and workspace.",
      icon:
        "database",
    },
    {
      title:
        "Role-based permissions",
      description:
        "Personal, household, business, organization, support, platform-admin, and master-admin roles are separated by authorization rules.",
      icon:
        "users",
    },
    {
      title:
        "Server-only credentials",
      description:
        "Administrative service-role credentials are kept in server-only environment variables and are not exposed to browser clients.",
      icon:
        "shield",
    },
    {
      title:
        "Operational monitoring",
      description:
        "Security events, errors, and application activity may be logged and reviewed to detect suspicious behavior and reliability issues.",
      icon:
        "monitor",
    },
  ];

export default function SecurityPracticesPage() {
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
              Security Practices
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
              This page describes the
              administrative, technical,
              and organizational safeguards
              designed to protect CASE Budget
              accounts, workspaces, sessions,
              and financial information.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PolicyBadge
                label="Current security overview"
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
            aria-label="Security practices sections"
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4"
          >
            <p className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              On this page
            </p>

            <div className="mt-3 space-y-1">
              {securitySections.map(
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
              <AlertIcon />
            </div>

            <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
              Report a security issue
            </p>

            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              Do not include passwords,
              authentication codes, full
              account numbers, or other
              sensitive information in
              your initial message.
            </p>

            <a
              href="mailto:security@xilairetechnologies.com"
              className="mt-4 inline-flex break-all text-xs font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              security@xilairetechnologies.com
            </a>
          </div>
        </aside>

        <article className="min-w-0 space-y-8">
          <SecurityIntroduction />

          <PolicySection
            id="security-overview"
            number="1"
            title="Security overview"
          >
            <p>
              CASE Budget is designed to
              protect sensitive personal and
              financial information through
              multiple layers of security.
              These layers include secure
              authentication, database access
              controls, workspace permissions,
              protected server operations,
              monitoring, and documented
              support procedures.
            </p>

            <p>
              Security controls are intended
              to reduce the risk of
              unauthorized access, data loss,
              misuse, alteration, and
              disclosure. No platform can
              guarantee absolute security, but
              CASE Budget is designed to apply
              reasonable safeguards based on
              the sensitivity of the data and
              the type of access being
              performed.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {securityControls.map(
                (
                  control,
                ) => (
                  <SecurityControlCard
                    key={
                      control.title
                    }
                    control={
                      control
                    }
                  />
                ),
              )}
            </div>
          </PolicySection>

          <PolicySection
            id="account-security"
            number="2"
            title="Account security"
          >
            <p>
              CASE Budget accounts are
              protected through controls
              designed to verify identity,
              preserve session integrity, and
              reduce unauthorized access.
            </p>

            <PolicyList
              items={[
                "Passwords are handled through the configured authentication provider rather than stored directly in CASE Budget application tables.",
                "Password-reset links are time-limited and require a valid recovery session.",
                "Email-confirmation flows help verify ownership of an email address.",
                "Authentication sessions may be revoked when a user signs out, changes credentials, or when suspicious activity is detected.",
                "Inactive, suspended, or disabled profiles may be prevented from accessing protected areas.",
                "Administrative and support accounts may be subject to additional security requirements.",
              ]}
            />

            <PolicyNotice
              title="Use a unique password"
              description="Your CASE Budget password should not be reused for email, banking, social media, or other services."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="authentication"
            number="3"
            title="Authentication and session protection"
          >
            <p>
              CASE Budget uses supported
              authentication services and
              server-side session handling to
              control access to protected
              application routes.
            </p>

            <PolicyList
              items={[
                "Secure cookies may be used to maintain authenticated sessions.",
                "Session tokens are refreshed through protected server-side flows.",
                "Protected routes verify the current authenticated user before returning private content.",
                "Authentication callbacks validate redirect paths to reduce open-redirect risk.",
                "Expired, malformed, missing, or invalid sessions are rejected.",
                "Password recovery, account confirmation, and invitation links are validated before a session is established.",
              ]}
            />

            <PolicySubsection
              title="Multi-factor authentication"
            >
              <p>
                CASE Budget is designed to
                support optional multi-factor
                authentication using compatible
                authenticator applications.
                MFA may be required for certain
                privileged roles, sensitive
                administrative operations, or
                high-risk account actions.
              </p>

              <PolicyList
                items={[
                  "MFA enrollment should require verification before the factor becomes active.",
                  "Recovery or factor-removal workflows should require additional identity checks.",
                  "Master-admin and platform-admin actions may require a higher assurance level.",
                  "Users should store recovery information securely and never share verification codes.",
                ]}
              />
            </PolicySubsection>
          </PolicySection>

          <PolicySection
            id="access-controls"
            number="4"
            title="Access controls and permissions"
          >
            <p>
              CASE Budget separates account,
              workspace, support, and platform
              permissions so that users can
              access only the information and
              actions appropriate to their
              role.
            </p>

            <PolicySubsection
              title="Workspace roles"
            >
              <PolicyList
                items={[
                  "Owners may manage workspace settings, members, and eligible destructive actions.",
                  "Administrators may manage many workspace functions without receiving unrestricted platform access.",
                  "Members may create or edit eligible financial records according to workspace permissions.",
                  "Viewers may receive read-only access to eligible workspace information.",
                  "Suspended or removed members should not retain active workspace access.",
                ]}
              />
            </PolicySubsection>

            <PolicySubsection
              title="Platform roles"
            >
              <PolicyList
                items={[
                  "Regular users access only their own authorized workspaces and records.",
                  "Support administrators may receive limited tools for customer support and issue investigation.",
                  "Platform administrators may manage broader application operations subject to authorization controls.",
                  "Master administrators may perform XilAire Technologies platform-management functions that are unavailable to customer accounts.",
                  "Privileged roles should be assigned only through trusted server-side or database-controlled operations.",
                ]}
              />
            </PolicySubsection>

            <PolicyNotice
              title="Least-privilege access"
              description="Access should be limited to the minimum information and functionality needed to perform an authorized task."
              tone="success"
            />
          </PolicySection>

          <PolicySection
            id="data-protection"
            number="5"
            title="Data protection"
          >
            <p>
              CASE Budget uses safeguards
              intended to protect data while
              it is transmitted, stored,
              accessed, and processed.
            </p>

            <PolicyList
              items={[
                "Network communications should use encrypted HTTPS connections.",
                "Authentication credentials and service-role keys must remain in protected server environments.",
                "Sensitive application data is stored in access-controlled databases.",
                "Row Level Security policies restrict access to authorized rows.",
                "Workspace identifiers are used to separate customer and household data.",
                "Database functions performing privileged operations are restricted to trusted roles.",
                "Backups and recovery processes may be used to support continuity and restoration.",
                "Sensitive values should be excluded from analytics, client logs, and public error messages.",
              ]}
            />

            <PolicySubsection
              title="Financial information"
            >
              <p>
                Financial information may
                include transaction amounts,
                account balances, budget
                assignments, debt balances,
                bill details, savings goals,
                and investment information.
                Such information should be
                exposed only to authorized
                users and services needed to
                provide the requested feature.
              </p>
            </PolicySubsection>
          </PolicySection>

          <PolicySection
            id="application-security"
            number="6"
            title="Application security"
          >
            <p>
              CASE Budget is designed with
              application-level safeguards
              that reduce common web and
              authorization risks.
            </p>

            <PolicyList
              items={[
                "Server Components and server actions are used for protected operations when appropriate.",
                "Administrative clients are marked server-only and must not be imported by browser components.",
                "Redirect destinations are validated before navigation.",
                "User-supplied input is validated before authentication or database operations.",
                "Error messages are normalized to avoid exposing unnecessary internal details.",
                "Account-recovery flows avoid confirming whether an email address is registered.",
                "Database functions use explicit search paths and restricted execution privileges.",
                "Direct browser access to privileged provisioning and role-management functions is revoked.",
              ]}
            />

            <PolicyNotice
              title="Security is part of development"
              description="New CASE Budget features should be reviewed for authentication, authorization, data exposure, input validation, logging, and subscription-access risks before release."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="infrastructure"
            number="7"
            title="Infrastructure and service providers"
          >
            <p>
              CASE Budget may rely on cloud,
              authentication, database, email,
              payment, monitoring, and
              financial-data providers to
              operate the platform.
            </p>

            <PolicyList
              items={[
                "Providers should be selected based on reliability, security capabilities, and business requirements.",
                "Administrative access to provider dashboards should be restricted to authorized personnel.",
                "Production credentials should be separated from development and testing credentials.",
                "Service-role and secret keys should never use public environment-variable prefixes.",
                "Provider access should be reviewed when personnel, systems, or responsibilities change.",
                "Third-party incidents may require coordinated investigation, containment, and user communication.",
              ]}
            />

            <p>
              Third-party providers maintain
              their own security programs and
              may process information according
              to their agreements with XilAire
              Technologies and their published
              policies.
            </p>
          </PolicySection>

          <PolicySection
            id="monitoring"
            number="8"
            title="Monitoring, logging, and audit records"
          >
            <p>
              CASE Budget may record security,
              access, operational, and error
              information to support monitoring,
              troubleshooting, abuse prevention,
              and investigations.
            </p>

            <PolicyList
              items={[
                "Authentication success and failure events.",
                "Password recovery and account-confirmation activity.",
                "Privileged role assignments and removals.",
                "Workspace membership changes.",
                "Administrative customer-support access.",
                "Subscription and billing state changes.",
                "Application errors, failed database operations, and service outages.",
                "Suspicious request patterns, rate-limit events, and potential abuse.",
              ]}
            />

            <p>
              Logs should avoid unnecessary
              sensitive financial values,
              passwords, MFA codes, full
              payment details, or secret keys.
              Retention periods may vary based
              on security, operational, legal,
              and regulatory needs.
            </p>
          </PolicySection>

          <PolicySection
            id="support-access"
            number="9"
            title="Customer support and administrative access"
          >
            <p>
              Authorized XilAire Technologies
              personnel may require limited
              access to customer account or
              workspace information to resolve
              support, security, subscription,
              or platform issues.
            </p>

            <PolicyList
              items={[
                "Support access should be limited to authorized personnel with an operational need.",
                "Administrative actions should be associated with the staff member performing them.",
                "Support personnel should access only the minimum information required to investigate the issue.",
                "Highly sensitive actions may require platform-admin or master-admin authority.",
                "Customer data should not be copied into unsecured communication channels.",
                "Support access may be logged for accountability and incident review.",
              ]}
            />

            <PolicyNotice
              title="XilAire master administration"
              description="Master-admin access is intended for authorized XilAire Technologies platform management, customer support escalation, security response, and operational recovery."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="incident-response"
            number="10"
            title="Security incident response"
          >
            <p>
              XilAire Technologies may
              investigate suspected security
              incidents involving CASE Budget,
              customer accounts, service
              providers, or infrastructure.
            </p>

            <PolicyList
              items={[
                "Identify and validate the suspected incident.",
                "Contain affected accounts, sessions, credentials, services, or systems.",
                "Preserve relevant logs and evidence.",
                "Remove unauthorized access and remediate the cause.",
                "Restore affected services and verify security controls.",
                "Assess whether personal or financial information was involved.",
                "Notify affected users, providers, regulators, or authorities when required.",
                "Document lessons learned and improve safeguards.",
              ]}
            />

            <p>
              CASE Budget may temporarily
              suspend accounts, revoke sessions,
              disable integrations, restrict
              features, or require credential
              resets when necessary to protect
              users and the platform.
            </p>
          </PolicySection>

          <PolicySection
            id="user-responsibilities"
            number="11"
            title="Your security responsibilities"
          >
            <p>
              Users also play an important role
              in protecting CASE Budget
              accounts and financial
              information.
            </p>

            <PolicyList
              items={[
                "Use a strong and unique password.",
                "Protect access to your email account and mobile device.",
                "Enable multi-factor authentication when available.",
                "Do not share passwords, recovery links, MFA codes, or session information.",
                "Review workspace members and permissions regularly.",
                "Remove former household, business, or organization members promptly.",
                "Keep devices, browsers, and operating systems updated.",
                "Avoid accessing CASE Budget from untrusted or shared devices.",
                "Sign out after using public or shared computers.",
                "Report suspected unauthorized activity promptly.",
              ]}
            />

            <PolicyNotice
              title="Protect your email account"
              description="Anyone who gains access to your email may be able to request password-recovery links or receive account-security messages."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="reporting"
            number="12"
            title="Report a security concern"
          >
            <p>
              Report suspected vulnerabilities,
              unauthorized access, account
              compromise, or security concerns
              to XilAire Technologies.
            </p>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]">
                  <ShieldAlertIcon />
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-[var(--text-primary)]">
                    XilAire Technologies
                  </p>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Security and Incident
                    Response
                  </p>

                  <a
                    href="mailto:security@xilairetechnologies.com"
                    className="mt-3 inline-flex break-all font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  >
                    security@xilairetechnologies.com
                  </a>
                </div>
              </div>
            </div>

            <PolicySubsection
              title="Include"
            >
              <PolicyList
                items={[
                  "A clear description of the issue.",
                  "The affected page, feature, or account area.",
                  "The approximate date and time observed.",
                  "Steps to reproduce the issue when applicable.",
                  "Screenshots with sensitive information removed.",
                  "A safe method for contacting you.",
                ]}
              />
            </PolicySubsection>

            <PolicySubsection
              title="Do not include"
            >
              <PolicyList
                items={[
                  "Your password.",
                  "Multi-factor authentication codes.",
                  "Full bank or payment account numbers.",
                  "Authentication cookies or session tokens.",
                  "Service-role keys, secret keys, or private API credentials.",
                  "Sensitive information belonging to another user unless necessary and legally authorized.",
                ]}
              />
            </PolicySubsection>
          </PolicySection>

          <DocumentNavigation />
        </article>
      </div>

      <LegalFooter />
    </main>
  );
}

function SecurityIntroduction() {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--primary)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--surface-default))] p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
          <ShieldCheckIcon />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Security by design
          </h2>

          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            CASE Budget is designed
            around authenticated access,
            protected workspaces,
            role-based permissions,
            restricted server operations,
            and database-level security.
            Security controls will continue
            to evolve as the platform,
            integrations, and subscription
            features grow.
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

type SecurityControlCardProps = {
  control: SecurityControl;
};

function SecurityControlCard({
  control,
}: SecurityControlCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <SecurityControlIcon
          icon={
            control.icon
          }
        />
      </div>

      <h3 className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {control.title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {control.description}
      </p>
    </div>
  );
}

type PolicyNoticeProps = {
  title: string;
  description: string;
  tone:
    | "primary"
    | "success"
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
        "success"
          ? "border-[color-mix(in_srgb,var(--success)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--success)_6%,var(--surface-muted))]"
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
            "success"
              ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
              : tone ===
                  "warning"
                ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
                : "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
          ].join(" ")}
        >
          {tone ===
          "warning" ? (
            <AlertIcon />
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
        href="/legal/cookies"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Previous
        </p>

        <div className="mt-3 flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <ArrowLeftIcon />

          Cookie Policy
        </div>
      </Link>

      <Link
        href="/legal/data-deletion"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 text-right outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Next
        </p>

        <div className="mt-3 flex items-center justify-end gap-2 font-bold text-[var(--text-primary)]">
          Data Deletion

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
          aria-label="Security practices navigation"
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

type SecurityControlIconProps = {
  icon:
    SecurityControl["icon"];
};

function SecurityControlIcon({
  icon,
}: SecurityControlIconProps) {
  switch (icon) {
    case "lock":
      return (
        <LockIcon />
      );

    case "database":
      return (
        <DatabaseIcon />
      );

    case "monitor":
      return (
        <MonitorIcon />
      );

    case "users":
      return (
        <UsersIcon />
      );

    case "key":
      return (
        <KeyIcon />
      );

    case "shield":
    default:
      return (
        <ShieldIcon />
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
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
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

function DatabaseIcon() {
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

function MonitorIcon() {
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
        y="4"
        width="18"
        height="12"
        rx="2"
      />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  );
}

function UsersIcon() {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle
        cx="9.5"
        cy="7"
        r="4"
      />
      <path d="M19 8a3 3 0 0 1 0 6" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.9" />
    </svg>
  );
}

function KeyIcon() {
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
        cx="8"
        cy="15"
        r="4"
      />
      <path d="m11 12 8-8" />
      <path d="m17 6 2 2" />
      <path d="m14 9 2 2" />
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
      <path d="m12 3 9 16H3Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
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