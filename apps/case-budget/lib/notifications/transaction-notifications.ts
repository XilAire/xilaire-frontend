import type {
  NotificationItem,
  TransactionData,
} from "./generate-notifications";

import {
  createNotificationId,
  differenceInCalendarDays,
  formatCurrency,
  normalizeCalendarDate,
  normalizeMoney,
  parseDate,
  sanitizeIdPart,
  sortAndDeduplicateNotifications,
} from "./notification-utils";

const DEFAULT_LARGE_PURCHASE_THRESHOLD =
  500;

const DUPLICATE_TRANSACTION_WINDOW_DAYS =
  3;

export function generateTransactionNotifications(
  transactions: TransactionData[],
  asOfDate: Date,
  largePurchaseThreshold: number =
    DEFAULT_LARGE_PURCHASE_THRESHOLD,
): NotificationItem[] {
  const normalizedAsOfDate =
    normalizeCalendarDate(asOfDate);

  const normalizedThreshold =
    normalizeLargePurchaseThreshold(
      largePurchaseThreshold,
    );

  const notifications: NotificationItem[] =
    [];

  const activeTransactions =
    transactions.filter(
      (transaction) =>
        !isDeletedTransaction(
          transaction,
        ),
    );

  for (const transaction of
    activeTransactions) {
    const eventDate =
      resolveTransactionEventDate(
        transaction,
        normalizedAsOfDate,
      );

    if (
      isUncategorizedTransaction(
        transaction,
      )
    ) {
      notifications.push(
        createUncategorizedTransactionNotification(
          transaction,
          eventDate,
        ),
      );
    }

    if (
      isLargePurchase(
        transaction,
        normalizedThreshold,
      )
    ) {
      notifications.push(
        createLargePurchaseNotification(
          transaction,
          eventDate,
        ),
      );
    }

    if (
      isRecentlyClearedTransaction(
        transaction,
      )
    ) {
      notifications.push(
        createClearedTransactionNotification(
          transaction,
          eventDate,
        ),
      );
    }
  }

  const duplicateGroups =
    findPossibleDuplicateTransactions(
      activeTransactions,
    );

  for (const duplicateGroup of
    duplicateGroups) {
    notifications.push(
      createDuplicateTransactionNotification(
        duplicateGroup,
        normalizedAsOfDate,
      ),
    );
  }

  return sortAndDeduplicateNotifications(
    notifications,
  );
}

function createUncategorizedTransactionNotification(
  transaction: TransactionData,
  eventDate: Date,
): NotificationItem {
  const merchantName =
    getTransactionDisplayName(
      transaction,
    );

  return {
    id: createNotificationId(
      "transaction",
      transaction.id,
      "uncategorized",
    ),
    category: "transaction",
    priority: "medium",
    title:
      "A transaction needs a category",
    message: `${merchantName} for ${formatCurrency(
      getTransactionAbsoluteAmount(
        transaction,
      ),
    )} has not been assigned to a budget item.`,
    createdAt:
      eventDate.toISOString(),
    read: false,
    actionLabel:
      "Categorize transaction",
    href: createTransactionHref(
      transaction.id,
    ),
  };
}

function createLargePurchaseNotification(
  transaction: TransactionData,
  eventDate: Date,
): NotificationItem {
  const merchantName =
    getTransactionDisplayName(
      transaction,
    );

  return {
    id: createNotificationId(
      "transaction",
      transaction.id,
      "large-purchase",
    ),
    category: "transaction",
    priority: "high",
    title:
      "Large purchase detected",
    message: `${merchantName} posted a charge of ${formatCurrency(
      getTransactionAbsoluteAmount(
        transaction,
      ),
    )}. Review the transaction to confirm it is expected.`,
    createdAt:
      eventDate.toISOString(),
    read: false,
    actionLabel:
      "Review transaction",
    href: createTransactionHref(
      transaction.id,
    ),
  };
}

function createClearedTransactionNotification(
  transaction: TransactionData,
  eventDate: Date,
): NotificationItem {
  const merchantName =
    getTransactionDisplayName(
      transaction,
    );

  return {
    id: createNotificationId(
      "transaction",
      transaction.id,
      "cleared",
    ),
    category: "transaction",
    priority: "low",
    title:
      "A pending transaction has cleared",
    message: `${merchantName} for ${formatCurrency(
      getTransactionAbsoluteAmount(
        transaction,
      ),
    )} has cleared your account.`,
    createdAt:
      eventDate.toISOString(),
    read: false,
    actionLabel:
      "View transaction",
    href: createTransactionHref(
      transaction.id,
    ),
  };
}

