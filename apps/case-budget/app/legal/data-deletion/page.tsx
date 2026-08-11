import type {
  Metadata,
} from "next";
import Link from "next/link";

import CaseBudgetLogo from "@/components/branding/CaseBudgetLogo";

export const metadata: Metadata = {
  title:
    "Data Deletion | CASE Budget",
  description:
    "Learn how to request deletion of a CASE Budget account, workspace, connected financial data, or eligible personal information.",
};

const LAST_UPDATED =
  "August 2, 2026";

const policySections = [
  {
    href:
      "#overview",
    label:
      "Overview",
  },
  {
    href:
      "#before-requesting",
    label:
      "Before requesting",
  },
  {
    href:
      "#account-deletion",
    label:
      "Account deletion",
  },
  {
    href:
      "#workspace-deletion",
    label:
      "Workspace deletion",
  },
  {
    href:
      "#connected-accounts",
    label:
      "Connected accounts",
  },
  {
    href:
      "#retained-information",
    label:
      "Retained information",
  },
  {
    href:
      "#shared-workspaces",
    label:
      "Shared workspaces",
  },
  {
    href:
      "#request-process",
    label:
      "Request process",
  },
  {
    href:
      "#verification",
    label:
      "Identity verification",
  },
  {
    href:
      "#timing",
    label:
      "Processing time",
  },
  {
    href:
      "#cancellation",
    label:
      "Canceling a request",
  },
  {
    href:
      "#contact",
    label:
      "Contact us",
  },
];

type DeletionScope = {
  title: string;
  description: string;
  includes: string[];
  icon:
    | "user"
    | "workspace"
    | "bank"
    | "document";
};

const deletionScopes:
  DeletionScope[] = [
    {
      title:
        "Personal account",
      description:
        "Close your CASE Budget user account and remove eligible personal information associated with it.",
      includes: [
        "Profile information",
        "Authentication access",
        "Personal workspace ownership",
        "Eligible preferences and saved settings",
      ],
      icon:
        "user",
    },
    {
      title:
        "Workspace",
      description:
        "Delete an eligible personal, household, business, or organization workspace when authorized.",
      includes: [
        "Budget records",
        "Transactions",
        "Bills and reminders",
        "Savings, debt, and net-worth records",
      ],
      icon:
        "workspace",
    },
    {
      title:
        "Connected financial data",
      description:
        "Disconnect supported financial institutions and request removal of eligible imported financial records.",
      includes: [
        "Connection tokens",
        "Imported accounts",
        "Imported transactions",
        "Synchronization metadata",
      ],
      icon:
        "bank",
    },
    {
      title:
        "Specific information",
      description:
        "Request correction or deletion of eligible personal information without closing your entire account.",
      includes: [
        "Profile fields",
        "Support attachments",
        "Communication records",
        "Other eligible personal data",
      ],
      icon:
        "document",
    },
  ];

