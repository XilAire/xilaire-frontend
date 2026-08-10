"use client";

import {
  CalendarDays,
} from "lucide-react";

import type {
  ReportPeriodPreset,
} from "@/lib/reports/reports-service";

export type ReportingPeriodCardProps = {
  periodPreset:
    ReportPeriodPreset;

  dateRangeLabel:
    string;

  previousDateRangeLabel:
    string;

  onPeriodChange: (
    preset:
      ReportPeriodPreset,
  ) => void;

  onCustomRangeClick:
    () => void;
};

export default function ReportingPeriodCard({
  periodPreset,
  dateRangeLabel,
  previousDateRangeLabel,
  onPeriodChange,
  onCustomRangeClick,
}: ReportingPeriodCardProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CalendarDays className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-bold text-slate-950">
            Reporting period
          </h2>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            Choose the period used by
            your financial reports.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          Selected range
        </p>

        <p className="mt-1 text-sm font-bold text-slate-800">
          {dateRangeLabel}
        </p>

        <div className="my-3 border-t border-slate-200" />

        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          Compared with
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-600">
          {previousDateRangeLabel}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <PeriodOption
          title="This month"
          description="Current calendar month"
          selected={
            periodPreset ===
            "this-month"
          }
          onClick={() =>
            onPeriodChange(
              "this-month",
            )
          }
        />

        <PeriodOption
          title="Last month"
          description="Previous calendar month"
          selected={
            periodPreset ===
            "last-month"
          }
          onClick={() =>
            onPeriodChange(
              "last-month",
            )
          }
        />

        <PeriodOption
          title="Year to date"
          description="January through today"
          selected={
            periodPreset ===
            "year-to-date"
          }
          onClick={() =>
            onPeriodChange(
              "year-to-date",
            )
          }
        />

        <PeriodOption
          title="Last 30 days"
          description="Rolling 30-day period"
          selected={
            periodPreset ===
            "last-30-days"
          }
          onClick={() =>
            onPeriodChange(
              "last-30-days",
            )
          }
        />

        <PeriodOption
          title="Last 90 days"
          description="Rolling 90-day period"
          selected={
            periodPreset ===
            "last-90-days"
          }
          onClick={() =>
            onPeriodChange(
              "last-90-days",
            )
          }
        />

        <PeriodOption
          title="Custom range"
          description="Choose exact start and end dates"
          selected={
            periodPreset ===
            "custom"
          }
          onClick={
            onCustomRangeClick
          }
        />
      </div>
    </section>
  );
}

type PeriodOptionProps = {
  title:
    string;

  description:
    string;

  selected?:
    boolean;

  onClick:
    () => void;
};

function PeriodOption({
  title,
  description,
  selected = false,
  onClick,
}: PeriodOptionProps) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition",
        selected
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(
        " ",
      )}
    >
      <div>
        <p
          className={[
            "text-sm font-bold",
            selected
              ? "text-emerald-900"
              : "text-slate-800",
          ].join(
            " ",
          )}
        >
          {title}
        </p>

        <p
          className={[
            "mt-1 text-xs",
            selected
              ? "text-emerald-700"
              : "text-slate-500",
          ].join(
            " ",
          )}
        >
          {description}
        </p>
      </div>

      <span
        className={[
          "h-4 w-4 shrink-0 rounded-full border-2",
          selected
            ? "border-emerald-600 bg-emerald-600 shadow-[inset_0_0_0_3px_white]"
            : "border-slate-300",
        ].join(
          " ",
        )}
      />
    </button>
  );
}