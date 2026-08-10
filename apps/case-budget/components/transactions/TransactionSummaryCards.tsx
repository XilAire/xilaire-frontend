"use client";

import type {
  TransactionSummary,
} from "@/types/transaction";

type TransactionSummaryCardsProps = {
  summary: TransactionSummary;
};

const currencyFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

export default function TransactionSummaryCards({
  summary,
}: TransactionSummaryCardsProps) {
  return (
    <section
      aria-label="Transaction summary"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <SummaryCard
        label="Total Income"
        value={currencyFormatter.format(
          summary.totalIncome,
        )}
        description="All income in the current filtered view"
        icon={<IncomeIcon />}
        iconClassName="bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
        valueClassName="text-[var(--success)]"
      />

      <SummaryCard
        label="Total Expenses"
        value={currencyFormatter.format(
          summary.totalExpenses,
        )}
        description="All expenses in the current filtered view"
        icon={<ExpenseIcon />}
        iconClassName="bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
        valueClassName="text-[var(--danger)]"
      />

      <SummaryCard
        label="Net Activity"
        value={currencyFormatter.format(
          summary.netAmount,
        )}
        description="Income minus expenses, excluding transfers"
        icon={<ActivityIcon />}
        iconClassName={
          summary.netAmount < 0
            ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
            : "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
        }
        valueClassName={
          summary.netAmount < 0
            ? "text-[var(--danger)]"
            : "text-[var(--success)]"
        }
      />

      <SummaryCard
        label="Net Cleared"
        value={currencyFormatter.format(
          summary.netClearedAmount,
        )}
        description={`${currencyFormatter.format(
          summary.clearedIncome,
        )} income minus ${currencyFormatter.format(
          summary.clearedExpenses,
        )} expenses`}
        icon={<ClearedIcon />}
        iconClassName={
          summary.netClearedAmount < 0
            ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
            : "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
        }
        valueClassName={
          summary.netClearedAmount < 0
            ? "text-[var(--danger)]"
            : "text-[var(--success)]"
        }
      />

      <SummaryCard
        label="Pending Expenses"
        value={currencyFormatter.format(
          summary.pendingExpenseAmount,
        )}
        description={`${summary.pendingCount} ${
          summary.pendingCount === 1
            ? "pending transaction"
            : "pending transactions"
        } in the current view`}
        icon={<PendingExpenseIcon />}
        iconClassName="bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
        valueClassName={
          summary.pendingExpenseAmount > 0
            ? "text-[var(--warning)]"
            : undefined
        }
      />

      <SummaryCard
        label="Needs Review"
        value={String(
          summary.uncategorizedCount,
        )}
        description={
          summary.uncategorizedCount === 1
            ? "Uncategorized expense needs a budget item"
            : "Uncategorized expenses need budget items"
        }
        icon={<ReviewIcon />}
        iconClassName={
          summary.uncategorizedCount > 0
            ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
            : "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
        }
        valueClassName={
          summary.uncategorizedCount > 0
            ? "text-[var(--warning)]"
            : "text-[var(--success)]"
        }
        footer={
          <SummaryFooter
            totalCount={
              summary.totalCount
            }
            clearedCount={
              summary.clearedCount
            }
            transferCount={
              summary.transferCount
            }
            totalTransferAmount={
              summary.totalTransferAmount
            }
          />
        }
      />
    </section>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconClassName?: string;
  valueClassName?: string;
  footer?: React.ReactNode;
};

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconClassName,
  valueClassName,
  footer,
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 shadow-sm sm:p-5">
      <div className="flex min-h-[132px] items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {label}
          </p>

          <p
            className={joinClassNames(
              "mt-2",
              "break-words",
              "text-2xl",
              "font-bold",
              "leading-tight",
              "tracking-tight",
              "text-[var(--text-primary)]",
              valueClassName,
            )}
          >
            {value}
          </p>

          <p className="mt-2 max-w-[28rem] text-sm leading-5 text-[var(--text-muted)]">
            {description}
          </p>
        </div>

        <div
          className={joinClassNames(
            "flex",
            "h-10",
            "w-10",
            "shrink-0",
            "items-center",
            "justify-center",
            "rounded-xl",
            "bg-[var(--surface-muted)]",
            "text-[var(--primary)]",
            "sm:h-11",
            "sm:w-11",
            iconClassName,
          )}
        >
          {icon}
        </div>
      </div>

      {footer ? (
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          {footer}
        </div>
      ) : null}
    </article>
  );
}

type SummaryFooterProps = {
  totalCount: number;
  clearedCount: number;
  transferCount: number;
  totalTransferAmount: number;
};

function SummaryFooter({
  totalCount,
  clearedCount,
  transferCount,
  totalTransferAmount,
}: SummaryFooterProps) {
  return (
    <dl className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-[var(--surface-muted)] p-3">
        <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Visible
        </dt>

        <dd className="mt-1 text-sm font-bold text-[var(--text-primary)]">
          {totalCount}{" "}
          {totalCount === 1
            ? "transaction"
            : "transactions"}
        </dd>

        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          {clearedCount} cleared
        </p>
      </div>

      <div className="rounded-xl bg-[var(--surface-muted)] p-3">
        <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Transfers
        </dt>

        <dd className="mt-1 text-sm font-bold text-[var(--primary)]">
          {transferCount}
        </dd>

        <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
          {currencyFormatter.format(
            totalTransferAmount,
          )}
        </p>
      </div>
    </dl>
  );
}

function IncomeIcon() {
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ExpenseIcon() {
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
      <path d="M12 21V9" />
      <path d="m17 14-5-5-5 5" />
      <path d="M5 3h14" />
    </svg>
  );
}

function ActivityIcon() {
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
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}

function ClearedIcon() {
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
        cy="12"
        r="9"
      />

      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function PendingExpenseIcon() {
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
        cy="12"
        r="9"
      />

      <path d="M12 7v5l3 2" />
      <path d="M8 3.9 6.5 2.5" />
    </svg>
  );
}

function ReviewIcon() {
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
      <path d="M9 3h6" />
      <path d="M10 2h4a2 2 0 0 1 2 2v1H8V4a2 2 0 0 1 2-2Z" />

      <rect
        x="5"
        y="5"
        width="14"
        height="16"
        rx="2"
      />

      <path d="M9 11h6" />
      <path d="M9 15h4" />
    </svg>
  );
}