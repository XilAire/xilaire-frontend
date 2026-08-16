"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  cancelHouseholdApproval,
} from "@/actions/household/cancel-approval";

import {
  decideHouseholdApproval,
} from "@/actions/household/decide-approval";

import {
  getHouseholdApprovals,
} from "@/actions/household/get-approvals";

import {
  useApp,
} from "@/components/providers/AppProvider";

import type {
  HouseholdApprovalDecision,
  HouseholdApprovalFilter,
  HouseholdApprovalRequest,
  HouseholdApprovalStatus,
  HouseholdApprovalType,
} from "@/types/household/household-approval";

type ApprovalAction =
  | "approve"
  | "reject"
  | "cancel";

type ApprovalActionSelection = {
  approval:
    HouseholdApprovalRequest;

  action:
    ApprovalAction;
};

const approvalFilters: {
  id:
    HouseholdApprovalFilter;

  label:
    string;
}[] = [
  {
    id:
      "pending",

    label:
      "Pending",
  },

  {
    id:
      "all",

    label:
      "All approvals",
  },

  {
    id:
      "approved",

    label:
      "Approved",
  },

  {
    id:
      "rejected",

    label:
      "Rejected",
  },

  {
    id:
      "cancelled",

    label:
      "Cancelled",
  },
];

