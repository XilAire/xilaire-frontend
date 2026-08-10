import {
  ReceiptText,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type ReportBreakdownItem = {
  id: string;
  name: string;
  groupName: string;
  amount: number;
  transactionCount: number;
  percentage: number;
};

export type ReportBreakdownCardProps = {
  title: string;
  description: string;
  items: ReportBreakdownItem[];
  emptyTitle: string;
  emptyDescription: string;
  icon?: LucideIcon;
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

export default function ReportBreakdownCard({
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
  icon: Icon = ReceiptText,
  maxItems = 6,
}: ReportBreakdownCardProps) {
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
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="font-bold text-slate-950">
              {title}
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              {description}
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
              <ReportBreakdownRow
                key={
                  item.id
                }
                item={
                  item
                }
              />
            ),
          )}
        </div>
      ) : (
        <ReportBreakdownEmptyState
          title={
            emptyTitle
          }
          description={
            emptyDescription
          }
          icon={
            Icon
          }
        />
      )}
    </section>
  );
}

function ReportBreakdownRow({
  item,
}: {
  item:
    ReportBreakdownItem;
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
            {item.name}
          </p>

          <p className="mt-0.5 truncate text-xs text-slate-500">
            {item.groupName}
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

function ReportBreakdownEmptyState({
  title,
  description,
  icon: Icon,
}: {
  title:
    string;
  description:
    string;
  icon:
    LucideIcon;
}) {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-4 font-bold text-slate-950">
        {title}
      </p>

      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export function SpendingBreakdownCard({
  items,
}: {
  items:
    ReportBreakdownItem[];
}) {
  return (
    <ReportBreakdownCard
      title="Spending by item"
      description="Cleared expenses grouped by budget item."
      items={
        items
      }
      emptyTitle="No spending to report"
      emptyDescription="Cleared expense transactions for this period will appear here."
      icon={
        ReceiptText
      }
    />
  );
}

export function IncomeBreakdownCard({
  items,
}: {
  items:
    ReportBreakdownItem[];
}) {
  return (
    <ReportBreakdownCard
      title="Income breakdown"
      description="Cleared income grouped by source or category."
      items={
        items
      }
      emptyTitle="No income to report"
      emptyDescription="Cleared income transactions for this period will appear here."
      icon={
        TrendingUp
      }
    />
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