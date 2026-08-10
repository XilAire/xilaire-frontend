"use client";

import {
  useMemo,
} from "react";

import {
  generateBillReminders,
  getBillReminderSummary,
  type BillReminder,
  type BillReminderSeverity,
} from "@/lib/bills/bill-reminders";

import type {
  BillData,
} from "@/types/bill";

type UpcomingBillsWidgetProps = {
  bills: BillData[];
  maxItems?: number;
  title?: string;
  description?: string;
  onViewDetails?: (
    bill: BillData,
  ) => void;
  onViewAll?: () => void;
};

export default function UpcomingBillsWidget({
  bills,
  maxItems = 5,
  title = "Upcoming Bills",
  description =
    "Stay ahead of upcoming and overdue payments.",
  onViewDetails,
  onViewAll,
}: UpcomingBillsWidgetProps) {
  const reminders = useMemo(
    () =>
      generateBillReminders(
        bills,
      ),
    [bills],
  );

  const visibleReminders =
    useMemo(
      () =>
        reminders.slice(
          0,
          Math.max(
            0,
            maxItems,
          ),
        ),
      [
        maxItems,
        reminders,
      ],
    );

  const summary = useMemo(
    () =>
      getBillReminderSummary(
        reminders,
      ),
    [reminders],
  );

  const hasReminders =
    reminders.length > 0;

  const hasAdditionalReminders =
    reminders.length >
    visibleReminders.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <header className="border-b border-[var(--border-subtle)] px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <CalendarIcon />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-[var(--text-primary)] sm:text-lg">
                  {title}
                </h2>

                <p className="mt-0.5 text-sm leading-5 text-[var(--text-muted)]">
                  {description}
                </p>
              </div>
            </div>
          </div>

          {hasReminders ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {summary.pastDue >
              0 ? (
                <SummaryBadge
                  label="Past due"
                  value={
                    summary.pastDue
                  }
                  severity="overdue"
                />
              ) : null}

              {summary.dueToday >
              0 ? (
                <SummaryBadge
                  label="Due today"
                  value={
                    summary.dueToday
                  }
                  severity="urgent"
                />
              ) : null}

              {summary.upcoming >
              0 ? (
                <SummaryBadge
                  label="Upcoming"
                  value={
                    summary.upcoming
                  }
                  severity="info"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {hasReminders ? (
        <>
          <div className="divide-y divide-[var(--border-subtle)]">
            {visibleReminders.map(
              (reminder) => (
                <ReminderRow
                  key={
                    reminder.id
                  }
                  reminder={
                    reminder
                  }
                  onViewDetails={
                    onViewDetails
                  }
                />
              ),
            )}
          </div>

          <footer className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatCurrency(
                  summary.totalAmount,
                )}{" "}
                requiring attention
              </p>

              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {buildSummaryText(
                  summary.total,
                  summary.pastDue,
                  summary.dueToday,
                )}
              </p>
            </div>

            {onViewAll ? (
              <button
                type="button"
                onClick={
                  onViewAll
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-[var(--primary)] outline-none transition hover:bg-[var(--primary)]/10 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                {hasAdditionalReminders
                  ? `View all ${reminders.length}`
                  : "View all bills"}

                <ArrowRightIcon />
              </button>
            ) : null}
          </footer>
        </>
      ) : (
        <EmptyReminderState
          onViewAll={
            onViewAll
          }
        />
      )}
    </section>
  );
}

type ReminderRowProps = {
  reminder: BillReminder;
  onViewDetails?: (
    bill: BillData,
  ) => void;
};

function ReminderRow({
  reminder,
  onViewDetails,
}: ReminderRowProps) {
  const isInteractive =
    Boolean(onViewDetails);

  function handleViewDetails() {
    onViewDetails?.(
      reminder.bill,
    );
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
  ) {
    if (
      !isInteractive
    ) {
      return;
    }

    if (
      event.key ===
        "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      handleViewDetails();
    }
  }

  return (
    <div
      role={
        isInteractive
          ? "button"
          : undefined
      }
      tabIndex={
        isInteractive
          ? 0
          : undefined
      }
      onClick={
        isInteractive
          ? handleViewDetails
          : undefined
      }
      onKeyDown={
        isInteractive
          ? handleKeyDown
          : undefined
      }
      className={[
        "group px-4 py-4 sm:px-5",
        isInteractive
          ? "cursor-pointer outline-none transition hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
          : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <ReminderIcon
          severity={
            reminder.severity
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-bold text-[var(--text-primary)] sm:text-base">
                  {
                    reminder.bill
                      .name
                  }
                </h3>

                <ReminderBadge
                  reminder={
                    reminder
                  }
                />
              </div>

              <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
                {reminder.bill
                  .payee ??
                  reminder.message}
              </p>
            </div>

            <div className="shrink-0 sm:text-right">
              <p className="text-base font-bold text-[var(--text-primary)]">
                {formatCurrency(
                  reminder.amount,
                )}
              </p>

              <p className="mt-0.5 text-xs font-medium text-[var(--text-muted)]">
                {formatDueDateText(
                  reminder,
                )}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {reminder.bill
              .account?.name ? (
              <MetadataItem
                icon={
                  <WalletIcon />
                }
                text={
                  reminder.bill
                    .account.name
                }
              />
            ) : null}

            {reminder.bill
              .budgetItem
              ?.categoryName ? (
              <MetadataItem
                icon={
                  <TagIcon />
                }
                text={
                  reminder.bill
                    .budgetItem
                    .categoryName
                }
              />
            ) : null}

            {reminder.bill
              .paymentMethod ===
            "autopay" ? (
              <MetadataItem
                icon={
                  <RepeatIcon />
                }
                text="Autopay"
              />
            ) : (
              <MetadataItem
                icon={
                  <HandIcon />
                }
                text="Manual payment"
              />
            )}
          </div>
        </div>

        {isInteractive ? (
          <div className="hidden shrink-0 self-center text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--primary)] sm:block">
            <ChevronRightIcon />
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ReminderIconProps = {
  severity: BillReminderSeverity;
};

function ReminderIcon({
  severity,
}: ReminderIconProps) {
  return (
    <div
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
        getReminderIconClasses(
          severity,
        ),
      ].join(" ")}
    >
      {severity ===
      "overdue" ? (
        <AlertTriangleIcon />
      ) : severity ===
        "urgent" ? (
        <ClockIcon />
      ) : (
        <BellIcon />
      )}
    </div>
  );
}

type ReminderBadgeProps = {
  reminder: BillReminder;
};

function ReminderBadge({
  reminder,
}: ReminderBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
        getReminderBadgeClasses(
          reminder.severity,
        ),
      ].join(" ")}
    >
      {getReminderBadgeLabel(
        reminder,
      )}
    </span>
  );
}

type SummaryBadgeProps = {
  label: string;
  value: number;
  severity: BillReminderSeverity;
};

function SummaryBadge({
  label,
  value,
  severity,
}: SummaryBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        getReminderBadgeClasses(
          severity,
        ),
      ].join(" ")}
    >
      <span>{value}</span>
      <span>{label}</span>
    </span>
  );
}

type MetadataItemProps = {
  icon: React.ReactNode;
  text: string;
};

function MetadataItem({
  icon,
  text,
}: MetadataItemProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
      <span className="shrink-0">
        {icon}
      </span>

      <span className="truncate">
        {text}
      </span>
    </span>
  );
}

