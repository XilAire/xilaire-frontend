import type {
  BillData,
} from "@/types/bill";

export type BillReminderSeverity =
  | "info"
  | "warning"
  | "urgent"
  | "overdue";

export type BillReminderType =
  | "upcoming"
  | "due-today"
  | "past-due";

export type BillReminder = {
  id: string;
  billId: string;
  bill: BillData;
  type: BillReminderType;
  severity: BillReminderSeverity;
  title: string;
  message: string;
  amount: number;
  dueDate: string;
  reminderDate: string;
  daysUntilDue: number;
  isPastDue: boolean;
  isDueToday: boolean;
};

export type BillReminderSummary = {
  total: number;
  upcoming: number;
  dueToday: number;
  pastDue: number;
  totalAmount: number;
  upcomingAmount: number;
  dueTodayAmount: number;
  pastDueAmount: number;
};

export type GenerateBillRemindersOptions = {
  referenceDate?: Date | string;
  includeUpcoming?: boolean;
  includeDueToday?: boolean;
  includePastDue?: boolean;
  includeDisabledReminders?: boolean;
};

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

const DEFAULT_REMINDER_DAYS = 3;

export function generateBillReminders(
  bills: BillData[],
  options: GenerateBillRemindersOptions = {},
): BillReminder[] {
  const {
    referenceDate = new Date(),
    includeUpcoming = true,
    includeDueToday = true,
    includePastDue = true,
    includeDisabledReminders = false,
  } = options;

  const normalizedReferenceDate =
    normalizeDate(referenceDate);

  return bills
    .filter((bill) => {
      if (bill.status === "paid") {
        return false;
      }

      if (
        !includeDisabledReminders &&
        !bill.reminder.enabled
      ) {
        return false;
      }

      return true;
    })
    .map((bill) =>
      createBillReminder(
        bill,
        normalizedReferenceDate,
      ),
    )
    .filter(
      (
        reminder,
      ): reminder is BillReminder => {
        if (!reminder) {
          return false;
        }

        if (
          reminder.type ===
            "past-due" &&
          !includePastDue
        ) {
          return false;
        }

        if (
          reminder.type ===
            "due-today" &&
          !includeDueToday
        ) {
          return false;
        }

        if (
          reminder.type ===
            "upcoming" &&
          !includeUpcoming
        ) {
          return false;
        }

        return true;
      },
    )
    .sort(compareBillReminders);
}

export function createBillReminder(
  bill: BillData,
  referenceDate: Date | string = new Date(),
): BillReminder | null {
  if (bill.status === "paid") {
    return null;
  }

  const normalizedReferenceDate =
    normalizeDate(referenceDate);

  const dueDate = parseDateOnly(
    bill.dueDate,
  );

  if (!dueDate) {
    return null;
  }

  const daysUntilDue =
    differenceInCalendarDays(
      dueDate,
      normalizedReferenceDate,
    );

  const reminderDays =
    getBillReminderDays(bill);

  const shouldCreateReminder =
    daysUntilDue <= reminderDays;

  if (!shouldCreateReminder) {
    return null;
  }

  const reminderDate =
    addCalendarDays(
      dueDate,
      -reminderDays,
    );

  if (daysUntilDue < 0) {
    const overdueDays =
      Math.abs(daysUntilDue);

    return {
      id: createReminderId(
        bill.id,
        "past-due",
        bill.dueDate,
      ),
      billId: bill.id,
      bill,
      type: "past-due",
      severity: "overdue",
      title: `${bill.name} is past due`,
      message: buildPastDueMessage(
        bill,
        overdueDays,
      ),
      amount: bill.amount,
      dueDate: bill.dueDate,
      reminderDate:
        formatDateOnly(reminderDate),
      daysUntilDue,
      isPastDue: true,
      isDueToday: false,
    };
  }

  if (daysUntilDue === 0) {
    return {
      id: createReminderId(
        bill.id,
        "due-today",
        bill.dueDate,
      ),
      billId: bill.id,
      bill,
      type: "due-today",
      severity: "urgent",
      title: `${bill.name} is due today`,
      message: buildDueTodayMessage(
        bill,
      ),
      amount: bill.amount,
      dueDate: bill.dueDate,
      reminderDate:
        formatDateOnly(reminderDate),
      daysUntilDue,
      isPastDue: false,
      isDueToday: true,
    };
  }

  return {
    id: createReminderId(
      bill.id,
      "upcoming",
      bill.dueDate,
    ),
    billId: bill.id,
    bill,
    type: "upcoming",
    severity:
      daysUntilDue <= 1
        ? "warning"
        : "info",
    title: `${bill.name} is due soon`,
    message: buildUpcomingMessage(
      bill,
      daysUntilDue,
    ),
    amount: bill.amount,
    dueDate: bill.dueDate,
    reminderDate:
      formatDateOnly(reminderDate),
    daysUntilDue,
    isPastDue: false,
    isDueToday: false,
  };
}

