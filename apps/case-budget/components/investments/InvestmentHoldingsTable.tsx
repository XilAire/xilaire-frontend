"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import Pagination from "@/components/ui/Pagination";

import {
  useInvestments,
  type InvestmentAccountData,
  type InvestmentHoldingData,
  type InvestmentHoldingType,
} from "@/components/providers/InvestmentsProvider";

import usePagination from "@/hooks/usePagination";

export type InvestmentHoldingsSortOption =
  | "market-value-desc"
  | "market-value-asc"
  | "gain-desc"
  | "gain-asc"
  | "gain-percent-desc"
  | "gain-percent-asc"
  | "symbol-asc"
  | "symbol-desc"
  | "name-asc"
  | "name-desc";

export type InvestmentHoldingsTypeFilter =
  | "all"
  | InvestmentHoldingType;

export type InvestmentHoldingsTableProps = {
  holdings?: InvestmentHoldingData[];
  accounts?: InvestmentAccountData[];

  compact?: boolean;
  showHeader?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  showActions?: boolean;

  title?: string;
  description?: string;

  initialPageSize?: number;

  pageSizeOptions?: number[];

  onEdit?: (
    holding:
      InvestmentHoldingData,
  ) => void;

  onDelete?: (
    holding:
      InvestmentHoldingData,
  ) => void;

  className?: string;
};

const DEFAULT_PAGE_SIZE =
  10;

const DEFAULT_PAGE_SIZE_OPTIONS = [
  10,
  25,
  50,
  100,
];

