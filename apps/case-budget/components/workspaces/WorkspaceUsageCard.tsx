"use client";

import Link from "next/link";

import {
  canPurchaseAdditionalCaseBudgetWorkspaces,
  getCaseBudgetEffectiveWorkspaceLimit,
  getCaseBudgetIncludedWorkspaceLimit,
  getCaseBudgetPlanName,
  type CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

type WorkspaceUsageCardProps = {
  plan:
    CaseBudgetPlan;

  ownedWorkspaceCount:
    number;

  additionalWorkspaceCount?:
    number;

  billingHref?:
    string;

  compact?:
    boolean;
};

function normalizeWorkspaceCount(
  value:
    number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      value,
    ),
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="2"
      />

      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="2"
      />

      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="2"
      />

      <path d="M17.5 14v7" />
      <path d="M14 17.5h7" />
    </svg>
  );
}

function ArrowRightIcon() {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function PlusIcon() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function WorkspaceUsageCard({
  plan,
  ownedWorkspaceCount,
  additionalWorkspaceCount =
    0,
  billingHref =
    "/dashboard/settings/billing",
  compact =
    false,
}: WorkspaceUsageCardProps) {
  const normalizedOwnedWorkspaceCount =
    normalizeWorkspaceCount(
      ownedWorkspaceCount,
    );

  const normalizedAdditionalWorkspaceCount =
    normalizeWorkspaceCount(
      additionalWorkspaceCount,
    );

  const includedWorkspaceLimit =
    getCaseBudgetIncludedWorkspaceLimit(
      plan,
    );

  const effectiveWorkspaceLimit =
    getCaseBudgetEffectiveWorkspaceLimit({
      plan,

      additionalWorkspaceCount:
        normalizedAdditionalWorkspaceCount,
    });

  const planName =
    getCaseBudgetPlanName(
      plan,
    );

  const allowsAdditionalWorkspacePurchases =
    canPurchaseAdditionalCaseBudgetWorkspaces(
      plan,
    );

  const isAtLimit =
    normalizedOwnedWorkspaceCount >=
    effectiveWorkspaceLimit;

  const usagePercentage =
    effectiveWorkspaceLimit >
    0
      ? Math.min(
          100,
          Math.round(
            (
              normalizedOwnedWorkspaceCount /
              effectiveWorkspaceLimit
            ) *
              100,
          ),
        )
      : 0;

  const hasPurchasedAdditionalCapacity =
    normalizedAdditionalWorkspaceCount >
    0;

  const usageLabel =
    `${normalizedOwnedWorkspaceCount} of ${effectiveWorkspaceLimit} used`;

  const includedLimitLabel =
    `Includes up to ${includedWorkspaceLimit} ${
      includedWorkspaceLimit ===
      1
        ? "workspace"
        : "workspaces"
    }`;

  const effectiveLimitLabel =
    hasPurchasedAdditionalCapacity
      ? `${effectiveWorkspaceLimit} total workspace capacity`
      : includedLimitLabel;

  const shouldShowUpgradeCta =
    isAtLimit &&
    plan !==
      "pro";

  const shouldShowCapacityCta =
    isAtLimit &&
    plan ===
      "pro" &&
    allowsAdditionalWorkspacePurchases;

  const statusMessage =
    isAtLimit
      ? plan ===
        "pro"
        ? "You have used all available workspace capacity."
        : `You have reached the ${planName} workspace limit.`
      : `${
          effectiveWorkspaceLimit -
          normalizedOwnedWorkspaceCount
        } ${
          effectiveWorkspaceLimit -
            normalizedOwnedWorkspaceCount ===
          1
            ? "workspace"
            : "workspaces"
        } remaining.`;

  return (
    <section
      aria-label="Workspace usage"
      className={[
        "overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]",
        compact
          ? "p-3"
          : "p-4",
      ].join(
        " ",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={[
              "flex shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]",
              compact
                ? "h-8 w-8"
                : "h-10 w-10",
            ].join(
              " ",
            )}
          >
            <WorkspaceIcon />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Workspaces
            </p>

            <p
              className={[
                "mt-0.5 font-bold text-[var(--text-primary)]",
                compact
                  ? "text-sm"
                  : "text-base",
              ].join(
                " ",
              )}
            >
              {
                usageLabel
              }
            </p>
          </div>
        </div>

        <span
          className={[
            "shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold",
            plan ===
            "pro"
              ? "bg-[var(--pro-soft)] text-[var(--pro)]"
              : plan ===
                  "plus"
                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                : "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
          ].join(
            " ",
          )}
        >
          {
            planName
          }
        </span>
      </div>

      <div
        className={
          compact
            ? "mt-3"
            : "mt-4"
        }
      >
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
          <div
            className={[
              "h-full rounded-full transition-[width] duration-300",
              isAtLimit
                ? "bg-[var(--warning)]"
                : "bg-[var(--primary)]",
            ].join(
              " ",
            )}
            style={{
              width:
                `${usagePercentage}%`,
            }}
          />
        </div>

        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              {
                effectiveLimitLabel
              }
            </p>

            {!compact ? (
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                {
                  statusMessage
                }
              </p>
            ) : null}
          </div>

          <span className="shrink-0 text-[10px] font-bold text-[var(--text-muted)]">
            {
              usagePercentage
            }
            %
          </span>
        </div>
      </div>

      {hasPurchasedAdditionalCapacity ? (
        <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2">
          <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
            Base Pro allowance:{" "}
            {
              includedWorkspaceLimit
            }
          </p>

          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            Additional capacity: +
            {
              normalizedAdditionalWorkspaceCount
            }
          </p>
        </div>
      ) : null}

      {shouldShowUpgradeCta ? (
        <Link
          href={
            billingHref
          }
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-bold text-[var(--primary-foreground)] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <span>
            Upgrade to{" "}
            {
              plan ===
              "free"
                ? "Plus"
                : "Pro"
            }
          </span>

          <ArrowRightIcon />
        </Link>
      ) : null}

      {shouldShowCapacityCta ? (
        <Link
          href={
            billingHref
          }
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-2.5 text-sm font-bold text-[var(--primary)] outline-none transition hover:bg-[var(--primary-soft-strong)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <span className="flex items-center gap-2">
            <PlusIcon />

            Add workspace capacity
          </span>

          <ArrowRightIcon />
        </Link>
      ) : null}

      {!isAtLimit &&
      !compact ? (
        <div className="mt-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2">
          <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
            Only workspaces you own count toward your workspace allowance.
            Workspaces you join as a member do not consume this limit.
          </p>
        </div>
      ) : null}
    </section>
  );
}