import { generateAccountNotifications } from "./account-notifications";
import { generateBillNotifications } from "./bill-notifications";
import { generateBudgetNotifications } from "./budget-notifications";
import { generateDebtNotifications } from "./debt-notifications";
import { generateSavingsNotifications } from "./savings-notifications";
import { generateTransactionNotifications } from "./transaction-notifications";

import {
  normalizeCalendarDate,
  parseDate,
  sortAndDeduplicateNotifications,
} from "./notification-utils";

export type NotificationCategory =
  | "bill"
  | "budget"
  | "transaction"
  | "savings"
  | "debt"
  | "account";

export type NotificationPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionLabel?: string;
  href?: string;
};

export type BillNotificationStatus =
  | "upcoming"
  | "due-soon"
  | "due-today"
  | "past-due"
  | "paid"
  | "cancelled";

export type BillNotificationPaymentMethod =
  | "autopay"
  | "manual"
  | "unknown";

export type BillNotificationReminderTiming =
  | "same-day"
  | "1-day"
  | "3-days"
  | "5-days"
  | "7-days"
  | "14-days";

export type BillData = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status?: BillNotificationStatus;
  payee?: string;
  paymentMethod?: BillNotificationPaymentMethod;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  reminder?: {
    enabled?: boolean;
    timing?: BillNotificationReminderTiming;
  } | null;
};