function createDuplicateTransactionNotification(
  transactions: TransactionData[],
  fallbackDate: Date,
): NotificationItem {
  const sortedTransactions =
    [...transactions].sort(
      compareTransactionsByDate,
    );

  const primaryTransaction =
    sortedTransactions[0];

  const merchantName =
    getTransactionDisplayName(
      primaryTransaction,
    );

  const eventDate =
    sortedTransactions.reduce(
      (
        latestDate,
        transaction,
      ) => {
        const transactionDate =
          resolveTransactionEventDate(
            transaction,
            fallbackDate,
          );

        return transactionDate.getTime() >
          latestDate.getTime()
          ? transactionDate
          : latestDate;
      },
      fallbackDate,
    );

  const transactionIds =
    sortedTransactions
      .map(
        (transaction) =>
          sanitizeIdPart(
            transaction.id,
          ),
      )
      .sort();

  return {
    id: [
      "notification",
      "transaction",
      "possible-duplicate",
      ...transactionIds,
    ].join(":"),
    category: "transaction",
    priority: "high",
    title:
      "Possible duplicate transactions",
    message: `${sortedTransactions.length} transactions from ${merchantName} for ${formatCurrency(
      getTransactionAbsoluteAmount(
        primaryTransaction,
      ),
    )} may be duplicates.`,
    createdAt:
      eventDate.toISOString(),
    read: false,
    actionLabel:
      "Review transactions",
    href: createTransactionsHref(
      sortedTransactions.map(
        (transaction) =>
          transaction.id,
      ),
    ),
  };
}

function isUncategorizedTransaction(
  transaction: TransactionData,
): boolean {
  if (
    isIncomeTransaction(
      transaction,
    )
  ) {
    return false;
  }

  const categoryId =
    transaction.categoryId?.trim();

  const categoryName =
    transaction.categoryName?.trim();

  const budgetItemId =
    transaction.budgetItemId?.trim();

  return (
    !categoryId &&
    !categoryName &&
    !budgetItemId
  );
}

function isLargePurchase(
  transaction: TransactionData,
  threshold: number,
): boolean {
  if (
    threshold <= 0 ||
    isIncomeTransaction(
      transaction,
    )
  ) {
    return false;
  }

  return (
    getTransactionAbsoluteAmount(
      transaction,
    ) >= threshold
  );
}

function isRecentlyClearedTransaction(
  transaction: TransactionData,
): boolean {
  const status =
    normalizeTransactionStatus(
      transaction.status,
    );

  if (
    status !== "cleared" &&
    status !== "posted"
  ) {
    return false;
  }

  if (
    transaction.wasPending === true
  ) {
    return true;
  }

  const previousStatus =
    normalizeTransactionStatus(
      transaction.previousStatus,
    );

  return previousStatus ===
    "pending";
}

function findPossibleDuplicateTransactions(
  transactions: TransactionData[],
): TransactionData[][] {
  const candidateTransactions =
    transactions.filter(
      (transaction) =>
        isDuplicateCandidate(
          transaction,
        ),
    );

  const groupedTransactions =
    new Map<
      string,
      TransactionData[]
    >();

  for (const transaction of
    candidateTransactions) {
    const merchantKey =
      normalizeMerchantKey(
        transaction,
      );

    const amountKey =
      normalizeMoney(
        getTransactionAbsoluteAmount(
          transaction,
        ),
      ).toFixed(2);

    const accountKey =
      transaction.accountId
        ?.trim()
        .toLowerCase() ||
      "unknown-account";

    const transactionTypeKey =
      normalizeTransactionType(
        transaction.type,
      );

    const groupKey = [
      merchantKey,
      amountKey,
      accountKey,
      transactionTypeKey,
    ].join("|");

    const existingGroup =
      groupedTransactions.get(
        groupKey,
      ) ?? [];

    existingGroup.push(
      transaction,
    );

    groupedTransactions.set(
      groupKey,
      existingGroup,
    );
  }

  const duplicateGroups:
    TransactionData[][] = [];

  for (const group of
    groupedTransactions.values()) {
    if (group.length < 2) {
      continue;
    }

    const sortedGroup =
      [...group].sort(
        compareTransactionsByDate,
      );

    const clusters:
      TransactionData[][] = [];

    let currentCluster:
      TransactionData[] = [];

    for (const transaction of
      sortedGroup) {
      if (
        currentCluster.length === 0
      ) {
        currentCluster = [
          transaction,
        ];

        continue;
      }

      const previousTransaction =
        currentCluster[
          currentCluster.length - 1
        ];

      const previousDate =
        getTransactionDate(
          previousTransaction,
        );

      const currentDate =
        getTransactionDate(
          transaction,
        );

      if (
        !previousDate ||
        !currentDate
      ) {
        currentCluster.push(
          transaction,
        );

        continue;
      }

      const dayDifference =
        Math.abs(
          differenceInCalendarDays(
            currentDate,
            previousDate,
          ),
        );

      if (
        dayDifference <=
        DUPLICATE_TRANSACTION_WINDOW_DAYS
      ) {
        currentCluster.push(
          transaction,
        );

        continue;
      }

      if (
        currentCluster.length >= 2
      ) {
        clusters.push(
          currentCluster,
        );
      }

      currentCluster = [
        transaction,
      ];
    }

    if (
      currentCluster.length >= 2
    ) {
      clusters.push(
        currentCluster,
      );
    }

    duplicateGroups.push(
      ...clusters,
    );
  }

  return duplicateGroups;
}

