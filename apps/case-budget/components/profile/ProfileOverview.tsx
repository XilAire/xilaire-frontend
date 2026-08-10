"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import ChangeEmailModal from "@/components/profile/ChangeEmailModal";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";
import EditProfileModal from "@/components/profile/EditProfileModal";
import ExportAccountDataButton from "@/components/profile/ExportAccountDataButton";

import {
  useApp,
} from "@/components/providers/AppProvider";

export default function ProfileOverview() {
  const router =
    useRouter();

  const {
    currentUser,
    activeWorkspace,
  } =
    useApp();

  const [
    isEditProfileOpen,
    setIsEditProfileOpen,
  ] =
    useState(
      false,
    );

  const [
    isChangeEmailOpen,
    setIsChangeEmailOpen,
  ] =
    useState(
      false,
    );

  const [
    isDeleteAccountOpen,
    setIsDeleteAccountOpen,
  ] =
    useState(
      false,
    );

  const displayName =
    currentUser?.displayName ??
    "CASE Budget User";

  const email =
    currentUser?.email ??
    "";

  const firstName =
    currentUser?.firstName ??
    getFirstName(
      displayName,
    );

  const lastName =
    currentUser?.lastName ??
    getLastName(
      displayName,
    );

  const initials =
    useMemo(
      () =>
        getInitials(
          displayName,
        ),
      [
        displayName,
      ],
    );

  const workspaceName =
    activeWorkspace?.name ??
    "Personal workspace";

  const workspaceType =
    formatWorkspaceType(
      activeWorkspace?.type,
    );

  function openEditProfile() {
    setIsEditProfileOpen(
      true,
    );
  }

  function closeEditProfile() {
    setIsEditProfileOpen(
      false,
    );

    router.refresh();
  }

  function openChangeEmail() {
    setIsChangeEmailOpen(
      true,
    );
  }

  function closeChangeEmail() {
    setIsChangeEmailOpen(
      false,
    );

    router.refresh();
  }

  function openDeleteAccount() {
    setIsDeleteAccountOpen(
      true,
    );
  }

  function closeDeleteAccount() {
    setIsDeleteAccountOpen(
      false,
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageHeader />

        <ProfileSummaryCard
          displayName={
            displayName
          }
          email={
            email
          }
          initials={
            initials
          }
          workspaceName={
            workspaceName
          }
          workspaceType={
            workspaceType
          }
        />

        <ProfileDetailsSection
          firstName={
            firstName
          }
          lastName={
            lastName
          }
          displayName={
            displayName
          }
          email={
            email
          }
          onEditProfile={
            openEditProfile
          }
          onChangeEmail={
            openChangeEmail
          }
        />

        <WorkspaceSection
          workspaceName={
            workspaceName
          }
          workspaceType={
            workspaceType
          }
        />

        <AccountSecuritySection />

        <ProfileDataSection
          onDeleteAccount={
            openDeleteAccount
          }
        />
      </div>

      <EditProfileModal
        isOpen={
          isEditProfileOpen
        }
        firstName={
          firstName
        }
        lastName={
          lastName
        }
        displayName={
          displayName
        }
        email={
          email
        }
        onClose={
          closeEditProfile
        }
      />

      <ChangeEmailModal
        isOpen={
          isChangeEmailOpen
        }
        currentEmail={
          email
        }
        onClose={
          closeChangeEmail
        }
      />

      <DeleteAccountModal
        isOpen={
          isDeleteAccountOpen
        }
        email={
          email
        }
        onClose={
          closeDeleteAccount
        }
      />
    </>
  );
}

function PageHeader() {
  return (
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
        Account
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
        Profile
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
        Review and manage your personal CASE Budget account information,
        workspace details, and account preferences.
      </p>
    </header>
  );
}

function ProfileSummaryCard({
  displayName,
  email,
  initials,
  workspaceName,
  workspaceType,
}: {
  displayName:
    string;

  email:
    string;

  initials:
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
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-lg font-black text-[var(--primary)] ring-1 ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]">
            {initials}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-[var(--text-primary)]">
              {displayName}
            </h2>

            {email ? (
              <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
                {email}
              </p>
            ) : null}

            <span className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--success)]">
              <CheckIcon />

              Active account
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[380px]">
          <SummaryMetric
            label="Workspace"
            value={
              workspaceName
            }
          />

          <SummaryMetric
            label="Workspace type"
            value={
              workspaceType
            }
          />
        </div>
      </div>
    </section>
  );
}