export default function InvestmentHoldingsTable({
  holdings:
    holdingsOverride,
  accounts:
    accountsOverride,
  compact = false,
  showHeader = true,
  showFilters = true,
  showPagination = true,
  showActions = true,
  title = "Holdings",
  description = "Track market value, cost basis, gains, and dividend income.",
  initialPageSize =
    DEFAULT_PAGE_SIZE,
  pageSizeOptions =
    DEFAULT_PAGE_SIZE_OPTIONS,
  onEdit,
  onDelete,
  className = "",
}: InvestmentHoldingsTableProps) {
  const {
    holdings:
      storedHoldings,
    investmentAccounts:
      storedAccounts,
  } = useInvestments();

  const holdings =
    holdingsOverride ??
    storedHoldings;

  const accounts =
    accountsOverride ??
    storedAccounts;

  const [
    searchValue,
    setSearchValue,
  ] = useState(
    "",
  );

  const [
    selectedAccountId,
    setSelectedAccountId,
  ] = useState(
    "all",
  );

  const [
    selectedHoldingType,
    setSelectedHoldingType,
  ] =
    useState<InvestmentHoldingsTypeFilter>(
      "all",
    );

  const [
    sortOption,
    setSortOption,
  ] =
    useState<InvestmentHoldingsSortOption>(
      "market-value-desc",
    );

  const filteredHoldings =
    useMemo(
      () => {
        const normalizedSearch =
          searchValue
            .trim()
            .toLowerCase();

        return holdings
          .filter(
            (
              holding,
            ) => {
              if (
                selectedAccountId !==
                  "all" &&
                holding.investmentAccountId !==
                  selectedAccountId
              ) {
                return false;
              }

              if (
                selectedHoldingType !==
                  "all" &&
                holding.type !==
                  selectedHoldingType
              ) {
                return false;
              }

              if (
                !normalizedSearch
              ) {
                return true;
              }

              const account =
                accounts.find(
                  (
                    currentAccount,
                  ) =>
                    currentAccount.id ===
                    holding.investmentAccountId,
                );

              return [
                holding.name,
                holding.symbol,
                holding.type,
                account?.name,
                account?.institution,
              ]
                .filter(
                  Boolean,
                )
                .some(
                  (
                    value,
                  ) =>
                    String(
                      value,
                    )
                      .toLowerCase()
                      .includes(
                        normalizedSearch,
                      ),
                );
            },
          )
          .sort(
            (
              firstHolding,
              secondHolding,
            ) =>
              compareHoldings(
                firstHolding,
                secondHolding,
                sortOption,
              ),
          );
      },
      [
        accounts,
        holdings,
        searchValue,
        selectedAccountId,
        selectedHoldingType,
        sortOption,
      ],
    );

  const {
    currentPage,
    pageSize,
    totalItems,
    paginatedItems,
    setCurrentPage,
    setPageSize,
  } = usePagination({
    items:
      filteredHoldings,
    initialPageSize,
    resetDependencies: [
      searchValue,
      selectedAccountId,
      selectedHoldingType,
      sortOption,
    ],
  });

  const displayedHoldings =
    showPagination
      ? paginatedItems
      : filteredHoldings;

  const hasActiveFilters =
    Boolean(
      searchValue.trim(),
    ) ||
    selectedAccountId !==
      "all" ||
    selectedHoldingType !==
      "all" ||
    sortOption !==
      "market-value-desc";

  function clearFilters() {
    setSearchValue(
      "",
    );

    setSelectedAccountId(
      "all",
    );

    setSelectedHoldingType(
      "all",
    );

    setSortOption(
      "market-value-desc",
    );
  }

  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm",
        className,
      ].join(
        " ",
      )}
    >
      {showHeader ? (
        <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {title}
            </h2>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {description}
            </p>
          </div>

          <Link
            href="/dashboard/investments?action=add-holding"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <PlusIcon />

            Add holding
          </Link>
        </header>
      ) : null}

      {showFilters ? (
        <InvestmentHoldingsFilters
          searchValue={
            searchValue
          }
          selectedAccountId={
            selectedAccountId
          }
          selectedHoldingType={
            selectedHoldingType
          }
          sortOption={
            sortOption
          }
          accounts={
            accounts
          }
          hasActiveFilters={
            hasActiveFilters
          }
          onSearchChange={
            setSearchValue
          }
          onAccountChange={
            setSelectedAccountId
          }
          onHoldingTypeChange={
            setSelectedHoldingType
          }
          onSortChange={
            setSortOption
          }
          onClearFilters={
            clearFilters
          }
        />
      ) : null}

      {displayedHoldings.length >
      0 ? (
        <>
          <DesktopHoldingsTable
            holdings={
              displayedHoldings
            }
            accounts={
              accounts
            }
            compact={
              compact
            }
            showActions={
              showActions
            }
            onEdit={
              onEdit
            }
            onDelete={
              onDelete
            }
          />

          <MobileHoldingsList
            holdings={
              displayedHoldings
            }
            accounts={
              accounts
            }
            showActions={
              showActions
            }
            onEdit={
              onEdit
            }
            onDelete={
              onDelete
            }
          />

          {showPagination ? (
            <Pagination
              currentPage={
                currentPage
              }
              totalItems={
                totalItems
              }
              pageSize={
                pageSize
              }
              itemLabel="holdings"
              showFirstLast
              showPageSizeSelector
              pageSizeOptions={
                pageSizeOptions
              }
              onPageChange={
                setCurrentPage
              }
              onPageSizeChange={
                setPageSize
              }
            />
          ) : null}
        </>
      ) : (
        <HoldingsEmptyState
          hasActiveFilters={
            hasActiveFilters
          }
          onClearFilters={
            clearFilters
          }
        />
      )}
    </section>
  );
}

type InvestmentHoldingsFiltersProps = {
  searchValue:
    string;

  selectedAccountId:
    string;

  selectedHoldingType:
    InvestmentHoldingsTypeFilter;

  sortOption:
    InvestmentHoldingsSortOption;

  accounts:
    InvestmentAccountData[];

  hasActiveFilters:
    boolean;

  onSearchChange: (
    value:
      string,
  ) => void;

  onAccountChange: (
    value:
      string,
  ) => void;

  onHoldingTypeChange: (
    value:
      InvestmentHoldingsTypeFilter,
  ) => void;

  onSortChange: (
    value:
      InvestmentHoldingsSortOption,
  ) => void;

  onClearFilters: () => void;
};

