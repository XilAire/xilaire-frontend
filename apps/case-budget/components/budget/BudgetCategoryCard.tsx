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
  BudgetAmountType,
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
  onCreateLinkedBill?: (
    category: BudgetCategoryData,
  ) => void;
  isCreatingLinkedBill?: boolean;
  onAddActivity?: (
    category: BudgetCategoryData,
  ) => void;
  onViewActivity?: (
    category: BudgetCategoryData,
  ) => void;
  activityCount?: number;
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

type BudgetItemFinancialPresentation = {
  assignedAmount:
    number;

  spentAmount:
    number;

  remainingAmount:
    number;

  isOverspent:
    boolean;
};

/**
 * Builds read-only presentation values from the canonical budget item
 * returned by getBudget().
 *
 * Production boundary:
 *
 * - assignedAmount is the persisted planned amount.
 * - spentAmount is the canonical persisted activity amount.
 * - This component never reads or sums transactions.
 * - This component never mutates budget activity.
 * - remainingAmount is presentation-only because the current
 *   BudgetCategoryData contract does not yet expose canonical
 *   available_amount / rollover_amount.
 *
 * When BudgetCategoryData is extended with availableAmount, this helper
 * should use that canonical field instead of deriving remainingAmount here.
 */
function getBudgetItemFinancialPresentation(
  category:
    BudgetCategoryData,
): BudgetItemFinancialPresentation {
  const assignedAmount =
    category.assignedAmount;

  const spentAmount =
    category.spentAmount;

  const remainingAmount =
    assignedAmount -
    spentAmount;

  return {
    assignedAmount,

    spentAmount,

    remainingAmount,

    isOverspent:
      remainingAmount <
      0,
  };
}

function getBudgetItemSummaryLabel(
  amountType: BudgetAmountType,
  remainingAmount: number,
) {
  if (remainingAmount < 0) {
    return "Overspent";
  }

  switch (amountType) {
    case "spending":
      return "Monthly spending";
    case "variable":
      return "Variable expense";
    case "fixed":
    default:
      return "Fixed expense";
  }
}

function getPrimaryMetricLabel(
  amountType: BudgetAmountType,
) {
  switch (amountType) {
    case "spending":
      return "Monthly Target";
    case "variable":
      return "Planned";
    case "fixed":
    default:
      return "Assigned";
  }
}

function getActivityMetricLabel(
  amountType: BudgetAmountType,
) {
  switch (amountType) {
    case "spending":
      return "Spent";
    case "variable":
      return "Actual";
    case "fixed":
    default:
      return "Paid / Spent";
  }
}

function getRemainingMetricLabel(
  amountType: BudgetAmountType,
  isOverspent: boolean,
) {
  if (isOverspent) {
    return "Overspent";
  }

  return amountType === "variable"
    ? "Available"
    : "Remaining";
}

function getBudgetItemDescription(
  amountType: BudgetAmountType,
  assignedAmount: number,
  spentAmount: number,
  remainingAmount: number,
) {
  if (remainingAmount < 0) {
    return `${currencyFormatter.format(
      Math.abs(remainingAmount),
    )} over the planned amount`;
  }

  switch (amountType) {
    case "spending":
      return `${currencyFormatter.format(
        spentAmount,
      )} spent of ${currencyFormatter.format(
        assignedAmount,
      )} · ${currencyFormatter.format(
        remainingAmount,
      )} remaining`;

    case "variable":
      return `${currencyFormatter.format(
        spentAmount,
      )} actual of ${currencyFormatter.format(
        assignedAmount,
      )} planned`;

    case "fixed":
    default:
      return `${currencyFormatter.format(
        assignedAmount,
      )} planned · ${currencyFormatter.format(
        remainingAmount,
      )} remaining`;
  }
}