function isDuplicateCandidate(
  transaction: TransactionData,
): boolean {
  if (
    isIncomeTransaction(
      transaction,
    )
  ) {
    return false;
  }

  if (
    transaction.isTransfer === true
  ) {
    return false;
  }

  if (
    transaction.isDuplicate === false
  ) {
    return false;
  }

  const amount =
    getTransactionAbsoluteAmount(
      transaction,
    );

  const merchantKey =
    normalizeMerchantKey(
      transaction,
    );

  return (
    amount > 0 &&
    merchantKey !==
      "unknown-merchant"
  );
}

function isDeletedTransaction(
  transaction: TransactionData,
): boolean {
  const status =
    normalizeTransactionStatus(
      transaction.status,
    );

  return (
    status === "deleted" ||
    status === "voided" ||
    status === "cancelled"
  );
}

function isIncomeTransaction(
  transaction: TransactionData,
): boolean {
  const normalizedType =
    normalizeTransactionType(
      transaction.type,
    );

  if (
    normalizedType === "income" ||
    normalizedType === "credit" ||
    normalizedType === "deposit"
  ) {
    return true;
  }

  return (
    transaction.isIncome === true
  );
}

function getTransactionAbsoluteAmount(
  transaction: TransactionData,
): number {
  return Math.abs(
    normalizeMoney(
      transaction.amount,
    ),
  );
}

function getTransactionDisplayName(
  transaction: TransactionData,
): string {
  return (
    transaction.merchantName?.trim() ||
    transaction.payee?.trim() ||
    transaction.description?.trim() ||
    "This transaction"
  );
}

function normalizeMerchantKey(
  transaction: TransactionData,
): string {
  const displayName =
    getTransactionDisplayName(
      transaction,
    );

  const normalizedName =
    displayName
      .toLowerCase()
      .replace(
        /\b(?:pending|purchase|payment|debit|credit|card)\b/g,
        " ",
      )
      .replace(
        /[^a-z0-9]+/g,
        " ",
      )
      .trim()
      .replace(/\s+/g, "-");

  return normalizedName ||
    "unknown-merchant";
}

function normalizeTransactionStatus(
  status:
    | string
    | null
    | undefined,
): string {
  return (
    status
      ?.trim()
      .toLowerCase() ?? ""
  );
}

function normalizeTransactionType(
  type:
    | string
    | null
    | undefined,
): string {
  return (
    type
      ?.trim()
      .toLowerCase() ||
    "expense"
  );
}

function resolveTransactionEventDate(
  transaction: TransactionData,
  fallbackDate: Date,
): Date {
  return (
    parseDate(
      transaction.clearedAt,
    ) ??
    parseDate(
      transaction.postedAt,
    ) ??
    parseDate(
      transaction.updatedAt,
    ) ??
    parseDate(
      transaction.transactionDate,
    ) ??
    parseDate(transaction.date) ??
    parseDate(
      transaction.createdAt,
    ) ??
    fallbackDate
  );
}

function getTransactionDate(
  transaction: TransactionData,
): Date | null {
  return (
    parseDate(
      transaction.transactionDate,
    ) ??
    parseDate(transaction.date) ??
    parseDate(
      transaction.postedAt,
    ) ??
    parseDate(
      transaction.createdAt,
    )
  );
}

function compareTransactionsByDate(
  firstTransaction: TransactionData,
  secondTransaction: TransactionData,
): number {
  const firstTimestamp =
    getTransactionDate(
      firstTransaction,
    )?.getTime() ?? 0;

  const secondTimestamp =
    getTransactionDate(
      secondTransaction,
    )?.getTime() ?? 0;

  if (
    firstTimestamp !==
    secondTimestamp
  ) {
    return (
      firstTimestamp -
      secondTimestamp
    );
  }

  return firstTransaction.id.localeCompare(
    secondTransaction.id,
  );
}

function createTransactionHref(
  transactionId: string,
): string {
  return `/dashboard/transactions?transactionId=${encodeURIComponent(
    transactionId,
  )}`;
}

function createTransactionsHref(
  transactionIds: string[],
): string {
  const uniqueIds =
    Array.from(
      new Set(
        transactionIds.filter(
          Boolean,
        ),
      ),
    );

  const searchParams =
    new URLSearchParams();

  for (const transactionId of
    uniqueIds) {
    searchParams.append(
      "transactionId",
      transactionId,
    );
  }

  const queryString =
    searchParams.toString();

  return queryString
    ? `/dashboard/transactions?${queryString}`
    : "/dashboard/transactions";
}

function normalizeLargePurchaseThreshold(
  threshold: number,
): number {
  const normalizedThreshold =
    normalizeMoney(threshold);

  if (
    normalizedThreshold <= 0
  ) {
    return DEFAULT_LARGE_PURCHASE_THRESHOLD;
  }

  return normalizedThreshold;
}