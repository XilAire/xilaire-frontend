import type {
  Metadata,
} from "next";
import Link from "next/link";

import CaseBudgetLogo from "@/components/branding/CaseBudgetLogo";

export const metadata: Metadata = {
  title:
    "Support Center | CASE Budget",
  description:
    "Get help with CASE Budget accounts, authentication, workspaces, budgeting, bills, subscriptions, security, and data requests.",
};

type SupportCategoryIcon =
  | "account"
  | "workspace"
  | "budget"
  | "billing"
  | "security"
  | "data";

type SupportCategory = {
  title: string;
  description: string;
  href: string;
  icon: SupportCategoryIcon;
  topics: string[];
};

const supportCategories:
  SupportCategory[] = [
    {
      title:
        "Account and sign-in",
      description:
        "Get help creating an account, signing in, confirming your email, resetting your password, or managing MFA.",
      href:
        "#account-and-sign-in",
      icon:
        "account",
      topics: [
        "Account registration",
        "Email confirmation",
        "Password recovery",
        "Multi-factor authentication",
      ],
    },
    {
      title:
        "Workspaces and members",
      description:
        "Learn how personal, household, business, and organization workspaces operate.",
      href:
        "#workspaces-and-members",
      icon:
        "workspace",
      topics: [
        "Workspace ownership",
        "Member invitations",
        "Roles and permissions",
        "Removing access",
      ],
    },
    {
      title:
        "Budgets and financial tools",
      description:
        "Find guidance for monthly budgets, transactions, bills, goals, debts, accounts, and reports.",
      href:
        "#budgets-and-financial-tools",
      icon:
        "budget",
      topics: [
        "Monthly budgets",
        "Bills and reminders",
        "Transactions",
        "Savings and debt",
      ],
    },
    {
      title:
        "Subscriptions and billing",
      description:
        "Get assistance with plans, trials, payments, invoices, upgrades, downgrades, and cancellations.",
      href:
        "#subscriptions-and-billing",
      icon:
        "billing",
      topics: [
        "Plan access",
        "Payment issues",
        "Invoices",
        "Cancellation",
      ],
    },
    {
      title:
        "Security and account protection",
      description:
        "Report suspicious activity, secure your account, and review CASE Budget security guidance.",
      href:
        "#security-and-account-protection",
      icon:
        "security",
      topics: [
        "Unauthorized access",
        "Suspicious sign-ins",
        "Security reports",
        "Credential protection",
      ],
    },
    {
      title:
        "Privacy and data requests",
      description:
        "Request access, correction, export, or deletion of eligible personal information.",
      href:
        "#privacy-and-data-requests",
      icon:
        "data",
      topics: [
        "Data access",
        "Data correction",
        "Data export",
        "Account deletion",
      ],
    },
  ];

type FrequentlyAskedQuestion = {
  question: string;
  answer: string;
};

