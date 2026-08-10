import type {
  DebtData,
  NotificationItem,
  NotificationPriority,
} from "./generate-notifications";

import {
  calculateCompletionPercentage,
  createNotificationId,
  differenceInCalendarDays,
  formatCurrency,
  formatDateKey,
  normalizeCalendarDate,
  normalizeMoney,
  parseDate,
  resolveEntityTimestamp,
  sortAndDeduplicateNotifications,
} from "./notification-utils";

const PAYMENT_DUE_SOON_DAYS = 3;

const DEBT_MILESTONES = [
  25,
  50,
  75,
] as const;

export function generateDebtNotifications(
  debts: DebtData[],
  asOfDate: Date,
): NotificationItem[] {
  const normalizedAsOfDate =
    normalizeCalendarDate(asOfDate);

  const notifications: NotificationItem[] =
    [];

  for (const debt of debts) {
    const eventDate =
      resolveDebtEventDate(
        debt,
        normalizedAsOfDate,
      );

    const balance =
      Math.max(
        0,
        normalizeMoney(debt.balance),
      );

    if (isDebtPaidOff(debt, balance)) {
      notifications.push(
        createDebtPaidOffNotification(
          debt,
          eventDate,
        ),
      );

      continue;
    }

    const paymentNotification =
      createDebtPaymentNotification(
        debt,
        normalizedAsOfDate,
        eventDate,
      );

    if (paymentNotification) {
      notifications.push(
        paymentNotification,
      );
    }

    const milestoneNotification =
      createDebtMilestoneNotification(
        debt,
        balance,
        eventDate,
      );

    if (milestoneNotification) {
      notifications.push(
        milestoneNotification,
      );
    }
  }

  return sortAndDeduplicateNotifications(
    notifications,
  );
}

function createDebtPaidOffNotification(
  debt: DebtData,
  eventDate: Date,
): NotificationItem {
  return {
    id: createNotificationId(
      "debt",
      debt.id,
      "paid-off",
    ),
    category: "debt",
    priority: "high",
    title: `${debt.name} is paid off`,
    message:
      "Congratulations. This debt now has a zero balance.",
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "View debt details",
    href: createDebtHref(debt.id),
  };
}

function createDebtPaymentNotification(
  debt: DebtData,
  asOfDate: Date,
  eventDate: Date,
): NotificationItem | null {
  if (debt.paymentStatus === "paid") {
    return null;
  }

  if (debt.paymentStatus === "missed") {
    return createMissedPaymentNotification(
      debt,
      eventDate,
    );
  }

  const nextPaymentDate =
    parseDate(debt.nextPaymentDate);

  if (!nextPaymentDate) {
    return null;
  }

  const daysUntilPayment =
    differenceInCalendarDays(
      nextPaymentDate,
      asOfDate,
    );

  if (daysUntilPayment < 0) {
    return createPastDuePaymentNotification(
      debt,
      nextPaymentDate,
      eventDate,
      Math.abs(daysUntilPayment),
    );
  }

  if (daysUntilPayment === 0) {
    return createPaymentDueTodayNotification(
      debt,
      nextPaymentDate,
      eventDate,
    );
  }

  if (
    daysUntilPayment <=
    PAYMENT_DUE_SOON_DAYS
  ) {
    return createPaymentDueSoonNotification(
      debt,
      nextPaymentDate,
      eventDate,
      daysUntilPayment,
    );
  }

  return null;
}

function createMissedPaymentNotification(
  debt: DebtData,
  eventDate: Date,
): NotificationItem {
  return {
    id: createNotificationId(
      "debt",
      debt.id,
      "payment-missed",
    ),
    category: "debt",
    priority: "critical",
    title: `${debt.name} payment was missed`,
    message:
      buildMissedPaymentMessage(debt),
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Review payment",
    href: createDebtHref(debt.id),
  };
}

function createPastDuePaymentNotification(
  debt: DebtData,
  paymentDate: Date,
  eventDate: Date,
  daysPastDue: number,
): NotificationItem {
  const dueText =
    daysPastDue === 1
      ? "yesterday"
      : `${daysPastDue} days ago`;

  return {
    id: createNotificationId(
      "debt",
      debt.id,
      `payment-past-due-${formatDateKey(
        paymentDate,
      )}`,
    ),
    category: "debt",
    priority: "critical",
    title: `${debt.name} payment is past due`,
    message: `${buildPaymentAmountText(
      debt,
    )} was due ${dueText}.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Review payment",
    href: createDebtHref(debt.id),
  };
}

function createPaymentDueTodayNotification(
  debt: DebtData,
  paymentDate: Date,
  eventDate: Date,
): NotificationItem {
  return {
    id: createNotificationId(
      "debt",
      debt.id,
      `payment-due-${formatDateKey(
        paymentDate,
      )}`,
    ),
    category: "debt",
    priority: "high",
    title: `${debt.name} payment is due today`,
    message: `${buildPaymentAmountText(
      debt,
    )} is due today.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "View payment",
    href: createDebtHref(debt.id),
  };
}

