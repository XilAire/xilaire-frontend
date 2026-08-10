"use client";

import {
  useMemo,
  useState,
} from "react";

import TransactionMobileCard from "@/components/transactions/TransactionMobileCard";
import TransactionRow from "@/components/transactions/TransactionRow";

import type {
  TransactionData,
} from "@/types/transaction";

type TransactionListProps = {
  transactions: TransactionData[];
  onEdit: (
    transaction: TransactionData,
  ) => void;
};

type TransactionSortKey =
  | "date"
  | "merchant"
  | "status"
  | "amount";

type TransactionSortDirection =
  | "ascending"
  | "descending";

type TransactionSortState = {
  key: TransactionSortKey;
  direction: TransactionSortDirection;
};

const defaultSortState: TransactionSortState = {
  key: "date",
  direction: "descending",
};

export default function TransactionList({
  transactions,
  onEdit,
}: TransactionListProps) {
  const [
    sortState,
    setSortState,
  ] =
    useState<TransactionSortState>(
      defaultSortState,
    );

  const sortedTransactions =
    useMemo(
      () =>
        [...transactions].sort(
          (
            firstTransaction,
            secondTransaction,
          ) =>
            compareTransactions(
              firstTransaction,
              secondTransaction,
              sortState,
            ),
        ),
      [
        sortState,
        transactions,
      ],
    );

  function handleSort(
    key: TransactionSortKey,
  ) {
    setSortState(
      (
        currentSortState,
      ) => {
        if (
          currentSortState.key ===
          key
        ) {
          return {
            key,
            direction:
              currentSortState.direction ===
              "ascending"
                ? "descending"
                : "ascending",
          };
        }

        return {
          key,
          direction:
            getDefaultSortDirection(
              key,
            ),
        };
      },
    );
  }

  return (
    <section
      aria-labelledby="transaction-list-heading"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
            Activity
          </p>

          <h2
            id="transaction-list-heading"
            className="mt-1 text-lg font-bold text-[var(--text-primary)]"
          >
            Recent Transactions
          </h2>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Review, sort, and edit
            the transactions in the
            current filtered view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm font-semibold text-[var(--text-muted)]">
            {transactions.length}{" "}
            {transactions.length === 1
              ? "transaction"
              : "transactions"}
          </p>

          <p className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--surface-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] lg:block">
            Sorted by{" "}
            {getSortLabel(
              sortState.key,
            ).toLowerCase()}
            ,{" "}
            {sortState.direction ===
            "ascending"
              ? "ascending"
              : "descending"}
          </p>
        </div>
      </div>

      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-3 lg:hidden">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Sort transactions
          </span>

          <div className="relative">
            <select
              value={`${sortState.key}:${sortState.direction}`}
              onChange={(
                event,
              ) => {
                const [
                  key,
                  direction,
                ] =
                  event.target.value.split(
                    ":",
                  ) as [
                    TransactionSortKey,
                    TransactionSortDirection,
                  ];

                setSortState({
                  key,
                  direction,
                });
              }}
              className="min-h-11 w-full appearance-none rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-3.5 py-2.5 pr-10 text-sm font-semibold text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] hover:border-[var(--border-strong)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]"
            >
              <option value="date:descending">
                Newest first
              </option>

              <option value="date:ascending">
                Oldest first
              </option>

              <option value="merchant:ascending">
                Merchant A–Z
              </option>

              <option value="merchant:descending">
                Merchant Z–A
              </option>

              <option value="amount:descending">
                Highest amount
              </option>

              <option value="amount:ascending">
                Lowest amount
              </option>

              <option value="status:ascending">
                Cleared first
              </option>

              <option value="status:descending">
                Pending first
              </option>
            </select>

            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--text-muted)]">
              <ChevronDownIcon />
            </span>
          </div>
        </label>
      </div>

      <div className="lg:hidden">
        <div className="divide-y divide-[var(--border-subtle)]">
          {sortedTransactions.map(
            (
              transaction,
            ) => (
              <TransactionMobileCard
                key={
                  transaction.id
                }
                transaction={
                  transaction
                }
                onEdit={
                  onEdit
                }
              />
            ),
          )}
        </div>
      </div>

      <div className="hidden max-h-[680px] overflow-auto lg:block">
        <table className="min-w-[980px] w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] shadow-[0_1px_0_var(--border-subtle)]">
              <SortableTableHeader
                label="Date"
                sortKey="date"
                sortState={
                  sortState
                }
                onSort={
                  handleSort
                }
                className="w-[130px]"
              />

              <SortableTableHeader
                label="Merchant"
                sortKey="merchant"
                sortState={
                  sortState
                }
                onSort={
                  handleSort
                }
                className="min-w-[220px]"
              />

              <TableHeader className="min-w-[190px]">
                Category
              </TableHeader>

              <TableHeader className="min-w-[150px]">
                Account
              </TableHeader>

              <SortableTableHeader
                label="Status"
                sortKey="status"
                sortState={
                  sortState
                }
                onSort={
                  handleSort
                }
                className="w-[130px]"
              />

              <SortableTableHeader
                label="Amount"
                sortKey="amount"
                sortState={
                  sortState
                }
                onSort={
                  handleSort
                }
                align="right"
                className="w-[150px]"
              />

              <TableHeader
                align="right"
                className="w-[72px]"
              >
                <span className="sr-only">
                  Actions
                </span>
              </TableHeader>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)]">
            {sortedTransactions.map(
              (
                transaction,
              ) => (
                <TransactionRow
                  key={
                    transaction.id
                  }
                  transaction={
                    transaction
                  }
                  onEdit={
                    onEdit
                  }
                />
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function compareTransactions(
  firstTransaction: TransactionData,
  secondTransaction: TransactionData,
  sortState: TransactionSortState,
) {
  let comparison = 0;

  switch (sortState.key) {
    case "merchant":
      comparison =
        firstTransaction.merchant.localeCompare(
          secondTransaction.merchant,
          "en-US",
          {
            sensitivity: "base",
          },
        );
      break;

    case "status":
      comparison =
        getStatusSortWeight(
          firstTransaction.status,
        ) -
        getStatusSortWeight(
          secondTransaction.status,
        );
      break;

    case "amount":
      comparison =
        firstTransaction.amount -
        secondTransaction.amount;
      break;

    case "date":
    default:
      comparison =
        firstTransaction.date.localeCompare(
          secondTransaction.date,
        );
      break;
  }

  if (comparison === 0) {
    comparison =
      firstTransaction.id.localeCompare(
        secondTransaction.id,
      );
  }

  return sortState.direction ===
    "ascending"
    ? comparison
    : comparison * -1;
}

function getStatusSortWeight(
  status: TransactionData["status"],
) {
  return status === "cleared"
    ? 0
    : 1;
}

function getDefaultSortDirection(
  key: TransactionSortKey,
): TransactionSortDirection {
  if (
    key === "merchant" ||
    key === "status"
  ) {
    return "ascending";
  }

  return "descending";
}

function getSortLabel(
  key: TransactionSortKey,
) {
  switch (key) {
    case "merchant":
      return "Merchant";

    case "status":
      return "Status";

    case "amount":
      return "Amount";

    case "date":
    default:
      return "Date";
  }
}

type SortableTableHeaderProps = {
  label: string;
  sortKey: TransactionSortKey;
  sortState: TransactionSortState;
  onSort: (
    key: TransactionSortKey,
  ) => void;
  align?: "left" | "right";
  className?: string;
};

function SortableTableHeader({
  label,
  sortKey,
  sortState,
  onSort,
  align = "left",
  className,
}: SortableTableHeaderProps) {
  const isActive =
    sortState.key ===
    sortKey;

  const ariaSort:
    | "ascending"
    | "descending"
    | "none" =
    isActive
      ? sortState.direction
      : "none";

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={[
        "whitespace-nowrap px-5 py-3",
        align === "right"
          ? "text-right"
          : "text-left",
        className ?? "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() =>
          onSort(
            sortKey,
          )
        }
        className={[
          "inline-flex items-center gap-1.5 rounded-md text-xs font-bold uppercase tracking-[0.14em] outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
          isActive
            ? "text-[var(--primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          align === "right"
            ? "ml-auto"
            : "",
        ].join(" ")}
      >
        <span>
          {label}
        </span>

        <SortIcon
          active={
            isActive
          }
          direction={
            sortState.direction
          }
        />
      </button>
    </th>
  );
}

type TableHeaderProps = {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
};

function TableHeader({
  children,
  align = "left",
  className,
}: TableHeaderProps) {
  return (
    <th
      scope="col"
      className={[
        "whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]",
        align === "right"
          ? "text-right"
          : "text-left",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

type SortIconProps = {
  active: boolean;
  direction: TransactionSortDirection;
};

function SortIcon({
  active,
  direction,
}: SortIconProps) {
  if (!active) {
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
        <path d="m8 9 4-4 4 4" />
        <path d="m16 15-4 4-4-4" />
      </svg>
    );
  }

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={
        direction ===
        "descending"
          ? "rotate-180"
          : undefined
      }
    >
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

function ChevronDownIcon() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}