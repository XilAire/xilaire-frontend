"use client";

import {
  useMemo,
} from "react";

import {
  useApp,
} from "@/components/providers/AppProvider";

type MemberRole =
  | "Owner"
  | "Admin"
  | "Member"
  | "Viewer";

type HouseholdMember = {
  id:
    string;

  name:
    string;

  email:
    string;

  role:
    MemberRole;

  status:
    "active" | "invited";

  isCurrentUser:
    boolean;
};

export default function HouseholdMembersOverview() {
  const {
    currentUser,
    activeWorkspace,
  } =
    useApp();

  const members =
    useMemo<
      HouseholdMember[]
    >(
      () => {
        if (
          !currentUser
        ) {
          return [];
        }

        return [
          {
            id:
              currentUser.id,

            name:
              currentUser.displayName,

            email:
              currentUser.email,

            role:
              activeWorkspace?.isOwner
                ? "Owner"
                : "Member",

            status:
              "active",

            isCurrentUser:
              true,
          },
        ];
      },
      [
        activeWorkspace?.isOwner,
        currentUser,
      ],
    );

  const activeMemberCount =
    members.filter(
      (
        member,
      ) =>
        member.status ===
        "active",
    ).length;

  const pendingInviteCount =
    members.filter(
      (
        member,
      ) =>
        member.status ===
        "invited",
    ).length;

  const workspaceName =
    activeWorkspace?.name ??
    "Personal workspace";

  const workspaceType =
    formatWorkspaceType(
      activeWorkspace?.type,
    );

  return (
  <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader />

      <HouseholdSummary
        workspaceName={
          workspaceName
        }
        workspaceType={
          workspaceType
        }
        memberCount={
          activeMemberCount
        }
        pendingInviteCount={
          pendingInviteCount
        }
      />

      <MembersSection
        members={
          members
        }
      />

      <HouseholdAccessSection />

      <HouseholdUpgradeNotice />
    </div>
  );
}

function PageHeader() {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
          Household
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Members
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Manage the people who can access your household workspace, control
          their permissions, and collaborate on your financial plan.
        </p>
      </div>

      <button
        type="button"
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[var(--primary-foreground)] shadow-sm outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <PlusIcon />

        Invite member
      </button>
    </header>
  );
}

function HouseholdSummary({
  workspaceName,
  workspaceType,
  memberCount,
  pendingInviteCount,
}: {
  workspaceName:
    string;

  workspaceType:
    string;

  memberCount:
    number;

  pendingInviteCount:
    number;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
            <HouseholdIcon />
          </div>

          <h2 className="mt-4 truncate text-xl font-bold text-[var(--text-primary)]">
            {workspaceName}
          </h2>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {workspaceType}
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--success)]">
          <CheckIcon />

          Active workspace
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryMetric
          label="Members"
          value={
            String(
              memberCount,
            )
          }
          description="Active household access"
        />

        <SummaryMetric
          label="Pending invites"
          value={
            String(
              pendingInviteCount,
            )
          }
          description="Waiting for acceptance"
        />

        <SummaryMetric
          label="Workspace"
          value={
            workspaceType
          }
          description="Current collaboration type"
        />
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  description,
}: {
  label:
    string;

  value:
    string;

  description:
    string;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-2 truncate text-lg font-bold text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function MembersSection({
  members,
}: {
  members:
    HouseholdMember[];
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Household members
          </h2>

          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            People who currently have access to this financial workspace.
          </p>
        </div>

        <span className="text-xs font-semibold text-[var(--text-muted)]">
          {members.length}{" "}
          {members.length ===
          1
            ? "member"
            : "members"}
        </span>
      </div>

      {members.length >
      0 ? (
        <div className="divide-y divide-[var(--border-subtle)]">
          {members.map(
            (
              member,
            ) => (
              <MemberRow
                key={
                  member.id
                }
                member={
                  member
                }
              />
            ),
          )}
        </div>
      ) : (
        <EmptyMembersState />
      )}
    </section>
  );
}

function MemberRow({
  member,
}: {
  member:
    HouseholdMember;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-center gap-4">
        <MemberAvatar
          name={
            member.name
          }
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-[var(--text-primary)]">
              {member.name}
            </p>

            {member.isCurrentUser ? (
              <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                You
              </span>
            ) : null}

            <MemberStatusBadge
              status={
                member.status
              }
            />
          </div>

          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
            {member.email}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <RoleBadge
          role={
            member.role
          }
        />

        <button
          type="button"
          aria-label={`Manage ${member.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <MoreIcon />
        </button>
      </div>
    </div>
  );
}

function MemberAvatar({
  name,
}: {
  name:
    string;
}) {
  const initials =
    getInitials(
      name,
    );

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-sm font-black text-[var(--primary)] ring-1 ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]">
      {initials}
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role:
    MemberRole;
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)]">
      {role}
    </span>
  );
}

function MemberStatusBadge({
  status,
}: {
  status:
    HouseholdMember["status"];
}) {
  const active =
    status ===
    "active";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
        active
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]",
      ].join(
        " ",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {active
        ? "Active"
        : "Invited"}
    </span>
  );
}

function HouseholdAccessSection() {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          Household access
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Roles determine what household members can view and manage inside
          your shared financial workspace.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <PermissionCard
          icon={
            <CrownIcon />
          }
          title="Owner"
          description="Full workspace access, including member management, security, financial data, and workspace settings."
        />

        <PermissionCard
          icon={
            <ShieldIcon />
          }
          title="Admin"
          description="Can manage shared financial information and most household settings without ownership controls."
        />

        <PermissionCard
          icon={
            <UserIcon />
          }
          title="Member"
          description="Can participate in shared budgeting, transactions, bills, goals, and other enabled household features."
        />

        <PermissionCard
          icon={
            <EyeIcon />
          }
          title="Viewer"
          description="Read-only access to the household financial plan without permission to make changes."
        />
      </div>
    </section>
  );
}

function PermissionCard({
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
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start gap-3">
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
    </div>
  );
}

function HouseholdUpgradeNotice() {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
            <UsersIcon />
          </div>

          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Plan together
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              Household collaboration will let families coordinate budgets,
              bills, goals, approvals, and financial activity from one shared
              workspace.
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-[var(--pro-soft)] px-3 py-1.5 text-xs font-bold text-[var(--pro)]">
          Household feature
        </span>
      </div>
    </section>
  );
}

function EmptyMembersState() {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
        <UsersIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        No household members yet
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        Invite someone you trust when you are ready to start managing your
        household finances together.
      </p>
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
    return "Personal workspace";
  }

  return `${value
    .split("-")
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

function getInitials(
  name:
    string,
) {
  const initials =
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
      .toUpperCase();

  return initials ||
    "CB";
}

function PlusIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function HouseholdIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="21"
      height="21"
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

function UserIcon() {
  return (
    <svg
      width="18"
      height="18"
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
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 7 4 4 5-7 5 7 4-4-2 11H5Z" />
      <path d="M5 21h14" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle
        cx="12"
        cy="12"
        r="2.5"
      />
    </svg>
  );
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

function MoreIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle
        cx="5"
        cy="12"
        r="1.4"
      />
      <circle
        cx="12"
        cy="12"
        r="1.4"
      />
      <circle
        cx="19"
        cy="12"
        r="1.4"
      />
    </svg>
  );
}