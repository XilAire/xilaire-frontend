"use client";

import Link from "next/link";

import {
  useInvestments,
  type InvestmentAccountData,
  type InvestmentAccountSummary,
} from "@/components/providers/InvestmentsProvider";

export type InvestmentAccountListProps = {
  accounts?: InvestmentAccountData[];

  compact?: boolean;

  showHeader?: boolean;
  showActions?: boolean;

  title?: string;
  description?: string;

  emptyTitle?: string;
  emptyDescription?: string;

  onEdit?: (
    account: InvestmentAccountData,
  ) => void;

  onDelete?: (
    account: InvestmentAccountData,
  ) => void;

  className?: string;
};

type AccountWithSummary = {
  account: InvestmentAccountData;
  summary: InvestmentAccountSummary;
};

export default function InvestmentAccountList({
  accounts,
  compact = false,
  showHeader = true,
  showActions = true,
  title = "Investment Accounts",
  description = "Portfolio value and performance by account.",
  emptyTitle = "No investment accounts",
  emptyDescription = "Add a brokerage, retirement, IRA, crypto, or other investment account.",
  onEdit,
  onDelete,
  className = "",
}: InvestmentAccountListProps) {
  const {
    investmentAccounts,
    getAccountSummary,
  } = useInvestments();

  const resolvedAccounts =
    accounts ??
    investmentAccounts;

  const accountsWithSummaries:
    AccountWithSummary[] =
    resolvedAccounts.map(
      (
        account,
      ) => ({
        account,
        summary:
          getAccountSummary(
            account.id,
          ),
      }),
    );

  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm",
        className,
      ].join(
        " ",
      )}
    >
      {showHeader ? (
        <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {title}
            </h2>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {description}
            </p>
          </div>

          <Link
            href="/dashboard/investments?action=add-account"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <PlusIcon />

            Add account
          </Link>
        </header>
      ) : null}

      {accountsWithSummaries.length >
      0 ? (
        <div
          className={[
            "grid grid-cols-1 gap-4",
            compact
              ? "p-4 md:grid-cols-2 xl:grid-cols-3"
              : "p-4 md:grid-cols-2 xl:grid-cols-3 sm:p-5",
          ].join(
            " ",
          )}
        >
          {accountsWithSummaries.map(
            ({
              account,
              summary,
            }) => (
              <InvestmentAccountCard
                key={
                  account.id
                }
                account={
                  account
                }
                summary={
                  summary
                }
                compact={
                  compact
                }
                showActions={
                  showActions
                }
                onEdit={
                  onEdit
                }
                onDelete={
                  onDelete
                }
              />
            ),
          )}
        </div>
      ) : (
        <InvestmentAccountEmptyState
          title={
            emptyTitle
          }
          description={
            emptyDescription
          }
        />
      )}
    </section>
  );
}

type InvestmentAccountCardProps = {
  account:
    InvestmentAccountData;

  summary:
    InvestmentAccountSummary;

  compact:
    boolean;

  showActions:
    boolean;

  onEdit?: (
    account:
      InvestmentAccountData,
  ) => void;

  onDelete?: (
    account:
      InvestmentAccountData,
  ) => void;
};

