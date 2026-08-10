"use client";

import Link from "next/link";

import {
  BarChart3,
  CalendarDays,
  Download,
  Printer,
  ReceiptText,
  WalletCards,
} from "lucide-react";

export type ReportsHeaderProps = {
  dateRangeLabel: string;
  onExportCsv: () => void;
  onPrint: () => void;
};

export default function ReportsHeader({
  dateRangeLabel,
  onExportCsv,
  onPrint,
}: ReportsHeaderProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <BarChart3 className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Insights
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Reports
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Understand where your
              money is going, measure
              progress, and see how
              your financial position
              changes over time.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <CalendarDays className="h-4 w-4" />

              {dateRangeLabel}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end print:hidden">
          <button
            type="button"
            onClick={
              onPrint
            }
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
          >
            <Printer className="h-[18px] w-[18px]" />

            Print / PDF
          </button>

          <button
            type="button"
            onClick={
              onExportCsv
            }
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
          >
            <Download className="h-[18px] w-[18px]" />

            Export CSV
          </button>

          <Link
            href="/dashboard/transactions"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
          >
            <ReceiptText className="h-[18px] w-[18px]" />

            View transactions
          </Link>

          <Link
            href="/dashboard/budget"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            <WalletCards className="h-[18px] w-[18px]" />

            View budget
          </Link>
        </div>
      </div>
    </section>
  );
}