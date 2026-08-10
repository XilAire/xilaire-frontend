"use client";

import BudgetProgress from "@/components/budget/BudgetProgress";

import type {
  BillBudgetSyncMode,
  BillData,
  BillStatus,
} from "@/types/bill";
import type {
  BudgetCategoryData,
} from "@/types/budget";

export type BudgetCategoryRowProps = {
  category: BudgetCategoryData;
  linkedBill?: BillData | null;
  onEdit?: () => void;
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
  dateValue: string,
) {
  const [
    year,
    month,
    day,
  ] = dateValue
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
  dueDate: string,
) {
  const parsedDate =
    parseLocalDate(
      dueDate,
    );

  if (
    !parsedDate ||
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return dueDate;
  }

  return shortDateFormatter.format(
    parsedDate,
  );
}

function getBillStatusLabel(
  status: BillStatus,
) {
  switch (status) {
    case "past-due":
      return "Past due";

    case "due-soon":
      return "Due soon";

    case "upcoming":
      return "Upcoming";

    case "paid":
      return "Paid";

    default:
      return "Scheduled";
  }
}

function getBillStatusClasses(
  status: BillStatus,
) {
  switch (status) {
    case "past-due":
      return "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]";

    case "due-soon":
      return "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]";

    case "paid":
      return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";

    case "upcoming":
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  }
}

function getBudgetSyncModeLabel(
  mode: BillBudgetSyncMode,
) {
  switch (mode) {
    case "automatic":
      return "Automatic sync";

    case "suggest":
      return "Suggested sync";

    case "manual":
    default:
      return "Manual sync";
  }
}

