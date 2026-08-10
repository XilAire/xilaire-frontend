import type { ReactNode } from "react";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Info,
  Landmark,
  ReceiptText,
  ShieldAlert,
  Target,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";

export type FinancialAlertSeverity =
  | "info"
  | "warning"
  | "critical"
  | "success";

export type FinancialAlertType =
  | "bill-due"
  | "bill-overdue"
  | "low-balance"
  | "budget-warning"
  | "budget-exceeded"
  | "debt-payment"
  | "goal-progress"
  | "account-disconnected"
  | "custom";

export type FinancialAlertAction = {
  label: string;
  href: string;
};

export type FinancialAlertItem = {
  id: string;
  title: string;
  message: string;
  severity: FinancialAlertSeverity;
  type?: FinancialAlertType;
  amount?: number;
  dueDate?: Date | string;
  createdAt?: Date | string;
  isRead?: boolean;
  action?: FinancialAlertAction;
  icon?: ReactNode;
};

export type FinancialAlertsCardProps = {
  alerts: FinancialAlertItem[];
  currency?: string;
  locale?: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  maxAlerts?: number;
  showReadAlerts?: boolean;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function parseDateValue(value?: Date | string) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function normalizeDate(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function getDaysDifference(
  date: Date,
  currentDate: Date
) {
  const normalizedDate = normalizeDate(date);
  const normalizedCurrentDate =
    normalizeDate(currentDate);

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  return Math.round(
    (normalizedCurrentDate.getTime() -
      normalizedDate.getTime()) /
      millisecondsPerDay
  );
}

function formatRelativeDate(
  value: Date | string | undefined,
  locale: string,
  currentDate: Date
) {
  const date = parseDateValue(value);

  if (!date) {
    return null;
  }

  const daysDifference = getDaysDifference(
    date,
    currentDate
  );

  if (daysDifference === 0) {
    return "Today";
  }

  if (daysDifference === 1) {
    return "Yesterday";
  }

  if (
    daysDifference > 1 &&
    daysDifference < 7
  ) {
    return `${daysDifference} days ago`;
  }

  if (daysDifference < 0) {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !==
      currentDate.getFullYear()
        ? "numeric"
        : undefined,
  }).format(date);
}

function formatDueDate(
  value: Date | string | undefined,
  locale: string,
  currentDate: Date
) {
  const dueDate = parseDateValue(value);

  if (!dueDate) {
    return null;
  }

  const normalizedDueDate =
    normalizeDate(dueDate);

  const normalizedCurrentDate =
    normalizeDate(currentDate);

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  const daysUntilDue = Math.round(
    (normalizedDueDate.getTime() -
      normalizedCurrentDate.getTime()) /
      millisecondsPerDay
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

  return `Due ${new Intl.DateTimeFormat(
    locale,
    {
      month: "short",
      day: "numeric",
    }
  ).format(dueDate)}`;
}

function getAlertTypeIcon(
  type: FinancialAlertType
) {
  if (
    type === "bill-due" ||
    type === "bill-overdue"
  ) {
    return (
      <ReceiptText
        size={17}
        aria-hidden="true"
      />
    );
  }

  if (type === "low-balance") {
    return (
      <Landmark
        size={17}
        aria-hidden="true"
      />
    );
  }

  if (
    type === "budget-warning" ||
    type === "budget-exceeded"
  ) {
    return (
      <WalletCards
        size={17}
        aria-hidden="true"
      />
    );
  }

  if (type === "debt-payment") {
    return (
      <CreditCard
        size={17}
        aria-hidden="true"
      />
    );
  }

  if (type === "goal-progress") {
    return (
      <Target
        size={17}
        aria-hidden="true"
      />
    );
  }

  if (type === "account-disconnected") {
    return (
      <ShieldAlert
        size={17}
        aria-hidden="true"
      />
    );
  }

  return (
    <BellRing
      size={17}
      aria-hidden="true"
    />
  );
}

const severityConfig: Record<
  FinancialAlertSeverity,
  {
    label: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
    icon: ReactNode;
    priority: number;
  }
> = {
  critical: {
    label: "Critical",
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    icon: (
      <AlertCircle
        size={13}
        aria-hidden="true"
      />
    ),
    priority: 4,
  },
  warning: {
    label: "Warning",
    textClass: "text-amber-400",
    backgroundClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    icon: (
      <TriangleAlert
        size={13}
        aria-hidden="true"
      />
    ),
    priority: 3,
  },
  info: {
    label: "Info",
    textClass: "text-sky-400",
    backgroundClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
    icon: (
      <Info
        size={13}
        aria-hidden="true"
      />
    ),
    priority: 2,
  },
  success: {
    label: "Success",
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    icon: (
      <CheckCircle2
        size={13}
        aria-hidden="true"
      />
    ),
    priority: 1,
  },
};

export default function FinancialAlertsCard({
  alerts,
  currency = "USD",
  locale = "en-US",
  title = "Financial Alerts",
  description =
    "Important updates that need your attention",
  emptyTitle = "No active alerts",
  emptyDescription =
    "Everything looks good. New financial alerts will appear here.",
  maxAlerts = 6,
  showReadAlerts = false,
  icon,
  href,
  className,
}: FinancialAlertsCardProps) {
  const currentDate = new Date();

  const resolvedAlerts = alerts
    .map((alert) => {
      const createdAt = parseDateValue(
        alert.createdAt
      );

      return {
        ...alert,
        type: alert.type ?? "custom",
        isRead: alert.isRead ?? false,
        createdAt,
      };
    })
    .filter((alert) => {
      return showReadAlerts
        ? true
        : !alert.isRead;
    })
    .sort((firstAlert, secondAlert) => {
      const firstPriority =
        severityConfig[firstAlert.severity]
          .priority;

      const secondPriority =
        severityConfig[secondAlert.severity]
          .priority;

      if (firstPriority !== secondPriority) {
        return secondPriority - firstPriority;
      }

      if (
        !firstAlert.createdAt &&
        !secondAlert.createdAt
      ) {
        return 0;
      }

      if (!firstAlert.createdAt) {
        return 1;
      }

      if (!secondAlert.createdAt) {
        return -1;
      }

      return (
        secondAlert.createdAt.getTime() -
        firstAlert.createdAt.getTime()
      );
    })
    .slice(0, Math.max(maxAlerts, 0));

  const unreadCount = alerts.filter(
    (alert) => !alert.isRead
  ).length;

  const criticalCount =
    resolvedAlerts.filter((alert) => {
      return alert.severity === "critical";
    }).length;

  const warningCount =
    resolvedAlerts.filter((alert) => {
      return alert.severity === "warning";
    }).length;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={joinClassNames(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
              criticalCount > 0
                ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                : warningCount > 0
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                  : "border-white/10 bg-white/[0.05] text-sky-400"
            )}
          >
            {icon ?? (
              <BellRing
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

        {unreadCount > 0 ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-400">
            {unreadCount} unread
          </span>
        ) : null}
      </div>

      {criticalCount > 0 ||
      warningCount > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {criticalCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400">
              <AlertCircle
                size={13}
                aria-hidden="true"
              />

              {criticalCount}{" "}
              {criticalCount === 1
                ? "critical alert"
                : "critical alerts"}
            </span>
          ) : null}

          {warningCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
              <TriangleAlert
                size={13}
                aria-hidden="true"
              />

              {warningCount}{" "}
              {warningCount === 1
                ? "warning"
                : "warnings"}
            </span>
          ) : null}
        </div>
      ) : null}

      {resolvedAlerts.length > 0 ? (
        <div className="mt-5 space-y-3">
          {resolvedAlerts.map((alert) => {
            const currentSeverity =
              severityConfig[alert.severity];

            const dueDateLabel =
              formatDueDate(
                alert.dueDate,
                locale,
                currentDate
              );

            const createdAtLabel =
              formatRelativeDate(
                alert.createdAt ?? undefined,
                locale,
                currentDate
              );

            return (
              <div
                key={alert.id}
                className={joinClassNames(
                  "rounded-xl border bg-white/[0.025] p-4",
                  currentSeverity.borderClass,
                  alert.isRead && "opacity-70"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={joinClassNames(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                      currentSeverity.textClass,
                      currentSeverity.backgroundClass,
                      currentSeverity.borderClass
                    )}
                  >
                    {alert.icon ??
                      getAlertTypeIcon(alert.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-200">
                          {alert.title}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {alert.message}
                        </p>
                      </div>

                      {!alert.isRead ? (
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-400"
                          aria-label="Unread alert"
                        />
                      ) : null}
                    </div>

                    {typeof alert.amount ===
                    "number" ? (
                      <MoneyDisplay
                        amount={alert.amount}
                        currency={currency}
                        locale={locale}
                        showColor={false}
                        size="md"
                        className="mt-3 text-slate-200"
                      />
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={joinClassNames(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          currentSeverity.textClass,
                          currentSeverity.backgroundClass,
                          currentSeverity.borderClass
                        )}
                      >
                        {currentSeverity.icon}
                        {currentSeverity.label}
                      </span>

                      {dueDateLabel ? (
                        <span
                          className={joinClassNames(
                            "text-xs font-medium",
                            alert.severity ===
                              "critical"
                              ? "text-rose-400"
                              : alert.severity ===
                                  "warning"
                                ? "text-amber-400"
                                : "text-slate-500"
                          )}
                        >
                          {dueDateLabel}
                        </span>
                      ) : null}

                      {createdAtLabel ? (
                        <span className="text-xs text-slate-600">
                          {createdAtLabel}
                        </span>
                      ) : null}
                    </div>

                    {alert.action ? (
                      <a
                        href={alert.action.href}
                        className="mt-3 inline-flex text-xs font-semibold text-emerald-400 transition hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                      >
                        {alert.action.label}
                      </a>
                    ) : null}
                  </div>
                </div>
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
          criticalCount > 0 &&
            "border-rose-500/20",
          criticalCount === 0 &&
            warningCount > 0 &&
            "border-amber-500/20",
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
        criticalCount > 0 &&
          "border-rose-500/20",
        criticalCount === 0 &&
          warningCount > 0 &&
          "border-amber-500/20",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}