type EmptyReminderStateProps = {
  onViewAll?: () => void;
};

function EmptyReminderState({
  onViewAll,
}: EmptyReminderStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center sm:py-14">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircleIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        You are all caught up
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
        There are no active bill
        reminders requiring your
        attention right now.
      </p>

      {onViewAll ? (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          View all bills

          <ArrowRightIcon />
        </button>
      ) : null}
    </div>
  );
}

function getReminderBadgeLabel(
  reminder: BillReminder,
) {
  switch (
    reminder.type
  ) {
    case "past-due": {
      const overdueDays =
        Math.abs(
          reminder.daysUntilDue,
        );

      return overdueDays === 1
        ? "1 day overdue"
        : `${overdueDays} days overdue`;
    }

    case "due-today":
      return "Due today";

    case "upcoming":
      return reminder.daysUntilDue ===
        1
        ? "Due tomorrow"
        : `Due in ${reminder.daysUntilDue} days`;

    default:
      return "Upcoming";
  }
}

function formatDueDateText(
  reminder: BillReminder,
) {
  if (
    reminder.type ===
    "past-due"
  ) {
    return `Was due ${formatDate(
      reminder.dueDate,
    )}`;
  }

  if (
    reminder.type ===
    "due-today"
  ) {
    return "Due today";
  }

  return `Due ${formatDate(
    reminder.dueDate,
  )}`;
}

function buildSummaryText(
  total: number,
  pastDue: number,
  dueToday: number,
) {
  const billLabel =
    total === 1
      ? "bill"
      : "bills";

  const urgencyParts: string[] =
    [];

  if (pastDue > 0) {
    urgencyParts.push(
      `${pastDue} past due`,
    );
  }

  if (dueToday > 0) {
    urgencyParts.push(
      `${dueToday} due today`,
    );
  }

  if (
    urgencyParts.length === 0
  ) {
    return `${total} upcoming ${billLabel}`;
  }

  return `${total} ${billLabel}: ${urgencyParts.join(
    " and ",
  )}`;
}

function getReminderIconClasses(
  severity: BillReminderSeverity,
) {
  switch (severity) {
    case "overdue":
      return "bg-red-500/10 text-red-600 dark:text-red-400";

    case "urgent":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";

    case "warning":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";

    case "info":
    default:
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  }
}

function getReminderBadgeClasses(
  severity: BillReminderSeverity,
) {
  switch (severity) {
    case "overdue":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";

    case "urgent":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";

    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";

    case "info":
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  }
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatDate(
  value: string,
) {
  const date = new Date(
    `${value.slice(
      0,
      10,
    )}T00:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

function CalendarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect
        width="18"
        height="18"
        x="3"
        y="4"
        rx="2"
      />
      <path d="M3 10h18" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
      <path d="M4 17h16" />
      <path d="M6 17V10a6 6 0 0 1 12 0v7" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />
      <path d="M16 13h.01" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42Z" />
      <circle
        cx="7.5"
        cy="7.5"
        r=".5"
        fill="currentColor"
      />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m17 1 4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="m7 23-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function HandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 11V6a2 2 0 0 0-4 0v5" />
      <path d="M14 10V4a2 2 0 0 0-4 0v7" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
      <path d="M6 13.5 4.5 12A2 2 0 0 0 2 15l5 5a7 7 0 0 0 5 2h1a7 7 0 0 0 7-7v-4a2 2 0 0 0-4 0v1" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}