export default function BudgetCategoryRow({
  category,
  linkedBill,
  onEdit,
  onOpenBill,
}: BudgetCategoryRowProps) {
  const remainingAmount =
    getRemainingAmount(category);

  const isOverspent =
    remainingAmount < 0;

  const isBillSyncEnabled =
    Boolean(
      linkedBill
        ?.budgetSync
        ?.enabled,
    );

  function handleOpenBill() {
    if (
      !linkedBill ||
      !onOpenBill
    ) {
      return;
    }

    onOpenBill(
      linkedBill,
    );
  }

  return (
    <div
      className={joinClassNames(
        "px-5",
        "py-5",
        "transition-colors",
        "duration-[var(--motion-fast)]",
        "hover:bg-[var(--surface-muted)]",
        "sm:px-6",
      )}
    >
      <div
        className={joinClassNames(
          "grid",
          "gap-4",
          "lg:grid-cols-[minmax(0,1fr)_130px_130px_130px_44px]",
          "lg:items-center",
        )}
      >
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div
              className={joinClassNames(
                "flex",
                "h-10",
                "w-10",
                "shrink-0",
                "items-center",
                "justify-center",
                "rounded-xl",
                isOverspent
                  ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
                  : linkedBill
                    ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
              )}
            >
              {linkedBill ? (
                <LinkedBillIcon />
              ) : (
                <CategoryIcon />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {category.name}
                </h3>

                {isOverspent ? (
                  <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--danger)]">
                    Overspent
                  </span>
                ) : null}

                {linkedBill ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
                    <LinkIcon />

                    Linked Bill
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {getRemainingLabel(
                  remainingAmount,
                )}
              </p>

              <div className="mt-3 max-w-md">
                <BudgetProgress
                  assignedAmount={
                    category.assignedAmount
                  }
                  spentAmount={
                    category.spentAmount
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <MobileAmountGrid
          category={category}
          remainingAmount={
            remainingAmount
          }
        />

        <DesktopAmount
          label="Assigned"
          amount={
            category.assignedAmount
          }
        />

        <DesktopAmount
          label="Spent"
          amount={
            category.spentAmount
          }
        />

        <DesktopAmount
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

        <div className="flex justify-end">
          <button
            type="button"
            aria-label={`Edit ${category.name}`}
            title={`Edit ${category.name}`}
            onClick={onEdit}
            className={joinClassNames(
              "inline-flex",
              "h-10",
              "w-10",
              "items-center",
              "justify-center",
              "rounded-xl",
              "text-[var(--text-muted)]",
              "outline-none",
              "transition-[background-color,color,box-shadow]",
              "duration-[var(--motion-fast)]",
              "hover:bg-[var(--surface-default)]",
              "hover:text-[var(--primary)]",
              "focus-visible:ring-2",
              "focus-visible:ring-[var(--primary)]",
              "focus-visible:ring-offset-2",
              "focus-visible:ring-offset-[var(--background)]",
            )}
          >
            <MoreHorizontalIcon />
          </button>
        </div>
      </div>

      {linkedBill ? (
        <div className="mt-4 lg:pl-[52px]">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {linkedBill.name}
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
                      "tracking-[0.1em]",
                      getBillStatusClasses(
                        linkedBill.status,
                      ),
                    )}
                  >
                    {getBillStatusLabel(
                      linkedBill.status,
                    )}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                  <span>
                    Due{" "}
                    {formatDueDate(
                      linkedBill.dueDate,
                    )}
                  </span>

                  <span aria-hidden="true">
                    •
                  </span>

                  <span>
                    {currencyFormatter.format(
                      linkedBill.amount,
                    )}
                  </span>

                  {linkedBill.payee ? (
                    <>
                      <span aria-hidden="true">
                        •
                      </span>

                      <span className="truncate">
                        {linkedBill.payee}
                      </span>
                    </>
                  ) : null}

                  <span aria-hidden="true">
                    •
                  </span>

                  <span
                    className={joinClassNames(
                      "inline-flex",
                      "rounded-full",
                      "px-2",
                      "py-1",
                      "text-[10px]",
                      "font-semibold",
                      isBillSyncEnabled
                        ? "bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]"
                        : "bg-[var(--surface-default)] text-[var(--text-muted)]",
                    )}
                  >
                    {isBillSyncEnabled
                      ? getBudgetSyncModeLabel(
                          linkedBill
                            .budgetSync
                            ?.mode ??
                            "manual",
                        )
                      : "Budget sync disabled"}
                  </span>
                </div>
              </div>

              {onOpenBill ? (
                <button
                  type="button"
                  onClick={
                    handleOpenBill
                  }
                  className={joinClassNames(
                    "inline-flex",
                    "min-h-9",
                    "shrink-0",
                    "items-center",
                    "justify-center",
                    "gap-2",
                    "rounded-lg",
                    "border",
                    "border-[var(--border-default)]",
                    "bg-[var(--surface-default)]",
                    "px-3",
                    "py-2",
                    "text-xs",
                    "font-semibold",
                    "text-[var(--text-primary)]",
                    "outline-none",
                    "transition-[background-color,border-color,color,box-shadow]",
                    "hover:border-[var(--primary)]",
                    "hover:text-[var(--primary)]",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--primary)]",
                    "focus-visible:ring-offset-2",
                    "focus-visible:ring-offset-[var(--surface-muted)]",
                  )}
                >
                  Open Bill

                  <ArrowUpRightIcon />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type MobileAmountGridProps = {
  category: BudgetCategoryData;
  remainingAmount: number;
};

function MobileAmountGrid({
  category,
  remainingAmount,
}: MobileAmountGridProps) {
  const isOverspent =
    remainingAmount < 0;

  return (
    <div className="grid grid-cols-3 gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 lg:hidden">
      <MobileAmount
        label="Assigned"
        amount={
          category.assignedAmount
        }
      />

      <MobileAmount
        label="Spent"
        amount={
          category.spentAmount
        }
      />

      <MobileAmount
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
  );
}

type MobileAmountProps = {
  label: string;
  amount: number;
  valueClassName?: string;
};

function MobileAmount({
  label,
  amount,
  valueClassName,
}: MobileAmountProps) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={joinClassNames(
          "mt-1",
          "truncate",
          "text-xs",
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

type DesktopAmountProps = {
  label: string;
  amount: number;
  valueClassName?: string;
};

function DesktopAmount({
  label,
  amount,
  valueClassName,
}: DesktopAmountProps) {
  return (
    <div className="hidden text-right lg:block">
      <span className="sr-only">
        {label}
      </span>

      <p
        className={joinClassNames(
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

function CategoryIcon() {
  return (
    <svg
      width="19"
      height="19"
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
      width="19"
      height="19"
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

function ArrowUpRightIcon() {
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
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function MoreHorizontalIcon() {
  return (
    <svg
      width="19"
      height="19"
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