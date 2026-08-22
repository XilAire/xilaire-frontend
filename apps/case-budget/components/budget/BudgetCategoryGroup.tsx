"use client";

import BudgetCategoryCard from "@/components/budget/BudgetCategoryCard";
import Card, {
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card/Card";

import type {
  BillData,
} from "@/types/bill";
import type {
  BudgetCategoryData,
  BudgetCategoryGroupData,
} from "@/types/budget";

export type BudgetCategoryGroupProps = {
  group: BudgetCategoryGroupData;
  defaultExpanded?: boolean;
  onAddItem?: (
    group: BudgetCategoryGroupData,
  ) => void;
  onEditItem?: (
    item: BudgetCategoryData,
    group: BudgetCategoryGroupData,
  ) => void;
  onEditCategory?: (
    group: BudgetCategoryGroupData,
  ) => void;
  getLinkedBillsForBudgetItem?: (
    budgetItem: BudgetCategoryData,
  ) => BillData[];
  onViewBill?: (
    bill: BillData,
  ) => void;
  onCreateLinkedBill?: (
    item: BudgetCategoryData,
    group: BudgetCategoryGroupData,
  ) => void;
  creatingLinkedBillItemId?: string | null;
  onAddItemActivity?: (
    item: BudgetCategoryData,
  ) => void;
  onViewItemActivity?: (
    item: BudgetCategoryData,
  ) => void;
  getItemActivityCount?: (
    item: BudgetCategoryData,
  ) => number;
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

type GroupFinancialTotals = {
  assignedAmount:
    number;

  spentAmount:
    number;

  remainingAmount:
    number;
};

/**
 * Builds read-only group presentation totals from the canonical budget item
 * values already returned by getBudget().
 *
 * Important production boundary:
 *
 * - This component never reads transactions directly.
 * - This component never applies transaction deltas.
 * - item.spentAmount already represents canonical Supabase activity_amount.
 * - item.availableAmount already represents canonical Supabase
 *   available_amount, including rollover.
 * - Group totals only aggregate those canonical item values for display.
 * - No available balance is re-derived as assigned minus spent.
 * - No budget data is persisted or mutated here.
 */
function getGroupFinancialTotals(
  group:
    BudgetCategoryGroupData,
): GroupFinancialTotals {
  const totals =
    group.categories.reduce(
      (
        current,
        item,
      ) => ({
        assignedAmount:
          current.assignedAmount +
          item.assignedAmount,

        spentAmount:
          current.spentAmount +
          item.spentAmount,

        remainingAmount:
          current.remainingAmount +
          item.availableAmount,
      }),
      {
        assignedAmount:
          0,

        spentAmount:
          0,

        remainingAmount:
          0,
      },
    );

  return {
    assignedAmount:
      totals.assignedAmount,

    spentAmount:
      totals.spentAmount,

    remainingAmount:
      totals.remainingAmount,
  };
}

export default function BudgetCategoryGroup({
  group,
  defaultExpanded = true,
  onAddItem,
  onEditItem,
  onEditCategory,
  getLinkedBillsForBudgetItem,
  onViewBill,
  onCreateLinkedBill,
  creatingLinkedBillItemId = null,
  onAddItemActivity,
  onViewItemActivity,
  getItemActivityCount,
}: BudgetCategoryGroupProps) {
  const {
    assignedAmount,
    spentAmount,
    remainingAmount,
  } =
    getGroupFinancialTotals(
      group,
    );

  function handleEditCategoryClick(
    event:
      React.MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    onEditCategory?.(
      group,
    );
  }

  return (
    <Card padding="none">
      <details
        open={defaultExpanded}
        className="group"
      >
        <summary
          className={joinClassNames(
            "flex",
            "cursor-pointer",
            "list-none",
            "items-start",
            "justify-between",
            "gap-4",
            "border-b",
            "border-[var(--border-subtle)]",
            "p-5",
            "outline-none",
            "transition-colors",
            "duration-[var(--motion-fast)]",
            "hover:bg-[var(--surface-muted)]",
            "focus-visible:ring-2",
            "focus-visible:ring-inset",
            "focus-visible:ring-[var(--primary)]",
            "sm:p-6",
            "[&::-webkit-details-marker]:hidden",
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={joinClassNames(
                "mt-0.5",
                "flex",
                "h-9",
                "w-9",
                "shrink-0",
                "items-center",
                "justify-center",
                "rounded-xl",
                "bg-[var(--surface-muted)]",
                "text-[var(--text-muted)]",
                "transition-transform",
                "duration-[var(--motion-fast)]",
                "group-open:rotate-90",
              )}
            >
              <ChevronRightIcon />
            </div>

            <div className="min-w-0">
              <CardTitle>
                {group.name}
              </CardTitle>

              {group.description ? (
                <CardDescription>
                  {group.description}
                </CardDescription>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <div className="text-right">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {currencyFormatter.format(
                  assignedAmount,
                )}
              </p>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                assigned
              </p>
            </div>

            {onEditCategory ? (
              <button
                type="button"
                aria-label={`Edit ${group.name} category`}
                title={`Edit ${group.name}`}
                onClick={
                  handleEditCategoryClick
                }
                className={joinClassNames(
                  "inline-flex",
                  "h-9",
                  "w-9",
                  "shrink-0",
                  "items-center",
                  "justify-center",
                  "rounded-xl",
                  "text-[var(--text-muted)]",
                  "outline-none",
                  "transition-colors",
                  "hover:bg-[var(--surface-muted)]",
                  "hover:text-[var(--primary)]",
                  "focus-visible:ring-2",
                  "focus-visible:ring-[var(--primary)]",
                  "focus-visible:ring-offset-2",
                  "focus-visible:ring-offset-[var(--surface-default)]",
                )}
              >
                <MoreIcon />
              </button>
            ) : null}
          </div>
        </summary>

        <CardContent className="p-0">
          {group.categories.length >
          0 ? (
            <div className="space-y-5 p-5 sm:p-6">
              {group.categories.map(
                (
                  item,
                ) => (
                  <div
                    key={item.id}
                  >
                    <BudgetCategoryCard
                      category={item}
                      linkedBills={
                        getLinkedBillsForBudgetItem?.(
                          item,
                        ) ?? []
                      }
                      onOpenBill={
                        onViewBill
                      }
                      onEdit={() =>
                        onEditItem?.(
                          item,
                          group,
                        )
                      }
                      onCreateLinkedBill={() =>
                        onCreateLinkedBill?.(
                          item,
                          group,
                        )
                      }
                      isCreatingLinkedBill={
                        creatingLinkedBillItemId ===
                        item.id
                      }
                      onAddActivity={
                        onAddItemActivity
                      }
                      onViewActivity={
                        onViewItemActivity
                      }
                      activityCount={
                        getItemActivityCount?.(
                          item,
                        ) ??
                        0
                      }
                    />
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="px-5 py-10 text-center sm:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
                <FolderIcon />
              </div>

              <p className="mt-4 font-semibold text-[var(--text-primary)]">
                No items yet
              </p>

              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
                Add an item to begin
                assigning money within
                this budget category.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button
              type="button"
              onClick={() =>
                onAddItem?.(
                  group,
                )
              }
              className={joinClassNames(
                "inline-flex",
                "min-h-10",
                "items-center",
                "justify-center",
                "gap-2",
                "whitespace-nowrap",
                "rounded-xl",
                "border",
                "border-[var(--border-default)]",
                "bg-[var(--surface-default)]",
                "px-3.5",
                "py-2",
                "text-sm",
                "font-semibold",
                "text-[var(--text-primary)]",
                "outline-none",
                "transition-[background-color,border-color,box-shadow,color]",
                "duration-[var(--motion-fast)]",
                "hover:border-[var(--primary)]",
                "hover:text-[var(--primary)]",
                "focus-visible:ring-2",
                "focus-visible:ring-[var(--primary)]",
                "focus-visible:ring-offset-2",
                "focus-visible:ring-offset-[var(--background)]",
              )}
            >
              <PlusIcon />

              Add item
            </button>

            <div className="grid grid-cols-3 gap-4 text-right sm:min-w-[360px]">
              <GroupTotal
                label="Assigned"
                amount={
                  assignedAmount
                }
              />

              <GroupTotal
                label="Spent"
                amount={
                  spentAmount
                }
              />

              <GroupTotal
                label="Remaining"
                amount={
                  remainingAmount
                }
                valueClassName={
                  remainingAmount < 0
                    ? "text-[var(--danger)]"
                    : remainingAmount ===
                        0
                      ? "text-[var(--text-muted)]"
                      : "text-[var(--success)]"
                }
              />
            </div>
          </div>
        </CardContent>
      </details>
    </Card>
  );
}

type GroupTotalProps = {
  label: string;
  amount: number;
  valueClassName?: string;
};

function GroupTotal({
  label,
  amount,
  valueClassName,
}: GroupTotalProps) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs font-medium text-[var(--text-muted)]">
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

function ChevronRightIcon() {
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
      <path d="m9 18 6-6-6-6" />
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

function MoreIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
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

function FolderIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />
    </svg>
  );
}