export default function HouseholdApprovalsOverview() {
  const {
    currentUser,
    activeWorkspace,
  } =
    useApp();

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<HouseholdApprovalFilter>(
      "pending",
    );

  const [
    approvals,
    setApprovals,
  ] =
    useState<
      HouseholdApprovalRequest[]
    >(
      [],
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  const [
    loadError,
    setLoadError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    actionSelection,
    setActionSelection,
  ] =
    useState<
      ApprovalActionSelection | null
    >(
      null,
    );

  const workspaceId =
    activeWorkspace?.id ??
    null;

  const workspaceName =
    activeWorkspace?.name ??
    "Personal workspace";

  const currentUserId =
    currentUser?.id ??
    null;

  const loadApprovals =
    useCallback(
      async () => {
        if (
          !workspaceId
        ) {
          setApprovals(
            [],
          );

          setLoadError(
            null,
          );

          setIsLoading(
            false,
          );

          return;
        }

        setIsLoading(
          true,
        );

        setLoadError(
          null,
        );

        try {
          const result =
            await getHouseholdApprovals();

          if (
            !result.success
          ) {
            setApprovals(
              [],
            );

            setLoadError(
              result.error,
            );

            return;
          }

          setApprovals(
            result.approvals,
          );
        } catch (
          error
        ) {
          console.error(
            "[CASE Budget Household Approvals] Failed to load approval requests.",
            error,
          );

          setApprovals(
            [],
          );

          setLoadError(
            "Unable to load household approval requests.",
          );
        } finally {
          setIsLoading(
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
      void loadApprovals();
    },
    [
      loadApprovals,
    ],
  );

  const filteredApprovals =
    useMemo(
      () => {
        if (
          selectedFilter ===
          "all"
        ) {
          return approvals;
        }

        return approvals.filter(
          (
            approval,
          ) =>
            approval.status ===
            selectedFilter,
        );
      },
      [
        approvals,
        selectedFilter,
      ],
    );

  const pendingCount =
    approvals.filter(
      (
        approval,
      ) =>
        approval.status ===
        "pending",
    ).length;

  const approvedCount =
    approvals.filter(
      (
        approval,
      ) =>
        approval.status ===
        "approved",
    ).length;

  const rejectedCount =
    approvals.filter(
      (
        approval,
      ) =>
        approval.status ===
        "rejected",
    ).length;

  const cancelledCount =
    approvals.filter(
      (
        approval,
      ) =>
        approval.status ===
        "cancelled",
    ).length;

  function handleOpenAction(
    approval:
      HouseholdApprovalRequest,

    action:
      ApprovalAction,
  ) {
    setActionSelection({
      approval,
      action,
    });
  }

  function handleCloseAction() {
    setActionSelection(
      null,
    );
  }

  function handleApprovalUpdated(
    updatedApproval:
      HouseholdApprovalRequest,
  ) {
    setApprovals(
      (
        currentApprovals,
      ) =>
        currentApprovals.map(
          (
            approval,
          ) =>
            approval.id ===
            updatedApproval.id
              ? updatedApproval
              : approval,
        ),
    );

    setActionSelection(
      null,
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageHeader
          isRefreshing={
            isLoading
          }
          onRefresh={
            loadApprovals
          }
        />

        <ApprovalSummary
          workspaceName={
            workspaceName
          }
          pendingCount={
            pendingCount
          }
          approvedCount={
            approvedCount
          }
          rejectedCount={
            rejectedCount
          }
          cancelledCount={
            cancelledCount
          }
        />

        <ApprovalQueue
          approvals={
            filteredApprovals
          }
          selectedFilter={
            selectedFilter
          }
          currentUserId={
            currentUserId
          }
          isWorkspaceOwner={
            activeWorkspace?.isOwner ===
            true
          }
          isLoading={
            isLoading
          }
          error={
            loadError
          }
          onFilterChange={
            setSelectedFilter
          }
          onRetry={
            loadApprovals
          }
          onAction={
            handleOpenAction
          }
        />

        <ApprovalPolicySection />
      </div>

      <ApprovalActionModal
        selection={
          actionSelection
        }
        workspaceName={
          workspaceName
        }
        onClose={
          handleCloseAction
        }
        onCompleted={
          handleApprovalUpdated
        }
      />
    </>
  );
}

function PageHeader({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing:
    boolean;

  onRefresh:
    () => void | Promise<void>;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
          Household
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Approvals
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Review household financial requests that require authorization before
          changes are applied to the shared workspace.
        </p>
      </div>

      <button
        type="button"
        disabled={
          isRefreshing
        }
        onClick={() => {
          void onRefresh();
        }}
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshIcon
          spinning={
            isRefreshing
          }
        />

        {isRefreshing
          ? "Refreshing..."
          : "Refresh"}
      </button>
    </header>
  );
}

function ApprovalSummary({
  workspaceName,
  pendingCount,
  approvedCount,
  rejectedCount,
  cancelledCount,
}: {
  workspaceName:
    string;

  pendingCount:
    number;

  approvedCount:
    number;

  rejectedCount:
    number;

  cancelledCount:
    number;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
            <ApprovalIcon />
          </div>

          <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
            Approval center
          </h2>

          <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
            {workspaceName}
          </p>
        </div>

        <span
          className={[
            "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
            pendingCount >
            0
              ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
              : "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
          ].join(
            " ",
          )}
        >
          {pendingCount >
          0 ? (
            <ClockIcon />
          ) : (
            <CheckIcon />
          )}

          {pendingCount >
          0
            ? `${pendingCount} pending`
            : "Up to date"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Pending"
          value={
            String(
              pendingCount,
            )
          }
          description="Waiting for a decision"
        />

        <SummaryMetric
          label="Approved"
          value={
            String(
              approvedCount,
            )
          }
          description="Requests accepted"
        />

        <SummaryMetric
          label="Rejected"
          value={
            String(
              rejectedCount,
            )
          }
          description="Requests declined"
        />

        <SummaryMetric
          label="Cancelled"
          value={
            String(
              cancelledCount,
            )
          }
          description="Requests withdrawn"
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

      <p className="mt-2 text-lg font-bold text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function ApprovalQueue({
  approvals,
  selectedFilter,
  currentUserId,
  isWorkspaceOwner,
  isLoading,
  error,
  onFilterChange,
  onRetry,
  onAction,
}: {
  approvals:
    HouseholdApprovalRequest[];

  selectedFilter:
    HouseholdApprovalFilter;

  currentUserId:
    string | null;

  isWorkspaceOwner:
    boolean;

  isLoading:
    boolean;

  error:
    string | null;

  onFilterChange:
    (
      filter:
        HouseholdApprovalFilter,
    ) => void;

  onRetry:
    () => void | Promise<void>;

  onAction:
    (
      approval:
        HouseholdApprovalRequest,

      action:
        ApprovalAction,
    ) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="border-b border-[var(--border-subtle)] p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          Approval requests
        </h2>

        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
          Review requests from household members before protected financial
          actions are completed.
        </p>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {approvalFilters.map(
            (
              filter,
            ) => {
              const isSelected =
                selectedFilter ===
                filter.id;

              return (
                <button
                  key={
                    filter.id
                  }
                  type="button"
                  onClick={
                    () => {
                      onFilterChange(
                        filter.id,
                      );
                    }
                  }
                  className={[
                    "shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                    isSelected
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                  ].join(
                    " ",
                  )}
                >
                  {filter.label}
                </button>
              );
            },
          )}
        </div>
      </div>

      {error &&
      approvals.length >
        0 ? (
        <div className="border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] px-5 py-3 text-xs font-semibold text-[var(--warning)] sm:px-6">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <ApprovalsLoadingState />
      ) : error &&
        approvals.length ===
          0 ? (
        <ApprovalsErrorState
          message={
            error
          }
          onRetry={
            onRetry
          }
        />
      ) : approvals.length >
        0 ? (
        <div className="divide-y divide-[var(--border-subtle)]">
          {approvals.map(
            (
              approval,
            ) => (
              <ApprovalRow
                key={
                  approval.id
                }
                approval={
                  approval
                }
                currentUserId={
                  currentUserId
                }
                isWorkspaceOwner={
                  isWorkspaceOwner
                }
                onAction={
                  onAction
                }
              />
            ),
          )}
        </div>
      ) : (
        <EmptyApprovalsState
          selectedFilter={
            selectedFilter
          }
        />
      )}
    </section>
  );
}

function ApprovalRow({
  approval,
  currentUserId,
  isWorkspaceOwner,
  onAction,
}: {
  approval:
    HouseholdApprovalRequest;

  currentUserId:
    string | null;

  isWorkspaceOwner:
    boolean;

  onAction:
    (
      approval:
        HouseholdApprovalRequest,

      action:
        ApprovalAction,
    ) => void;
}) {
  const isOwnRequest =
    Boolean(
      currentUserId,
    ) &&
    approval.requestedByUserId ===
      currentUserId;

  /*
   * The server action remains the authorization boundary.
   *
   * The AppProvider currently exposes ownership but not the active member's
   * complete workspace role. Owners get the cleanest UI immediately. For
   * non-owner accounts, review controls remain available for requests created
   * by someone else so administrators can still use the feature; the server
   * rejects Members/Viewers if they attempt a decision.
   */
  const canAttemptDecision =
    !isOwnRequest;

  const canAttemptCancel =
    isOwnRequest ||
    isWorkspaceOwner ||
    !isOwnRequest;

  return (
    <article className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--primary)]">
            <ApprovalTypeIcon
              type={
                approval.type
              }
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {approval.title}
              </h3>

              <ApprovalStatusBadge
                status={
                  approval.status
                }
              />

              {isOwnRequest ? (
                <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Your request
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {approval.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
              <span>
                Requested by{" "}
                <strong className="font-semibold text-[var(--text-primary)]">
                  {approval.requestedByName ??
                    "Household member"}
                </strong>
              </span>

              {approval.requestedByRole ? (
                <>
                  <span>
                    ·
                  </span>

                  <span>
                    {formatRole(
                      approval.requestedByRole,
                    )}
                  </span>
                </>
              ) : null}

              <span>
                ·
              </span>

              <time
                dateTime={
                  approval.requestedAt
                }
              >
                {formatApprovalDate(
                  approval.requestedAt,
                )}
              </time>

              {approval.amount !==
              null ? (
                <>
                  <span>
                    ·
                  </span>

                  <strong className="font-bold text-[var(--text-primary)]">
                    {formatCurrency(
                      approval.amount,
                    )}
                  </strong>
                </>
              ) : null}
            </div>

            {approval.target ? (
              <div className="mt-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
                <span className="font-bold text-[var(--text-secondary)]">
                  Target:
                </span>{" "}
                {approval.target.entityType}
                {" · "}
                {approval.target.entityId}
              </div>
            ) : null}

            {approval.status !==
              "pending" ? (
              <ApprovalDecisionDetails
                approval={
                  approval
                }
              />
            ) : approval.expiresAt ? (
              <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                Expires{" "}
                {formatApprovalDate(
                  approval.expiresAt,
                )}
              </p>
            ) : null}
          </div>
        </div>

        {approval.status ===
        "pending" ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {canAttemptCancel ? (
              <button
                type="button"
                onClick={() => {
                  onAction(
                    approval,
                    "cancel",
                  );
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Cancel
              </button>
            ) : null}

            {canAttemptDecision ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onAction(
                      approval,
                      "reject",
                    );
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface-default))] hover:text-[var(--danger)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  Reject
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onAction(
                      approval,
                      "approve",
                    );
                  }}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[var(--primary-foreground)] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <CheckIcon />

                  Approve
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ApprovalDecisionDetails({
  approval,
}: {
  approval:
    HouseholdApprovalRequest;
}) {
  if (
    approval.status ===
    "cancelled"
  ) {
    return (
      <div className="mt-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-[11px] leading-5 text-[var(--text-muted)]">
        <span className="font-bold text-[var(--text-secondary)]">
          Cancelled
        </span>

        {approval.cancelledAt
          ? ` · ${formatApprovalDate(
              approval.cancelledAt,
            )}`
          : ""}

        {approval.cancellationReason
          ? ` · ${approval.cancellationReason}`
          : ""}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-[11px] leading-5 text-[var(--text-muted)]">
      <span className="font-bold text-[var(--text-secondary)]">
        {approval.status ===
        "approved"
          ? "Approved"
          : "Rejected"}
      </span>

      {approval.decisionByName
        ? ` by ${approval.decisionByName}`
        : ""}

      {approval.decidedAt
        ? ` · ${formatApprovalDate(
            approval.decidedAt,
          )}`
        : ""}

      {approval.decisionReason
        ? ` · ${approval.decisionReason}`
        : ""}
    </div>
  );
}

function ApprovalActionModal({
  selection,
  workspaceName,
  onClose,
  onCompleted,
}: {
  selection:
    ApprovalActionSelection | null;

  workspaceName:
    string;

  onClose:
    () => void;

  onCompleted:
    (
      approval:
        HouseholdApprovalRequest,
    ) => void;
}) {
  const [
    reason,
    setReason,
  ] =
    useState(
      "",
    );

  const [
    errorMessage,
    setErrorMessage,
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

      setErrorMessage(
        null,
      );

      setIsSubmitting(
        false,
      );
    },
    [
      selection,
    ],
  );

  useEffect(
    () => {
      if (
        !selection
      ) {
        return;
      }

      function handleKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key ===
            "Escape" &&
          !isSubmitting
        ) {
          onClose();
        }
      }

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        document.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      isSubmitting,
      onClose,
      selection,
    ],
  );

  if (
    !selection
  ) {
    return null;
  }

  const {
    approval,
    action,
  } =
    selection;

  const copy =
    getApprovalActionCopy({
      approval,
      action,
      workspaceName,
    });

  async function handleSubmit() {
    if (
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(
      true,
    );

    setErrorMessage(
      null,
    );

    try {
      if (
        action ===
        "cancel"
      ) {
        const result =
          await cancelHouseholdApproval({
            approvalId:
              approval.id,

            reason:
              reason.trim() ||
              undefined,
          });

        if (
          !result.success
        ) {
          setErrorMessage(
            result.error.message,
          );

          return;
        }

        onCompleted(
          result.approval,
        );

        return;
      }

      const decision:
        Extract<
          HouseholdApprovalDecision,
          "approve" | "reject"
        > =
        action;

      const result =
        await decideHouseholdApproval({
          approvalId:
            approval.id,

          decision,

          reason:
            reason.trim() ||
            undefined,
        });

      if (
        !result.success
      ) {
        setErrorMessage(
          result.error.message,
        );

        return;
      }

      onCompleted(
        result.approval,
      );
    } catch (
      error
    ) {
      console.error(
        "[CASE Budget Household Approvals] Approval action failed.",
        error,
      );

      setErrorMessage(
        "CASE Budget could not complete this approval action. Please try again.",
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
      role="presentation"
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
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-action-title"
        aria-describedby="approval-action-description"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[var(--shadow-xl)]"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div
              className={[
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                copy.danger
                  ? "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
                  : "bg-[var(--primary-soft)] text-[var(--primary)]",
              ].join(
                " ",
              )}
            >
              {copy.icon}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Household approval
              </p>

              <h2
                id="approval-action-title"
                className="mt-1 text-xl font-bold text-[var(--text-primary)]"
              >
                {copy.title}
              </h2>

              <p
                id="approval-action-description"
                className="mt-2 text-sm leading-6 text-[var(--text-muted)]"
              >
                {copy.description}
              </p>
            </div>

            <button
              type="button"
              aria-label="Close"
              disabled={
                isSubmitting
              }
              onClick={
                onClose
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-default)] text-[var(--primary)]">
                <ApprovalTypeIcon
                  type={
                    approval.type
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {approval.title}
                </p>

                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  {approval.description}
                </p>

                {approval.amount !==
                null ? (
                  <p className="mt-2 text-sm font-extrabold text-[var(--text-primary)]">
                    {formatCurrency(
                      approval.amount,
                    )}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              Reason{" "}
              <span className="font-medium text-[var(--text-muted)]">
                (optional)
              </span>
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
                    1000,
                  ),
                );
              }}
              rows={
                3
              }
              maxLength={
                1000
              }
              disabled={
                isSubmitting
              }
              placeholder={
                copy.placeholder
              }
              className="mt-2 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />

            <span className="mt-1 block text-right text-[10px] font-medium text-[var(--text-muted)]">
              {reason.length}/1000
            </span>
          </label>

          {copy.warning ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--warning)_22%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-3">
              <span className="mt-0.5 shrink-0 text-[var(--warning)]">
                <WarningIcon />
              </span>

              <p className="text-xs leading-5 text-[var(--text-secondary)]">
                {copy.warning}
              </p>
            </div>
          ) : null}

          {errorMessage ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2.5 text-xs font-semibold leading-5 text-[var(--danger)]"
            >
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={
              isSubmitting
            }
            onClick={
              onClose
            }
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          <button
            type="button"
            disabled={
              isSubmitting
            }
            onClick={() => {
              void handleSubmit();
            }}
            className={[
              "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60",
              copy.danger
                ? "bg-[var(--danger)] text-white hover:opacity-90"
                : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
            ].join(
              " ",
            )}
          >
            {isSubmitting ? (
              <LoadingSpinner />
            ) : copy.icon}

            {isSubmitting
              ? copy.submittingLabel
              : copy.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function getApprovalActionCopy({
  approval,
  action,
  workspaceName,
}: {
  approval:
    HouseholdApprovalRequest;

  action:
    ApprovalAction;

  workspaceName:
    string;
}) {
  if (
    action ===
    "approve"
  ) {
    return {
      title:
        "Approve this request?",

      description:
        `Approve "${approval.title}" for ${workspaceName}.`,

      warning:
        "This records the authorization decision. Protected financial actions are executed only by their own trusted server workflow.",

      placeholder:
        "Add an optional approval note.",

      confirmLabel:
        "Approve request",

      submittingLabel:
        "Approving...",

      danger:
        false,

      icon:
        <CheckIcon />,
    };
  }

  if (
    action ===
    "reject"
  ) {
    return {
      title:
        "Reject this request?",

      description:
        `Reject "${approval.title}" for ${workspaceName}.`,

      warning:
        "A rejected request cannot be approved later. A new approval request would need to be created.",

      placeholder:
        "Explain why this request is being rejected.",

      confirmLabel:
        "Reject request",

      submittingLabel:
        "Rejecting...",

      danger:
        true,

      icon:
        <RejectIcon />,
    };
  }

  return {
    title:
      "Cancel this request?",

    description:
      `Cancel "${approval.title}" for ${workspaceName}.`,

    warning:
      "Only pending requests can be cancelled. The server verifies whether your workspace role is allowed to cancel this request.",

    placeholder:
      "Add an optional cancellation note.",

    confirmLabel:
      "Cancel request",

    submittingLabel:
      "Cancelling...",

    danger:
      true,

    icon:
      <CancelIcon />,
  };
}

function ApprovalStatusBadge({
  status,
}: {
  status:
    HouseholdApprovalStatus;
}) {
  const className =
    status ===
    "approved"
      ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
      : status ===
          "rejected"
        ? "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
        : status ===
            "pending"
          ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
          : "bg-[var(--surface-muted)] text-[var(--text-muted)]";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
        className,
      ].join(
        " ",
      )}
    >
      {formatApprovalStatus(
        status,
      )}
    </span>
  );
}

function EmptyApprovalsState({
  selectedFilter,
}: {
  selectedFilter:
    HouseholdApprovalFilter;
}) {
  const isPending =
    selectedFilter ===
    "pending";

  const isAll =
    selectedFilter ===
    "all";

  return (
    <div className="flex flex-col items-center px-5 py-14 text-center sm:px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
        <ApprovalIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        {isPending
          ? "You're all caught up"
          : isAll
            ? "No approval history yet"
            : `No ${selectedFilter} requests`}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {isPending
          ? "There are no household requests waiting for a decision."
          : isAll
            ? "Household requests and their decisions will appear here once approval rules are in use."
            : `There are no household requests with a ${selectedFilter} status yet.`}
      </p>
    </div>
  );
}

function ApprovalsLoadingState() {
  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {[
        1,
        2,
        3,
      ].map(
        (
          item,
        ) => (
          <div
            key={
              item
            }
            className="flex animate-pulse gap-4 p-5 sm:p-6"
          >
            <div className="h-11 w-11 shrink-0 rounded-xl bg-[var(--surface-muted)]" />

            <div className="min-w-0 flex-1">
              <div className="h-4 w-48 rounded bg-[var(--surface-muted)]" />

              <div className="mt-3 h-3 w-full max-w-xl rounded bg-[var(--surface-muted)]" />

              <div className="mt-2 h-3 w-72 max-w-full rounded bg-[var(--surface-muted)]" />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function ApprovalsErrorState({
  message,
  onRetry,
}: {
  message:
    string;

  onRetry:
    () => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-14 text-center sm:px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]">
        <WarningIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        Unable to load approvals
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {message}
      </p>

      <button
        type="button"
        onClick={() => {
          void onRetry();
        }}
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        Try again
      </button>
    </div>
  );
}

function ApprovalPolicySection() {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
          Approval controls
        </p>

        <h2 className="mt-2 text-lg font-bold text-[var(--text-primary)]">
          Protect important household decisions
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          Approval rules can help household owners control which financial
          actions members can complete independently and which actions require
          authorization first.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ApprovalPolicyCard
          icon={
            <MoneyIcon />
          }
          title="Large transactions"
          description="Require approval when a household transaction exceeds a configured spending threshold."
        />

        <ApprovalPolicyCard
          icon={
            <BudgetIcon />
          }
          title="Budget changes"
          description="Protect important changes to shared category assignments and monthly planning."
        />

        <ApprovalPolicyCard
          icon={
            <AccountIcon />
          }
          title="Account changes"
          description="Require authorization before adding, removing, or changing shared financial accounts."
        />

        <ApprovalPolicyCard
          icon={
            <SecurityIcon />
          }
          title="Sensitive actions"
          description="Add an extra authorization step for membership, security, and other high-impact workspace changes."
        />
      </div>

      <div className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Approval history is now persisted. Policy configuration is the next
          layer: these cards describe supported controls but do not yet change
          enforcement settings.
        </p>
      </div>
    </section>
  );
}

function ApprovalPolicyCard({
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

function ApprovalTypeIcon({
  type,
}: {
  type:
    HouseholdApprovalType;
}) {
  switch (
    type
  ) {
    case "budget":
      return (
        <BudgetIcon />
      );

    case "account":
      return (
        <AccountIcon />
      );

    case "security":
    case "member":
      return (
        <SecurityIcon />
      );

    case "transaction":
    case "bill":
      return (
        <MoneyIcon />
      );

    default:
      return (
        <ApprovalIcon />
      );
  }
}

function formatApprovalStatus(
  status:
    HouseholdApprovalStatus,
) {
  return `${status
    .charAt(
      0,
    )
    .toUpperCase()}${status.slice(
    1,
  )}`;
}

function formatRole(
  role:
    string,
) {
  return `${role
    .charAt(
      0,
    )
    .toUpperCase()}${role.slice(
    1,
  )}`;
}

function formatApprovalDate(
  value:
    string,
) {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    },
  ).format(
    date,
  );
}

function formatCurrency(
  amount:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",
    },
  ).format(
    amount,
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ApprovalIcon() {
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
      <path d="M9 11 12 14 20 6" />
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
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

      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
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

function RefreshIcon({
  spinning,
}: {
  spinning:
    boolean;
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        spinning
          ? "animate-spin"
          : ""
      }
      aria-hidden="true"
    >
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
    </svg>
  );
}

function MoneyIcon() {
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
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />

      <path d="M7 9h10" />
      <path d="M7 15h4" />
    </svg>
  );
}

function BudgetIcon() {
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
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h16" />

      <circle
        cx="8"
        cy="6.5"
        r="1.5"
      />

      <circle
        cx="15"
        cy="12"
        r="1.5"
      />

      <circle
        cx="11"
        cy="17.5"
        r="1.5"
      />
    </svg>
  );
}

function AccountIcon() {
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
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="3"
      />

      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function SecurityIcon() {
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
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function RejectIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg
      width="16"
      height="16"
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
      <path d="M8 12h8" />
    </svg>
  );
}

function WarningIcon() {
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
      <path d="M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CloseIcon() {
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
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}
