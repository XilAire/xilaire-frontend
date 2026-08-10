"use client";

import Link from "next/link";

import AppearanceSettings from "@/components/settings/AppearanceSettings";

import {
  useApp,
} from "@/components/providers/AppProvider";

export default function SettingsOverview() {
  const {
    currentUser,
    activeWorkspace,
  } =
    useApp();

  const workspaceName =
    activeWorkspace?.name ??
    "Personal workspace";

  const workspaceType =
    formatWorkspaceType(
      activeWorkspace?.type,
    );

  const displayName =
    currentUser?.displayName ??
    "CASE Budget User";

  const email =
    currentUser?.email ??
    "";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader />

      <AccountSummary
        displayName={
          displayName
        }
        email={
          email
        }
        workspaceName={
          workspaceName
        }
        workspaceType={
          workspaceType
        }
      />

      <SettingsSection
        title="Account"
        description="Manage your personal CASE Budget account and security settings."
      >
        <SettingsGrid>
          <SettingsNavigationCard
            href="/dashboard/profile"
            icon={
              <UserIcon />
            }
            title="Profile"
            description="Manage your name, email address, personal information, and account details."
          />

          <SettingsNavigationCard
            href="/dashboard/settings/security"
            icon={
              <ShieldIcon />
            }
            title="Security"
            description="Manage multi-factor authentication, account protection, and identity verification."
          />
        </SettingsGrid>
      </SettingsSection>

      <SettingsSection
        title="Workspace"
        description="Manage how your active financial workspace is organized and shared."
      >
        <SettingsGrid>
          <SettingsNavigationCard
            href="/dashboard/household/members"
            icon={
              <UsersIcon />
            }
            title="Household members"
            description="Manage people, roles, and access to your shared financial workspace."
          />

          <SettingsNavigationCard
            href="/dashboard/household/approvals"
            icon={
              <ApprovalIcon />
            }
            title="Approval controls"
            description="Review household approval requests and prepare authorization rules for shared actions."
          />
        </SettingsGrid>
      </SettingsSection>

      <SettingsSection
        title="Appearance"
        description="Choose how CASE Budget looks on this device."
      >
        <AppearanceSettings />
      </SettingsSection>

      <SettingsSection
        title="Preferences"
        description="Control how CASE Budget behaves and communicates with you."
      >
        <div className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-xl border border-[var(--border-subtle)]">
          <PreferenceRow
            icon={
              <NotificationIcon />
            }
            title="Notifications"
            description="Control reminders for bills, budgets, goals, account activity, and household events."
            status="Coming soon"
          />

          <PreferenceRow
            icon={
              <CurrencyIcon />
            }
            title="Currency and regional settings"
            description="Configure your default currency, locale, date format, and financial display preferences."
            status="Coming soon"
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Data & privacy"
        description="Review how your financial information is managed and access account-level privacy controls."
      >
        <SettingsGrid>
          <SettingsNavigationCard
            href="/dashboard/profile"
            icon={
              <DatabaseIcon />
            }
            title="Financial data"
            description="Export your CASE Budget account data and review the information associated with your profile and financial workspace."
          />

          <SettingsInformationCard
            icon={
              <PrivacyIcon />
            }
            title="Privacy controls"
            description="Additional data-retention and privacy-management controls will be available here."
          />
        </SettingsGrid>
      </SettingsSection>

      <SettingsSection
        title="Subscription"
        description="Review the CASE Budget features available to your account."
      >
        <PlanCard />
      </SettingsSection>
    </div>
  );
}

function PageHeader() {
  return (
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
        Account & workspace
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
        Settings
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
        Manage your CASE Budget account, financial workspace, security,
        preferences, privacy, and application settings.
      </p>
    </header>
  );
}

function AccountSummary({
  displayName,
  email,
  workspaceName,
  workspaceType,
}: {
  displayName:
    string;

  email:
    string;

  workspaceName:
    string;

  workspaceType:
    string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-base font-black text-[var(--primary)] ring-1 ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]">
            {getInitials(
              displayName,
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-[var(--text-primary)]">
              {displayName}
            </p>

            {email ? (
              <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
                {email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
          <SummaryValue
            label="Workspace"
            value={
              workspaceName
            }
          />

          <SummaryValue
            label="Type"
            value={
              workspaceType
            }
          />
        </div>
      </div>
    </section>
  );
}

function SummaryValue({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title:
    string;

  description:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          {title}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

function SettingsGrid({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {children}
    </div>
  );
}

function SettingsNavigationCard({
  href,
  icon,
  title,
  description,
}: {
  href:
    string;

  icon:
    React.ReactNode;

  title:
    string;

  description:
    string;
}) {
  return (
    <Link
      href={
        href
      }
      className="group flex items-start gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_28%,var(--border-subtle))] hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--primary)] shadow-sm">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </h3>

          <span className="shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--primary)]">
            <ChevronRightIcon />
          </span>
        </div>

        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </p>
      </div>
    </Link>
  );
}

function SettingsInformationCard({
  icon,
  title,
  description,
}: {
  icon:
    React.ReactNode;

  title:
    string;

  description:
    string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--primary)] shadow-sm">
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function PreferenceRow({
  icon,
  title,
  description,
  status,
}: {
  icon:
    React.ReactNode;

  title:
    string;

  description:
    string;

  status:
    string;
}) {
  return (
    <div className="flex flex-col gap-4 bg-[var(--surface-muted)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--primary)] shadow-sm">
          {icon}
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

      <span className="inline-flex w-fit shrink-0 rounded-full bg-[var(--surface-default)] px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]">
        {status}
      </span>
    </div>
  );
}

function PlanCard() {
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
            <PlanIcon />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
              CASE Budget
            </p>

            <h3 className="mt-1 text-base font-bold text-[var(--text-primary)]">
              Subscription & features
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              Plan management, billing information, AI Coach usage, and
              connected-account feature access will be managed here.
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit shrink-0 rounded-full bg-[var(--pro-soft)] px-3 py-1.5 text-xs font-bold text-[var(--pro)]">
          Plan settings
        </span>
      </div>
    </div>
  );
}

function formatWorkspaceType(
  value:
    string | undefined,
) {
  if (
    !value
  ) {
    return "Personal";
  }

  return value
    .split(
      "-",
    )
    .map(
      (
        part,
      ) =>
        part.charAt(
          0,
        ).toUpperCase() +
        part.slice(
          1,
        ),
    )
    .join(
      " ",
    );
}

function getInitials(
  name:
    string,
) {
  return (
    name
      .trim()
      .split(
        /\s+/,
      )
      .map(
        (
          part,
        ) =>
          part.charAt(
            0,
          ),
      )
      .join(
        "",
      )
      .slice(
        0,
        2,
      )
      .toUpperCase() ||
    "CB"
  );
}

function UserIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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

function ShieldIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="8"
        r="4"
      />

      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 3.5a4 4 0 0 1 0 8" />
      <path d="M18 15a6 6 0 0 1 4 6" />
    </svg>
  );
}

function ApprovalIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 11 12 14 20 6" />
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function NotificationIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" />
      <path d="M12 6v12" />
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
      strokeWidth="1.8"
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

      <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="11"
        rx="2"
      />

      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.3-4.4 2.3.8-5-3.6-3.5 5-.7Z" />
    </svg>
  );
}

function ChevronRightIcon() {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