function createPaymentDueSoonNotification(
  debt: DebtData,
  paymentDate: Date,
  eventDate: Date,
  daysUntilPayment: number,
): NotificationItem {
  const dueText =
    daysUntilPayment === 1
      ? "tomorrow"
      : `in ${daysUntilPayment} days`;

  return {
    id: createNotificationId(
      "debt",
      debt.id,
      `payment-due-${formatDateKey(
        paymentDate,
      )}`,
    ),
    category: "debt",
    priority: "medium",
    title: `${debt.name} payment is due soon`,
    message: `${buildPaymentAmountText(
      debt,
    )} is due ${dueText}.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "View payment",
    href: createDebtHref(debt.id),
  };
}

function createDebtMilestoneNotification(
  debt: DebtData,
  currentBalance: number,
  eventDate: Date,
): NotificationItem | null {
  const originalBalance =
    normalizeMoney(
      debt.originalBalance,
    );

  if (originalBalance <= 0) {
    return null;
  }

  const currentPaidAmount =
    Math.max(
      0,
      originalBalance -
        currentBalance,
    );

  const currentPaidPercentage =
    calculateCompletionPercentage(
      currentPaidAmount,
      originalBalance,
    );

  const previousPaidPercentage =
    resolvePreviousPaidPercentage(
      debt,
      originalBalance,
    );

  const reachedMilestones =
    DEBT_MILESTONES.filter(
      (milestone) =>
        currentPaidPercentage >=
          milestone &&
        previousPaidPercentage <
          milestone,
    );

  if (
    reachedMilestones.length === 0
  ) {
    return null;
  }

  const milestone =
    reachedMilestones[
      reachedMilestones.length - 1
    ];

  return {
    id: createNotificationId(
      "debt",
      debt.id,
      `payoff-milestone-${milestone}`,
    ),
    category: "debt",
    priority:
      getMilestonePriority(
        milestone,
      ),
    title: `${debt.name} is ${milestone}% paid off`,
    message: `${formatCurrency(
      currentPaidAmount,
    )} of the original ${formatCurrency(
      originalBalance,
    )} balance has been paid.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel:
      "View payoff progress",
    href: createDebtHref(debt.id),
  };
}

function buildMissedPaymentMessage(
  debt: DebtData,
): string {
  const minimumPayment =
    normalizeMoney(
      debt.minimumPayment,
    );

  if (minimumPayment > 0) {
    return `${formatCurrency(
      minimumPayment,
    )} requires immediate attention.`;
  }

  return "The missed payment requires immediate attention.";
}

function buildPaymentAmountText(
  debt: DebtData,
): string {
  const minimumPayment =
    normalizeMoney(
      debt.minimumPayment,
    );

  if (minimumPayment > 0) {
    return formatCurrency(
      minimumPayment,
    );
  }

  return "The minimum payment";
}

function resolvePreviousPaidPercentage(
  debt: DebtData,
  originalBalance: number,
): number {
  if (
    debt.previousBalance === undefined ||
    debt.previousBalance === null
  ) {
    return 0;
  }

  const previousBalance =
    Math.max(
      0,
      normalizeMoney(
        debt.previousBalance,
      ),
    );

  const previousPaidAmount =
    Math.max(
      0,
      originalBalance -
        previousBalance,
    );

  return calculateCompletionPercentage(
    previousPaidAmount,
    originalBalance,
  );
}

function isDebtPaidOff(
  debt: DebtData,
  balance: number,
): boolean {
  return (
    balance <= 0 ||
    debt.paymentStatus === "paid"
  );
}

function getMilestonePriority(
  milestone: number,
): NotificationPriority {
  if (milestone >= 75) {
    return "medium";
  }

  return "low";
}

function resolveDebtEventDate(
  debt: DebtData,
  fallbackDate: Date,
): Date {
  return resolveEntityTimestamp(
    debt,
    fallbackDate,
  );
}

function createDebtHref(
  debtId: string,
): string {
  return `/dashboard/debts?debtId=${encodeURIComponent(
    debtId,
  )}`;
}