function InvestmentHoldingsFilters({
  searchValue,
  selectedAccountId,
  selectedHoldingType,
  sortOption,
  accounts,
  hasActiveFilters,
  onSearchChange,
  onAccountChange,
  onHoldingTypeChange,
  onSortChange,
  onClearFilters,
}: InvestmentHoldingsFiltersProps) {
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(170px,auto))_auto]">
        <label className="relative block">
          <span className="sr-only">
            Search holdings
          </span>

          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-muted)]">
            <SearchIcon />
          </span>

          <input
            type="search"
            value={
              searchValue
            }
            placeholder="Search symbol, holding, or account"
            onChange={(
              event,
            ) =>
              onSearchChange(
                event.target
                  .value,
              )
            }
            className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]"
          />
        </label>

        <FilterSelect
          label="Investment account"
          value={
            selectedAccountId
          }
          onChange={
            onAccountChange
          }
        >
          <option value="all">
            All accounts
          </option>

          {accounts.map(
            (
              account,
            ) => (
              <option
                key={
                  account.id
                }
                value={
                  account.id
                }
              >
                {account.name}
              </option>
            ),
          )}
        </FilterSelect>

        <FilterSelect
          label="Holding type"
          value={
            selectedHoldingType
          }
          onChange={(
            value,
          ) =>
            onHoldingTypeChange(
              value as InvestmentHoldingsTypeFilter,
            )
          }
        >
          <option value="all">
            All types
          </option>

          {getHoldingTypeOptions().map(
            (
              option,
            ) => (
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
        </FilterSelect>

        <FilterSelect
          label="Sort holdings"
          value={
            sortOption
          }
          onChange={(
            value,
          ) =>
            onSortChange(
              value as InvestmentHoldingsSortOption,
            )
          }
        >
          <option value="market-value-desc">
            Value: High to low
          </option>

          <option value="market-value-asc">
            Value: Low to high
          </option>

          <option value="gain-desc">
            Gain: High to low
          </option>

          <option value="gain-asc">
            Gain: Low to high
          </option>

          <option value="gain-percent-desc">
            Gain %: High to low
          </option>

          <option value="gain-percent-asc">
            Gain %: Low to high
          </option>

          <option value="symbol-asc">
            Symbol: A–Z
          </option>

          <option value="symbol-desc">
            Symbol: Z–A
          </option>

          <option value="name-asc">
            Name: A–Z
          </option>

          <option value="name-desc">
            Name: Z–A
          </option>
        </FilterSelect>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={
              onClearFilters
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-bold text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

type FilterSelectProps = {
  label:
    string;

  value:
    string;

  children:
    React.ReactNode;

  onChange: (
    value:
      string,
  ) => void;
};

function FilterSelect({
  label,
  value,
  children,
  onChange,
}: FilterSelectProps) {
  return (
    <label className="block">
      <span className="sr-only">
        {label}
      </span>

      <select
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]"
      >
        {children}
      </select>
    </label>
  );
}

type HoldingsViewProps = {
  holdings:
    InvestmentHoldingData[];

  accounts:
    InvestmentAccountData[];

  showActions:
    boolean;

  onEdit?: (
    holding:
      InvestmentHoldingData,
  ) => void;

  onDelete?: (
    holding:
      InvestmentHoldingData,
  ) => void;
};

type DesktopHoldingsTableProps =
  HoldingsViewProps & {
    compact:
      boolean;
  };

function DesktopHoldingsTable({
  holdings,
  accounts,
  compact,
  showActions,
  onEdit,
  onDelete,
}: DesktopHoldingsTableProps) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full border-collapse">
        <thead className="bg-[var(--surface-muted)]">
          <tr className="border-b border-[var(--border-subtle)]">
            <TableHeader>
              Holding
            </TableHeader>

            <TableHeader>
              Account
            </TableHeader>

            <TableHeader align="right">
              Quantity
            </TableHeader>

            <TableHeader align="right">
              Price
            </TableHeader>

            <TableHeader align="right">
              Market Value
            </TableHeader>

            {!compact ? (
              <TableHeader align="right">
                Cost Basis
              </TableHeader>
            ) : null}

            <TableHeader align="right">
              Gain / Loss
            </TableHeader>

            {!compact ? (
              <TableHeader align="right">
                Dividends
              </TableHeader>
            ) : null}

            {showActions ? (
              <TableHeader align="right">
                <span className="sr-only">
                  Actions
                </span>
              </TableHeader>
            ) : null}
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-subtle)]">
          {holdings.map(
            (
              holding,
            ) => {
              const account =
                accounts.find(
                  (
                    currentAccount,
                  ) =>
                    currentAccount.id ===
                    holding.investmentAccountId,
                );

              return (
                <tr
                  key={
                    holding.id
                  }
                  className="transition hover:bg-[var(--surface-muted)]"
                >
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/investments?holdingId=${encodeURIComponent(
                        holding.id,
                      )}`}
                      className="block min-w-44 rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-xs font-bold text-[var(--primary)]">
                          {getHoldingInitials(
                            holding,
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                            {holding.symbol ??
                              holding.name}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                            {holding.symbol
                              ? holding.name
                              : formatHoldingType(
                                  holding.type,
                                )}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </td>

                  <TableCell>
                    <p className="max-w-40 truncate font-semibold text-[var(--text-primary)]">
                      {account?.name ??
                        "Unknown account"}
                    </p>

                    <p className="mt-0.5 max-w-40 truncate text-xs text-[var(--text-muted)]">
                      {account?.institution ??
                        formatAccountType(
                          account?.type ??
                            "other",
                        )}
                    </p>
                  </TableCell>

                  <TableCell align="right">
                    {formatQuantity(
                      holding.quantity,
                    )}
                  </TableCell>

                  <TableCell align="right">
                    {formatCurrency(
                      holding.currentPrice,
                    )}
                  </TableCell>

                  <TableCell
                    align="right"
                    strong
                  >
                    {formatCurrency(
                      holding.marketValue,
                    )}
                  </TableCell>

                  {!compact ? (
                    <TableCell align="right">
                      {formatCurrency(
                        holding.costBasis,
                      )}
                    </TableCell>
                  ) : null}

                  <TableCell align="right">
                    <GainLossValue
                      amount={
                        holding.unrealizedGain
                      }
                      percentage={
                        holding.unrealizedGainPercentage
                      }
                    />
                  </TableCell>

                  {!compact ? (
                    <TableCell align="right">
                      {formatCurrency(
                        holding.annualDividendIncome ??
                          0,
                      )}
                    </TableCell>
                  ) : null}

                  {showActions ? (
                    <td className="px-4 py-4 text-right">
                      <HoldingActions
                        holding={
                          holding
                        }
                        onEdit={
                          onEdit
                        }
                        onDelete={
                          onDelete
                        }
                      />
                    </td>
                  ) : null}
                </tr>
              );
            },
          )}
        </tbody>
      </table>
    </div>
  );
}

function MobileHoldingsList({
  holdings,
  accounts,
  showActions,
  onEdit,
  onDelete,
}: HoldingsViewProps) {
  return (
    <div className="divide-y divide-[var(--border-subtle)] md:hidden">
      {holdings.map(
        (
          holding,
        ) => {
          const account =
            accounts.find(
              (
                currentAccount,
              ) =>
                currentAccount.id ===
                holding.investmentAccountId,
            );

          return (
            <article
              key={
                holding.id
              }
              className="p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-xs font-bold text-[var(--primary)]">
                  {getHoldingInitials(
                    holding,
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/dashboard/investments?holdingId=${encodeURIComponent(
                        holding.id,
                      )}`}
                      className="min-w-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                        {holding.symbol ??
                          holding.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                        {holding.symbol
                          ? holding.name
                          : formatHoldingType(
                              holding.type,
                            )}
                      </p>
                    </Link>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {formatCurrency(
                          holding.marketValue,
                        )}
                      </p>

                      <GainLossValue
                        amount={
                          holding.unrealizedGain
                        }
                        percentage={
                          holding.unrealizedGainPercentage
                        }
                        compact
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                    <MobileMetric
                      label="Account"
                      value={
                        account?.name ??
                        "Unknown"
                      }
                    />

                    <MobileMetric
                      label="Type"
                      value={
                        formatHoldingType(
                          holding.type,
                        )
                      }
                    />

                    <MobileMetric
                      label="Quantity"
                      value={
                        formatQuantity(
                          holding.quantity,
                        )
                      }
                    />

                    <MobileMetric
                      label="Price"
                      value={
                        formatCurrency(
                          holding.currentPrice,
                        )
                      }
                    />

                    <MobileMetric
                      label="Cost basis"
                      value={
                        formatCurrency(
                          holding.costBasis,
                        )
                      }
                    />

                    <MobileMetric
                      label="Annual dividends"
                      value={
                        formatCurrency(
                          holding.annualDividendIncome ??
                            0,
                        )
                      }
                    />
                  </div>

                  {showActions ? (
                    <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                      <HoldingActions
                        holding={
                          holding
                        }
                        onEdit={
                          onEdit
                        }
                        onDelete={
                          onDelete
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        },
      )}
    </div>
  );
}

type HoldingActionsProps = {
  holding:
    InvestmentHoldingData;

  onEdit?: (
    holding:
      InvestmentHoldingData,
  ) => void;

  onDelete?: (
    holding:
      InvestmentHoldingData,
  ) => void;
};

function HoldingActions({
  holding,
  onEdit,
  onDelete,
}: HoldingActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href={`/dashboard/investments?holdingId=${encodeURIComponent(
          holding.id,
        )}`}
        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        View
      </Link>

      {onEdit ? (
        <button
          type="button"
          onClick={() =>
            onEdit(
              holding,
            )
          }
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Edit
        </button>
      ) : (
        <Link
          href={`/dashboard/investments?action=edit-holding&holdingId=${encodeURIComponent(
            holding.id,
          )}`}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Edit
        </Link>
      )}

      {onDelete ? (
        <button
          type="button"
          onClick={() =>
            onDelete(
              holding,
            )
          }
          className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-bold text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
        >
          Delete
        </button>
      ) : null}
    </div>
  );
}

type MobileMetricProps = {
  label:
    string;

  value:
    string;
};

function MobileMetric({
  label,
  value,
}: MobileMetricProps) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

type GainLossValueProps = {
  amount:
    number;

  percentage:
    number;

  compact?:
    boolean;
};

function GainLossValue({
  amount,
  percentage,
  compact = false,
}: GainLossValueProps) {
  const className =
    amount >
    0
      ? "text-[var(--success)]"
      : amount <
          0
        ? "text-[var(--danger)]"
        : "text-[var(--text-muted)]";

  return (
    <div
      className={[
        "font-bold",
        compact
          ? "mt-1 text-xs"
          : "text-sm",
        className,
      ].join(
        " ",
      )}
    >
      <span>
        {formatSignedCurrency(
          amount,
        )}
      </span>

      <span className="ml-1">
        (
        {formatSignedPercentage(
          percentage,
        )}
        )
      </span>
    </div>
  );
}

type TableHeaderProps = {
  children:
    React.ReactNode;

  align?:
    "left" | "right";
};

function TableHeader({
  children,
  align = "left",
}: TableHeaderProps) {
  return (
    <th
      scope="col"
      className={[
        "px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]",
        align ===
        "right"
          ? "text-right"
          : "text-left",
      ].join(
        " ",
      )}
    >
      {children}
    </th>
  );
}

type TableCellProps = {
  children:
    React.ReactNode;

  align?:
    "left" | "right";

  strong?:
    boolean;
};

function TableCell({
  children,
  align = "left",
  strong = false,
}: TableCellProps) {
  return (
    <td
      className={[
        "px-4 py-4 text-sm",
        align ===
        "right"
          ? "text-right"
          : "text-left",
        strong
          ? "font-bold text-[var(--text-primary)]"
          : "text-[var(--text-muted)]",
      ].join(
        " ",
      )}
    >
      {children}
    </td>
  );
}

function HoldingsEmptyState({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters:
    boolean;

  onClearFilters: () => void;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <HoldingIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        {hasActiveFilters
          ? "No holdings match your filters"
          : "No holdings yet"}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {hasActiveFilters
          ? "Try changing or clearing the current filters."
          : "Add your first holding to begin tracking portfolio value, cost basis, gains, and dividends."}
      </p>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={
            onClearFilters
          }
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Clear filters
        </button>
      ) : (
        <Link
          href="/dashboard/investments?action=add-holding"
          className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <PlusIcon />

          Add holding
        </Link>
      )}
    </div>
  );
}

