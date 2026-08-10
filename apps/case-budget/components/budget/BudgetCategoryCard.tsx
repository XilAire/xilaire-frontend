"use client";

import BudgetProgress from "@/components/budget/BudgetProgress";

import {
  getBillFrequencyLabel,
  getBillStatusLabel,
  type BillBudgetSyncMode,
  type BillData,
  type BillStatus,
} from "@/types/bill";
import type {
  BudgetCategoryData,
} from "@/types/budget";

export type BudgetCategoryCardProps = {
  category: BudgetCategoryData;
  linkedBills?: BillData[];
  onEdit?: (
    category: BudgetCategoryData,
  ) => void;
  onOpenBill?: (
    bill: BillData,
  ) => void;
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

const shortDateFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
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

function getRemainingAmount(
  category: BudgetCategoryData,
) {
  return (
    category.assignedAmount -
    category.spentAmount
  );
}

function getRemainingLabel(
  remainingAmount: number,
) {
  if (remainingAmount < 0) {
    return "Overspent";
  }

  if (remainingAmount === 0) {
    return "Fully spent";
  }

  return "Available";
}

function parseLocalDate(
  value: string,
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
  );
}

function formatDueDate(
  value: string,
) {
  const parsedDate =
    parseLocalDate(value);

  if (
    !parsedDate ||
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return value;
  }

  return shortDateFormatter.format(
    parsedDate,
  );
}

function getStatusClasses(
  status: BillStatus,
) {
  switch (status) {
    case "paid":
      return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";

    case "past-due":
      return "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]";

    case "due-today":
      return "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--warning)]";

    case "due-soon":
      return "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]";

    case "upcoming":
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  }
}

function getSyncModeLabel(
  mode:
    BillBudgetSyncMode | undefined,
) {
  switch (mode) {
    case "automatic":
      return "Automatic Sync";

    case "suggest":
      return "Suggested Sync";

    case "manual":
      return "Manual Sync";

    default:
      return "Sync Disabled";
  }
}

function getSyncModeClasses(
  bill: BillData,
) {
  if (
    !bill.budgetSync?.enabled
  ) {
    return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  }

  switch (
    bill.budgetSync.mode
  ) {
    case "automatic":
      return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";

    case "suggest":
      return "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]";

    case "manual":
    default:
      return "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]";
  }
}

function sortLinkedBills(
  firstBill: BillData,
  secondBill: BillData,
) {
  if (
    firstBill.status === "paid" &&
    secondBill.status !== "paid"
  ) {
    return 1;
  }

  if (
    firstBill.status !== "paid" &&
    secondBill.status === "paid"
  ) {
    return -1;
  }

  return firstBill.dueDate.localeCompare(
    secondBill.dueDate,
  );
}

export default function BudgetCategoryCard({
  category,
  linkedBills = [],
  onEdit,
  onOpenBill,
}: BudgetCategoryCardProps) {
  const remainingAmount =
    getRemainingAmount(
      category,
    );

  const isOverspent =
    remainingAmount < 0;

  const sortedLinkedBills =
    [...linkedBills].sort(
      sortLinkedBills,
    );

  const linkedBillCount =
    sortedLinkedBills.length;

  const linkedBillLabel =
    linkedBillCount === 1
      ? "1 Linked Bill"
      : `${linkedBillCount} Linked Bills`;

  return (
    <article
      className={joinClassNames(
        "overflow-hidden",
        "rounded-2xl",
        "border",
        "border-[var(--border-subtle)]",
        "bg-[var(--surface-default)]",
        "shadow-sm",
        "transition-[border-color,box-shadow,transform]",
        "duration-[var(--motion-fast)]",
        "hover:border-[var(--border-strong)]",
        "hover:shadow-md",
      )}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={joinClassNames(
                "flex",
                "h-11",
                "w-11",
                "shrink-0",
                "items-center",
                "justify-center",
                "rounded-xl",
                isOverspent
                  ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
                  : linkedBillCount > 0
                    ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
              )}
            >
              {linkedBillCount >
              0 ? (
                <LinkedBillIcon />
              ) : (
                <CategoryIcon />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-bold text-[var(--text-primary)]">
                  {category.name}
                </h3>

                {isOverspent ? (
                  <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--danger)]">
                    Overspent
                  </span>
                ) : null}

                {linkedBillCount >
                0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--primary)]">
                    <LinkIcon />

                    {linkedBillLabel}
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">
                {getRemainingLabel(
                  remainingAmount,
                )}
              </p>
            </div>
          </div>

          {onEdit ? (
            <button
              type="button"
              onClick={() =>
                onEdit(category)
              }
              aria-label={`Edit ${category.name}`}
              title={`Edit ${category.name}`}
              className={joinClassNames(
                "inline-flex",
                "h-10",
                "w-10",
                "shrink-0",
                "items-center",
                "justify-center",
                "rounded-xl",
                "text-[var(--text-muted)]",
                "outline-none",
                "transition-[background-color,color,box-shadow]",
                "hover:bg-[var(--surface-muted)]",
                "hover:text-[var(--primary)]",
                "focus-visible:ring-2",
                "focus-visible:ring-[var(--primary)]",
              )}
            >
              <MoreHorizontalIcon />
            </button>
          ) : null}
        </div>

        <div className="mt-5">
          <BudgetProgress
            assignedAmount={
              category.assignedAmount
            }
            spentAmount={
              category.spentAmount
            }
          />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <AmountMetric
            label="Assigned"
            amount={
              category.assignedAmount
            }
          />

          <AmountMetric
            label="Spent"
            amount={
              category.spentAmount
            }
          />

          <AmountMetric
            label={
              isOverspent
                ? "Overspent"
                : "Remaining"
            }
            amount={
              remainingAmount
            }
            valueClassName={
              isOverspent
                ? "text-[var(--danger)]"
                : remainingAmount === 0
                  ? "text-[var(--text-muted)]"
                  : "text-[var(--success)]"
            }
          />
        </div>
      </div>

      {linkedBillCount > 0 ? (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
                Bill Connections
              </p>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Open a linked bill to
                view payment details.
              </p>
            </div>

            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-default)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">
              {linkedBillCount}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {sortedLinkedBills.map(
              (bill) => (
                <LinkedBillRow
                  key={bill.id}
                  bill={bill}
                  onOpenBill={
                    onOpenBill
                  }
                />
              ),
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--text-muted)]">
              <UnlinkedIcon />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                No linked bills
              </p>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                Connect a bill to this
                budget item to track
                upcoming payments and
                synchronization status.
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

type AmountMetricProps = {
  label: string;
  amount: number;
  valueClassName?: string;
};

function AmountMetric({
  label,
  amount,
  valueClassName,
}: AmountMetricProps) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={joinClassNames(
          "mt-1",
          "truncate",
          "text-sm",
          "font-bold",
          "text-[var(--text-primary)]",
          valueClassName,
        )}
      >
        {currencyFormatter.format(
          amount,
        )}
      </p>
    </div>
  );
}