function SummaryMetric({
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

function ProfileDetailsSection({
  firstName,
  lastName,
  displayName,
  email,
  onEditProfile,
  onChangeEmail,
}: {
  firstName:
    string;

  lastName:
    string;

  displayName:
    string;

  email:
    string;

  onEditProfile:
    () => void;

  onChangeEmail:
    () => void;
}) {
  return (
    <ProfileSection
      title="Personal information"
      description="Review the identity information associated with your CASE Budget account."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ProfileField
          label="First name"
          value={
            firstName ||
            "Not provided"
          }
        />

        <ProfileField
          label="Last name"
          value={
            lastName ||
            "Not provided"
          }
        />

        <ProfileField
          label="Display name"
          value={
            displayName
          }
        />

        <ProfileField
          label="Email address"
          value={
            email ||
            "Not provided"
          }
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={
            onEditProfile
          }
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[var(--primary-foreground)] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <EditIcon />

          Edit profile
        </button>

        <button
          type="button"
          onClick={
            onChangeEmail
          }
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <MailIcon />

          Change email
        </button>
      </div>
    </ProfileSection>
  );
}

function WorkspaceSection({
  workspaceName,
  workspaceType,
}: {
  workspaceName:
    string;

  workspaceType:
    string;
}) {
  return (
    <ProfileSection
      title="Current workspace"
      description="Your profile is currently working inside this CASE Budget financial workspace."
    >
      <div className="flex flex-col gap-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--primary)] shadow-sm">
            <WorkspaceIcon />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--text-primary)]">
              {workspaceName}
            </p>

            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {workspaceType}
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/settings"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          Manage workspace

          <ChevronRightIcon />
        </Link>
      </div>
    </ProfileSection>
  );
}

function AccountSecuritySection() {
  return (
    <ProfileSection
      title="Account security"
      description="Review and manage the security controls protecting your CASE Budget account."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <NavigationCard
          href="/dashboard/settings/security"
          icon={
            <ShieldIcon />
          }
          title="Multi-factor authentication"
          description="Manage authenticator enrollment, MFA verification, and account protection."
        />

        <NavigationCard
          href="/dashboard/settings"
          icon={
            <SettingsIcon />
          }
          title="Account settings"
          description="Manage general preferences, workspace options, privacy, and subscription settings."
        />
      </div>
    </ProfileSection>
  );
}

function ProfileDataSection({
  onDeleteAccount,
}: {
  onDeleteAccount:
    () => void;
}) {
  return (
    <ProfileSection
      title="Data & privacy"
      description="Control how your CASE Budget account information is handled."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ExportDataCard />

        <DeleteAccountCard
          onDeleteAccount={
            onDeleteAccount
          }
        />
      </div>
    </ProfileSection>
  );
}

function ExportDataCard() {
  return (
    <div className="flex flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--primary)] shadow-sm">
          <DownloadIcon />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Export account data
            </h3>

            <span className="rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--success)]">
              Available
            </span>
          </div>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Download a JSON copy of your CASE Budget profile, workspace,
            budgets, accounts, transactions, bills, goals, debts,
            investments, pay cycles, and net-worth history.
          </p>
        </div>
      </div>

      <ExportAccountDataButton
        className="mt-4"
        variant="card"
      />
    </div>
  );
}

function DeleteAccountCard({
  onDeleteAccount,
}: {
  onDeleteAccount:
    () => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-[color-mix(in_srgb,var(--danger)_22%,var(--border-subtle))] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--danger)] shadow-sm">
          <TrashIcon />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Delete account
            </h3>

            <span className="rounded-full bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--danger)]">
              Permanent
            </span>
          </div>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Permanently remove your CASE Budget account and associated
            personal data. Shared workspace ownership must be resolved before
            an account can be deleted.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={
          onDeleteAccount
        }
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface-default))] focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]"
      >
        <TrashIcon />

        Delete account
      </button>
    </div>
  );
}

function ProfileSection({
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

function ProfileField({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function NavigationCard({
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

function InformationCard({
  icon,
  title,
  description,
  status,
  isDanger = false,
}: {
  icon:
    React.ReactNode;

  title:
    string;

  description:
    string;

  status:
    string;

  isDanger?:
    boolean;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] shadow-sm",
          isDanger
            ? "text-[var(--danger)]"
            : "text-[var(--primary)]",
        ].join(
          " ",
        )}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </h3>

          <span className="rounded-full bg-[var(--surface-default)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-muted)]">
            {status}
          </span>
        </div>

        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function getFirstName(
  displayName:
    string,
) {
  return (
    displayName
      .trim()
      .split(
        /\s+/,
      )[0] ??
    ""
  );
}

function getLastName(
  displayName:
    string,
) {
  const parts =
    displayName
      .trim()
      .split(
        /\s+/,
      );

  if (
    parts.length <=
    1
  ) {
    return "";
  }

  return parts
    .slice(
      1,
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

function formatWorkspaceType(
  value:
    string | undefined,
) {
  if (
    !value
  ) {
    return "Personal workspace";
  }

  return `${value
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
    )} workspace`;
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 12 4 4 8-8" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
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

function WorkspaceIcon() {
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
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
      />

      <path d="M8 4v16" />
      <path d="M8 9h13" />
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

function SettingsIcon() {
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
        r="3"
      />

      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function DownloadIcon() {
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
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
