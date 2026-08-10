"use client";

import { useMemo } from "react";

import {
  useBudget,
} from "@/components/providers/BudgetProvider";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";

import type {
  TransactionFilters as TransactionFilterValues,
  TransactionStatus,
  TransactionType,
} from "@/types/transaction";

type TransactionFiltersProps = {
  filters: TransactionFilterValues;
  onChange: (
    filters: TransactionFilterValues,
  ) => void;
};

type FilterOption<TValue extends string> = {
  label: string;
  value: TValue;
};

const typeOptions: FilterOption<
  TransactionType | "all"
>[] = [
  {
    label: "All types",
    value: "all",
  },
  {
    label: "Expenses",
    value: "expense",
  },
  {
    label: "Income",
    value: "income",
  },
  {
    label: "Transfers",
    value: "transfer",
  },
];

const statusOptions: FilterOption<
  TransactionStatus | "all"
>[] = [
  {
    label: "All statuses",
    value: "all",
  },
  {
    label: "Pending",
    value: "pending",
  },
  {
    label: "Cleared",
    value: "cleared",
  },
];

export default function TransactionFilters({
  filters,
  onChange,
}: TransactionFiltersProps) {
  const {
    budgetGroups,
  } = useBudget();

  const {
    accounts,
  } = useAccounts();

  const accountOptions = useMemo<
    FilterOption<string>[]
  >(
    () => [
      {
        label: "All accounts",
        value: "all",
      },
      ...accounts
        .slice()
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
            ),
        )
        .map(
          (account) => ({
            label:
              account.institution
                ? `${account.name} • ${account.institution}`
                : account.name,
            value:
              account.id,
          }),
        ),
    ],
    [accounts],
  );

  const budgetItemOptions = useMemo<
    FilterOption<string>[]
  >(
    () => [
      {
        label: "All budget items",
        value: "all",
      },
      ...budgetGroups.flatMap(
        (group) =>
          group.categories.map(
            (item) => ({
              label: `${group.name} — ${item.name}`,
              value: item.id,
            }),
          ),
      ),
    ],
    [budgetGroups],
  );

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.accountId !== "all" ||
    filters.categoryId !== "all" ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  function updateFilter<
    TKey extends keyof TransactionFilterValues,
  >(
    key: TKey,
    value: TransactionFilterValues[TKey],
  ) {
    onChange({
      ...filters,
      [key]: value,
    });
  }

  function handleClearFilters() {
    onChange({
      search: "",
      type: "all",
      status: "all",
      accountId: "all",
      categoryId: "all",
      dateFrom: undefined,
      dateTo: undefined,
    });
  }

  return (
    <section
      aria-labelledby="transaction-filters-heading"
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
              Filters
            </p>

            <h2
              id="transaction-filters-heading"
              className="mt-1 text-lg font-bold text-[var(--text-primary)]"
            >
              Find transactions
            </h2>
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={
                handleClearFilters
              }
              className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl px-3 text-sm font-semibold text-[var(--primary)] outline-none transition-colors hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:self-auto"
            >
              <ResetIcon />

              Clear filters
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(150px,1fr))]">
          <label className="block">
            <span className="sr-only">
              Search transactions
            </span>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-muted)]">
                <SearchIcon />
              </div>

              <input
                type="search"
                value={filters.search}
                onChange={(event) =>
                  updateFilter(
                    "search",
                    event.target.value,
                  )
                }
                placeholder="Search merchant or note"
                className={getInputClassName()}
              />
            </div>
          </label>

          <FilterSelect
            ariaLabel="Filter by transaction type"
            value={filters.type}
            options={typeOptions}
            onChange={(value) =>
              updateFilter(
                "type",
                value as
                  | TransactionType
                  | "all",
              )
            }
          />

          <FilterSelect
            ariaLabel="Filter by transaction status"
            value={filters.status}
            options={statusOptions}
            onChange={(value) =>
              updateFilter(
                "status",
                value as
                  | TransactionStatus
                  | "all",
              )
            }
          />

          <FilterSelect
            ariaLabel="Filter by account"
            value={filters.accountId}
            options={accountOptions}
            onChange={(value) =>
              updateFilter(
                "accountId",
                value,
              )
            }
          />

          <FilterSelect
            ariaLabel="Filter by budget item"
            value={
              filters.categoryId
            }
            options={
              budgetItemOptions
            }
            onChange={(value) =>
              updateFilter(
                "categoryId",
                value,
              )
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <DateFilter
            label="From"
            value={
              filters.dateFrom ??
              ""
            }
            onChange={(value) =>
              updateFilter(
                "dateFrom",
                value ||
                  undefined,
              )
            }
          />

          <DateFilter
            label="To"
            value={
              filters.dateTo ??
              ""
            }
            onChange={(value) =>
              updateFilter(
                "dateTo",
                value ||
                  undefined,
              )
            }
          />
        </div>
      </div>
    </section>
  );
}

type FilterSelectProps = {
  ariaLabel: string;
  value: string;
  options: FilterOption<string>[];
  onChange: (
    value: string,
  ) => void;
};

function FilterSelect({
  ariaLabel,
  value,
  options,
  onChange,
}: FilterSelectProps) {
  return (
    <label className="relative block">
      <span className="sr-only">
        {ariaLabel}
      </span>

      <select
        aria-label={
          ariaLabel
        }
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className={getSelectClassName()}
      >
        {options.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {option.label}
            </option>
          ),
        )}
      </select>

      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--text-muted)]">
        <ChevronDownIcon />
      </div>
    </label>
  );
}

type DateFilterProps = {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
};

function DateFilter({
  label,
  value,
  onChange,
}: DateFilterProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>

      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className={getDateInputClassName()}
      />
    </label>
  );
}

function getInputClassName() {
  return [
    "min-h-11",
    "w-full",
    "rounded-xl",
    "border",
    "border-[var(--border-default)]",
    "bg-[var(--surface-default)]",
    "py-2.5",
    "pl-10",
    "pr-4",
    "text-sm",
    "text-[var(--text-primary)]",
    "outline-none",
    "transition-[border-color,box-shadow]",
    "placeholder:text-[var(--text-muted)]",
    "hover:border-[var(--border-strong)]",
    "focus:border-[var(--primary)]",
    "focus:ring-2",
    "focus:ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]",
  ].join(" ");
}

function getSelectClassName() {
  return [
    "min-h-11",
    "w-full",
    "appearance-none",
    "rounded-xl",
    "border",
    "border-[var(--border-default)]",
    "bg-[var(--surface-default)]",
    "px-3.5",
    "py-2.5",
    "pr-10",
    "text-sm",
    "font-medium",
    "text-[var(--text-primary)]",
    "outline-none",
    "transition-[border-color,box-shadow]",
    "hover:border-[var(--border-strong)]",
    "focus:border-[var(--primary)]",
    "focus:ring-2",
    "focus:ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]",
  ].join(" ");
}

function getDateInputClassName() {
  return [
    "min-h-11",
    "w-full",
    "rounded-xl",
    "border",
    "border-[var(--border-default)]",
    "bg-[var(--surface-default)]",
    "px-3.5",
    "py-2.5",
    "text-sm",
    "font-medium",
    "text-[var(--text-primary)]",
    "outline-none",
    "transition-[border-color,box-shadow]",
    "hover:border-[var(--border-strong)]",
    "focus:border-[var(--primary)]",
    "focus:ring-2",
    "focus:ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]",
  ].join(" ");
}

function SearchIcon() {
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
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m20 20-3.5-3.5" />
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

function ResetIcon() {
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
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
    </svg>
  );
}