type LinkedBillRowProps = {
  bill: BillData;
  onOpenBill?: (
    bill: BillData,
  ) => void;
};

function LinkedBillRow({
  bill,
  onOpenBill,
}: LinkedBillRowProps) {
  const isClickable =
    Boolean(onOpenBill);

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() =>
        onOpenBill?.(bill)
      }
      className={joinClassNames(
        "w-full",
        "rounded-xl",
        "border",
        "border-[var(--border-subtle)]",
        "bg-[var(--surface-default)]",
        "p-3.5",
        "text-left",
        "outline-none",
        "transition-[border-color,background-color,box-shadow]",
        isClickable
          ? "cursor-pointer hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_4%,var(--surface-default))] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          : "cursor-default",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-[var(--text-primary)]">
              {bill.name}
            </p>

            <span
              className={joinClassNames(
                "inline-flex",
                "rounded-full",
                "px-2",
                "py-0.5",
                "text-[9px]",
                "font-bold",
                "uppercase",
                "tracking-[0.08em]",
                getStatusClasses(
                  bill.status,
                ),
              )}
            >
              {getBillStatusLabel(
                bill.status,
              )}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
            <span>
              Due{" "}
              {formatDueDate(
                bill.dueDate,
              )}
            </span>

            <span aria-hidden="true">
              •
            </span>

            <span>
              {currencyFormatter.format(
                bill.amount,
              )}
            </span>

            <span aria-hidden="true">
              •
            </span>

            <span>
              {bill.paymentMethod ===
              "autopay"
                ? "Autopay"
                : "Manual"}
            </span>

            <span aria-hidden="true">
              •
            </span>

            <span>
              {getBillFrequencyLabel(
                bill.frequency,
              )}
            </span>
          </div>

          <div className="mt-2">
            <span
              className={joinClassNames(
                "inline-flex",
                "rounded-full",
                "px-2",
                "py-1",
                "text-[10px]",
                "font-semibold",
                getSyncModeClasses(
                  bill,
                ),
              )}
            >
              {bill.budgetSync
                ?.enabled
                ? getSyncModeLabel(
                    bill.budgetSync
                      .mode,
                  )
                : "Sync Disabled"}
            </span>
          </div>
        </div>

        {isClickable ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)]">
            <ArrowUpRightIcon />
          </div>
        ) : null}
      </div>
    </button>
  );
}

function CategoryIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        width="16"
        height="12"
        x="4"
        y="6"
        rx="2"
      />

      <path d="M8 10h8" />
      <path d="M8 14h4" />
    </svg>
  );
}

function LinkedBillIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h3" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function UnlinkedIcon() {
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
      <path d="m18.84 12.25 1.69-1.69a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="m5.17 11.75-1.7 1.7a5 5 0 0 0 7.08 7.07l1.7-1.7" />
      <path d="M8 12h8" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

function ArrowUpRightIcon() {
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
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function MoreHorizontalIcon() {
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
        cx="5"
        cy="12"
        r="1"
      />

      <circle
        cx="12"
        cy="12"
        r="1"
      />

      <circle
        cx="19"
        cy="12"
        r="1"
      />
    </svg>
  );
}