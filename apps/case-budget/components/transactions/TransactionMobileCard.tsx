"use client";

import type {
  TransactionData,
} from "@/types/transaction";

type TransactionMobileCardProps = {
  transaction: TransactionData;
  onEdit: (
    transaction: TransactionData,
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

const dateFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );

export default function TransactionMobileCard({
  transaction,
  onEdit,
}: TransactionMobileCardProps) {
  const categoryName =
    transaction.category?.name ??
    getFallbackCategory(
      transaction,
    );

  const categoryGroupName =
    transaction.category?.groupName ??
    getFallbackGroupName(
      transaction,
    );

  const formattedDate =
    formatTransactionDate(
      transaction.date,
    );

  const formattedAmount =
    currencyFormatter.format(
      transaction.amount,
    );

  return (
    <article className="p-4 transition-colors hover:bg-[var(--surface-muted)] sm:p-5">
      <div className="flex items-start gap-3">
        <TransactionIcon
          type={transaction.type}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3
                  title={
                    transaction.merchant
                  }
                  className="min-w-0 truncate text-sm font-bold text-[var(--text-primary)]"
                >
                  {transaction.merchant}
                </h3>

                <TransactionTypeBadge
                  type={
                    transaction.type
                  }
                />
              </div>

              <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">
                {formattedDate}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onEdit(
                  transaction,
                )
              }
              aria-label={`Edit ${transaction.merchant} transaction`}
              title={`Edit ${transaction.merchant}`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition-[background-color,color,box-shadow] hover:bg-[var(--surface-default)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
            >
              <MoreIcon />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p
                className={[
                  "whitespace-nowrap text-xl font-bold leading-none tabular-nums",
                  getAmountClassName(
                    transaction.type,
                  ),
                ].join(" ")}
              >
                {getAmountPrefix(
                  transaction.type,
                )}
                {formattedAmount}
              </p>

              <p className="mt-1 text-xs capitalize text-[var(--text-muted)]">
                {transaction.type}
              </p>
            </div>

            <TransactionStatusBadge
              status={
                transaction.status
              }
            />
          </div>

          {transaction.note ? (
            <p
              title={
                transaction.note
              }
              className="mt-3 line-clamp-2 text-sm leading-5 text-[var(--text-muted)]"
            >
              {transaction.note}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
            <TransactionDetail
              label="Category"
              value={categoryName}
              description={
                categoryGroupName
              }
            />

            <TransactionDetail
              label="Account"
              value={
                transaction.account.name
              }
              description={formatAccountType(
                transaction.account.type,
              )}
            />
          </div>

          <button
            type="button"
            onClick={() =>
              onEdit(
                transaction,
              )
            }
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition-[background-color,border-color,color,box-shadow] hover:border-[var(--primary)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
          >
            <EditIcon />

            Edit Transaction
          </button>
        </div>
      </div>
    </article>
  );
}

type TransactionDetailProps = {
  label: string;
  value: string;
  description?: string;
};

function TransactionDetail({
  label,
  value,
  description,
}: TransactionDetailProps) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        title={
          value
        }
        className="mt-1 truncate text-xs font-bold text-[var(--text-primary)]"
      >
        {value}
      </p>

      {description ? (
        <p
          title={
            description
          }
          className="mt-0.5 truncate text-[11px] capitalize text-[var(--text-muted)]"
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

type TransactionStatusBadgeProps = {
  status: TransactionData["status"];
};

function TransactionStatusBadge({
  status,
}: TransactionStatusBadgeProps) {
  const isCleared =
    status === "cleared";

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize",
        isCleared
          ? "border-[color-mix(in_srgb,var(--success)_22%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]"
          : "border-[color-mix(in_srgb,var(--warning)_24%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "h-1.5 w-1.5 rounded-full",
          isCleared
            ? "bg-[var(--success)]"
            : "bg-[var(--warning)]",
        ].join(" ")}
      />

      {status}
    </span>
  );
}

type TransactionTypeBadgeProps = {
  type: TransactionData["type"];
};

function TransactionTypeBadge({
  type,
}: TransactionTypeBadgeProps) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]",
        getTypeBadgeClassName(
          type,
        ),
      ].join(" ")}
    >
      {type}
    </span>
  );
}

type TransactionIconProps = {
  type: TransactionData["type"];
};

function TransactionIcon({
  type,
}: TransactionIconProps) {
  return (
    <div
      className={[
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
        getIconClassName(
          type,
        ),
      ].join(" ")}
      aria-hidden="true"
    >
      {type === "income" ? (
        <IncomeIcon />
      ) : type === "transfer" ? (
        <TransferIcon />
      ) : (
        <ExpenseIcon />
      )}
    </div>
  );
}

function getAmountClassName(
  type: TransactionData["type"],
) {
  if (
    type === "income"
  ) {
    return "text-[var(--success)]";
  }

  if (
    type === "transfer"
  ) {
    return "text-[var(--primary)]";
  }

  return "text-[var(--danger)]";
}

function getAmountPrefix(
  type: TransactionData["type"],
) {
  if (
    type === "income"
  ) {
    return "+";
  }

  if (
    type === "expense"
  ) {
    return "-";
  }

  return "";
}

function getIconClassName(
  type: TransactionData["type"],
) {
  if (
    type === "income"
  ) {
    return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";
  }

  if (
    type === "transfer"
  ) {
    return "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]";
  }

  return "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]";
}

function getTypeBadgeClassName(
  type: TransactionData["type"],
) {
  if (
    type === "income"
  ) {
    return "bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]";
  }

  if (
    type === "transfer"
  ) {
    return "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]";
  }

  return "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]";
}

function getFallbackCategory(
  transaction: TransactionData,
) {
  if (
    transaction.type ===
    "income"
  ) {
    return "Income";
  }

  if (
    transaction.type ===
    "transfer"
  ) {
    return "Transfer";
  }

  return "Uncategorized";
}

function getFallbackGroupName(
  transaction: TransactionData,
) {
  if (
    transaction.type ===
    "income"
  ) {
    return "Income";
  }

  if (
    transaction.type ===
    "transfer"
  ) {
    return "Account transfer";
  }

  return "No budget item";
}

function formatTransactionDate(
  date: string,
) {
  const parsedDate =
    new Date(
      `${date}T12:00:00`,
    );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return date;
  }

  return dateFormatter.format(
    parsedDate,
  );
}

function formatAccountType(
  accountType: string,
) {
  return accountType.replaceAll(
    "-",
    " ",
  );
}

function IncomeIcon() {
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ExpenseIcon() {
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
      <path d="M12 21V9" />
      <path d="m17 14-5-5-5 5" />
      <path d="M5 3h14" />
    </svg>
  );
}

function TransferIcon() {
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
      <path d="m7 7 3-3 3 3" />
      <path d="M10 4v12" />
      <path d="m17 17-3 3-3-3" />
      <path d="M14 20V8" />
    </svg>
  );
}

function EditIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function MoreIcon() {
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