function compareHoldings(
  firstHolding:
    InvestmentHoldingData,
  secondHolding:
    InvestmentHoldingData,
  sortOption:
    InvestmentHoldingsSortOption,
) {
  switch (
    sortOption
  ) {
    case "market-value-asc":
      return (
        firstHolding.marketValue -
        secondHolding.marketValue
      );

    case "gain-desc":
      return (
        secondHolding.unrealizedGain -
        firstHolding.unrealizedGain
      );

    case "gain-asc":
      return (
        firstHolding.unrealizedGain -
        secondHolding.unrealizedGain
      );

    case "gain-percent-desc":
      return (
        secondHolding.unrealizedGainPercentage -
        firstHolding.unrealizedGainPercentage
      );

    case "gain-percent-asc":
      return (
        firstHolding.unrealizedGainPercentage -
        secondHolding.unrealizedGainPercentage
      );

    case "symbol-asc":
      return getHoldingSortLabel(
        firstHolding,
      ).localeCompare(
        getHoldingSortLabel(
          secondHolding,
        ),
      );

    case "symbol-desc":
      return getHoldingSortLabel(
        secondHolding,
      ).localeCompare(
        getHoldingSortLabel(
          firstHolding,
        ),
      );

    case "name-asc":
      return firstHolding.name.localeCompare(
        secondHolding.name,
      );

    case "name-desc":
      return secondHolding.name.localeCompare(
        firstHolding.name,
      );

    case "market-value-desc":
    default:
      return (
        secondHolding.marketValue -
        firstHolding.marketValue
      );
  }
}

