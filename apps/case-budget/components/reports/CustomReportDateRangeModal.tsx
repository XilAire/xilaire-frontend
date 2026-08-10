"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Check,
  X,
} from "lucide-react";

import type {
  ReportDateRange,
} from "@/lib/reports/reports-service";

export type CustomReportDateRangeModalProps = {
  open: boolean;
  initialRange: ReportDateRange;
  onClose: () => void;
  onApply: (
    dateRange: ReportDateRange,
  ) => void;
};

export default function CustomReportDateRangeModal({
  open,
  initialRange,
  onClose,
  onApply,
}: CustomReportDateRangeModalProps) {
  const [
    startDate,
    setStartDate,
  ] =
    useState(
      initialRange.startDate,
    );

  const [
    endDate,
    setEndDate,
  ] =
    useState(
      initialRange.endDate,
    );

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      setStartDate(
        initialRange.startDate,
      );

      setEndDate(
        initialRange.endDate,
      );
    },
    [
      initialRange.endDate,
      initialRange.startDate,
      open,
    ],
  );

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      function handleKeyDown(
        event: KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          onClose();
        }
      }

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      onClose,
      open,
    ],
  );

  const validationError =
    useMemo(
      () =>
        getValidationError({
          startDate,
          endDate,
        }),
      [
        endDate,
        startDate,
      ],
    );

  if (
    !open
  ) {
    return null;
  }

  function handleApply() {
    if (
      validationError
    ) {
      return;
    }

    onApply({
      startDate,
      endDate,
    });
  }

  return (
    <div className="fixed inset-0 z-[1600]">
      <button
        type="button"
        aria-label="Close custom reporting range"
        onClick={
          onClose
        }
        className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-report-date-range-title"
        className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[30px] border-t border-slate-200 bg-white shadow-2xl sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[30px] sm:border"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <h2
                id="custom-report-date-range-title"
                className="text-xl font-bold tracking-tight text-slate-950"
              >
                Custom reporting range
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Choose the exact dates
                you want CASE Budget
                to analyze.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Close custom reporting range"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Start date
              </span>

              <input
                type="date"
                value={
                  startDate
                }
                onChange={(
                  event,
                ) =>
                  setStartDate(
                    event.target.value,
                  )
                }
                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                End date
              </span>

              <input
                type="date"
                value={
                  endDate
                }
                onChange={(
                  event,
                ) =>
                  setEndDate(
                    event.target.value,
                  )
                }
                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
          </div>

          {validationError ? (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {validationError}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Check className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    Reporting range ready
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-700">
                    Reports, charts,
                    category totals, and
                    period comparisons
                    will use this date
                    range.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Selected period
            </p>

            <p className="mt-2 text-sm font-bold text-slate-800">
              {formatDateRange(
                startDate,
                endDate,
              )}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {getRangeLengthLabel(
                startDate,
                endDate,
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={
              onClose
            }
            className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={
              Boolean(
                validationError,
              )
            }
            onClick={
              handleApply
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4.5 w-4.5" />

            Apply range
          </button>
        </div>
      </section>
    </div>
  );
}

function getValidationError({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  if (
    !startDate ||
    !endDate
  ) {
    return "Both a start date and an end date are required.";
  }

  if (
    !isValidDateString(
      startDate,
    ) ||
    !isValidDateString(
      endDate,
    )
  ) {
    return "Enter a valid reporting date range.";
  }

  if (
    startDate >
    endDate
  ) {
    return "The start date cannot be later than the end date.";
  }

  return null;
}

function isValidDateString(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .split(
        "-",
      )
      .map(
        Number,
      );

  const date =
    new Date(
      year,
      month -
        1,
      day,
    );

  return (
    date.getFullYear() ===
      year &&
    date.getMonth() ===
      month -
        1 &&
    date.getDate() ===
      day
  );
}

function formatDateRange(
  startDate: string,
  endDate: string,
) {
  if (
    !isValidDateString(
      startDate,
    ) ||
    !isValidDateString(
      endDate,
    )
  ) {
    return "Select a valid date range";
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      },
    );

  const start =
    parseDate(
      startDate,
    );

  const end =
    parseDate(
      endDate,
    );

  if (
    startDate ===
    endDate
  ) {
    return formatter.format(
      start,
    );
  }

  return `${formatter.format(
    start,
  )} – ${formatter.format(
    end,
  )}`;
}

function getRangeLengthLabel(
  startDate: string,
  endDate: string,
) {
  if (
    !isValidDateString(
      startDate,
    ) ||
    !isValidDateString(
      endDate,
    ) ||
    startDate >
      endDate
  ) {
    return "Choose your reporting dates.";
  }

  const start =
    parseDate(
      startDate,
    );

  const end =
    parseDate(
      endDate,
    );

  const millisecondsPerDay =
    24 *
    60 *
    60 *
    1000;

  const startUtc =
    Date.UTC(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );

  const endUtc =
    Date.UTC(
      end.getFullYear(),
      end.getMonth(),
      end.getDate(),
    );

  const numberOfDays =
    Math.round(
      (
        endUtc -
        startUtc
      ) /
        millisecondsPerDay,
    ) +
    1;

  return `${numberOfDays} day${
    numberOfDays ===
    1
      ? ""
      : "s"
  } of financial activity`;
}

function parseDate(
  value: string,
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split(
        "-",
      )
      .map(
        Number,
      );

  return new Date(
    year,
    month -
      1,
    day,
  );
}