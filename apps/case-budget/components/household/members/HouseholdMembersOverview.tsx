"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  manageHouseholdMember,
} from "@/actions/household/manage-member";

import InviteMemberModal from "@/components/household/members/InviteMemberModal";

import {
  useApp,
} from "@/components/providers/AppProvider";

import {
  getHouseholdMembers,
} from "@/actions/household/get-household-members";

import type {
  HouseholdMemberRecord,
} from "@/actions/household/get-household-members";

import type {
  HouseholdMemberManagementAction,
} from "@/types/household/member-management";

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
    | "active"
    | "invited"
    | "suspended";

  databaseRole:
    HouseholdMemberRecord["role"];

  memberLabel:
    string | null;

  suspensionReason:
    string | null;

  isCurrentUser:
    boolean;
};

type MemberManagementSelection = {
  member:
    HouseholdMember;

  action:
    HouseholdMemberManagementAction;
};

export default function HouseholdMembersOverview() {
  const [
    isInviteMemberModalOpen,
    setIsInviteMemberModalOpen,
  ] =
    useState(
      false,
    );

  const [
    databaseMembers,
    setDatabaseMembers,
  ] =
    useState<
      HouseholdMemberRecord[]
    >(
      [],
    );

  const [
    isLoadingMembers,
    setIsLoadingMembers,
  ] =
    useState(
      true,
    );

  const [
    membersError,
    setMembersError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    managementSelection,
    setManagementSelection,
  ] =
    useState<
      MemberManagementSelection | null
    >(
      null,
    );

  const {
    currentUser,
    activeWorkspace,
  } =
    useApp();

  const workspaceId =
    activeWorkspace?.id ??
    null;

  const loadMembers =
    useCallback(
      async () => {
        if (
          !workspaceId
        ) {
          setDatabaseMembers(
            [],
          );

          setMembersError(
            null,
          );

          setIsLoadingMembers(
            false,
          );

          return;
        }

        setIsLoadingMembers(
          true,
        );

        setMembersError(
          null,
        );

        try {
          const result =
            await getHouseholdMembers(
              workspaceId,
            );

          if (
            !result.success
          ) {
            setDatabaseMembers(
              [],
            );

            setMembersError(
              result.error,
            );

            return;
          }

          setDatabaseMembers(
            result.members,
          );
        } catch (
          error
        ) {
          console.error(
            "[CASE Budget Household] Failed to load household members.",
            error,
          );

          setDatabaseMembers(
            [],
          );

          setMembersError(
            "Unable to load household members.",
          );
        } finally {
          setIsLoadingMembers(
            false,
          );
        }
      },
      [
        workspaceId,
      ],
    );

  useEffect(
    () => {
      void loadMembers();
    },
    [
      loadMembers,
    ],
  );

  const members =
    useMemo<
      HouseholdMember[]
    >(
      () => {
        if (
          databaseMembers.length >
          0
        ) {
          return databaseMembers
            .filter(
              (
                member,
              ) =>
                member.status ===
                  "active" ||
                member.status ===
                  "invited" ||
                member.status ===
                  "suspended",
            )
            .map(
              (
                member,
              ) => ({
                id:
                  member.id,

                name:
                  member.name,

                email:
                  member.email,

                role:
                  formatMemberRole(
                    member.role,
                  ),

                databaseRole:
                  member.role,

                status:
                  member.status ===
                    "suspended"
                    ? "suspended"
                    : member.status ===
                        "invited"
                      ? "invited"
                      : "active",

                memberLabel:
                  member.memberLabel,

                suspensionReason:
                  member.suspensionReason,

                isCurrentUser:
                  member.isCurrentUser,
              }),
            );
        }

        if (
          isLoadingMembers ||
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

            databaseRole:
              activeWorkspace?.isOwner
                ? "owner"
                : "member",

            status:
              "active",

            memberLabel:
              null,

            suspensionReason:
              null,

            isCurrentUser:
              true,
          },
        ];
      },
      [
        activeWorkspace?.isOwner,
        currentUser,
        databaseMembers,
        isLoadingMembers,
      ],
    );

  const currentMembership =
    members.find(
      (
        member,
      ) =>
        member.isCurrentUser,
    ) ??
    null;

  const currentUserCanManageMembers =
    currentMembership?.databaseRole ===
      "owner" ||
    currentMembership?.databaseRole ===
      "admin";

  const currentUserIsOwner =
    currentMembership?.databaseRole ===
      "owner" ||
    activeWorkspace?.isOwner ===
      true;

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

  const blockedMemberCount =
    members.filter(
      (
        member,
      ) =>
        member.status ===
        "suspended",
    ).length;

  const workspaceName =
    activeWorkspace?.name ??
    "Personal workspace";

  const workspaceType =
    formatWorkspaceType(
      activeWorkspace?.type,
    );

  function handleOpenInviteMemberModal() {
    setIsInviteMemberModalOpen(
      true,
    );
  }

  function handleCloseInviteMemberModal() {
    setIsInviteMemberModalOpen(
      false,
    );
  }

  function handleInvitationSent() {
    void loadMembers();
  }

  function handleOpenManagementConfirmation(
    member:
      HouseholdMember,

    action:
      HouseholdMemberManagementAction,
  ) {
    setManagementSelection({
      member,
      action,
    });
  }

  function handleCloseManagementConfirmation() {
    setManagementSelection(
      null,
    );
  }

  async function handleMemberManaged() {
    setManagementSelection(
      null,
    );

    await loadMembers();
  }

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageHeader
          canInvite={
            currentUserCanManageMembers
          }
          onInviteMember={
            handleOpenInviteMemberModal
          }
        />

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
          blockedMemberCount={
            blockedMemberCount
          }
        />

        <MembersSection
          members={
            members
          }
          isLoading={
            isLoadingMembers
          }
          error={
            membersError
          }
          canManageMembers={
            currentUserCanManageMembers
          }
          currentUserIsOwner={
            currentUserIsOwner
          }
          onRetry={
            loadMembers
          }
          onManageMember={
            handleOpenManagementConfirmation
          }
        />

        <HouseholdAccessSection />

        <HouseholdUpgradeNotice />
      </div>

      <InviteMemberModal
        open={
          isInviteMemberModalOpen
        }
        workspaceName={
          workspaceName
        }
        onClose={
          handleCloseInviteMemberModal
        }
        onInvitationSent={
          handleInvitationSent
        }
      />

      <MemberManagementConfirmationModal
        selection={
          managementSelection
        }
        workspaceName={
          workspaceName
        }
        onClose={
          handleCloseManagementConfirmation
        }
        onCompleted={
          handleMemberManaged
        }
      />
    </>
  );
}