function getHoldingSortLabel(
  holding:
    InvestmentHoldingData,
) {
  return (
    holding.symbol ??
    holding.name
  ).toLowerCase();
}

function getHoldingInitials(
  holding:
    InvestmentHoldingData,
) {
  if (
    holding.symbol
  ) {
    return holding.symbol.slice(
      0,
      4,
    );
  }

  return holding.name
    .split(
      /\s+/,
    )
    .filter(
      Boolean,
    )
    .slice(
      0,
      2,
    )
    .map(
      (
        part,
      ) =>
        part[
          0
        ],
    )
    .join(
      "",
    )
    .toUpperCase();
}

function getHoldingTypeOptions() {
  return [
    {
      value:
        "stock",
      label:
        "Stocks",
    },
    {
      value:
        "etf",
      label:
        "ETFs",
    },
    {
      value:
        "mutual-fund",
      label:
        "Mutual funds",
    },
    {
      value:
        "bond",
      label:
        "Bonds",
    },
    {
      value:
        "option",
      label:
        "Options",
    },
    {
      value:
        "crypto",
      label:
        "Crypto",
    },
    {
      value:
        "cash",
      label:
        "Cash",
    },
    {
      value:
        "real-estate",
      label:
        "Real estate",
    },
    {
      value:
        "commodity",
      label:
        "Commodities",
    },
    {
      value:
        "other",
      label:
        "Other",
    },
  ] satisfies {
    value:
      InvestmentHoldingType;

    label:
      string;
  }[];
}