const frequentlyAskedQuestions:
  FrequentlyAskedQuestion[] = [
    {
      question:
        "Why did I not receive my confirmation email?",
      answer:
        "Check your spam or junk folder, confirm that the email address was entered correctly, and wait a few minutes. You may also return to the sign-in page and request another confirmation message when that option is available.",
    },
    {
      question:
        "Can I change my password after signing in?",
      answer:
        "Yes. CASE Budget will include account-security settings where authenticated users can update their password and manage multi-factor authentication.",
    },
    {
      question:
        "Can I share my budget with my spouse or household?",
      answer:
        "Yes. Household workspaces are designed to support authorized collaboration through individual user accounts and workspace roles. Password sharing should not be used.",
    },
    {
      question:
        "Why can another workspace member see financial information?",
      answer:
        "Shared workspace visibility depends on the member's assigned role. Owners and administrators should review workspace membership and permissions regularly.",
    },
    {
      question:
        "Does CASE Budget move or hold my money?",
      answer:
        "No. CASE Budget is a financial organization and planning platform. Unless a future feature explicitly states otherwise, it does not hold deposits, transfer funds, originate loans, or execute investments.",
    },
    {
      question:
        "How do I request deletion of my account?",
      answer:
        "Review the Data Deletion page in the Legal Center and contact the privacy team from the email address associated with your CASE Budget account.",
    },
  ];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <SupportHeader />

      <SupportHero />

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <QuickHelpSection />

        <div className="mt-14 space-y-14">
          <SupportTopicSection
            id="account-and-sign-in"
            eyebrow="Account"
            title="Account and sign-in help"
            description="Use these steps for account registration, email confirmation, password recovery, sign-in errors, and multi-factor authentication."
          >
            <SupportChecklist
              items={[
                "Confirm that you are using the same email address used during registration.",
                "Check spam and junk folders for confirmation or password-recovery emails.",
                "Verify that your browser allows the secure cookies needed for authentication.",
                "Try signing out and signing back in after changing authentication settings.",
                "Use a strong, unique password that is not shared with another service.",
                "Do not share password-reset links, MFA codes, or authentication credentials.",
              ]}
            />

            <SupportActionRow>
              <Link
                href="/sign-in"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
              >
                Go to sign in
              </Link>

              <Link
                href="/forgot-password"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Reset password
              </Link>
            </SupportActionRow>
          </SupportTopicSection>

          <SupportTopicSection
            id="workspaces-and-members"
            eyebrow="Collaboration"
            title="Workspaces and members"
            description="CASE Budget uses individual accounts and role-based workspace access for personal, household, business, and organization collaboration."
          >
            <SupportChecklist
              items={[
                "Workspace owners control ownership, eligible deletion, and high-impact membership actions.",
                "Administrators may manage many workspace settings and members.",
                "Members may create or edit eligible records based on assigned permissions.",
                "Viewers may receive read-only access.",
                "Former household or organization members should be removed promptly.",
                "Each person should use their own account instead of sharing credentials.",
              ]}
            />

            <SupportNotice
              title="Review access regularly"
              description="Workspace owners and administrators should verify that every member still requires access to the workspace and its financial information."
              tone="primary"
            />
          </SupportTopicSection>

          <SupportTopicSection
            id="budgets-and-financial-tools"
            eyebrow="Financial planning"
            title="Budgets and financial tools"
            description="CASE Budget is designed to organize monthly plans, transactions, bills, savings goals, debts, accounts, investments, and net worth."
          >
            <SupportChecklist
              items={[
                "Create a monthly budget only when you are ready to plan that month.",
                "Add income before assigning money to budget items.",
                "Review recurring bills and due dates regularly.",
                "Confirm transaction categories and imported account information.",
                "Verify debt balances, interest rates, and payoff amounts with creditors.",
                "Confirm important balances and payment information with the relevant financial institution.",
              ]}
            />

            <SupportNotice
              title="Financial information may require verification"
              description="CASE Budget calculations and imported records may be delayed, incomplete, or inaccurate. Always verify important financial information with the official source."
              tone="warning"
            />

            <Link
              href="/legal/disclaimer"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Review Financial Disclaimer
            </Link>
          </SupportTopicSection>

          <SupportTopicSection
            id="subscriptions-and-billing"
            eyebrow="Plans and payments"
            title="Subscriptions and billing"
            description="Subscription features may differ by plan, workspace type, billing cycle, member limit, account limit, and connected-service access."
          >
            <SupportChecklist
              items={[
                "Confirm that the correct workspace is associated with the subscription.",
                "Verify that the payment method is current.",
                "Review failed-payment notifications and retry instructions.",
                "Check whether a trial or promotional period has ended.",
                "Review plan limits before adding members, accounts, or workspaces.",
                "Cancel the subscription separately before requesting account deletion.",
              ]}
            />

            <SupportActionRow>
              <a
                href="mailto:support@xilairetechnologies.com?subject=CASE%20Budget%20Billing%20Support"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
              >
                Contact billing support

                <EmailIcon />
              </a>

              <Link
                href="/legal/terms"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Review Terms of Service
              </Link>
            </SupportActionRow>
          </SupportTopicSection>

          <SupportTopicSection
            id="security-and-account-protection"
            eyebrow="Security"
            title="Security and account protection"
            description="Take immediate action when you suspect unauthorized access, exposed credentials, suspicious sign-ins, or misuse of your workspace."
          >
            <SupportChecklist
              items={[
                "Change your password immediately if you suspect compromise.",
                "Secure the email account associated with CASE Budget.",
                "Enable or review multi-factor authentication when available.",
                "Sign out of other sessions when session-management controls are available.",
                "Review workspace members and remove unknown or unauthorized users.",
                "Do not send passwords, MFA codes, session tokens, or full financial credentials to support.",
              ]}
            />

            <SupportNotice
              title="Report active security concerns"
              description="Use the security mailbox for suspected vulnerabilities, unauthorized access, exposed credentials, or account compromise."
              tone="danger"
            />

            <SupportActionRow>
              <a
                href="mailto:security@xilairetechnologies.com?subject=CASE%20Budget%20Security%20Report"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--danger)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
              >
                Report security issue

                <ShieldIcon />
              </a>

              <Link
                href="/legal/security"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Review Security Practices
              </Link>
            </SupportActionRow>
          </SupportTopicSection>

          <SupportTopicSection
            id="privacy-and-data-requests"
            eyebrow="Privacy"
            title="Privacy and data requests"
            description="Contact the privacy team for requests involving personal information, exports, corrections, account closure, or deletion."
          >
            <SupportChecklist
              items={[
                "Send the request from the email address associated with your CASE Budget account.",
                "Include your name and the relevant workspace name.",
                "Clearly describe the information or account action requested.",
                "Complete identity or workspace-authority verification when required.",
                "Export information you need before requesting permanent deletion.",
                "Do not include passwords, MFA codes, session tokens, or complete financial account numbers.",
              ]}
            />

            <SupportActionRow>
              <a
                href="mailto:privacy@xilairetechnologies.com?subject=CASE%20Budget%20Privacy%20Request"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
              >
                Contact privacy team

                <EmailIcon />
              </a>

              <Link
                href="/legal/data-deletion"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Review Data Deletion
              </Link>
            </SupportActionRow>
          </SupportTopicSection>
        </div>

        <FrequentlyAskedQuestions />
      </section>

      <ContactSupportSection />

      <SupportFooter />
    </main>
  );
}

