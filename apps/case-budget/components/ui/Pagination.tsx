"use client";

import {
  useMemo,
} from "react";

export type PaginationProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;

  siblingCount?: number;

  itemLabel?: string;

  showFirstLast?: boolean;
  showPageSizeSelector?: boolean;

  pageSizeOptions?: number[];

  disabled?: boolean;

  onPageChange: (
    page: number,
  ) => void;

  onPageSizeChange?: (
    pageSize: number,
  ) => void;
};

type PaginationItem =
  | number
  | "ellipsis-start"
  | "ellipsis-end";

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  siblingCount = 1,
  itemLabel = "items",
  showFirstLast = true,
  showPageSizeSelector = false,
  pageSizeOptions = [
    10,
    25,
    50,
    100,
  ],
  disabled = false,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const safeTotalItems =
    Math.max(
      0,
      totalItems,
    );

  const safePageSize =
    Math.max(
      1,
      pageSize,
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        safeTotalItems /
          safePageSize,
      ),
    );

  const safeCurrentPage =
    Math.min(
      Math.max(
        1,
        currentPage,
      ),
      totalPages,
    );

  const firstVisibleItem =
    safeTotalItems ===
    0
      ? 0
      : (
          safeCurrentPage -
          1
        ) *
          safePageSize +
        1;

  const lastVisibleItem =
    safeTotalItems ===
    0
      ? 0
      : Math.min(
          safeCurrentPage *
            safePageSize,
          safeTotalItems,
        );

  const paginationItems =
    useMemo(
      () =>
        createPaginationItems({
          currentPage:
            safeCurrentPage,
          totalPages,
          siblingCount,
        }),
      [
        safeCurrentPage,
        siblingCount,
        totalPages,
      ],
    );

  const isFirstPage =
    safeCurrentPage ===
    1;

  const isLastPage =
    safeCurrentPage ===
    totalPages;

  function changePage(
    page: number,
  ) {
    if (
      disabled
    ) {
      return;
    }

    const normalizedPage =
      Math.min(
        Math.max(
          1,
          page,
        ),
        totalPages,
      );

    if (
      normalizedPage ===
      safeCurrentPage
    ) {
      return;
    }

    onPageChange(
      normalizedPage,
    );
  }

  return (
    <nav
      aria-label={`${itemLabel} pagination`}
      className="flex flex-col gap-4 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4 sm:px-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p
          className="text-sm font-medium text-[var(--text-muted)]"
          aria-live="polite"
        >
          Showing{" "}
          <span className="font-bold text-[var(--text-primary)]">
            {firstVisibleItem}
          </span>
          {"–"}
          <span className="font-bold text-[var(--text-primary)]">
            {lastVisibleItem}
          </span>{" "}
          of{" "}
          <span className="font-bold text-[var(--text-primary)]">
            {safeTotalItems}
          </span>{" "}
          {itemLabel}
        </p>

        {showPageSizeSelector &&
        onPageSizeChange ? (
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
            <span>
              Rows per page
            </span>

            <select
              value={
                safePageSize
              }
              disabled={
                disabled
              }
              onChange={(
                event,
              ) =>
                onPageSizeChange(
                  Number(
                    event.target
                      .value,
                  ),
                )
              }
              className="h-10 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-sm font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pageSizeOptions.map(
                (
                  option,
                ) => (
                  <option
                    key={
                      option
                    }
                    value={
                      option
                    }
                  >
                    {option}
                  </option>
                ),
              )}
            </select>
          </label>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={() =>
              changePage(
                safeCurrentPage -
                  1,
              )
            }
            disabled={
              disabled ||
              isFirstPage
            }
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeftIcon />

            Previous
          </button>

          <span className="min-w-20 text-center text-sm font-bold text-[var(--text-primary)]">
            {safeCurrentPage} /{" "}
            {totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              changePage(
                safeCurrentPage +
                  1,
              )
            }
            disabled={
              disabled ||
              isLastPage
            }
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next

            <ChevronRightIcon />
          </button>
        </div>

        <div className="hidden w-full items-center justify-between gap-3 sm:flex">
          <div className="flex items-center gap-2">
            {showFirstLast ? (
              <PaginationButton
                label="First page"
                disabled={
                  disabled ||
                  isFirstPage
                }
                onClick={() =>
                  changePage(
                    1,
                  )
                }
              >
                <DoubleChevronLeftIcon />
              </PaginationButton>
            ) : null}

            <PaginationButton
              label="Previous page"
              disabled={
                disabled ||
                isFirstPage
              }
              onClick={() =>
                changePage(
                  safeCurrentPage -
                    1,
                )
              }
            >
              <ChevronLeftIcon />
            </PaginationButton>
          </div>

          <div className="flex items-center gap-1.5">
            {paginationItems.map(
              (
                item,
              ) => {
                if (
                  item ===
                  "ellipsis-start" ||
                  item ===
                  "ellipsis-end"
                ) {
                  return (
                    <span
                      key={
                        item
                      }
                      aria-hidden="true"
                      className="inline-flex h-10 min-w-8 items-center justify-center px-1 text-sm font-bold text-[var(--text-muted)]"
                    >
                      …
                    </span>
                  );
                }

                const isCurrent =
                  item ===
                  safeCurrentPage;

                return (
                  <button
                    key={
                      item
                    }
                    type="button"
                    onClick={() =>
                      changePage(
                        item,
                      )
                    }
                    disabled={
                      disabled
                    }
                    aria-label={`Go to page ${item}`}
                    aria-current={
                      isCurrent
                        ? "page"
                        : undefined
                    }
                    className={[
                      "inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                      isCurrent
                        ? "bg-[var(--primary)] text-white shadow-sm"
                        : "border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]",
                      disabled
                        ? "cursor-not-allowed opacity-50"
                        : "",
                    ].join(
                      " ",
                    )}
                  >
                    {item}
                  </button>
                );
              },
            )}
          </div>

          <div className="flex items-center gap-2">
            <PaginationButton
              label="Next page"
              disabled={
                disabled ||
                isLastPage
              }
              onClick={() =>
                changePage(
                  safeCurrentPage +
                    1,
                )
              }
            >
              <ChevronRightIcon />
            </PaginationButton>

            {showFirstLast ? (
              <PaginationButton
                label="Last page"
                disabled={
                  disabled ||
                  isLastPage
                }
                onClick={() =>
                  changePage(
                    totalPages,
                  )
                }
              >
                <DoubleChevronRightIcon />
              </PaginationButton>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}

function PaginationButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={
        label
      }
      title={
        label
      }
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function createPaginationItems({
  currentPage,
  totalPages,
  siblingCount,
}: {
  currentPage: number;
  totalPages: number;
  siblingCount: number;
}): PaginationItem[] {
  const safeSiblingCount =
    Math.max(
      0,
      siblingCount,
    );

  const maximumVisiblePages =
    safeSiblingCount *
      2 +
    5;

  if (
    totalPages <=
    maximumVisiblePages
  ) {
    return createNumberRange(
      1,
      totalPages,
    );
  }

  const leftSibling =
    Math.max(
      currentPage -
        safeSiblingCount,
      1,
    );

  const rightSibling =
    Math.min(
      currentPage +
        safeSiblingCount,
      totalPages,
    );

  const shouldShowLeftEllipsis =
    leftSibling >
    2;

  const shouldShowRightEllipsis =
    rightSibling <
    totalPages -
      1;

  if (
    !shouldShowLeftEllipsis &&
    shouldShowRightEllipsis
  ) {
    const leftItemCount =
      3 +
      safeSiblingCount *
        2;

    return [
      ...createNumberRange(
        1,
        leftItemCount,
      ),
      "ellipsis-end",
      totalPages,
    ];
  }

  if (
    shouldShowLeftEllipsis &&
    !shouldShowRightEllipsis
  ) {
    const rightItemCount =
      3 +
      safeSiblingCount *
        2;

    return [
      1,
      "ellipsis-start",
      ...createNumberRange(
        totalPages -
          rightItemCount +
          1,
        totalPages,
      ),
    ];
  }

  return [
    1,
    "ellipsis-start",
    ...createNumberRange(
      leftSibling,
      rightSibling,
    ),
    "ellipsis-end",
    totalPages,
  ];
}

function createNumberRange(
  start: number,
  end: number,
) {
  const length =
    Math.max(
      0,
      end -
        start +
        1,
    );

  return Array.from(
    {
      length,
    },
    (
      _,
      index,
    ) =>
      start +
      index,
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function DoubleChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </svg>
  );
}

function DoubleChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m13 17 5-5-5-5" />
      <path d="m6 17 5-5-5-5" />
    </svg>
  );
}