function formatAccountType(
  type:
    InvestmentAccountData["type"],
) {
  switch (
    type
  ) {
    case "brokerage":
      return "Brokerage";

    case "retirement":
      return "Retirement";

    case "ira":
      return "IRA";

    case "roth-ira":
      return "Roth IRA";

    case "401k":
      return "401(k)";

    case "403b":
      return "403(b)";

    case "529":
      return "529 Plan";

    case "hsa":
      return "HSA";

    case "crypto":
      return "Crypto Account";

    case "other":
    default:
      return "Investment Account";
  }
}

function formatHoldingType(
  type:
    InvestmentHoldingType,
) {
  switch (
    type
  ) {
    case "etf":
      return "ETF";

    case "mutual-fund":
      return "Mutual Fund";

    case "real-estate":
      return "Real Estate";

    case "stock":
      return "Stock";

    case "bond":
      return "Bond";

    case "option":
      return "Option";

    case "crypto":
      return "Crypto";

    case "cash":
      return "Cash";

    case "commodity":
      return "Commodity";

    case "other":
    default:
      return "Other";
  }
}

function formatCurrency(
  value:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",
      currency:
        "USD",
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2,
    },
  ).format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatSignedCurrency(
  value:
    number,
) {
  const normalizedValue =
    Number.isFinite(
      value,
    )
      ? value
      : 0;

  if (
    normalizedValue >
    0
  ) {
    return `+${formatCurrency(
      normalizedValue,
    )}`;
  }

  return formatCurrency(
    normalizedValue,
  );
}

function formatSignedPercentage(
  value:
    number,
) {
  const normalizedValue =
    Number.isFinite(
      value,
    )
      ? value
      : 0;

  const prefix =
    normalizedValue >
    0
      ? "+"
      : "";

  return `${prefix}${normalizedValue.toFixed(
    2,
  )}%`;
}

function formatQuantity(
  value:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits:
        0,
      maximumFractionDigits:
        6,
    },
  ).format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function SearchIcon() {
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
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function HoldingIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1"
      />
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
