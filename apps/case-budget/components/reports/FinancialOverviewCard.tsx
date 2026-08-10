import Link from "next/link";

import {
  ArrowRight,
  BarChart3,
  LineChart,
} from "lucide-react";

export type FinancialOverviewCardProps = {
  hasActivity: boolean;

  income: number;

  expenses: number;

  netCashFlow: number;

  savingsRate: number;

  expenseRatio: number;
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

export default function FinancialOverviewCard({
  hasActivity,
  income,
  expenses,
  netCashFlow,
  savingsRate,
  expenseRatio,
}: FinancialOverviewCardProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <LineChart className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-slate-950">
              Financial overview
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Cleared income and
              spending for the selected
              period.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
          {hasActivity
            ? "Live data"
            : "No activity yet"}
        </span>
      </div>

      {hasActivity ? (
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <OverviewStat
            label="Cleared income"
            value={
              formatMoney(
                income,
              )
            }
          />

          <OverviewStat
            label="Cleared spending"
            value={
              formatMoney(
                expenses,
              )
            }
          />

          <OverviewStat
            label="Net cash flow"
            value={
              formatMoney(
                netCashFlow,
              )
            }
          />

          <OverviewStat
            label="Savings rate"
            value={`${formatPercentage(
              savingsRate,
            )}%`}
          />

          <div className="sm:col-span-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-slate-600">
                  Spending as a share
                  of income
                </p>

                <p className="text-sm font-bold text-slate-950">
                  {formatPercentage(
                    expenseRatio,
                  )}
                  %
                </p>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{
                    width:
                      `${Math.min(
                        100,
                        Math.max(
                          0,
                          expenseRatio,
                        ),
                      )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center px-5 py-12 text-center sm:px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-500">
            <BarChart3 className="h-7 w-7" />
          </div>

          <h3 className="mt-5 text-lg font-bold text-slate-950">
            Build your reporting history
          </h3>

          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
            Once cleared income and
            expenses are recorded, CASE
            Budget will calculate your
            financial results here.
          </p>

          <Link
            href="/dashboard/transactions"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Add transaction

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

type OverviewStatProps = {
  label:
    string;

  value:
    string;
};

function OverviewStat({
  label,
  value,
}: OverviewStatProps) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
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