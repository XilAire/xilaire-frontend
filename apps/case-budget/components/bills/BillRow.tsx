import {
  getBillFrequencyLabel,
  getBillStatusLabel,
  type BillData,
} from "@/types/bill";

type BillRowProps = {
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

export default function BillRow({
  bill,
  onViewDetails,
  onEdit,
  onMarkPaid,
  spendingAmount,
}: BillRowProps) {
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
    <tr className="transition-colors hover:bg-[var(--surface-muted)]">
      <td className="px-5 py-4 align-middle">
        <button
          type="button"
          onClick={() =>
            onViewDetails(bill)
          }
          className="flex flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          aria-label={`View details for ${bill.name}`}
        >
          <span className="font-semibold text-[var(--text-primary)] transition hover:text-[var(--primary)]">
            {bill.name}
          </span>

          <span className="mt-1 text-sm text-[var(--text-muted)]">
            {bill.payee ?? "No payee"}
          </span>
        </button>
      </td>

      <td className="px-4 py-4 align-middle">
        <div className="flex flex-col">
          <span className="font-medium text-[var(--text-primary)]">
            {formatDate(
              bill.dueDate,
            )}
          </span>

          <span className="mt-1 text-xs text-[var(--text-muted)]">
            {getBillFrequencyLabel(
              bill.frequency,
            )}
          </span>
        </div>
      </td>

      <td className="px-4 py-4 align-middle">
        {hasBudgetLink &&
        bill.budgetItem ? (
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium text-[var(--text-primary)]">
                {
                  bill.budgetItem
                    .name
                }
              </span>

              <span
                className={[
                  "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
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

            <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="truncate">
                {
                  bill.budgetItem
                    .categoryName
                }
              </span>

              <span
                aria-hidden="true"
                className="shrink-0"
              >
                •
              </span>

              <span className="shrink-0 font-medium">
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
        ) : (
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <UnlinkedIcon />

            <div className="flex flex-col">
              <span className="text-sm font-medium">
                Not linked
              </span>

              <span className="mt-0.5 text-xs">
                No budget item
              </span>
            </div>
          </div>
        )}
      </td>

      <td className="px-4 py-4 align-middle">
        <span className="text-sm text-[var(--text-primary)]">
          {bill.account?.name ??
            "—"}
        </span>
      </td>

      <td className="px-4 py-4 align-middle">
        {isSpending ? (
          <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">
            Transaction tracked
          </span>
        ) : (
          <span
            className={[
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
              bill.paymentMethod ===
              "autopay"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
            ].join(" ")}
          >
            {bill.paymentMethod ===
            "autopay"
              ? "Autopay"
              : "Manual"}
          </span>
        )}
      </td>

      <td className="px-4 py-4 align-middle">
        {isSpending ? (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            Active
          </span>
        ) : (
          <span
            className={[
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
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
      </td>

      <td className="px-4 py-4 text-right align-middle">
        {isSpending ? (
          <div className="ml-auto w-52 max-w-full space-y-2 text-left">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-[var(--text-muted)]">
                Spent
              </span>

              <span className="font-bold text-[var(--text-primary)]">
                {formatCurrency(
                  normalizedSpendingAmount,
                )}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-[width]"
                style={{
                  width:
                    `${spendingPercent}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-[var(--text-muted)]">
                {spendingOverage >
                0
                  ? "Over target"
                  : "Remaining"}
              </span>

              <span
                className={[
                  "font-semibold",
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
              </span>
            </div>

            <p className="text-right text-[11px] font-semibold text-[var(--text-muted)]">
              {formatCurrency(
                bill.amount,
              )}{" "}
              target
            </p>
          </div>
        ) : (
          <span className="font-bold text-[var(--text-primary)]">
            {formatCurrency(
              bill.amount,
            )}
          </span>
        )}
      </td>

      <td className="px-5 py-4 text-right align-middle">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() =>
              onViewDetails(bill)
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label={`View details for ${bill.name}`}
            title="View details"
          >
            <EyeIcon />
          </button>

          {canMarkPaid ? (
            <button
              type="button"
              onClick={() =>
                onMarkPaid?.(bill)
              }
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-emerald-500/10 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:hover:text-emerald-400"
              aria-label={`Mark ${bill.name} as paid`}
              title="Mark as paid"
            >
              <CheckIcon />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() =>
              onEdit(bill)
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label={`Edit ${bill.name}`}
            title="Edit bill"
          >
            <EditIcon />
          </button>
        </div>
      </td>
    </tr>
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
      return "Suggest";

    case "manual":
    default:
      return "Manual";
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
      className="shrink-0"
    >
      <path d="m9 17-2 2a4.2 4.2 0 0 1-6-6l3-3a4.2 4.2 0 0 1 6 0" />

      <path d="m15 7 2-2a4.2 4.2 0 0 1 6 6l-3 3a4.2 4.2 0 0 1-6 0" />

      <path d="m8 2 8 20" />
    </svg>
  );
}