export default function DataDeletionPage() {
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
              Data Deletion
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
              This page explains how to
              request account closure,
              workspace deletion,
              disconnection of financial
              accounts, or removal of eligible
              personal information from CASE
              Budget.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PolicyBadge
                label="Current process"
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
            aria-label="Data deletion sections"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]">
              <TrashIcon />
            </div>

            <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
              Deletion requests
            </p>

            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              Requests may require
              identity verification and
              confirmation before any
              permanent deletion begins.
            </p>

            <a
              href="mailto:privacy@xilairetechnologies.com?subject=CASE%20Budget%20Data%20Deletion%20Request"
              className="mt-4 inline-flex break-all text-xs font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              privacy@xilairetechnologies.com
            </a>
          </div>
        </aside>

        <article className="min-w-0 space-y-8">
          <DeletionIntroduction />

          <PolicySection
            id="overview"
            number="1"
            title="Overview"
          >
            <p>
              CASE Budget users may request
              deletion of eligible personal
              information, user accounts,
              workspaces, or connected financial
              data. The available deletion
              options depend on account status,
              workspace ownership, subscription
              obligations, shared access, and
              legal retention requirements.
            </p>

            <p>
              Some records may be removed
              immediately, while others may be
              queued for review, retained for a
              limited period, or preserved when
              required for security, billing,
              auditing, fraud prevention, legal
              compliance, or dispute resolution.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {deletionScopes.map(
                (
                  scope,
                ) => (
                  <DeletionScopeCard
                    key={
                      scope.title
                    }
                    scope={
                      scope
                    }
                  />
                ),
              )}
            </div>

            <PolicyNotice
              title="Deletion may be permanent"
              description="Deleted account and workspace information may not be recoverable after the deletion process is completed."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="before-requesting"
            number="2"
            title="Before requesting deletion"
          >
            <p>
              Review the following items before
              submitting a permanent deletion
              request.
            </p>

            <PolicyList
              items={[
                "Export any financial records, reports, transaction history, or other information you may need later.",
                "Review active subscriptions and outstanding billing obligations.",
                "Disconnect supported financial institutions if you want synchronization to stop immediately.",
                "Transfer workspace ownership when another member needs continued access.",
                "Review household, business, or organization workspace members.",
                "Confirm that required tax, accounting, legal, or business records have been saved elsewhere.",
                "Resolve open customer-support or billing disputes when possible.",
                "Understand that deletion may affect other users in a shared workspace.",
              ]}
            />

            <PolicyNotice
              title="Download your records first"
              description="CASE Budget may provide export tools before account deletion is enabled. Save any information you need before confirming permanent deletion."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="account-deletion"
            number="3"
            title="Account deletion"
          >
            <p>
              Closing your CASE Budget account
              may remove your ability to sign
              in and may begin deletion of
              eligible information associated
              with your user profile.
            </p>

            <PolicySubsection
              title="Information that may be deleted"
            >
              <PolicyList
                items={[
                  "Profile information such as your name, phone number, avatar, timezone, and preferences.",
                  "Authentication access and active sessions.",
                  "Personal workspace records when you are the sole owner and no retention requirement applies.",
                  "Notification preferences and eligible application settings.",
                  "Eligible support records and attachments.",
                  "Eligible financial-planning information associated only with your personal account.",
                ]}
              />
            </PolicySubsection>

            <PolicySubsection
              title="Information that may require additional review"
            >
              <PolicyList
                items={[
                  "Records connected to an active subscription or unresolved payment issue.",
                  "Shared workspace records visible to other authorized members.",
                  "Audit records involving administrative, security, or membership actions.",
                  "Information needed to investigate fraud, abuse, unauthorized access, or legal claims.",
                  "Tax, accounting, and transaction records that must be retained.",
                  "Information associated with a legal hold or regulatory request.",
                ]}
              />
            </PolicySubsection>

            <PolicyNotice
              title="Signing out is not account deletion"
              description="Signing out, uninstalling the application, or stopping use of CASE Budget does not automatically delete your account or stored information."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="workspace-deletion"
            number="4"
            title="Workspace deletion"
          >
            <p>
              Workspaces may contain financial
              information belonging to multiple
              people. Deletion authority depends
              on workspace role and workspace
              type.
            </p>

            <PolicySubsection
              title="Personal workspaces"
            >
              <p>
                A personal workspace owned by a
                single user may be eligible for
                deletion when there are no
                unresolved subscription,
                security, legal, or retention
                requirements.
              </p>
            </PolicySubsection>

            <PolicySubsection
              title="Household workspaces"
            >
              <p>
                Household workspace deletion may
                require confirmation from the
                owner. Other members should be
                notified before deletion because
                their access and shared records
                may also be removed.
              </p>
            </PolicySubsection>

            <PolicySubsection
              title="Business and organization workspaces"
            >
              <p>
                Business or organization
                workspaces may be subject to
                additional contractual, billing,
                legal, audit, or record-retention
                requirements. Only authorized
                owners or designated
                administrators may request
                deletion.
              </p>
            </PolicySubsection>

            <PolicyList
              items={[
                "Workspace deletion may remove budgets, transactions, bills, goals, debts, accounts, investments, reports, and related configuration.",
                "Workspace membership records may be preserved in an audit history.",
                "Deleted workspace slugs or identifiers may remain reserved temporarily.",
                "Subscription cancellation and workspace deletion may be separate operations.",
                "Workspace deletion may require MFA or another higher-assurance verification step.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="connected-accounts"
            number="5"
            title="Connected financial accounts"
          >
            <p>
              When bank connectivity is
              available, disconnecting a
              financial institution stops future
              synchronization but may not
              automatically delete previously
              imported records.
            </p>

            <PolicySubsection
              title="Disconnecting an institution"
            >
              <PolicyList
                items={[
                  "Stops future balance and transaction synchronization when successfully completed.",
                  "May revoke or remove connection tokens held by the approved connection provider.",
                  "May leave previously imported accounts and transactions in your workspace.",
                  "Does not necessarily close your account with the financial institution.",
                ]}
              />
            </PolicySubsection>

            <PolicySubsection
              title="Deleting imported information"
            >
              <p>
                You may separately request
                deletion of eligible imported
                accounts, transactions, balances,
                connection metadata, and
                synchronization history.
              </p>
            </PolicySubsection>

            <PolicyNotice
              title="Contact your bank separately"
              description="Deleting CASE Budget data does not close, freeze, modify, or cancel any account held by your financial institution."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="retained-information"
            number="6"
            title="Information that may be retained"
          >
            <p>
              Some information may remain after
              a deletion request when retention
              is reasonably necessary or legally
              required.
            </p>

            <PolicyList
              items={[
                "Payment, subscription, invoice, tax, and accounting records.",
                "Security logs, authentication events, and fraud-prevention records.",
                "Administrative and customer-support audit history.",
                "Records needed to investigate abuse, unauthorized access, or policy violations.",
                "Information subject to litigation, legal hold, regulatory review, or law-enforcement request.",
                "Backups that have not yet completed their normal retention cycle.",
                "Aggregated or de-identified information that no longer identifies you.",
                "Minimal records needed to document that a deletion request was received and completed.",
              ]}
            />

            <p>
              Retained information is not
              intended for ordinary product use
              and should remain restricted to
              authorized legal, security,
              accounting, support, or operational
              purposes.
            </p>
          </PolicySection>

          <PolicySection
            id="shared-workspaces"
            number="7"
            title="Shared workspaces and other users"
          >
            <p>
              Deleting your personal account
              does not always require deletion
              of records that belong to a shared
              household, business, or
              organization workspace.
            </p>

            <PolicyList
              items={[
                "Records created in a shared workspace may remain available to other authorized workspace members.",
                "Your personal profile may be removed or replaced with a limited historical reference where appropriate.",
                "Comments, approvals, invitations, role changes, or other audit events may remain associated with a historical user identifier.",
                "Workspace owners may need to remove your membership before your account can be fully closed.",
                "A sole workspace owner may be required to transfer ownership or delete the workspace.",
                "Organization-controlled information may be retained according to the organization's instructions and applicable agreements.",
              ]}
            />

            <PolicyNotice
              title="Personal account and workspace data are separate"
              description="Closing your user account may not delete information that belongs to a shared workspace or another organization."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="request-process"
            number="8"
            title="How to submit a deletion request"
          >
            <p>
              Deletion requests may be submitted
              through an authenticated CASE
              Budget account when self-service
              tools are available or by
              contacting the XilAire Technologies
              privacy team.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <ProcessStep
                number="1"
                title="Submit"
                description="Send the request from the email address associated with your CASE Budget account."
              />

              <ProcessStep
                number="2"
                title="Verify"
                description="Complete identity, workspace-ownership, and authorization verification."
              />

              <ProcessStep
                number="3"
                title="Confirm"
                description="Review the scope and confirm that you want the requested deletion completed."
              />
            </div>

            <PolicySubsection
              title="Include in your request"
            >
              <PolicyList
                items={[
                  "The email address associated with your CASE Budget account.",
                  "Your full name or display name.",
                  "The workspace name or workspace identifier when applicable.",
                  "The specific information or account you want deleted.",
                  "Whether you want to close your entire account or remove only selected information.",
                  "A safe method for contacting you.",
                ]}
              />
            </PolicySubsection>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:privacy@xilairetechnologies.com?subject=CASE%20Budget%20Data%20Deletion%20Request"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
              >
                Email deletion request

                <EmailIcon />
              </a>

              <Link
                href="/legal/privacy"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Review Privacy Policy
              </Link>
            </div>
          </PolicySection>

          <PolicySection
            id="verification"
            number="9"
            title="Identity and authority verification"
          >
            <p>
              We may need to verify your identity
              and authority before processing a
              deletion request.
            </p>

            <PolicyList
              items={[
                "Confirm access to the email address associated with the account.",
                "Require sign-in to the affected CASE Budget account.",
                "Require a recent password confirmation or MFA challenge.",
                "Confirm workspace ownership or administrative authority.",
                "Request limited additional information needed to distinguish your account from another user.",
                "Require organization authorization for business or enterprise-controlled workspaces.",
              ]}
            />

            <PolicyNotice
              title="Protect yourself from impersonation"
              description="Never send your password, MFA code, authentication cookie, financial institution password, or full payment-card number as part of a deletion request."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="timing"
            number="10"
            title="Processing time"
          >
            <p>
              We aim to respond to verified
              deletion requests within a
              reasonable period. Processing time
              may depend on request complexity,
              workspace ownership, legal
              obligations, active disputes,
              backups, or the number of systems
              involved.
            </p>

            <PolicyList
              items={[
                "Simple profile corrections or deletions may be completed quickly.",
                "Full account and workspace deletions may require additional review.",
                "Connected financial-data removal may involve coordination with a third-party provider.",
                "Backup copies may remain until the normal backup-retention period expires.",
                "Legal or regulatory holds may delay or prevent deletion of selected records.",
                "We may provide status updates when processing requires additional time.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="cancellation"
            number="11"
            title="Canceling a deletion request"
          >
            <p>
              You may request cancellation before
              permanent deletion has been
              completed. We cannot guarantee that
              a request can be canceled after
              processing begins.
            </p>

            <PolicyList
              items={[
                "Contact the privacy team from the same verified email address.",
                "Reference the original deletion request.",
                "Clearly state that you want to cancel the request.",
                "Complete additional verification when requested.",
              ]}
            />

            <PolicyNotice
              title="Completed deletion may not be reversible"
              description="After eligible information has been permanently deleted, CASE Budget may not be able to restore it."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="contact"
            number="12"
            title="Contact us"
          >
            <p>
              Submit data deletion questions or
              requests to XilAire Technologies.
            </p>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]">
                  <TrashIcon />
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
                    href="mailto:privacy@xilairetechnologies.com?subject=CASE%20Budget%20Data%20Deletion%20Request"
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

function DeletionIntroduction() {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_5%,var(--surface-default))] p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
          <TrashIcon />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Control over your data
          </h2>

          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            CASE Budget is designed to
            give users meaningful control
            over personal information and
            financial records while also
            preserving information that
            must remain for security,
            legal, billing, audit, or
            shared-workspace purposes.
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

type DeletionScopeCardProps = {
  scope: DeletionScope;
};

function DeletionScopeCard({
  scope,
}: DeletionScopeCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <DeletionScopeIcon
          icon={
            scope.icon
          }
        />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        {scope.title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {scope.description}
      </p>

      <ul className="mt-4 space-y-2 text-xs leading-5 text-[var(--text-muted)]">
        {scope.includes.map(
          (
            item,
          ) => (
            <li
              key={item}
              className="flex items-start gap-2"
            >
              <span
                aria-hidden="true"
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]"
              />

              <span>
                {item}
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

type ProcessStepProps = {
  number: string;
  title: string;
  description: string;
};

function ProcessStep({
  number,
  title,
  description,
}: ProcessStepProps) {
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
            <TrashIcon />
          ) : tone ===
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
        href="/legal/security"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Previous
        </p>

        <div className="mt-3 flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <ArrowLeftIcon />

          Security Practices
        </div>
      </Link>

      <Link
        href="/legal/terms"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 text-right outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Next
        </p>

        <div className="mt-3 flex items-center justify-end gap-2 font-bold text-[var(--text-primary)]">
          Terms of Service

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
          aria-label="Data deletion navigation"
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

type DeletionScopeIconProps = {
  icon:
    DeletionScope["icon"];
};

function DeletionScopeIcon({
  icon,
}: DeletionScopeIconProps) {
  switch (icon) {
    case "workspace":
      return (
        <WorkspaceIcon />
      );

    case "bank":
      return (
        <BankIcon />
      );

    case "document":
      return (
        <DocumentIcon />
      );

    case "user":
    default:
      return (
        <UserIcon />
      );
  }
}

function TrashIcon() {
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
      <path d="M4 7h16" />
      <path d="M9 3h6l1 4H8Z" />
      <path d="m7 7 1 14h8l1-14" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function UserIcon() {
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
        height="16"
        rx="2"
      />

      <path d="M8 4v16" />
      <path d="M8 10h13" />
    </svg>
  );
}

function BankIcon() {
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
      <path d="m3 9 9-5 9 5" />
      <path d="M5 10v7" />
      <path d="M9 10v7" />
      <path d="M15 10v7" />
      <path d="M19 10v7" />
      <path d="M3 20h18" />
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
      <path d="M9 17h5" />
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