function SupportHeader() {
  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <BrandMark />

        <nav
          aria-label="Support navigation"
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

function SupportHero() {
  return (
    <section className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
            Support Center
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
            Help with your CASE
            Budget account
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
            Find help for sign-in,
            workspaces, budgets,
            financial tools,
            subscriptions, security,
            privacy, and account data.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:support@xilairetechnologies.com?subject=CASE%20Budget%20Support%20Request"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]"
            >
              Contact support

              <EmailIcon />
            </a>

            <Link
              href="/legal/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              View contact directory
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickHelpSection() {
  return (
    <section>
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
          Quick help
        </p>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Choose a support category
        </h2>

        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          Select the area that best
          matches your question or issue.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {supportCategories.map(
          (
            category,
          ) => (
            <SupportCategoryCard
              key={
                category.href
              }
              category={
                category
              }
            />
          ),
        )}
      </div>
    </section>
  );
}

type SupportCategoryCardProps = {
  category: SupportCategory;
};

function SupportCategoryCard({
  category,
}: SupportCategoryCardProps) {
  return (
    <a
      href={category.href}
      className="group flex min-h-[300px] flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 outline-none transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_32%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:p-6"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <SupportCategoryIcon
          icon={
            category.icon
          }
        />
      </div>

      <h3 className="mt-5 text-lg font-bold text-[var(--text-primary)]">
        {category.title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        {category.description}
      </p>

      <ul className="mt-5 space-y-2 text-xs leading-5 text-[var(--text-muted)]">
        {category.topics.map(
          (
            topic,
          ) => (
            <li
              key={topic}
              className="flex items-start gap-2"
            >
              <span
                aria-hidden="true"
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]"
              />

              <span>
                {topic}
              </span>
            </li>
          ),
        )}
      </ul>

      <div className="mt-auto pt-5">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          View help

          <span className="transition-transform group-hover:translate-x-1">
            <ArrowRightIcon />
          </span>
        </span>
      </div>
    </a>
  );
}

type SupportTopicSectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

function SupportTopicSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: SupportTopicSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-7"
    >
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--primary)]">
        {eyebrow}
      </p>

      <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
        {title}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
        {description}
      </p>

      <div className="mt-6 space-y-5">
        {children}
      </div>
    </section>
  );
}

