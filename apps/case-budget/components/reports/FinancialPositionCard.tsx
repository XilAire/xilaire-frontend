import Link from "next/link";

import {
  ArrowRight,
  Scale,
} from "lucide-react";

export type FinancialPositionCardProps = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accountCount: number;
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

export default function FinancialPositionCard({
  totalAssets,
  totalLiabilities,
  netWorth,
  accountCount,
}: FinancialPositionCardProps) {
  const safeTotalAssets =
    normalizeFiniteNumber(
      totalAssets,
    );

  const safeTotalLiabilities =
    normalizeFiniteNumber(
      totalLiabilities,
    );

  const safeNetWorth =
    normalizeFiniteNumber(
      netWorth,
    );

  const safeAccountCount =
    normalizeAccountCount(
      accountCount,
    );

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Scale className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="font-bold text-slate-950">
              Financial position
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Accounts currently
              included in net worth.
            </p>
          </div>
        </div>
      </div>

      {safeAccountCount >
      0 ? (
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <FinancialPositionStat
            label="Total assets"
            value={
              formatMoney(
                safeTotalAssets,
              )
            }
          />

          <FinancialPositionStat
            label="Total liabilities"
            value={
              formatMoney(
                safeTotalLiabilities,
              )
            }
          />

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
            <p className="text-sm font-semibold text-emerald-800">
              Net worth
            </p>

            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-900">
              {formatMoney(
                safeNetWorth,
              )}
            </p>

            <p className="mt-1 text-xs font-medium text-emerald-700">
              {safeAccountCount} account
              {safeAccountCount ===
              1
                ? ""
                : "s"}{" "}
              included
            </p>
          </div>

          <Link
            href="/dashboard/accounts"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 sm:col-span-2"
          >
            Manage accounts

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <EmptyFinancialPositionState />
      )}
    </section>
  );
}

function FinancialPositionStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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

function EmptyFinancialPositionState() {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Scale className="h-5 w-5" />
      </div>

      <p className="mt-4 font-bold text-slate-950">
        No accounts included
      </p>

      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
        Add your financial accounts
        to calculate assets,
        liabilities, and net worth.
      </p>

      <Link
        href="/dashboard/accounts"
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
      >
        Manage accounts

        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function normalizeFiniteNumber(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return value;
}

function normalizeAccountCount(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.trunc(
      value,
    ),
  );
}

function formatMoney(
  value: number,
) {
  return moneyFormatter.format(
    normalizeFiniteNumber(
      value,
    ),
  );
}