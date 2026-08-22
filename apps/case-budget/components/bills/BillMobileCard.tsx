import {
  getBillFrequencyLabel,
  getBillStatusLabel,
  type BillData,
} from "@/types/bill";

type BillMobileCardProps = {
  bill: BillData;
  onViewDetails: (
    bill: BillData,
  ) => void;
  onEdit: (bill: BillData) => void;
  onMarkPaid?: (
    bill: BillData,
  ) => void;
  spendingAmount?: number;
};

export default function BillMobileCard({
  bill,
  onViewDetails,
  onEdit,
  onMarkPaid,
  spendingAmount,
}: BillMobileCardProps) {
  const isPaid =
    bill.status === "paid";

  const isSpending =
    bill.amountType ===
    "spending";

  const canMarkPaid =
    !isPaid &&
    !isSpending &&
    Boolean(
      onMarkPaid,
    );

  const normalizedSpendingAmount =
    Math.max(
      0,
      spendingAmount ??
        0,
    );

  const spendingRemaining =
    Math.max(
      0,
      bill.amount -
        normalizedSpendingAmount,
    );

  const spendingOverage =
    Math.max(
      0,
      normalizedSpendingAmount -
        bill.amount,
    );

  const spendingPercent =
    bill.amount >
      0
      ? Math.min(
          100,
          (
            normalizedSpendingAmount /
            bill.amount
          ) *
            100,
        )
      : 0;

  const hasBudgetLink =
    Boolean(bill.budgetItem);

  const isBudgetSyncEnabled =
    hasBudgetLink &&
    Boolean(
      bill.budgetSync?.enabled,
    );

  return (
    <article className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={() =>
            onViewDetails(bill)
          }
          className="min-w-0 flex-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          aria-label={`View details for ${bill.name}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-[var(--text-primary)] transition hover:text-[var(--primary)]">
              {bill.name}
            </h3>

            {isSpending ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                Monthly Spending
              </span>
            ) : (
              <span
                className={[
                  "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                  getStatusClasses(
                    bill.status,
                  ),
                ].join(" ")}
              >
                {getBillStatusLabel(
                  bill.status,
                )}
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
            {bill.payee ??
              "No payee"}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            onViewDetails(bill)
          }
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          aria-label={`View details for ${bill.name}`}
          title="View details"
        >
          <EyeIcon />
        </button>
      </div>

      {isSpending ? (
        <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Target
              </p>

              <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                {formatCurrency(
                  bill.amount,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Spent
              </p>

              <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                {formatCurrency(
                  normalizedSpendingAmount,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {spendingOverage >
                0
                  ? "Over"
                  : "Remaining"}
              </p>

              <p
                className={[
                  "mt-1 text-lg font-bold",
                  spendingOverage >
                  0
                    ? "text-red-600 dark:text-red-400"
                    : "text-[var(--text-primary)]",
                ].join(" ")}
              >
                {formatCurrency(
                  spendingOverage >
                  0
                    ? spendingOverage
                    : spendingRemaining,
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--surface-default)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width]"
              style={{
                width:
                  `${spendingPercent}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <span>
              {Math.round(
                spendingPercent,
              )}
              % of target used
            </span>

            <span>
              Period ends{" "}
              {formatDate(
                bill.dueDate,
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Amount
            </p>

            <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {formatCurrency(
                bill.amount,
              )}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Due
            </p>

            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {formatDate(
                bill.dueDate,
              )}
            </p>
          </div>
        </div>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl bg-[var(--surface-muted)] p-4">
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Frequency
          </dt>

          <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            {getBillFrequencyLabel(
              bill.frequency,
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            {isSpending
              ? "Tracking"
              : "Payment"}
          </dt>

          <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            {isSpending
              ? "Transactions"
              : bill.paymentMethod ===
                "autopay"
                ? "Autopay"
                : "Manual"}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Account
          </dt>

          <dd className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
            {bill.account?.name ??
              "Not selected"}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            {isSpending
              ? "State"
              : "Status"}
          </dt>

          <dd className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
            {isSpending
              ? "Active"
              : getBillStatusLabel(
                  bill.status,
                )}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        {hasBudgetLink &&
        bill.budgetItem ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <BudgetIcon />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                      Linked Budget Item
                    </p>

                    <p className="mt-1 truncate text-sm font-bold text-[var(--text-primary)]">
                      {
                        bill.budgetItem
                          .name
                      }
                    </p>

                    <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                      {
                        bill.budgetItem
                          .categoryName
                      }
                    </p>
                  </div>

                  <span
                    className={[
                      "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold",
                      isBudgetSyncEnabled
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                    ].join(" ")}
                  >
                    {isBudgetSyncEnabled
                      ? "Sync On"
                      : "Sync Off"}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    Sync mode
                  </span>

                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {bill.budgetSync
                      ? getBudgetSyncModeLabel(
                          bill
                            .budgetSync
                            .mode,
                        )
                      : "Not configured"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-[var(--border-subtle)] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
              <UnlinkedIcon />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Not linked to budget
              </p>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                Link this bill to a
                budget item to track it
                alongside your monthly
                plan.
              </p>
            </div>
          </div>
        )}
      </div>

      {bill.reminder.enabled ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] px-3.5 py-3">
          <div className="mt-0.5 text-[var(--primary)]">
            <BellIcon />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Reminder enabled
            </p>

            <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
              {getReminderText(
                bill.reminder.timing,
              )}
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={[
          "mt-4 grid gap-3",
          canMarkPaid || isPaid
            ? "sm:grid-cols-3"
            : "sm:grid-cols-2",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() =>
            onViewDetails(bill)
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <EyeIcon />

          View Details
        </button>

        {canMarkPaid ? (
          <button
            type="button"
            onClick={() =>
              onMarkPaid?.(bill)
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white outline-none transition hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <CheckIcon />

            Mark as Paid
          </button>
        ) : isPaid ? (
          <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            <CheckIcon />

            Paid
          </div>
        ) : null}

        <button
          type="button"
          onClick={() =>
            onEdit(bill)
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <EditIcon />

          Edit Bill
        </button>
      </div>
    </article>
  );
}

function formatCurrency(
  amount: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(amount);
}

function formatDate(
  value: string,
) {
  const normalizedValue =
    value.slice(0, 10);

  return new Date(
    `${normalizedValue}T00:00:00`,
  ).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

function getBudgetSyncModeLabel(
  mode: NonNullable<
    BillData["budgetSync"]
  >["mode"],
) {
  switch (mode) {
    case "automatic":
      return "Automatic";

    case "suggest":
      return "Suggest changes";

    case "manual":
    default:
      return "Manual";
  }
}

function getReminderText(
  timing: BillData["reminder"]["timing"],
) {
  switch (timing) {
    case "same-day":
      return "Remind me on the due date.";

    case "1-day":
      return "Remind me 1 day before the due date.";

    case "3-days":
      return "Remind me 3 days before the due date.";

    case "5-days":
      return "Remind me 5 days before the due date.";

    case "7-days":
      return "Remind me 7 days before the due date.";

    case "14-days":
      return "Remind me 14 days before the due date.";

    default:
      return "Reminder enabled.";
  }
}

function getStatusClasses(
  status: BillData["status"],
) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";

    case "past-due":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";

    case "due-today":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";

    case "due-soon":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";

    case "upcoming":
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  }
}

function EyeIcon() {
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />

      <circle
        cx="12"
        cy="12"
        r="3"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function EditIcon() {
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
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z" />
    </svg>
  );
}

function BellIcon() {
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
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
      <path d="M4 17h16" />
      <path d="M6 17V10a6 6 0 0 1 12 0v7" />
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        width="18"
        height="14"
        x="3"
        y="5"
        rx="2"
      />

      <path d="M3 10h18" />

      <path d="M7 15h2" />
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
      <path d="m9 17-2 2a4.2 4.2 0 0 1-6-6l3-3a4.2 4.2 0 0 1 6 0" />

      <path d="m15 7 2-2a4.2 4.2 0 0 1 6 6l-3 3a4.2 4.2 0 0 1-6 0" />

      <path d="m8 2 8 20" />
    </svg>
  );
}
