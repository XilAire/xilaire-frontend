import Link from "next/link";

import {
  ArrowRight,
  WalletCards,
} from "lucide-react";

export type SpendingByAccountItem = {
  accountId: string;
  accountName: string;
  accountType: string;
  amount: number;
  transactionCount: number;
  percentage: number;
};

export type SpendingByAccountCardProps = {
  items: SpendingByAccountItem[];
  maxItems?: number;
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

export default function SpendingByAccountCard({
  items,
  maxItems = 6,
}: SpendingByAccountCardProps) {
  const visibleItems =
    items.slice(
      0,
      Math.max(
        1,
        maxItems,
      ),
    );

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <WalletCards className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="font-bold text-slate-950">
              Spending by account
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Cleared expenses grouped
              by the account used.
            </p>
          </div>
        </div>
      </div>

      {visibleItems.length >
      0 ? (
        <div className="divide-y divide-slate-100">
          {visibleItems.map(
            (
              item,
            ) => (
              <SpendingByAccountRow
                key={
                  item.accountId
                }
                item={
                  item
                }
              />
            ),
          )}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

function SpendingByAccountRow({
  item,
}: {
  item:
    SpendingByAccountItem;
}) {
  const safeAmount =
    normalizeFiniteNumber(
      item.amount,
    );

  const safePercentage =
    clampPercentage(
      item.percentage,
    );

  const safeTransactionCount =
    normalizeTransactionCount(
      item.transactionCount,
    );

  return (
    <div className="p-5 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {item.accountName}
          </p>

          <p className="mt-0.5 truncate text-xs text-slate-500">
            {formatAccountType(
              item.accountType,
            )}
            {" · "}
            {safeTransactionCount}{" "}
            transaction
            {safeTransactionCount ===
            1
              ? ""
              : "s"}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-slate-950">
            {formatMoney(
              safeAmount,
            )}
          </p>

          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {formatPercentage(
              safePercentage,
            )}
            %
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width]"
          style={{
            width:
              `${safePercentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <WalletCards className="h-5 w-5" />
      </div>

      <p className="mt-4 font-bold text-slate-950">
        No account spending to report
      </p>

      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
        Cleared expense transactions
        for this period will be grouped
        by account here.
      </p>

      <Link
        href="/dashboard/transactions"
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
      >
        View transactions

        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function formatAccountType(
  value: string,
) {
  const normalizedValue =
    value
      .trim()
      .replace(
        /[-_]+/g,
        " ",
      );

  if (
    !normalizedValue
  ) {
    return "Account";
  }

  return normalizedValue
    .split(
      " ",
    )
    .filter(
      Boolean,
    )
    .map(
      (
        part,
      ) =>
        part.charAt(
          0,
        ).toUpperCase() +
        part.slice(
          1,
        ),
    )
    .join(
      " ",
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

function normalizeTransactionCount(
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

function clampPercentage(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
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

function formatPercentage(
  value: number,
) {
  return percentFormatter.format(
    clampPercentage(
      value,
    ),
  );
}