export type BudgetCategoryData = {
  id: string;
  name: string;
  budgetedAmount: number;
  spentAmount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BudgetData = {
  id?: string;
  month?: string;
  income?: number;
  assignedAmount?: number;
  unassignedAmount?: number;
  categories?: BudgetCategoryData[];
  createdAt?: string;
  updatedAt?: string;
};

export type TransactionStatus =
  | "pending"
  | "cleared"
  | "posted"
  | "deleted"
  | "voided"
  | "cancelled";

export type TransactionType =
  | "expense"
  | "income"
  | "debit"
  | "credit"
  | "deposit"
  | "transfer"
  | string;

export type TransactionData = {
  id: string;
  amount: number;

  merchant?: string;
  merchantName?: string;
  payee?: string;
  description?: string;

  date?: string;
  transactionDate?: string;
  postedAt?: string | null;
  clearedAt?: string | null;

  categoryId?: string | null;
  categoryName?: string | null;
  budgetItemId?: string | null;

  accountId?: string | null;

  status?: TransactionStatus | string;
  previousStatus?:
    | TransactionStatus
    | string
    | null;
  type?: TransactionType;

  duplicateOfTransactionId?: string | null;
  isDuplicate?: boolean;
  isIncome?: boolean;
  isTransfer?: boolean;
  wasPending?: boolean;

  createdAt?: string;
  updatedAt?: string;
};

export type SavingsGoalStatus =
  | "active"
  | "completed"
  | "funded"
  | "paused"
  | "cancelled"
  | "deleted"
  | "archived";

export type SavingsGoalData = {
  id: string;
  name: string;
  targetAmount: number;

  currentAmount?: number;
  savedAmount?: number;

  previousAmount?: number | null;
  previousProgressPercentage?:
    | number
    | null;

  startDate?: string | null;
  targetDate?: string | null;
  deadline?: string | null;
  completedAt?: string | null;

  status?: SavingsGoalStatus | string;

  contributionRecorded?: boolean;
  contributionAmount?: number | null;
  contributionRecordedAt?: string | null;

  lastContributionAmount?: number | null;
  lastContributionAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export type DebtPaymentStatus =
  | "upcoming"
  | "due"
  | "missed"
  | "paid";

export type DebtData = {
  id: string;
  name: string;
  balance: number;
  originalBalance?: number;
  previousBalance?: number | null;
  minimumPayment?: number;
  nextPaymentDate?: string | null;
  paymentStatus?: DebtPaymentStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type AccountConnectionStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "syncing";

export type AccountSyncStatus =
  | "success"
  | "failed"
  | "pending"
  | "syncing";

export type ConnectedAccountData = {
  id: string;
  name: string;
  institutionName?: string;

  connectionStatus?: AccountConnectionStatus;
  previousConnectionStatus?:
    | AccountConnectionStatus
    | null;

  syncStatus?: AccountSyncStatus;
  previousSyncStatus?:
    | AccountSyncStatus
    | null;

  lastSyncedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type NotificationGenerationInput = {
  bills?: BillData[];
  budget?: BudgetData | null;
  transactions?: TransactionData[];
  savingsGoals?: SavingsGoalData[];
  debts?: DebtData[];
  accounts?: ConnectedAccountData[];

  /**
   * Date used for due-date and schedule calculations.
   *
   * Pass an ISO date or datetime to keep notification generation deterministic.
   * When omitted, the engine derives a stable date from the newest timestamp
   * found in the supplied input.
   */
  asOf?: string;

  /**
   * Transactions at or above this amount are treated as large purchases.
   */
  largePurchaseThreshold?: number;

  /**
   * Existing notification IDs that should be returned as read.
   */
  readNotificationIds?: string[];
};

const DEFAULT_LARGE_PURCHASE_THRESHOLD =
  500;

export function generateNotifications(
  input: NotificationGenerationInput,
): NotificationItem[] {
  const asOfDate =
    resolveAsOfDate(input);

  const readNotificationIds =
    new Set(
      input.readNotificationIds ?? [],
    );

  const notifications:
    NotificationItem[] = [
    ...generateBillNotifications(
      input.bills ?? [],
      asOfDate,
    ),
    ...generateBudgetNotifications(
      input.budget ?? null,
      asOfDate,
    ),
    ...generateTransactionNotifications(
      input.transactions ?? [],
      asOfDate,
      input.largePurchaseThreshold ??
        DEFAULT_LARGE_PURCHASE_THRESHOLD,
    ),
    ...generateSavingsNotifications(
      input.savingsGoals ?? [],
      asOfDate,
    ),
    ...generateDebtNotifications(
      input.debts ?? [],
      asOfDate,
    ),
    ...generateAccountNotifications(
      input.accounts ?? [],
      asOfDate,
    ),
  ];

  return sortAndDeduplicateNotifications(
    notifications,
  ).map((notification) => ({
    ...notification,
    read:
      notification.read ||
      readNotificationIds.has(
        notification.id,
      ),
  }));
}

function resolveAsOfDate(
  input: NotificationGenerationInput,
): Date {
  const explicitAsOfDate =
    parseDate(input.asOf);

  if (explicitAsOfDate) {
    return normalizeCalendarDate(
      explicitAsOfDate,
    );
  }

  const candidateDates: Date[] = [];

  collectEntityDates(
    input.bills,
    candidateDates,
    [
      "dueDate",
      "paidAt",
      "createdAt",
      "updatedAt",
    ],
  );

  collectEntityDates(
    input.transactions,
    candidateDates,
    [
      "date",
      "transactionDate",
      "postedAt",
      "clearedAt",
      "createdAt",
      "updatedAt",
    ],
  );

  collectEntityDates(
    input.savingsGoals,
    candidateDates,
    [
      "startDate",
      "targetDate",
      "deadline",
      "completedAt",
      "lastContributionAt",
      "contributionRecordedAt",
      "createdAt",
      "updatedAt",
    ],
  );

  collectEntityDates(
    input.debts,
    candidateDates,
    [
      "nextPaymentDate",
      "createdAt",
      "updatedAt",
    ],
  );

  collectEntityDates(
    input.accounts,
    candidateDates,
    [
      "lastSyncedAt",
      "createdAt",
      "updatedAt",
    ],
  );

  if (input.budget) {
    collectEntityDates(
      [input.budget],
      candidateDates,
      [
        "month",
        "createdAt",
        "updatedAt",
      ],
    );

    collectEntityDates(
      input.budget.categories,
      candidateDates,
      [
        "createdAt",
        "updatedAt",
      ],
    );
  }

  if (
    candidateDates.length === 0
  ) {
    return new Date(
      "1970-01-01T00:00:00.000Z",
    );
  }

  const newestTimestamp =
    Math.max(
      ...candidateDates.map(
        (date) =>
          date.getTime(),
      ),
    );

  return normalizeCalendarDate(
    new Date(newestTimestamp),
  );
}

function collectEntityDates<
  T extends object,
>(
  entities: T[] | undefined,
  dates: Date[],
  fields: Array<keyof T>,
): void {
  for (const entity of
    entities ?? []) {
    for (const field of fields) {
      const value = entity[field];

      if (
        typeof value !== "string"
      ) {
        continue;
      }

      const parsedDate =
        parseDate(value);

      if (parsedDate) {
        dates.push(parsedDate);
      }
    }
  }
}