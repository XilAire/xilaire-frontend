"use client";

import Badge from "@/components/ui/badge/Badge";
import Card, {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card/Card";
import ProgressBar from "@/components/ui/ProgressBar";

export type BudgetIncomeSource = {
  id: string;
  name: string;
  amount: number;
  receivedAmount: number;
  status:
    | "planned"
    | "partial"
    | "received";
};

export type BudgetIncomeCardProps = {
  incomeSources: BudgetIncomeSource[];
  plannedIncome: number;
  receivedIncome: number;
  onAddIncome?: () => void;
  onEditIncome?: (
    incomeSource: BudgetIncomeSource,
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

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

function getIncomeStatusVariant(
  status: BudgetIncomeSource["status"],
):
  | "default"
  | "success"
  | "warning"
  | "info" {
  switch (status) {
    case "received":
      return "success";

    case "partial":
      return "warning";

    case "planned":
    default:
      return "info";
  }
}

function getIncomeStatusLabel(
  status: BudgetIncomeSource["status"],
) {
  switch (status) {
    case "received":
      return "Received";

    case "partial":
      return "Partial";

    case "planned":
    default:
      return "Planned";
  }
}

function getIncomeProgress(
  receivedAmount: number,
  plannedAmount: number,
) {
  if (plannedAmount <= 0) {
    return 0;
  }

  return Math.min(
    (receivedAmount /
      plannedAmount) *
      100,
    100,
  );
}

export default function BudgetIncomeCard({
  incomeSources,
  plannedIncome,
  receivedIncome,
  onAddIncome,
  onEditIncome,
}: BudgetIncomeCardProps) {
  const receivedPercentage =
    getIncomeProgress(
      receivedIncome,
      plannedIncome,
    );

  return (
    <Card padding="none">
      <CardHeader
        className={joinClassNames(
          "flex",
          "flex-col",
          "gap-4",
          "border-b",
          "border-[var(--border-subtle)]",
          "p-5",
          "sm:flex-row",
          "sm:items-start",
          "sm:justify-between",
          "sm:p-6",
        )}
      >
        <div>
          <CardTitle>
            Income
          </CardTitle>

          <CardDescription>
            Track planned and
            received income for
            this budget month.
          </CardDescription>
        </div>

        <button
          type="button"
          onClick={onAddIncome}
          className={joinClassNames(
            "inline-flex",
            "min-h-10",
            "items-center",
            "justify-center",
            "gap-2",
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
            "hover:bg-[var(--surface-muted)]",
            "hover:text-[var(--primary)]",
            "focus-visible:ring-2",
            "focus-visible:ring-[var(--primary)]",
            "focus-visible:ring-offset-2",
            "focus-visible:ring-offset-[var(--background)]",
          )}
        >
          <PlusIcon />

          Add income
        </button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid gap-px bg-[var(--border-subtle)] sm:grid-cols-3">
          <IncomeSummaryItem
            label="Planned"
            value={currencyFormatter.format(
              plannedIncome,
            )}
          />

          <IncomeSummaryItem
            label="Received"
            value={currencyFormatter.format(
              receivedIncome,
            )}
            valueClassName="text-[var(--success)]"
          />

          <IncomeSummaryItem
            label="Remaining"
            value={currencyFormatter.format(
              Math.max(
                plannedIncome -
                  receivedIncome,
                0,
              ),
            )}
            valueClassName={
              plannedIncome -
                receivedIncome >
              0
                ? "text-[var(--warning)]"
                : "text-[var(--success)]"
            }
          />
        </div>

        <div className="border-b border-[var(--border-subtle)] p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Income received
              </p>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {receivedPercentage.toFixed(
                  0,
                )}
                % of planned income
              </p>
            </div>

            <p className="text-sm font-bold text-[var(--text-primary)]">
              {currencyFormatter.format(
                receivedIncome,
              )}
            </p>
          </div>

          <ProgressBar
            value={receivedIncome}
            max={
              plannedIncome > 0
                ? plannedIncome
                : 1
            }
            tone="success"
            size="sm"
            showValue={false}
          />
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {incomeSources.length >
          0 ? (
            incomeSources.map(
              (incomeSource) => {
                const remaining =
                  Math.max(
                    incomeSource.amount -
                      incomeSource.receivedAmount,
                    0,
                  );

                return (
                  <button
                    key={
                      incomeSource.id
                    }
                    type="button"
                    onClick={() =>
                      onEditIncome?.(
                        incomeSource,
                      )
                    }
                    className={joinClassNames(
                      "grid",
                      "w-full",
                      "gap-4",
                      "px-5",
                      "py-4",
                      "text-left",
                      "outline-none",
                      "transition-colors",
                      "duration-[var(--motion-fast)]",
                      "hover:bg-[var(--surface-muted)]",
                      "focus-visible:bg-[var(--surface-muted)]",
                      "sm:grid-cols-[minmax(0,1fr)_140px_140px]",
                      "sm:items-center",
                      "sm:px-6",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-[var(--text-primary)]">
                          {
                            incomeSource.name
                          }
                        </p>

                        <Badge
                          variant={getIncomeStatusVariant(
                            incomeSource.status,
                          )}
                          size="sm"
                        >
                          {getIncomeStatusLabel(
                            incomeSource.status,
                          )}
                        </Badge>
                      </div>

                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {remaining >
                        0
                          ? `${currencyFormatter.format(
                              remaining,
                            )} still expected`
                          : "Income fully received"}
                      </p>
                    </div>

                    <IncomeAmount
                      label="Planned"
                      value={
                        incomeSource.amount
                      }
                    />

                    <IncomeAmount
                      label="Received"
                      value={
                        incomeSource.receivedAmount
                      }
                      valueClassName="text-[var(--success)]"
                    />
                  </button>
                );
              },
            )
          ) : (
            <div className="px-5 py-10 text-center sm:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
                <WalletIcon />
              </div>

              <p className="mt-4 font-semibold text-[var(--text-primary)]">
                No income added
              </p>

              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
                Add your planned
                paychecks and other
                income sources to
                begin assigning
                dollars.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type IncomeSummaryItemProps = {
  label: string;
  value: string;
  valueClassName?: string;
};

function IncomeSummaryItem({
  label,
  value,
  valueClassName,
}: IncomeSummaryItemProps) {
  return (
    <div className="bg-[var(--surface-default)] px-5 py-4 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={joinClassNames(
          "mt-2",
          "text-xl",
          "font-bold",
          "text-[var(--text-primary)]",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

type IncomeAmountProps = {
  label: string;
  value: number;
  valueClassName?: string;
};

function IncomeAmount({
  label,
  value,
  valueClassName,
}: IncomeAmountProps) {
  return (
    <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
      <span className="text-xs font-medium text-[var(--text-muted)] sm:block">
        {label}
      </span>

      <span
        className={joinClassNames(
          "font-bold",
          "text-[var(--text-primary)]",
          "sm:mt-1",
          "sm:block",
          valueClassName,
        )}
      >
        {currencyFormatter.format(
          value,
        )}
      </span>
    </div>
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

function WalletIcon() {
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
      <path d="M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v8a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7" />
      <path d="M16 14h.01" />
    </svg>
  );
}