"use client";

import Card, {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card/Card";
import ProgressBar from "@/components/ui/ProgressBar";

export type RemainingBudgetCardProps = {
  income: number;
  assigned: number;

  /**
   * Planned income that has not yet been assigned to budget items.
   */
  unassignedAmount: number;

  /**
   * Canonical available_amount summed across active budget items.
   * This already includes rollover and transaction activity.
   */
  availableAmount: number;

  /**
   * Canonical rollover_amount summed across active budget items.
   */
  rolloverAmount: number;
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

function getProgressTone(
  income: number,
  assigned: number,
):
  | "success"
  | "primary"
  | "warning"
  | "danger" {
  if (assigned > income) {
    return "danger";
  }

  if (assigned === income) {
    return "success";
  }

  const percentage =
    income > 0
      ? (assigned / income) *
        100
      : 0;

  if (percentage >= 90) {
    return "primary";
  }

  return "warning";
}

export default function RemainingBudgetCard({
  income,
  assigned,
  unassignedAmount,
  availableAmount,
  rolloverAmount,
}: RemainingBudgetCardProps) {
  const isOverBudget =
    unassignedAmount < 0;

  const progressTone =
    getProgressTone(
      income,
      assigned,
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Remaining Budget
        </CardTitle>

        <CardDescription>
          Every dollar should have
          a job before the month
          begins.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Unassigned Income
          </p>

          <h2
            className={joinClassNames(
              "mt-2",
              "text-4xl",
              "font-bold",
              isOverBudget
                ? "text-[var(--danger)]"
                : unassignedAmount === 0
                  ? "text-[var(--success)]"
                  : "text-[var(--warning)]",
            )}
          >
            {currencyFormatter.format(
              unassignedAmount,
            )}
          </h2>

          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {isOverBudget
              ? "You have assigned more than your planned income."
              : unassignedAmount ===
                  0
                ? "Excellent! Every planned dollar has been assigned."
                : "Assign the remaining planned income to budget items before the month begins."}
          </p>
        </div>

        <ProgressBar
          value={Math.min(
            assigned,
            income > 0
              ? income
              : assigned,
          )}
          max={
            income > 0
              ? income
              : 1
          }
          tone={progressTone}
          size="md"
          showValue={false}
        />

        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
          <SummaryItem
            label="Income"
            value={income}
          />

          <SummaryItem
            label="Assigned"
            value={assigned}
          />

          <SummaryItem
            label="Available"
            value={availableAmount}
          />

          <SummaryItem
            label="Rollover"
            value={rolloverAmount}
          />
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Available to Spend
          </p>

          <p
            className={joinClassNames(
              "mt-2",
              "text-2xl",
              "font-bold",
              availableAmount < 0
                ? "text-[var(--danger)]"
                : "text-[var(--text-primary)]",
            )}
          >
            {currencyFormatter.format(
              availableAmount,
            )}
          </p>

          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Canonical availability across your budget items after rollover and spending activity.
          </p>
        </div>

        {unassignedAmount === 0 ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--success)_20%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] p-4">
            <div className="flex items-start gap-3">
              <SuccessIcon />

              <div>
                <p className="font-semibold text-[var(--success)]">
                  Zero-Based Budget Complete
                </p>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Every dollar has a purpose.
                  Continue tracking spending
                  throughout the month.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {unassignedAmount > 0 ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_20%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-4">
            <div className="flex items-start gap-3">
              <InfoIcon />

              <div>
                <p className="font-semibold text-[var(--warning)]">
                  Dollars Still Need Jobs
                </p>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Assign the remaining{" "}
                  <strong>
                    {currencyFormatter.format(
                      unassignedAmount,
                    )}
                  </strong>{" "}
                  to your budget categories.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {isOverBudget ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-4">
            <div className="flex items-start gap-3">
              <WarningIcon />

              <div>
                <p className="font-semibold text-[var(--danger)]">
                  Over Budget
                </p>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Reduce category assignments
                  by{" "}
                  <strong>
                    {currencyFormatter.format(
                      -unassignedAmount,
                    )}
                  </strong>{" "}
                  to balance this budget.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type SummaryItemProps = {
  label: string;
  value: number;
};

function SummaryItem({
  label,
  value,
}: SummaryItemProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
        {currencyFormatter.format(
          value,
        )}
      </p>
    </div>
  );
}

function SuccessIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-[var(--success)]"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-[var(--warning)]"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
      />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-[var(--danger)]"
    >
      <path d="m10.29 3.86-7.82 14A2 2 0 0 0 4.18 21h15.64a2 2 0 0 0 1.71-3.14l-7.82-14a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}