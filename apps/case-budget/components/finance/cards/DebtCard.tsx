import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  TrendingDown,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";

export type DebtCardStatus =
  | "active"
  | "nearly-paid"
  | "paid-off";

export type DebtCardProps = {
  title: string;
  currentBalance: number;
  originalBalance: number;
  minimumPayment?: number;
  interestRate?: number;
  nextPaymentDate?: string;
  currency?: string;
  locale?: string;
  description?: string;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function getDebtStatus(
  currentBalance: number,
  originalBalance: number
): DebtCardStatus {
  if (currentBalance <= 0) {
    return "paid-off";
  }

  if (
    originalBalance > 0 &&
    currentBalance / originalBalance <= 0.25
  ) {
    return "nearly-paid";
  }

  return "active";
}

function formatDate(
  value: string,
  locale: string
) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatInterestRate(
  value: number
) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

const statusConfig: Record<
  DebtCardStatus,
  {
    label: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
    progressClass: string;
    icon: ReactNode;
  }
> = {
  active: {
    label: "Active",
    textClass: "text-amber-400",
    backgroundClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    progressClass: "bg-amber-500",
    icon: (
      <CreditCard
        size={14}
        aria-hidden="true"
      />
    ),
  },
  "nearly-paid": {
    label: "Nearly paid",
    textClass: "text-sky-400",
    backgroundClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
    progressClass: "bg-sky-500",
    icon: (
      <TrendingDown
        size={14}
        aria-hidden="true"
      />
    ),
  },
  "paid-off": {
    label: "Paid off",
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    progressClass: "bg-emerald-500",
    icon: (
      <CheckCircle2
        size={14}
        aria-hidden="true"
      />
    ),
  },
};

export default function DebtCard({
  title,
  currentBalance,
  originalBalance,
  minimumPayment,
  interestRate,
  nextPaymentDate,
  currency = "USD",
  locale = "en-US",
  description,
  icon,
  href,
  className,
}: DebtCardProps) {
  const normalizedCurrentBalance = Math.max(
    currentBalance,
    0
  );

  const normalizedOriginalBalance = Math.max(
    originalBalance,
    0
  );

  const amountPaid = Math.max(
    normalizedOriginalBalance -
      normalizedCurrentBalance,
    0
  );

  const percentagePaid =
    normalizedOriginalBalance > 0
      ? (amountPaid / normalizedOriginalBalance) *
        100
      : normalizedCurrentBalance <= 0
        ? 100
        : 0;

  const progressPercentage = Math.min(
    Math.max(percentagePaid, 0),
    100
  );

  const status = getDebtStatus(
    normalizedCurrentBalance,
    normalizedOriginalBalance
  );

  const currentStatus = statusConfig[status];

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-amber-400">
            {icon ?? (
              <CreditCard
                size={21}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-200">
              {title}
            </h3>

            {description ? (
              <p className="mt-1 truncate text-xs text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <span
          className={joinClassNames(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            currentStatus.textClass,
            currentStatus.backgroundClass,
            currentStatus.borderClass
          )}
        >
          {currentStatus.icon}

          {currentStatus.label}
        </span>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium text-slate-500">
          Remaining balance
        </p>

        <MoneyDisplay
          amount={normalizedCurrentBalance}
          currency={currency}
          locale={locale}
          showColor={false}
          size="xl"
          className="mt-1 text-white"
        />
      </div>

      <div className="mt-5">
        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={joinClassNames(
              "h-full rounded-full transition-[width] duration-300",
              currentStatus.progressClass
            )}
            style={{
              width: `${progressPercentage}%`,
            }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {percentagePaid.toFixed(0)}% paid
          </span>

          <span className="inline-flex items-center gap-1">
            Original
            <MoneyDisplay
              amount={normalizedOriginalBalance}
              currency={currency}
              locale={locale}
              showColor={false}
              size="sm"
              className="text-slate-300"
            />
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingDown
              size={16}
              aria-hidden="true"
            />

            <span className="text-xs font-medium">
              Amount paid
            </span>
          </div>

          <MoneyDisplay
            amount={amountPaid}
            currency={currency}
            locale={locale}
            showColor={false}
            size="md"
            className="mt-2 text-emerald-400"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <CreditCard
              size={16}
              aria-hidden="true"
            />

            <span className="text-xs font-medium">
              Minimum payment
            </span>
          </div>

          {typeof minimumPayment === "number" ? (
            <MoneyDisplay
              amount={minimumPayment}
              currency={currency}
              locale={locale}
              showColor={false}
              size="md"
              className="mt-2 text-slate-200"
            />
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-400">
              Not set
            </p>
          )}
        </div>
      </div>

      {typeof interestRate === "number" ||
      nextPaymentDate ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-medium text-slate-500">
              Interest rate
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-200">
              {typeof interestRate === "number"
                ? `${formatInterestRate(
                    interestRate
                  )}% APR`
                : "Not set"}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarDays
                size={16}
                aria-hidden="true"
              />

              <span className="text-xs font-medium">
                Next payment
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-200">
              {nextPaymentDate
                ? formatDate(
                    nextPaymentDate,
                    locale
                  )
                : "Not scheduled"}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={`View debt: ${title}`}
        className={joinClassNames(
          "group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition duration-200",
          "hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05] hover:shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          className
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <article
      className={joinClassNames(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition duration-200",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}