function InvestmentAccountCard({
  account,
  summary,
  compact,
  showActions,
  onEdit,
  onDelete,
}: InvestmentAccountCardProps) {
  const gainTone =
    summary.unrealizedGain >
    0
      ? "positive"
      : summary.unrealizedGain <
          0
        ? "negative"
        : "neutral";

  return (
    <article className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 transition hover:border-[var(--border-default)] hover:bg-[var(--surface-default)]">
      <div className="flex items-start justify-between gap-4">
        <Link
          href={`/dashboard/investments?accountId=${encodeURIComponent(
            account.id,
          )}`}
          className="min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
              <AccountIcon />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                {account.name}
              </p>

              <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                {account.institution ??
                  formatAccountType(
                    account.type,
                  )}
              </p>
            </div>
          </div>
        </Link>

        <ConnectionBadge
          status={
            account.connectionStatus
          }
        />
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Total Value
          </p>

          <p className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)]">
            {formatCurrency(
              summary.totalMarketValue,
            )}
          </p>
        </div>

        <NetWorthBadge
          included={
            account.isIncludedInNetWorth
          }
        />
      </div>

      <div
        className={[
          "mt-5 grid gap-3",
          compact
            ? "grid-cols-2"
            : "grid-cols-2",
        ].join(
          " ",
        )}
      >
        <AccountMetric
          label="Holdings"
          value={
            formatCurrency(
              summary.holdingsMarketValue,
            )
          }
        />

        <AccountMetric
          label="Cash"
          value={
            formatCurrency(
              summary.cashBalance,
            )
          }
        />

        <AccountMetric
          label="Cost Basis"
          value={
            formatCurrency(
              summary.totalCostBasis,
            )
          }
        />

        <AccountMetric
          label="Gain / Loss"
          value={
            formatSignedCurrency(
              summary.unrealizedGain,
            )
          }
          detail={
            formatSignedPercentage(
              summary.unrealizedGainPercentage,
            )
          }
          tone={
            gainTone
          }
        />

        {!compact ? (
          <>
            <AccountMetric
              label="Annual Dividends"
              value={
                formatCurrency(
                  summary.annualDividendIncome,
                )
              }
            />

            <AccountMetric
              label="Holdings Count"
              value={
                String(
                  summary.holdingCount,
                )
              }
            />
          </>
        ) : null}
      </div>

      {showActions ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
          <Link
            href={`/dashboard/investments?accountId=${encodeURIComponent(
              account.id,
            )}`}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            View
          </Link>

          {onEdit ? (
            <button
              type="button"
              onClick={() =>
                onEdit(
                  account,
                )
              }
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Edit
            </button>
          ) : (
            <Link
              href={`/dashboard/investments?action=edit-account&accountId=${encodeURIComponent(
                account.id,
              )}`}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Edit
            </Link>
          )}

          {onDelete ? (
            <button
              type="button"
              onClick={() =>
                onDelete(
                  account,
                )
              }
              className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-bold text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

type AccountMetricProps = {
  label:
    string;

  value:
    string;

  detail?:
    string;

  tone?:
    | "positive"
    | "negative"
    | "neutral";
};

function AccountMetric({
  label,
  value,
  detail,
  tone = "neutral",
}: AccountMetricProps) {
  const valueClassName =
    tone ===
    "positive"
      ? "text-[var(--success)]"
      : tone ===
          "negative"
        ? "text-[var(--danger)]"
        : "text-[var(--text-primary)]";

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={[
          "mt-1 truncate text-sm font-bold",
          valueClassName,
        ].join(
          " ",
        )}
      >
        {value}
      </p>

      {detail ? (
        <p
          className={[
            "mt-0.5 text-xs font-semibold",
            valueClassName,
          ].join(
            " ",
          )}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function ConnectionBadge({
  status,
}: {
  status:
    InvestmentAccountData["connectionStatus"];
}) {
  const label =
    status ===
    "connected"
      ? "Connected"
      : status ===
          "pending"
        ? "Pending"
        : status ===
            "error"
          ? "Error"
          : status ===
              "disconnected"
            ? "Disconnected"
            : "Manual";

  const className =
    status ===
    "connected"
      ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
      : status ===
          "error"
        ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
        : status ===
            "pending"
          ? "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]"
          : "bg-[var(--surface-default)] text-[var(--text-muted)]";

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
        className,
      ].join(
        " ",
      )}
    >
      {label}
    </span>
  );
}

function NetWorthBadge({
  included,
}: {
  included:
    boolean;
}) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
        included
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : "bg-[var(--surface-default)] text-[var(--text-muted)]",
      ].join(
        " ",
      )}
    >
      {included
        ? "In Net Worth"
        : "Excluded"}
    </span>
  );
}

function InvestmentAccountEmptyState({
  title,
  description,
}: {
  title:
    string;

  description:
    string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <AccountIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {description}
      </p>

      <Link
        href="/dashboard/investments?action=add-account"
        className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        <PlusIcon />

        Add investment account
      </Link>
    </div>
  );
}

function formatAccountType(
  type:
    InvestmentAccountData["type"],
) {
  switch (
    type
  ) {
    case "brokerage":
      return "Brokerage";

    case "retirement":
      return "Retirement";

    case "ira":
      return "IRA";

    case "roth-ira":
      return "Roth IRA";

    case "401k":
      return "401(k)";

    case "403b":
      return "403(b)";

    case "529":
      return "529 Plan";

    case "hsa":
      return "HSA";

    case "crypto":
      return "Crypto Account";

    case "other":
    default:
      return "Investment Account";
  }
}

function formatCurrency(
  value:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",
      currency:
        "USD",
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2,
    },
  ).format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatSignedCurrency(
  value:
    number,
) {
  const normalizedValue =
    Number.isFinite(
      value,
    )
      ? value
      : 0;

  if (
    normalizedValue >
    0
  ) {
    return `+${formatCurrency(
      normalizedValue,
    )}`;
  }

  return formatCurrency(
    normalizedValue,
  );
}

function formatSignedPercentage(
  value:
    number,
) {
  const normalizedValue =
    Number.isFinite(
      value,
    )
      ? value
      : 0;

  const prefix =
    normalizedValue >
    0
      ? "+"
      : "";

  return `${prefix}${normalizedValue.toFixed(
    2,
  )}%`;
}

function AccountIcon() {
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

      <path d="M3 10h18" />
    </svg>
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
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
