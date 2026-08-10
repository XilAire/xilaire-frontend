"use client";

import {
  useMemo,
} from "react";

import {
  useBudget,
} from "@/components/providers/BudgetProvider";

import {
  transactionAccountReferences,
} from "@/lib/budget/budget-reference-data";

import {
  billFrequencyDefinitions,
  billStatusDefinitions,
  type BillFilters as BillFilterValues,
  type BillFrequency,
  type BillPaymentMethod,
  type BillStatus,
} from "@/types/bill";

type BillFiltersProps = {
  filters: BillFilterValues;
  onChange: (
    filters: BillFilterValues,
  ) => void;
};

export default function BillFilters({
  filters,
  onChange,
}: BillFiltersProps) {
  const {
    budgetGroups,
  } = useBudget();

  const budgetItemReferences =
    useMemo(
      () =>
        budgetGroups.flatMap(
          (group) =>
            group.categories.map(
              (item) => ({
                id: item.id,
                name: item.name,
                categoryId: group.id,
                categoryName: group.name,
              }),
            ),
        ),
      [budgetGroups],
    );

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.frequency !== "all" ||
    filters.paymentMethod !== "all" ||
    filters.accountId !== "all" ||
    filters.budgetItemId !== "all" ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  function updateFilter<
    Key extends keyof BillFilterValues,
  >(
    key: Key,
    value: BillFilterValues[Key],
  ) {
    onChange({
      ...filters,
      [key]: value,
    });
  }

  function clearFilters() {
    onChange({
      search: "",
      status: "all",
      frequency: "all",
      paymentMethod: "all",
      accountId: "all",
      budgetItemId: "all",
      dateFrom: undefined,
      dateTo: undefined,
    });
  }

  return (
    <section
      aria-label="Bill filters"
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon />

            <input
              type="search"
              value={filters.search}
              onChange={(event) =>
                updateFilter(
                  "search",
                  event.target.value,
                )
              }
              placeholder="Search bills or payees"
              aria-label="Search bills"
              className="min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] py-2.5 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-3">
            <select
              value={filters.status}
              onChange={(event) =>
                updateFilter(
                  "status",
                  event.target.value as
                    | BillStatus
                    | "all",
                )
              }
              aria-label="Filter by bill status"
              className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
            >
              <option value="all">
                All statuses
              </option>

              {billStatusDefinitions.map(
                (status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={filters.frequency}
              onChange={(event) =>
                updateFilter(
                  "frequency",
                  event.target.value as
                    | BillFrequency
                    | "all",
                )
              }
              aria-label="Filter by bill frequency"
              className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
            >
              <option value="all">
                All frequencies
              </option>

              {billFrequencyDefinitions.map(
                (frequency) => (
                  <option
                    key={frequency.value}
                    value={frequency.value}
                  >
                    {frequency.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={filters.paymentMethod}
              onChange={(event) =>
                updateFilter(
                  "paymentMethod",
                  event.target.value as
                    | BillPaymentMethod
                    | "all",
                )
              }
              aria-label="Filter by payment method"
              className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
            >
              <option value="all">
                All payment methods
              </option>

              <option value="autopay">
                Autopay
              </option>

              <option value="manual">
                Manual
              </option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Account
            </span>

            <select
              value={filters.accountId}
              onChange={(event) =>
                updateFilter(
                  "accountId",
                  event.target.value,
                )
              }
              className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
            >
              <option value="all">
                All accounts
              </option>

              {transactionAccountReferences.map(
                (account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Budget Item
            </span>

            <select
              value={filters.budgetItemId}
              onChange={(event) =>
                updateFilter(
                  "budgetItemId",
                  event.target.value,
                )
              }
              disabled={
                budgetItemReferences.length ===
                0
              }
              className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="all">
                {budgetItemReferences.length ===
                0
                  ? "No budget items available"
                  : "All budget items"}
              </option>

              {budgetItemReferences.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.categoryName} —{" "}
                    {item.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Due From
            </span>

            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(event) =>
                updateFilter(
                  "dateFrom",
                  event.target.value ||
                    undefined,
                )
              }
              className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Due To
            </span>

            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(event) =>
                updateFilter(
                  "dateTo",
                  event.target.value ||
                    undefined,
                )
              }
              className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
            />
          </label>
        </div>

        {hasActiveFilters ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-sm font-bold text-[var(--primary)] outline-none transition hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
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
        r="8"
      />

      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}