export function getBillReminderSummary(
  reminders: BillReminder[],
): BillReminderSummary {
  return reminders.reduce<BillReminderSummary>(
    (summary, reminder) => {
      summary.total += 1;
      summary.totalAmount +=
        reminder.amount;

      switch (reminder.type) {
        case "past-due":
          summary.pastDue += 1;
          summary.pastDueAmount +=
            reminder.amount;
          break;

        case "due-today":
          summary.dueToday += 1;
          summary.dueTodayAmount +=
            reminder.amount;
          break;

        case "upcoming":
          summary.upcoming += 1;
          summary.upcomingAmount +=
            reminder.amount;
          break;
      }

      return summary;
    },
    {
      total: 0,
      upcoming: 0,
      dueToday: 0,
      pastDue: 0,
      totalAmount: 0,
      upcomingAmount: 0,
      dueTodayAmount: 0,
      pastDueAmount: 0,
    },
  );
}

export function getBillReminderDays(
  bill: BillData,
): number {
  if (!bill.reminder.enabled) {
    return 0;
  }

  switch (bill.reminder.timing) {
    case "same-day":
      return 0;

    case "1-day":
      return 1;

    case "3-days":
      return 3;

    case "5-days":
      return 5;

    case "7-days":
      return 7;

    case "14-days":
      return 14;

    default:
      return DEFAULT_REMINDER_DAYS;
  }
}

export function getBillReminderDate(
  bill: BillData,
): string | null {
  const dueDate = parseDateOnly(
    bill.dueDate,
  );

  if (!dueDate) {
    return null;
  }

  const reminderDate =
    addCalendarDays(
      dueDate,
      -getBillReminderDays(bill),
    );

  return formatDateOnly(
    reminderDate,
  );
}

export function isBillReminderDue(
  bill: BillData,
  referenceDate: Date | string = new Date(),
): boolean {
  if (
    bill.status === "paid" ||
    !bill.reminder.enabled
  ) {
    return false;
  }

  return (
    createBillReminder(
      bill,
      referenceDate,
    ) !== null
  );
}

export function getUpcomingBillReminders(
  bills: BillData[],
  referenceDate: Date | string = new Date(),
): BillReminder[] {
  return generateBillReminders(
    bills,
    {
      referenceDate,
      includeUpcoming: true,
      includeDueToday: false,
      includePastDue: false,
    },
  );
}

export function getDueTodayBillReminders(
  bills: BillData[],
  referenceDate: Date | string = new Date(),
): BillReminder[] {
  return generateBillReminders(
    bills,
    {
      referenceDate,
      includeUpcoming: false,
      includeDueToday: true,
      includePastDue: false,
    },
  );
}

export function getPastDueBillReminders(
  bills: BillData[],
  referenceDate: Date | string = new Date(),
): BillReminder[] {
  return generateBillReminders(
    bills,
    {
      referenceDate,
      includeUpcoming: false,
      includeDueToday: false,
      includePastDue: true,
    },
  );
}

