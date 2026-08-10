import type { ReactNode } from "react";
import {
  AlertCircle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Receipt,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";

export type UpcomingBillStatus =
  | "upcoming"
  | "due-today"
  | "overdue"
  | "paid";

export type UpcomingBillItem = {
  id: string;
  name: string;
  amount: number;
  dueDate: Date | string;
  status?: UpcomingBillStatus;
  category?: string;
  accountName?: string;
  reminderEnabled?: boolean;
  icon?: ReactNode;
};

export type UpcomingBillsCardProps = {
  bills: UpcomingBillItem[];
  currency?: string;
  locale?: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  maxBills?: number;
  showPaidBills?: boolean;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function parseDateValue(value: Date | string) {
  if (value instanceof Date) {
    return new Date(value);
  }

  const date = new Date(value);

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
  dueDate: Date,
  currentDate: Date
) {
  const normalizedDueDate = normalizeDate(dueDate);
  const normalizedCurrentDate =
    normalizeDate(currentDate);

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  return Math.round(
    (normalizedDueDate.getTime() -
      normalizedCurrentDate.getTime()) /
      millisecondsPerDay
  );
}

function resolveBillStatus(
  bill: UpcomingBillItem,
  currentDate: Date
): UpcomingBillStatus {
  if (bill.status === "paid") {
    return "paid";
  }

  if (
    bill.status === "overdue" ||
    bill.status === "due-today" ||
    bill.status === "upcoming"
  ) {
    return bill.status;
  }

  const parsedDueDate = parseDateValue(
    bill.dueDate
  );

  if (!parsedDueDate) {
    return "upcoming";
  }

  const daysUntilDue = getDaysUntilDue(
    parsedDueDate,
    currentDate
  );

  if (daysUntilDue < 0) {
    return "overdue";
  }

  if (daysUntilDue === 0) {
    return "due-today";
  }

  return "upcoming";
}

function formatDueDate(
  value: Date | string,
  locale: string
) {
  const date = parseDateValue(value);

  if (!date) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getDueDateLabel(
  value: Date | string,
  status: UpcomingBillStatus,
  currentDate: Date,
  locale: string
) {
  if (status === "paid") {
    return "Paid";
  }

  const dueDate = parseDateValue(value);

  if (!dueDate) {
    return "Date unavailable";
  }

  const daysUntilDue = getDaysUntilDue(
    dueDate,
    currentDate
  );

  if (daysUntilDue < 0) {
    const overdueDays = Math.abs(daysUntilDue);

    return overdueDays === 1
      ? "1 day overdue"
      : `${overdueDays} days overdue`;
  }

  if (daysUntilDue === 0) {
    return "Due today";
  }

  if (daysUntilDue === 1) {
    return "Due tomorrow";
  }

  if (daysUntilDue <= 7) {
    return `Due in ${daysUntilDue} days`;
  }

  return `Due ${formatDueDate(
    dueDate,
    locale
  )}`;
}

const statusConfig: Record<
  UpcomingBillStatus,
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
    textClass: "text-sky-400",
    backgroundClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
    icon: (
      <Clock3
        size={13}
        aria-hidden="true"
      />
    ),
  },
  "due-today": {
    label: "Due today",
    textClass: "text-amber-400",
    backgroundClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    icon: (
      <AlertCircle
        size={13}
        aria-hidden="true"
      />
    ),
  },
  overdue: {
    label: "Overdue",
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    icon: (
      <AlertCircle
        size={13}
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
        size={13}
        aria-hidden="true"
      />
    ),
  },
};

export default function UpcomingBillsCard({
  bills,
  currency = "USD",
  locale = "en-US",
  title = "Upcoming Bills",
  description = "Stay ahead of due dates and reminders",
  emptyTitle = "No upcoming bills",
  emptyDescription = "You are all caught up for now.",
  maxBills = 5,
  showPaidBills = false,
  icon,
  href,
  className,
}: UpcomingBillsCardProps) {
  const currentDate = new Date();

  const resolvedBills = bills
    .map((bill) => {
      const parsedDueDate = parseDateValue(
        bill.dueDate
      );

      const status = resolveBillStatus(
        bill,
        currentDate
      );

      return {
        ...bill,
        parsedDueDate,
        status,
        amount: Math.max(bill.amount, 0),
      };
    })
    .filter((bill) => {
      return showPaidBills
        ? true
        : bill.status !== "paid";
    })
    .sort((firstBill, secondBill) => {
      if (
        firstBill.status === "overdue" &&
        secondBill.status !== "overdue"
      ) {
        return -1;
      }

      if (
        secondBill.status === "overdue" &&
        firstBill.status !== "overdue"
      ) {
        return 1;
      }

      if (
        firstBill.status === "due-today" &&
        secondBill.status !== "due-today"
      ) {
        return -1;
      }

      if (
        secondBill.status === "due-today" &&
        firstBill.status !== "due-today"
      ) {
        return 1;
      }

      if (
        !firstBill.parsedDueDate &&
        !secondBill.parsedDueDate
      ) {
        return 0;
      }

      if (!firstBill.parsedDueDate) {
        return 1;
      }

      if (!secondBill.parsedDueDate) {
        return -1;
      }

      return (
        firstBill.parsedDueDate.getTime() -
        secondBill.parsedDueDate.getTime()
      );
    })
    .slice(0, Math.max(maxBills, 0));

  const totalUpcomingAmount = resolvedBills
    .filter((bill) => bill.status !== "paid")
    .reduce((total, bill) => {
      return total + bill.amount;
    }, 0);

  const overdueCount = resolvedBills.filter(
    (bill) => bill.status === "overdue"
  ).length;

  const dueTodayCount = resolvedBills.filter(
    (bill) => bill.status === "due-today"
  ).length;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-amber-400">
            {icon ?? (
              <CalendarClock
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

        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-slate-500">
            Total due
          </p>

          <MoneyDisplay
            amount={totalUpcomingAmount}
            currency={currency}
            locale={locale}
            showColor={false}
            size="md"
            className="mt-1 text-white"
          />
        </div>
      </div>

      {overdueCount > 0 ||
      dueTodayCount > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {overdueCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400">
              <AlertCircle
                size={13}
                aria-hidden="true"
              />

              {overdueCount}{" "}
              {overdueCount === 1
                ? "overdue bill"
                : "overdue bills"}
            </span>
          ) : null}

          {dueTodayCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
              <Clock3
                size={13}
                aria-hidden="true"
              />

              {dueTodayCount} due today
            </span>
          ) : null}
        </div>
      ) : null}

      {resolvedBills.length > 0 ? (
        <div className="mt-5 space-y-3">
          {resolvedBills.map((bill) => {
            const currentStatus =
              statusConfig[bill.status];

            const dueDateLabel =
              getDueDateLabel(
                bill.dueDate,
                bill.status,
                currentDate,
                locale
              );

            return (
              <div
                key={bill.id}
                className={joinClassNames(
                  "rounded-xl border bg-white/[0.025] p-4",
                  bill.status === "overdue"
                    ? "border-rose-500/20"
                    : bill.status === "due-today"
                      ? "border-amber-500/20"
                      : "border-white/10"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={joinClassNames(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                        currentStatus.backgroundClass,
                        currentStatus.borderClass,
                        currentStatus.textClass
                      )}
                    >
                      {bill.icon ?? (
                        <Receipt
                          size={17}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-200">
                        {bill.name}
                      </p>

                      <p
                        className={joinClassNames(
                          "mt-1 text-xs font-medium",
                          currentStatus.textClass
                        )}
                      >
                        {dueDateLabel}
                      </p>

                      {bill.category ||
                      bill.accountName ? (
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {[
                            bill.category,
                            bill.accountName,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <MoneyDisplay
                      amount={bill.amount}
                      currency={currency}
                      locale={locale}
                      showColor={false}
                      size="sm"
                      className="text-slate-200"
                    />

                    <span
                      className={joinClassNames(
                        "mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        currentStatus.textClass,
                        currentStatus.backgroundClass,
                        currentStatus.borderClass
                      )}
                    >
                      {currentStatus.icon}
                      {currentStatus.label}
                    </span>
                  </div>
                </div>

                {bill.reminderEnabled ? (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs text-slate-500">
                    <BellRing
                      size={13}
                      className="text-sky-400"
                      aria-hidden="true"
                    />

                    Reminder enabled
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2
              size={21}
              aria-hidden="true"
            />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-300">
            {emptyTitle}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {emptyDescription}
          </p>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={`View ${title}`}
        className={joinClassNames(
          "group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition duration-200",
          "hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05] hover:shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          overdueCount > 0 &&
            "border-rose-500/20",
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
        overdueCount > 0 &&
          "border-rose-500/20",
        dueTodayCount > 0 &&
          overdueCount === 0 &&
          "border-amber-500/20",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}