function PageHeader({
  canInvite,
  onInviteMember,
}: {
  canInvite:
    boolean;

  onInviteMember:
    () => void;
}) {
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

      {canInvite ? (
        <button
          type="button"
          onClick={
            onInviteMember
          }
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[var(--primary-foreground)] shadow-sm outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <PlusIcon />

          Invite member
        </button>
      ) : null}
    </header>
  );
}

function HouseholdSummary({
  workspaceName,
  workspaceType,
  memberCount,
  pendingInviteCount,
  blockedMemberCount,
}: {
  workspaceName:
    string;

  workspaceType:
    string;

  memberCount:
    number;

  pendingInviteCount:
    number;

  blockedMemberCount:
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          label="Blocked"
          value={
            String(
              blockedMemberCount,
            )
          }
          description="Access suspended"
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
  isLoading,
  error,
  canManageMembers,
  currentUserIsOwner,
  onRetry,
  onManageMember,
}: {
  members:
    HouseholdMember[];

  isLoading:
    boolean;

  error:
    string | null;

  canManageMembers:
    boolean;

  currentUserIsOwner:
    boolean;

  onRetry:
    () => void | Promise<void>;

  onManageMember:
    (
      member:
        HouseholdMember,

      action:
        HouseholdMemberManagementAction,
    ) => void;
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

        {!isLoading ? (
          <span className="text-xs font-semibold text-[var(--text-muted)]">
            {members.length}{" "}
            {members.length ===
            1
              ? "member"
              : "members"}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <MembersLoadingState />
      ) : error &&
        members.length ===
          0 ? (
        <MembersErrorState
          message={
            error
          }
          onRetry={
            onRetry
          }
        />
      ) : members.length >
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
                canManageMembers={
                  canManageMembers
                }
                currentUserIsOwner={
                  currentUserIsOwner
                }
                onManageMember={
                  onManageMember
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
  canManageMembers,
  currentUserIsOwner,
  onManageMember,
}: {
  member:
    HouseholdMember;

  canManageMembers:
    boolean;

  currentUserIsOwner:
    boolean;

  onManageMember:
    (
      member:
        HouseholdMember,

      action:
        HouseholdMemberManagementAction,
    ) => void;
}) {
  const canManageThisMember =
    canManageMembers &&
    !member.isCurrentUser &&
    member.databaseRole !==
      "owner" &&
    (
      currentUserIsOwner ||
      member.databaseRole !==
        "admin"
    );

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

          {member.memberLabel ? (
            <p className="mt-1 truncate text-[11px] font-medium text-[var(--text-secondary)]">
              {member.memberLabel}
            </p>
          ) : null}

          {member.status ===
            "suspended" &&
          member.suspensionReason ? (
            <p className="mt-1 max-w-xl text-[11px] leading-5 text-[var(--danger)]">
              {member.suspensionReason}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <RoleBadge
          role={
            member.role
          }
        />

        {canManageThisMember ? (
          <MemberActionsMenu
            member={
              member
            }
            onManageMember={
              onManageMember
            }
          />
        ) : (
          <div
            className="h-9 w-9"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

function MemberActionsMenu({
  member,
  onManageMember,
}: {
  member:
    HouseholdMember;

  onManageMember:
    (
      member:
        HouseholdMember,

      action:
        HouseholdMemberManagementAction,
    ) => void;
}) {
  const [
    isOpen,
    setIsOpen,
  ] =
    useState(
      false,
    );

  const menuRef =
    useRef<HTMLDivElement>(
      null,
    );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      function handlePointerDown(
        event:
          MouseEvent,
      ) {
        if (
          menuRef.current &&
          !menuRef.current.contains(
            event.target as Node,
          )
        ) {
          setIsOpen(
            false,
          );
        }
      }

      function handleKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          setIsOpen(
            false,
          );
        }
      }

      document.addEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handlePointerDown,
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      isOpen,
    ],
  );

  function chooseAction(
    action:
      HouseholdMemberManagementAction,
  ) {
    setIsOpen(
      false,
    );

    onManageMember(
      member,
      action,
    );
  }

  return (
    <div
      ref={
        menuRef
      }
      className="relative"
    >
      <button
        type="button"
        aria-label={`Manage ${member.name}`}
        aria-haspopup="menu"
        aria-expanded={
          isOpen
        }
        onClick={() => {
          setIsOpen(
            (
              current,
            ) =>
              !current,
          );
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <MoreIcon />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.4rem)] z-40 min-w-56 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1.5 shadow-[var(--shadow-xl)]"
        >
          {member.status ===
          "suspended" ? (
            <>
              <MemberActionButton
                label="Unblock member"
                description="Allow this person to be invited again."
                onClick={() => {
                  chooseAction(
                    "unblock",
                  );
                }}
              />

              <MemberActionButton
                danger
                label="Remove record"
                description="Remove this blocked membership."
                onClick={() => {
                  chooseAction(
                    "remove",
                  );
                }}
              />
            </>
          ) : member.status ===
            "invited" ? (
            <>
              <MemberActionButton
                label="Cancel invitation"
                description="Cancel this pending workspace invitation."
                onClick={() => {
                  chooseAction(
                    "remove",
                  );
                }}
              />

              <MemberActionButton
                danger
                label="Block invitee"
                description="Cancel access and prevent future invitations."
                onClick={() => {
                  chooseAction(
                    "block",
                  );
                }}
              />
            </>
          ) : (
            <>
              <MemberActionButton
                label="Remove member"
                description="Revoke access but allow a future invitation."
                onClick={() => {
                  chooseAction(
                    "remove",
                  );
                }}
              />

              <MemberActionButton
                danger
                label="Block member"
                description="Revoke access and prevent future invitations."
                onClick={() => {
                  chooseAction(
                    "block",
                  );
                }}
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MemberActionButton({
  label,
  description,
  danger = false,
  onClick,
}: {
  label:
    string;

  description:
    string;

  danger?:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={
        onClick
      }
      className={[
        "w-full rounded-lg px-3 py-2.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        danger
          ? "hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
          : "hover:bg-[var(--surface-muted)]",
      ].join(
        " ",
      )}
    >
      <span
        className={[
          "block text-sm font-bold",
          danger
            ? "text-[var(--danger)]"
            : "text-[var(--text-primary)]",
        ].join(
          " ",
        )}
      >
        {label}
      </span>

      <span className="mt-0.5 block text-[11px] leading-4 text-[var(--text-muted)]">
        {description}
      </span>
    </button>
  );
}

function MemberManagementConfirmationModal({
  selection,
  workspaceName,
  onClose,
  onCompleted,
}: {
  selection:
    MemberManagementSelection | null;

  workspaceName:
    string;

  onClose:
    () => void;

  onCompleted:
    () => void | Promise<void>;
}) {
  const [
    reason,
    setReason,
  ] =
    useState(
      "",
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      setReason(
        "",
      );

      setError(
        null,
      );
    },
    [
      selection,
    ],
  );

  if (
    !selection
  ) {
    return null;
  }

  const {
    member,
    action,
  } =
    selection;

  const copy =
    getManagementModalCopy(
      member,
      action,
      workspaceName,
    );

  async function handleConfirm() {
    if (
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(
      true,
    );

    setError(
      null,
    );

    try {
      const result =
        await manageHouseholdMember({
          membershipId:
            member.id,

          action,

          reason:
            reason.trim() ||
            undefined,
        });

      if (
        !result.success
      ) {
        setError(
          result.error.message,
        );

        return;
      }

      await onCompleted();
    } catch (
      submitError
    ) {
      console.error(
        "[CASE Budget Household] Failed to manage workspace member.",
        submitError,
      );

      setError(
        "CASE Budget could not update this member. Please try again.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px]"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !isSubmitting
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[var(--shadow-xl)]"
      >
        <div className="p-5 sm:p-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {copy.title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {copy.description}
          </p>

          <div className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {member.name}
            </p>

            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {member.email}
            </p>
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              Reason <span className="font-medium text-[var(--text-muted)]">(optional)</span>
            </span>

            <textarea
              value={
                reason
              }
              onChange={(
                event,
              ) => {
                setReason(
                  event.target.value.slice(
                    0,
                    500,
                  ),
                );
              }}
              rows={
                3
              }
              maxLength={
                500
              }
              disabled={
                isSubmitting
              }
              placeholder={
                copy.reasonPlaceholder
              }
              className="mt-2 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </label>

          <div className="mt-4 rounded-xl bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
            {copy.warning}
          </div>

          {error ? (
            <div className="mt-4 rounded-xl bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2.5 text-xs font-semibold text-[var(--danger)]">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={
              isSubmitting
            }
            onClick={
              onClose
            }
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] px-4 text-sm font-bold text-[var(--text-primary)]"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={
              isSubmitting
            }
            onClick={() => {
              void handleConfirm();
            }}
            className={[
              "inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold disabled:opacity-60",
              copy.danger
                ? "bg-[var(--danger)] text-white"
                : "bg-[var(--primary)] text-[var(--primary-foreground)]",
            ].join(
              " ",
            )}
          >
            {isSubmitting
              ? copy.submittingLabel
              : copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function getManagementModalCopy(
  member:
    HouseholdMember,

  action:
    HouseholdMemberManagementAction,

  workspaceName:
    string,
) {
  if (
    action ===
    "block"
  ) {
    return {
      title:
        `Block ${member.name}?`,
      description:
        member.status ===
        "invited"
          ? `This will cancel the pending invitation to ${workspaceName} and prevent future invitations.`
          : `This will revoke ${member.name}'s access to ${workspaceName} and prevent future invitations.`,
      warning:
        "The user cannot be invited again until the membership is explicitly unblocked.",
      reasonPlaceholder:
        "Why are you blocking this person?",
      confirmLabel:
        member.status ===
        "invited"
          ? "Block invitee"
          : "Block member",
      submittingLabel:
        "Blocking...",
      danger:
        true,
    };
  }

  if (
    action ===
    "unblock"
  ) {
    return {
      title:
        `Unblock ${member.name}?`,
      description:
        "This removes the block, but it does not restore workspace access automatically.",
      warning:
        "After unblocking, send a new invitation if you want this person to regain access.",
      reasonPlaceholder:
        "Why are you unblocking this person?",
      confirmLabel:
        "Unblock member",
      submittingLabel:
        "Unblocking...",
      danger:
        false,
    };
  }

  return {
    title:
      member.status ===
      "invited"
        ? `Cancel ${member.name}'s invitation?`
        : `Remove ${member.name}?`,
    description:
      member.status ===
      "invited"
        ? `This will cancel the pending invitation to ${workspaceName}.`
        : `This will revoke ${member.name}'s access to ${workspaceName}.`,
    warning:
      "Removing does not permanently block this person. They can be invited again later.",
    reasonPlaceholder:
      member.status ===
      "invited"
        ? "Why are you canceling this invitation?"
        : "Why are you removing this member?",
    confirmLabel:
      member.status ===
      "invited"
        ? "Cancel invitation"
        : "Remove member",
    submittingLabel:
      member.status ===
      "invited"
        ? "Canceling..."
        : "Removing...",
    danger:
      true,
  };
}

function MembersLoadingState() {
  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {[
        1,
        2,
      ].map(
        (
          item,
        ) => (
          <div
            key={
              item
            }
            className="flex animate-pulse items-center gap-4 p-5 sm:p-6"
          >
            <div className="h-11 w-11 shrink-0 rounded-full bg-[var(--surface-muted)]" />

            <div className="min-w-0 flex-1">
              <div className="h-4 w-40 rounded bg-[var(--surface-muted)]" />

              <div className="mt-2 h-3 w-56 max-w-full rounded bg-[var(--surface-muted)]" />
            </div>

            <div className="hidden h-7 w-20 rounded-full bg-[var(--surface-muted)] sm:block" />
          </div>
        ),
      )}
    </div>
  );
}

function MembersErrorState({
  message,
  onRetry,
}: {
  message:
    string;

  onRetry:
    () => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]">
        <WarningIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        Unable to load members
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {message}
      </p>

      <button
        type="button"
        onClick={
          () => {
            void onRetry();
          }
        }
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        Try again
      </button>
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
  const statusConfig =
    status ===
    "active"
      ? {
          label:
            "Active",
          className:
            "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
        }
      : status ===
          "suspended"
        ? {
            label:
              "Blocked",
            className:
              "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]",
          }
        : {
            label:
              "Invited",
            className:
              "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]",
          };

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
        statusConfig.className,
      ].join(
        " ",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {statusConfig.label}
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

function formatMemberRole(
  role:
    HouseholdMemberRecord["role"],
): MemberRole {
  switch (
    role
  ) {
    case "owner":
      return "Owner";

    case "admin":
      return "Admin";

    case "viewer":
      return "Viewer";

    case "member":
    default:
      return "Member";
  }
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
        part
          .charAt(
            0,
          )
          .toUpperCase() +
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

  return (
    initials ||
    "CB"
  );
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

function WarningIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}