export function getNextBillReminder(
  bills: BillData[],
  referenceDate: Date | string = new Date(),
): BillReminder | null {
  const reminders =
    generateBillReminders(
      bills,
      {
        referenceDate,
      },
    );

  return reminders[0] ?? null;
}

function buildPastDueMessage(
  bill: BillData,
  overdueDays: number,
): string {
  const dayLabel =
    overdueDays === 1
      ? "day"
      : "days";

  return `${formatCurrency(
    bill.amount,
  )} was due ${overdueDays} ${dayLabel} ago on ${formatDisplayDate(
    bill.dueDate,
  )}.`;
}

function buildDueTodayMessage(
  bill: BillData,
): string {
  return `${formatCurrency(
    bill.amount,
  )} is due today${
    bill.payee
      ? ` to ${bill.payee}`
      : ""
  }.`;
}

function buildUpcomingMessage(
  bill: BillData,
  daysUntilDue: number,
): string {
  const dayLabel =
    daysUntilDue === 1
      ? "day"
      : "days";

  return `${formatCurrency(
    bill.amount,
  )} is due in ${daysUntilDue} ${dayLabel} on ${formatDisplayDate(
    bill.dueDate,
  )}.`;
}

function compareBillReminders(
  first: BillReminder,
  second: BillReminder,
): number {
  const severityOrder: Record<
    BillReminderSeverity,
    number
  > = {
    overdue: 0,
    urgent: 1,
    warning: 2,
    info: 3,
  };

  const severityDifference =
    severityOrder[first.severity] -
    severityOrder[second.severity];

  if (severityDifference !== 0) {
    return severityDifference;
  }

  const dueDateDifference =
    first.daysUntilDue -
    second.daysUntilDue;

  if (dueDateDifference !== 0) {
    return dueDateDifference;
  }

  return first.title.localeCompare(
    second.title,
  );
}

function createReminderId(
  billId: string,
  type: BillReminderType,
  dueDate: string,
): string {
  return `${billId}:${type}:${dueDate}`;
}

function differenceInCalendarDays(
  laterDate: Date,
  earlierDate: Date,
): number {
  const laterUtc =
    Date.UTC(
      laterDate.getFullYear(),
      laterDate.getMonth(),
      laterDate.getDate(),
    );

  const earlierUtc =
    Date.UTC(
      earlierDate.getFullYear(),
      earlierDate.getMonth(),
      earlierDate.getDate(),
    );

  return Math.round(
    (laterUtc - earlierUtc) /
      MILLISECONDS_PER_DAY,
  );
}

function addCalendarDays(
  value: Date,
  days: number,
): Date {
  const result = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );

  result.setDate(
    result.getDate() + days,
  );

  return result;
}

function normalizeDate(
  value: Date | string,
): Date {
  if (value instanceof Date) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
    );
  }

  const parsedDate =
    parseDateOnly(value);

  if (parsedDate) {
    return parsedDate;
  }

  const fallbackDate =
    new Date(value);

  if (
    Number.isNaN(
      fallbackDate.getTime(),
    )
  ) {
    return normalizeDate(
      new Date(),
    );
  }

  return new Date(
    fallbackDate.getFullYear(),
    fallbackDate.getMonth(),
    fallbackDate.getDate(),
  );
}

function parseDateOnly(
  value: string,
): Date | null {
  const datePart =
    value.slice(0, 10);

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      datePart,
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    year,
    month - 1,
    day,
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateOnly(
  value: Date,
): string {
  const year =
    value.getFullYear();

  const month = String(
    value.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    value.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(
  value: string,
): string {
  const parsedDate =
    parseDateOnly(value);

  if (!parsedDate) {
    return value;
  }

  return parsedDate.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

function formatCurrency(
  value: number,
): string {
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