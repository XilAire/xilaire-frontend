import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ReceiptText,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";

export type BillCardStatus =
  | "upcoming"
  | "due-soon"
  | "due-today"
  | "past-due"
  | "paid";

export type BillCardProps = {
  title: string;
  amount: number;
  dueDate: string;
  currency?: string;
  locale?: string;
  description?: string;
  accountName?: string;
  categoryName?: string;
  isPaid?: boolean;
  paidDate?: string;
  reminderDays?: number;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function parseDateValue(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function normalizeDate(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function getDaysUntilDue(
  dueDate: string,
  currentDate: Date
) {
  const parsedDueDate = parseDateValue(dueDate);

  if (!parsedDueDate) {
    return null;
  }

  const normalizedDueDate = normalizeDate(
    parsedDueDate
  );

  const normalizedCurrentDate = normalizeDate(
    currentDate
  );

  const differenceInMilliseconds =
    normalizedDueDate.getTime() -
    normalizedCurrentDate.getTime();

  return Math.round(
    differenceInMilliseconds /
      (1000 * 60 * 60 * 24)
  );
}

function getBillStatus(
  isPaid: boolean,
  daysUntilDue: number | null,
  reminderDays: number
): BillCardStatus {
  if (isPaid) {
    return "paid";
  }

  if (daysUntilDue === null) {
    return "upcoming";
  }

  if (daysUntilDue < 0) {
    return "past-due";
  }

  if (daysUntilDue === 0) {
    return "due-today";
  }

  if (daysUntilDue <= reminderDays) {
    return "due-soon";
  }

  return "upcoming";
}

function formatDate(
  value: string,
  locale: string
) {
  const date = parseDateValue(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getDueDateLabel(
  status: BillCardStatus,
  daysUntilDue: number | null
) {
  if (status === "paid") {
    return "Paid";
  }

  if (daysUntilDue === null) {
    return "Due date unavailable";
  }

  if (daysUntilDue < -1) {
    return `${Math.abs(daysUntilDue)} days past due`;
  }

  if (daysUntilDue === -1) {
    return "1 day past due";
  }

  if (daysUntilDue === 0) {
    return "Due today";
  }

  if (daysUntilDue === 1) {
    return "Due tomorrow";
  }

  return `Due in ${daysUntilDue} days`;
}

const statusConfig: Record<
  BillCardStatus,
  {
    label: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
    icon: ReactNode;
  }
> = {
  upcoming: {
    label: "Upcoming",
    textClass: "text-slate-300",
    backgroundClass: "bg-slate-500/10",
    borderClass: "border-slate-500/20",
    icon: (
      <CalendarClock
        size={14}
        aria-hidden="true"
      />
    ),
  },
  "due-soon": {
    label: "Due soon",
    textClass: "text-amber-400",
    backgroundClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    icon: (
      <Clock3
        size={14}
        aria-hidden="true"
      />
    ),
  },
  "due-today": {
    label: "Due today",
    textClass: "text-orange-400",
    backgroundClass: "bg-orange-500/10",
    borderClass: "border-orange-500/20",
    icon: (
      <AlertTriangle
        size={14}
        aria-hidden="true"
      />
    ),
  },
  "past-due": {
    label: "Past due",
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    icon: (
      <AlertTriangle
        size={14}
        aria-hidden="true"
      />
    ),
  },
  paid: {
    label: "Paid",
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    icon: (
      <CheckCircle2
        size={14}
        aria-hidden="true"
      />
    ),
  },
};

export default function BillCard({
  title,
  amount,
  dueDate,
  currency = "USD",
  locale = "en-US",
  description,
  accountName,
  categoryName,
  isPaid = false,
  paidDate,
  reminderDays = 5,
  icon,
  href,
  className,
}: BillCardProps) {
  const currentDate = new Date();

  const daysUntilDue = getDaysUntilDue(
    dueDate,
    currentDate
  );

  const status = getBillStatus(
    isPaid,
    daysUntilDue,
    reminderDays
  );

  const currentStatus = statusConfig[status];

  const dueDateLabel = getDueDateLabel(
    status,
    daysUntilDue
  );

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-violet-400">
            {icon ?? (
              <ReceiptText
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
          Amount due
        </p>

        <MoneyDisplay
          amount={amount}
          currency={currency}
          locale={locale}
          showColor={false}
          size="xl"
          className={joinClassNames(
            "mt-1",
            status === "past-due"
              ? "text-rose-400"
              : status === "paid"
                ? "text-emerald-400"
                : "text-white"
          )}
        />
      </div>

      <div
        className={joinClassNames(
          "mt-5 rounded-xl border p-4",
          currentStatus.backgroundClass,
          currentStatus.borderClass
        )}
      >
        <div className="flex items-start gap-3">
          <CalendarClock
            size={18}
            className={joinClassNames(
              "mt-0.5 shrink-0",
              currentStatus.textClass
            )}
            aria-hidden="true"
          />

          <div>
            <p
              className={joinClassNames(
                "text-sm font-semibold",
                currentStatus.textClass
              )}
            >
              {dueDateLabel}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {status === "paid" && paidDate
                ? `Paid on ${formatDate(
                    paidDate,
                    locale
                  )}`
                : `Scheduled for ${formatDate(
                    dueDate,
                    locale
                  )}`}
            </p>
          </div>
        </div>
      </div>

      {accountName || categoryName ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-medium text-slate-500">
              Payment account
            </p>

            <p className="mt-2 truncate text-sm font-semibold text-slate-200">
              {accountName ?? "Not assigned"}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-medium text-slate-500">
              Category
            </p>

            <p className="mt-2 truncate text-sm font-semibold text-slate-200">
              {categoryName ?? "Uncategorized"}
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
        aria-label={`View bill: ${title}`}
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
        status === "past-due" &&
          "border-rose-500/20",
        status === "due-today" &&
          "border-orange-500/20",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}