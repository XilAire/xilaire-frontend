"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type BudgetMonthPickerModalProps = {
  isOpen: boolean;
  selectedMonth: Date;
  onClose: () => void;
  onSelectMonth: (
    month: Date,
  ) => void;
};

type MonthOption = {
  monthIndex: number;
  shortLabel: string;
  fullLabel: string;
};

const monthFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
    },
  );

const shortMonthFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
    },
  );

const selectedMonthFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );

function createMonthDate(
  year: number,
  monthIndex: number,
) {
  return new Date(
    year,
    monthIndex,
    1,
    12,
    0,
    0,
    0,
  );
}

function isSameMonth(
  firstDate: Date,
  secondDate: Date,
) {
  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth()
  );
}

function getCurrentMonth() {
  const today = new Date();

  return createMonthDate(
    today.getFullYear(),
    today.getMonth(),
  );
}

function getFocusableElements(
  container: HTMLElement,
) {
  const selector = [
    "button:not([disabled])",
    "[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      selector,
    ),
  ).filter(
    (
      element,
    ) =>
      !element.hasAttribute(
        "disabled",
      ) &&
      element.getAttribute(
        "aria-hidden",
      ) !== "true",
  );
}

export default function BudgetMonthPickerModal({
  isOpen,
  selectedMonth,
  onClose,
  onSelectMonth,
}: BudgetMonthPickerModalProps) {
  const dialogRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const previouslyFocusedElementRef =
    useRef<HTMLElement | null>(
      null,
    );

  const [
    mounted,
    setMounted,
  ] = useState(false);

  const [
    visibleYear,
    setVisibleYear,
  ] = useState(
    selectedMonth.getFullYear(),
  );

  const monthOptions =
    useMemo<MonthOption[]>(
      () => {
        return Array.from(
          {
            length: 12,
          },
          (
            _,
            monthIndex,
          ) => {
            const date =
              createMonthDate(
                2026,
                monthIndex,
              );

            return {
              monthIndex,
              shortLabel:
                shortMonthFormatter.format(
                  date,
                ),
              fullLabel:
                monthFormatter.format(
                  date,
                ),
            };
          },
        );
      },
      [],
    );

  const currentMonth =
    useMemo(
      () =>
        getCurrentMonth(),
      [],
    );

  useEffect(
    () => {
      setMounted(true);
    },
    [],
  );

  useEffect(
    () => {
      if (!isOpen) {
        return;
      }

      setVisibleYear(
        selectedMonth.getFullYear(),
      );
    },
    [
      isOpen,
      selectedMonth,
    ],
  );

  useEffect(
    () => {
      if (
        !isOpen ||
        !mounted
      ) {
        return;
      }

      previouslyFocusedElementRef.current =
        document.activeElement instanceof
        HTMLElement
          ? document.activeElement
          : null;

      const originalOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      const frame =
        window.requestAnimationFrame(
          () => {
            const selectedButton =
              dialogRef.current?.querySelector<HTMLElement>(
                '[data-selected-month="true"]',
              );

            const firstFocusableElement =
              dialogRef.current
                ? getFocusableElements(
                    dialogRef.current,
                  )[0]
                : null;

            (
              selectedButton ??
              firstFocusableElement ??
              dialogRef.current
            )?.focus();
          },
        );

      function handleKeyDown(
        event: KeyboardEvent,
      ) {
        if (
          event.key === "Escape"
        ) {
          event.preventDefault();
          onClose();
          return;
        }

        if (
          event.key !== "Tab" ||
          !dialogRef.current
        ) {
          return;
        }

        const focusableElements =
          getFocusableElements(
            dialogRef.current,
          );

        if (
          focusableElements.length ===
          0
        ) {
          event.preventDefault();
          dialogRef.current.focus();
          return;
        }

        const firstElement =
          focusableElements[0];

        const lastElement =
          focusableElements[
            focusableElements.length -
              1
          ];

        const activeElement =
          document.activeElement;

        if (
          event.shiftKey &&
          activeElement === firstElement
        ) {
          event.preventDefault();
          lastElement.focus();
          return;
        }

        if (
          !event.shiftKey &&
          activeElement === lastElement
        ) {
          event.preventDefault();
          firstElement.focus();
        }
      }

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        window.cancelAnimationFrame(
          frame,
        );

        document.body.style.overflow =
          originalOverflow;

        document.removeEventListener(
          "keydown",
          handleKeyDown,
        );

        previouslyFocusedElementRef.current?.focus();
      };
    },
    [
      isOpen,
      mounted,
      onClose,
    ],
  );

  function handlePreviousYear() {
    setVisibleYear(
      (
        currentYear,
      ) =>
        currentYear - 1,
    );
  }

  function handleNextYear() {
    setVisibleYear(
      (
        currentYear,
      ) =>
        currentYear + 1,
    );
  }

  function handleSelectMonth(
    monthIndex: number,
  ) {
    onSelectMonth(
      createMonthDate(
        visibleYear,
        monthIndex,
      ),
    );
  }

  function handleSelectCurrentMonth() {
    onSelectMonth(
      currentMonth,
    );
  }

  function handleBackdropMouseDown(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target ===
      event.currentTarget
    ) {
      onClose();
    }
  }

  if (
    !mounted ||
    !isOpen
  ) {
    return null;
  }

  const selectedMonthLabel =
    selectedMonthFormatter.format(
      selectedMonth,
    );

  const currentMonthLabel =
    selectedMonthFormatter.format(
      currentMonth,
    );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={
        handleBackdropMouseDown
      }
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-month-picker-title"
        aria-describedby="budget-month-picker-description"
        tabIndex={-1}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl outline-none sm:max-w-lg sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4 sm:px-6">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--border-strong)] sm:hidden" />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                Budget period
              </p>

              <h2
                id="budget-month-picker-title"
                className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl"
              >
                Select a month
              </h2>

              <p
                id="budget-month-picker-description"
                className="mt-1 text-sm leading-6 text-[var(--text-muted)]"
              >
                Choose the month and
                year you want to view
                or plan.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close month picker"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface-default)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M6 6L18 18M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Currently selected
            </p>

            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
              {selectedMonthLabel}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={
                handlePreviousYear
              }
              aria-label={`View ${visibleYear - 1}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface-default)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Year
              </p>

              <p
                aria-live="polite"
                className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]"
              >
                {visibleYear}
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleNextYear
              }
              aria-label={`View ${visibleYear + 1}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface-default)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M9 6L15 12L9 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div
            role="grid"
            aria-label={`Months in ${visibleYear}`}
            className="grid grid-cols-3 gap-3 sm:grid-cols-4"
          >
            {monthOptions.map(
              (
                monthOption,
              ) => {
                const optionDate =
                  createMonthDate(
                    visibleYear,
                    monthOption.monthIndex,
                  );

                const selected =
                  isSameMonth(
                    optionDate,
                    selectedMonth,
                  );

                const current =
                  isSameMonth(
                    optionDate,
                    currentMonth,
                  );

                return (
                  <button
                    key={
                      monthOption.monthIndex
                    }
                    type="button"
                    role="gridcell"
                    data-selected-month={
                      selected
                        ? "true"
                        : undefined
                    }
                    aria-pressed={
                      selected
                    }
                    aria-label={`${monthOption.fullLabel} ${visibleYear}${
                      current
                        ? ", current month"
                        : ""
                    }${
                      selected
                        ? ", selected"
                        : ""
                    }`}
                    onClick={() =>
                      handleSelectMonth(
                        monthOption.monthIndex,
                      )
                    }
                    className={[
                      "relative min-h-16 rounded-2xl border px-3 py-3 text-center transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface-default)]",
                      selected
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                        : "border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-primary)] hover:border-[var(--primary)] hover:bg-[var(--surface-muted)]",
                    ].join(
                      " ",
                    )}
                  >
                    <span className="block text-sm font-bold sm:hidden">
                      {
                        monthOption.shortLabel
                      }
                    </span>

                    <span className="hidden text-sm font-bold sm:block">
                      {
                        monthOption.fullLabel
                      }
                    </span>

                    {current ? (
                      <span
                        className={[
                          "mt-1 block text-[10px] font-bold uppercase tracking-[0.12em]",
                          selected
                            ? "text-white/80"
                            : "text-[var(--primary)]",
                        ].join(
                          " ",
                        )}
                      >
                        Current
                      </span>
                    ) : null}
                  </button>
                );
              },
            )}
          </div>

          <button
            type="button"
            onClick={
              handleSelectCurrentMonth
            }
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface-default)]"
          >
            Go to {currentMonthLabel}
          </button>
        </div>

        <div className="sticky bottom-0 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface-default)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}