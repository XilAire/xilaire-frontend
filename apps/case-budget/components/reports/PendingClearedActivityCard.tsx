import Link from "next/link";

import {
  ArrowRight,
  ReceiptText,
} from "lucide-react";

export type PendingClearedActivityCardProps = {
  clearedIncome: number;

  pendingIncome: number;

  clearedExpenses: number;

  pendingExpenses: number;

  clearedTransactionCount: number;

  pendingTransactionCount: number;
};

const moneyFormatter =
  new Intl.NumberFormat(
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
  );

const percentFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits:
        1,

      maximumFractionDigits:
        1,
    },
  );

export default function PendingClearedActivityCard({
  clearedIncome,
  pendingIncome,
  clearedExpenses,
  pendingExpenses,
  clearedTransactionCount,
  pendingTransactionCount,
}: PendingClearedActivityCardProps) {
  const totalIncome =
    clearedIncome +
    pendingIncome;

  const totalExpenses =
    clearedExpenses +
    pendingExpenses;

  const clearedIncomePercentage =
    getSharePercentage(
      clearedIncome,
      totalIncome,
    );

  const pendingIncomePercentage =
    getSharePercentage(
      pendingIncome,
      totalIncome,
    );

  const clearedExpensePercentage =
    getSharePercentage(
      clearedExpenses,
      totalExpenses,
    );

  const pendingExpensePercentage =
    getSharePercentage(
      pendingExpenses,
      totalExpenses,
    );

  const hasActivity =
    totalIncome >
      0 ||
    totalExpenses >
      0 ||
    clearedTransactionCount >
      0 ||
    pendingTransactionCount >
      0;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ReceiptText className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-slate-950">
              Pending vs cleared activity
            </h2>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              See how much financial
              activity is finalized
              and how much is still
              pending.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            {clearedTransactionCount} cleared
          </span>

          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
            {pendingTransactionCount} pending
          </span>
        </div>
      </div>

      {hasActivity ? (
        <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-2">
          <ActivityStatusGroup
            title="Income"
            total={
              totalIncome
            }
            clearedAmount={
              clearedIncome
            }
            pendingAmount={
              pendingIncome
            }
            clearedPercentage={
              clearedIncomePercentage
            }
            pendingPercentage={
              pendingIncomePercentage
            }
          />

          <ActivityStatusGroup
            title="Spending"
            total={
              totalExpenses
            }
            clearedAmount={
              clearedExpenses
            }
            pendingAmount={
              pendingExpenses
            }
            clearedPercentage={
              clearedExpensePercentage
            }
            pendingPercentage={
              pendingExpensePercentage
            }
          />
        </div>
      ) : (
        <div className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <ReceiptText className="h-5 w-5" />
          </div>

          <p className="mt-4 font-bold text-slate-950">
            No transaction activity yet
          </p>

          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            Pending and cleared
            transaction totals for the
            selected reporting period
            will appear here.
          </p>

          <Link
            href="/dashboard/transactions"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
          >
            View transactions

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

type ActivityStatusGroupProps = {
  title:
    string;

  total:
    number;

  clearedAmount:
    number;

  pendingAmount:
    number;

  clearedPercentage:
    number;

  pendingPercentage:
    number;
};

function ActivityStatusGroup({
  title,
  total,
  clearedAmount,
  pendingAmount,
  clearedPercentage,
  pendingPercentage,
}: ActivityStatusGroupProps) {
  return (
    <div className="rounded-[22px] border border-slate-200 p-4 sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-950">
            {title}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Total activity
          </p>
        </div>

        <p className="text-xl font-bold tracking-tight text-slate-950">
          {formatMoney(
            total,
          )}
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <ActivityStatusRow
          label="Cleared"
          amount={
            clearedAmount
          }
          percentage={
            clearedPercentage
          }
          status="cleared"
        />

        <ActivityStatusRow
          label="Pending"
          amount={
            pendingAmount
          }
          percentage={
            pendingPercentage
          }
          status="pending"
        />
      </div>
    </div>
  );
}

type ActivityStatusRowProps = {
  label:
    string;

  amount:
    number;

  percentage:
    number;

  status:
    | "cleared"
    | "pending";
};

function ActivityStatusRow({
  label,
  amount,
  percentage,
  status,
}: ActivityStatusRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className={[
              "h-2.5 w-2.5 rounded-full",
              status ===
              "cleared"
                ? "bg-emerald-500"
                : "bg-amber-400",
            ].join(
              " ",
            )}
          />

          <p className="text-sm font-semibold text-slate-600">
            {label}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-bold text-slate-950">
            {formatMoney(
              amount,
            )}
          </p>

          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
            {formatPercentage(
              percentage,
            )}
            %
          </p>
        </div>
      </div>

      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={[
            "h-full rounded-full transition-all",
            status ===
              "cleared"
              ? "bg-emerald-500"
              : "bg-amber-400",
          ].join(
            " ",
          )}
          style={{
            width:
              `${Math.min(
                100,
                Math.max(
                  0,
                  percentage,
                ),
              )}%`,
          }}
        />
      </div>
    </div>
  );
}

function getSharePercentage(
  amount: number,
  total: number,
) {
  if (
    !Number.isFinite(
      amount,
    ) ||
    !Number.isFinite(
      total,
    ) ||
    total <=
      0
  ) {
    return 0;
  }

  return (
    amount /
    total
  ) *
    100;
}

function formatMoney(
  value: number,
) {
  return moneyFormatter.format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatPercentage(
  value: number,
) {
  return percentFormatter.format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}