function shouldOfferLinkedBill(
  amountType: BudgetAmountType,
) {
  return (
    amountType === "fixed" ||
    amountType === "variable"
  );
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

function getAmountTypeLabel(
  amountType:
    BudgetAmountType,
) {
  switch (
    amountType
  ) {
    case "variable":
      return "Variable";

    case "spending":
      return "Spending";

    case "fixed":
    default:
      return "Fixed";
  }
}

function getAmountTypeClasses(
  amountType:
    BudgetAmountType,
) {
  switch (
    amountType
  ) {
    case "variable":
      return "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]";

    case "spending":
      return "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]";

    case "fixed":
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
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
  onCreateLinkedBill,
  isCreatingLinkedBill = false,
  onAddActivity,
  onViewActivity,
  activityCount = 0,
}: BudgetCategoryCardProps) {
  const {
    assignedAmount,
    spentAmount,
    remainingAmount,
    isOverspent,
  } =
    getBudgetItemFinancialPresentation(
      category,
    );

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

  const amountType =
    category.amountType;

  const summaryLabel =
    getBudgetItemSummaryLabel(
      amountType,
      remainingAmount,
    );

  const description =
    getBudgetItemDescription(
      amountType,
      assignedAmount,
      spentAmount,
      remainingAmount,
    );

  const canCreateLinkedBill =
    shouldOfferLinkedBill(
      amountType,
    );

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

                <span
                  className={joinClassNames(
                    "inline-flex",
                    "rounded-full",
                    "px-2.5",
                    "py-1",
                    "text-[10px]",
                    "font-bold",
                    "uppercase",
                    "tracking-[0.1em]",
                    getAmountTypeClasses(
                      category.amountType,
                    ),
                  )}
                >
                  {getAmountTypeLabel(
                    category.amountType,
                  )}
                </span>

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

              <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                {summaryLabel}
              </p>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {description}
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
              assignedAmount
            }
            spentAmount={
              spentAmount
            }
            availableAmount={
              remainingAmount
            }
          />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <AmountMetric
            label={getPrimaryMetricLabel(
              amountType,
            )}
            amount={
              assignedAmount
            }
          />

          <AmountMetric
            label={getActivityMetricLabel(
              amountType,
            )}
            amount={
              spentAmount
            }
          />

          <AmountMetric
            label={getRemainingMetricLabel(
              amountType,
              isOverspent,
            )}
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

        {(onAddActivity ||
        onViewActivity) ? (
          <div className="mt-5 flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4 sm:flex-row">
            {onAddActivity ? (
              <button
                type="button"
                onClick={() =>
                  onAddActivity(
                    category,
                  )
                }
                className={joinClassNames(
                  "inline-flex",
                  "min-h-10",
                  "flex-1",
                  "items-center",
                  "justify-center",
                  "gap-2",
                  "rounded-xl",
                  "bg-[var(--primary)]",
                  "px-4",
                  "text-sm",
                  "font-bold",
                  "text-white",
                  "outline-none",
                  "transition-[filter,box-shadow]",
                  "hover:brightness-95",
                  "focus-visible:ring-2",
                  "focus-visible:ring-[var(--primary)]",
                )}
              >
                <ActivityPlusIcon />

                {category.amountType ===
                "spending"
                  ? "Add Spending"
                  : "Add Payment"}
              </button>
            ) : null}

            {onViewActivity ? (
              <button
                type="button"
                onClick={() =>
                  onViewActivity(
                    category,
                  )
                }
                className={joinClassNames(
                  "inline-flex",
                  "min-h-10",
                  "flex-1",
                  "items-center",
                  "justify-center",
                  "gap-2",
                  "rounded-xl",
                  "border",
                  "border-[var(--border-default)]",
                  "bg-[var(--surface-default)]",
                  "px-4",
                  "text-sm",
                  "font-bold",
                  "text-[var(--text-primary)]",
                  "outline-none",
                  "transition-[background-color,border-color,color,box-shadow]",
                  "hover:border-[var(--primary)]",
                  "hover:bg-[var(--surface-muted)]",
                  "hover:text-[var(--primary)]",
                  "focus-visible:ring-2",
                  "focus-visible:ring-[var(--primary)]",
                )}
              >
                <ActivityIcon />

                View / Edit Activity

                {activityCount > 0 ? (
                  <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                    {activityCount}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        ) : null}
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--text-muted)]">
                <UnlinkedIcon />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {canCreateLinkedBill
                    ? "No linked bill"
                    : "Transaction tracked"}
                </p>

                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  {canCreateLinkedBill
                    ? "Create a monthly bill linked directly to this budget item."
                    : "Spending is accumulated from transactions assigned to this budget item throughout the month."}
                </p>
              </div>
            </div>

            {onCreateLinkedBill &&
            canCreateLinkedBill ? (
              <button
                type="button"
                disabled={
                  isCreatingLinkedBill
                }
                onClick={() =>
                  onCreateLinkedBill(
                    category,
                  )
                }
                className={joinClassNames(
                  "inline-flex",
                  "min-h-10",
                  "items-center",
                  "justify-center",
                  "gap-2",
                  "rounded-xl",
                  "bg-[var(--primary)]",
                  "px-4",
                  "text-xs",
                  "font-bold",
                  "text-white",
                  "outline-none",
                  "transition-[filter,box-shadow]",
                  "hover:brightness-95",
                  "focus-visible:ring-2",
                  "focus-visible:ring-[var(--primary)]",
                  "disabled:cursor-not-allowed",
                  "disabled:opacity-60",
                )}
              >
                <LinkIcon />

                {isCreatingLinkedBill
                  ? "Creating..."
                  : "Create Linked Bill"}
              </button>
            ) : null}
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

function ActivityPlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ActivityIcon() {
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
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19H2" />
    </svg>
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