type SupportChecklistProps = {
  items: string[];
};

function SupportChecklist({
  items,
}: SupportChecklistProps) {
  return (
    <ul className="space-y-3">
      {items.map(
        (
          item,
        ) => (
          <li
            key={item}
            className="flex items-start gap-3 text-sm leading-7 text-[var(--text-muted)]"
          >
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
              <CheckIcon />
            </span>

            <span>
              {item}
            </span>
          </li>
        ),
      )}
    </ul>
  );
}

function SupportActionRow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {children}
    </div>
  );
}

type SupportNoticeProps = {
  title: string;
  description: string;
  tone:
    | "primary"
    | "warning"
    | "danger";
};

function SupportNotice({
  title,
  description,
  tone,
}: SupportNoticeProps) {
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

function FrequentlyAskedQuestions() {
  return (
    <section className="mt-14">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
          Common questions
        </p>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Frequently asked questions
        </h2>

        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          Review common account,
          workspace, security, and data
          questions.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {frequentlyAskedQuestions.map(
          (
            item,
          ) => (
            <article
              key={
                item.question
              }
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6"
            >
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {item.question}
              </h3>

              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                {item.answer}
              </p>
            </article>
          ),
        )}
      </div>
    </section>
  );
}

function ContactSupportSection() {
  return (
    <section className="border-y border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
            Still need help?
          </p>

          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Contact CASE Budget
            support
          </h2>

          <p className="mt-4 text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            Include your account email,
            workspace name, a clear
            description of the issue,
            relevant dates, and
            screenshots with sensitive
            information removed.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="mailto:support@xilairetechnologies.com?subject=CASE%20Budget%20Support%20Request"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]"
          >
            Email support

            <EmailIcon />
          </a>

          <Link
            href="/legal/contact"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Other contact options
          </Link>
        </div>
      </div>
    </section>
  );
}

function SupportFooter() {
  return (
    <footer className="bg-[var(--surface-default)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-7 text-sm text-[var(--text-muted)] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>
          © 2026 XilAire
          Technologies. All rights
          reserved.
        </p>

        <nav
          aria-label="Support footer navigation"
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

type SupportCategoryIconProps = {
  icon: SupportCategoryIcon;
};

function SupportCategoryIcon({
  icon,
}: SupportCategoryIconProps) {
  switch (icon) {
    case "workspace":
      return (
        <WorkspaceIcon />
      );

    case "budget":
      return (
        <BudgetIcon />
      );

    case "billing":
      return (
        <CardIcon />
      );

    case "security":
      return (
        <ShieldIcon />
      );

    case "data":
      return (
        <DataIcon />
      );

    case "account":
    default:
      return (
        <UserIcon />
      );
  }
}

function UserIcon() {
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

function BudgetIcon() {
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

      <path d="M7 9h5" />
      <path d="M7 13h3" />
      <path d="M16 11h1" />
    </svg>
  );
}

function CardIcon() {
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

      <path d="M3 10h18" />
      <path d="M7 15h3" />
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

function DataIcon() {
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

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 12 4 4 8-8" />
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