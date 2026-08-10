import type {
  BillData,
  BillStatus,
  BillSummary,
} from "@/types/bill";

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

export function getNormalizedDate(
  value: string | Date,
) {
  const date =
    typeof value === "string"
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

export function getLocalDateString(
  value: Date = new Date(),
) {
  const year = value.getFullYear();
  const month = String(
    value.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    value.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDaysUntilDue(
  dueDate: string,
  today: Date = new Date(),
) {
  const normalizedToday =
    getNormalizedDate(today);

  const normalizedDueDate =
    getNormalizedDate(dueDate);

  return Math.round(
    (normalizedDueDate.getTime() -
      normalizedToday.getTime()) /
      MILLISECONDS_PER_DAY,
  );
}

export function determineBillStatus(
  dueDate: string,
  currentStatus?: BillStatus,
  today: Date = new Date(),
): BillStatus {
  if (currentStatus === "paid") {
    return "paid";
  }

  const daysUntilDue =
    getDaysUntilDue(
      dueDate,
      today,
    );

  if (daysUntilDue < 0) {
    return "past-due";
  }

  if (daysUntilDue === 0) {
    return "due-today";
  }

  if (daysUntilDue <= 5) {
    return "due-soon";
  }

  return "upcoming";
}

export function refreshBillStatus(
  bill: BillData,
  today: Date = new Date(),
): BillData {
  const nextStatus =
    determineBillStatus(
      bill.dueDate,
      bill.status,
      today,
    );

  if (nextStatus === bill.status) {
    return bill;
  }

  return {
    ...bill,
    status: nextStatus,
    updatedAt:
      new Date().toISOString(),
  };
}

export function refreshBillStatuses(
  bills: BillData[],
  today: Date = new Date(),
) {
  return bills.map((bill) =>
    refreshBillStatus(
      bill,
      today,
    ),
  );
}

export function calculateBillSummary(
  bills: BillData[],
): BillSummary {
  return bills.reduce<BillSummary>(
    (summary, bill) => {
      summary.totalScheduled +=
        bill.amount;

      switch (bill.status) {
        case "paid":
          summary.totalPaid +=
            bill.amount;
          summary.paidCount += 1;
          break;

        case "past-due":
          summary.remainingAmount +=
            bill.amount;
          summary.pastDueCount += 1;
          break;

        case "due-today":
          summary.remainingAmount +=
            bill.amount;
          summary.dueTodayCount += 1;
          break;

        case "due-soon":
          summary.remainingAmount +=
            bill.amount;
          summary.dueSoonCount += 1;
          break;

        case "upcoming":
        default:
          summary.remainingAmount +=
            bill.amount;
          summary.upcomingCount += 1;
          break;
      }

      return summary;
    },
    {
      totalScheduled: 0,
      totalPaid: 0,
      remainingAmount: 0,
      upcomingCount: 0,
      dueSoonCount: 0,
      dueTodayCount: 0,
      pastDueCount: 0,
      paidCount: 0,
    },
  );
}

export function formatBillCurrency(
  amount: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(amount);
}

export function formatBillDate(
  value: string,
) {
  return getNormalizedDate(
    value,
  ).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

export function getNextDueDate(
  currentDueDate: string,
  frequency:
    BillData["frequency"],
) {
  const nextDate =
    getNormalizedDate(
      currentDueDate,
    );

  switch (frequency) {
    case "weekly":
      nextDate.setDate(
        nextDate.getDate() + 7,
      );
      break;

    case "biweekly":
      nextDate.setDate(
        nextDate.getDate() + 14,
      );
      break;

    case "monthly":
      nextDate.setMonth(
        nextDate.getMonth() + 1,
      );
      break;

    case "quarterly":
      nextDate.setMonth(
        nextDate.getMonth() + 3,
      );
      break;

    case "semiannual":
      nextDate.setMonth(
        nextDate.getMonth() + 6,
      );
      break;

    case "annual":
      nextDate.setFullYear(
        nextDate.getFullYear() + 1,
      );
      break;

    case "one-time":
    default:
      return null;
  }

  return getLocalDateString(
    nextDate,
  );
}