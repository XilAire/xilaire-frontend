"use client";

import type {
  TransactionData,
} from "@/types/transaction";

type TransactionRowProps = {
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

export default function TransactionRow({
  transaction,
  onEdit,
}: TransactionRowProps) {
  const formattedDate =
    formatTransactionDate(
      transaction.date,
    );

  const formattedAmount =
    currencyFormatter.format(
      transaction.amount,
    );

  const categoryName =
    transaction.category?.name ??
    getFallbackCategory(
      transaction,
    );

  const categoryGroupName =
    transaction.category?.groupName;

  return (
    <tr className="group transition-colors hover:bg-[var(--surface-muted)] focus-within:bg-[var(--surface-muted)]">
      <td className="w-[130px] whitespace-nowrap px-5 py-4 align-middle">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {formattedDate}
        </p>
      </td>

      <td className="min-w-[220px] px-5 py-4 align-middle">
        <div className="flex min-w-0 items-center gap-3">
          <TransactionIcon
            type={transaction.type}
          />

          <div className="min-w-0 flex-1">
            <p
              title={
                transaction.merchant
              }
              className="truncate text-sm font-bold text-[var(--text-primary)]"
            >
              {transaction.merchant}
            </p>

            <div className="mt-1 flex min-w-0 items-center gap-2">
              <TransactionTypeBadge
                type={
                  transaction.type
                }
              />

              {transaction.note ? (
                <p
                  title={
                    transaction.note
                  }
                  className="min-w-0 truncate text-xs text-[var(--text-muted)]"
                >
                  {transaction.note}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </td>

      <td className="min-w-[190px] px-5 py-4 align-middle">
        <div className="min-w-0">
          <p
            title={
              categoryName
            }
            className="truncate text-sm font-semibold text-[var(--text-primary)]"
          >
            {categoryName}
          </p>

          {categoryGroupName ? (
            <p
              title={
                categoryGroupName
              }
              className="mt-1 truncate text-xs text-[var(--text-muted)]"
            >
              {categoryGroupName}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {getFallbackGroupName(
                transaction,
              )}
            </p>
          )}
        </div>
      </td>

      <td className="min-w-[150px] px-5 py-4 align-middle">
        <div className="min-w-0">
          <p
            title={
              transaction.account.name
            }
            className="truncate text-sm font-semibold text-[var(--text-primary)]"
          >
            {transaction.account.name}
          </p>

          <p className="mt-1 capitalize text-xs text-[var(--text-muted)]">
            {formatAccountType(
              transaction.account.type,
            )}
          </p>
        </div>
      </td>

      <td className="w-[130px] whitespace-nowrap px-5 py-4 align-middle">
        <TransactionStatusBadge
          status={
            transaction.status
          }
        />
      </td>

      <td className="w-[150px] whitespace-nowrap px-5 py-4 text-right align-middle">
        <div className="flex flex-col items-end">
          <p
            className={[
              "text-sm font-bold tabular-nums",
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
      </td>

      <td className="w-[72px] whitespace-nowrap px-5 py-4 text-right align-middle">
        <button
          type="button"
          onClick={() =>
            onEdit(
              transaction,
            )
          }
          aria-label={`Edit ${transaction.merchant} transaction`}
          title={`Edit ${transaction.merchant}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition-[background-color,color,box-shadow] hover:bg-[var(--surface-default)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
        >
          <MoreIcon />
        </button>
      </td>
    </tr>
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold capitalize",
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
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
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

function MoreIcon() {
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