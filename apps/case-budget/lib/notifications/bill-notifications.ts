import type {
  BillData,
  BillNotificationReminderTiming,
  NotificationItem,
  NotificationPriority,
} from "./generate-notifications";

import {
  createNotificationId,
  differenceInCalendarDays,
  formatCurrency,
  formatDateKey,
  normalizeCalendarDate,
  parseDate,
  resolveEntityTimestamp,
  sortAndDeduplicateNotifications,
} from "./notification-utils";

export function generateBillNotifications(
  bills: BillData[],
  asOfDate: Date,
): NotificationItem[] {
  const normalizedAsOfDate =
    normalizeCalendarDate(asOfDate);

  const notifications: NotificationItem[] =
    [];

  for (const bill of bills) {
    if (bill.status === "cancelled") {
      continue;
    }

    const dueDate = parseDate(
      bill.dueDate,
    );

    if (!dueDate) {
      continue;
    }

    const eventDate =
      resolveEntityTimestamp(
        bill,
        normalizedAsOfDate,
      );

    if (isBillPaid(bill)) {
      notifications.push(
        createPaidBillNotification(
          bill,
          eventDate,
        ),
      );

      continue;
    }

    const daysUntilDue =
      differenceInCalendarDays(
        dueDate,
        normalizedAsOfDate,
      );

    if (daysUntilDue < 0) {
      notifications.push(
        createPastDueBillNotification(
          bill,
          dueDate,
          eventDate,
          Math.abs(daysUntilDue),
        ),
      );

      continue;
    }

    if (daysUntilDue === 0) {
      notifications.push(
        createDueTodayBillNotification(
          bill,
          dueDate,
          eventDate,
        ),
      );

      continue;
    }

    if (
      bill.reminder?.enabled === false
    ) {
      continue;
    }

    const reminderDays =
      getBillReminderDays(
        bill.reminder?.timing,
      );

    if (
      daysUntilDue > reminderDays
    ) {
      continue;
    }

    notifications.push(
      createUpcomingBillNotification(
        bill,
        dueDate,
        eventDate,
        daysUntilDue,
      ),
    );
  }

  return sortAndDeduplicateNotifications(
    notifications,
  );
}

function createPaidBillNotification(
  bill: BillData,
  eventDate: Date,
): NotificationItem {
  const paidDate =
    parseDate(bill.paidAt) ??
    eventDate;

  return {
    id: createNotificationId(
      "bill",
      bill.id,
      "paid",
    ),
    category: "bill",
    priority: "low",
    title: `${bill.name} was paid`,
    message: buildPaidBillMessage(
      bill,
      paidDate,
    ),
    createdAt:
      paidDate.toISOString(),
    read: false,
    actionLabel: "View bill",
    href: createBillHref(bill.id),
  };
}

function createPastDueBillNotification(
  bill: BillData,
  dueDate: Date,
  eventDate: Date,
  daysPastDue: number,
): NotificationItem {
  return {
    id: createNotificationId(
      "bill",
      bill.id,
      `past-due-${formatDateKey(
        dueDate,
      )}`,
    ),
    category: "bill",
    priority: "critical",
    title: `${bill.name} is past due`,
    message:
      buildPastDueBillMessage(
        bill,
        daysPastDue,
      ),
    createdAt:
      eventDate.toISOString(),
    read: false,
    actionLabel: "View bill",
    href: createBillHref(bill.id),
  };
}

function createDueTodayBillNotification(
  bill: BillData,
  dueDate: Date,
  eventDate: Date,
): NotificationItem {
  return {
    id: createNotificationId(
      "bill",
      bill.id,
      `due-today-${formatDateKey(
        dueDate,
      )}`,
    ),
    category: "bill",
    priority: "high",
    title: `${bill.name} is due today`,
    message:
      buildDueTodayBillMessage(
        bill,
      ),
    createdAt:
      eventDate.toISOString(),
    read: false,
    actionLabel:
      bill.paymentMethod ===
      "autopay"
        ? "View autopay"
        : "Open bill",
    href: createBillHref(bill.id),
  };
}

function createUpcomingBillNotification(
  bill: BillData,
  dueDate: Date,
  eventDate: Date,
  daysUntilDue: number,
): NotificationItem {
  const isAutopay =
    bill.paymentMethod ===
    "autopay";

  return {
    id: createNotificationId(
      "bill",
      bill.id,
      `${
        isAutopay
          ? "autopay"
          : "upcoming"
      }-${formatDateKey(dueDate)}`,
    ),
    category: "bill",
    priority:
      getUpcomingBillPriority(
        daysUntilDue,
      ),
    title: isAutopay
      ? `${bill.name} autopay is scheduled`
      : `${bill.name} is due soon`,
    message:
      buildUpcomingBillMessage(
        bill,
        daysUntilDue,
        isAutopay,
      ),
    createdAt:
      eventDate.toISOString(),
    read: false,
    actionLabel: isAutopay
      ? "View autopay"
      : "View bill",
    href: createBillHref(bill.id),
  };
}

function buildPaidBillMessage(
  bill: BillData,
  paidDate: Date,
): string {
  const amount = formatCurrency(
    bill.amount,
  );

  if (bill.paidAt) {
    return `${amount} was recorded as paid on ${formatDisplayDate(
      paidDate,
    )}.`;
  }

  return `${amount} was recorded as paid.`;
}

function buildPastDueBillMessage(
  bill: BillData,
  daysPastDue: number,
): string {
  const amount = formatCurrency(
    bill.amount,
  );

  if (daysPastDue === 1) {
    return `${amount} was due yesterday.`;
  }

  return `${amount} was due ${daysPastDue} days ago.`;
}

function buildDueTodayBillMessage(
  bill: BillData,
): string {
  const amount = formatCurrency(
    bill.amount,
  );

  if (
    bill.paymentMethod === "autopay"
  ) {
    return `${amount} is due today and is scheduled for automatic payment.`;
  }

  return `${amount} is due today.`;
}

function buildUpcomingBillMessage(
  bill: BillData,
  daysUntilDue: number,
  isAutopay: boolean,
): string {
  const amount = formatCurrency(
    bill.amount,
  );

  const dueText =
    daysUntilDue === 1
      ? "tomorrow"
      : `in ${daysUntilDue} days`;

  if (isAutopay) {
    return `${amount} is scheduled for automatic payment ${dueText}.`;
  }

  return `${amount} is due ${dueText}.`;
}

function isBillPaid(
  bill: BillData,
): boolean {
  return (
    bill.status === "paid" ||
    Boolean(bill.paidAt)
  );
}

function getUpcomingBillPriority(
  daysUntilDue: number,
): NotificationPriority {
  if (daysUntilDue <= 1) {
    return "high";
  }

  if (daysUntilDue <= 3) {
    return "medium";
  }

  return "low";
}

function getBillReminderDays(
  timing:
    | BillNotificationReminderTiming
    | undefined,
): number {
  switch (timing) {
    case "same-day":
      return 0;

    case "1-day":
      return 1;

    case "3-days":
      return 3;

    case "5-days":
      return 5;

    case "14-days":
      return 14;

    case "7-days":
    default:
      return 7;
  }
}

function createBillHref(
  billId: string,
): string {
  return `/dashboard/bills?billId=${encodeURIComponent(
    billId,
  )}`;
}

function formatDisplayDate(
  date: Date,
): string {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
}