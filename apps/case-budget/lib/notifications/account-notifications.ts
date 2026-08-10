import type {
  AccountConnectionStatus,
  AccountSyncStatus,
  ConnectedAccountData,
  NotificationItem,
  NotificationPriority,
} from "./generate-notifications";

import {
  createNotificationId,
  differenceInCalendarDays,
  formatDateKey,
  formatDateTimeKey,
  normalizeCalendarDate,
  parseDate,
  resolveEntityTimestamp,
  sortAndDeduplicateNotifications,
} from "./notification-utils";

const ACCOUNT_STALE_AFTER_DAYS = 3;

const ACCOUNT_CRITICAL_STALE_AFTER_DAYS =
  7;

export function generateAccountNotifications(
  accounts: ConnectedAccountData[],
  asOfDate: Date,
): NotificationItem[] {
  const normalizedAsOfDate =
    normalizeCalendarDate(asOfDate);

  const notifications: NotificationItem[] =
    [];

  for (const account of accounts) {
    const eventDate =
      resolveAccountEventDate(
        account,
        normalizedAsOfDate,
      );

    const connectionNotification =
      createConnectionNotification(
        account,
        eventDate,
      );

    if (connectionNotification) {
      notifications.push(
        connectionNotification,
      );
    }

    const syncNotification =
      createSyncNotification(
        account,
        eventDate,
      );

    if (syncNotification) {
      notifications.push(
        syncNotification,
      );
    }

    const staleNotification =
      createStaleAccountNotification(
        account,
        normalizedAsOfDate,
        eventDate,
      );

    if (staleNotification) {
      notifications.push(
        staleNotification,
      );
    }
  }

  return sortAndDeduplicateNotifications(
    notifications,
  );
}

function createConnectionNotification(
  account: ConnectedAccountData,
  eventDate: Date,
): NotificationItem | null {
  const currentStatus =
    normalizeConnectionStatus(
      account.connectionStatus,
    );

  const previousStatus =
    normalizeConnectionStatus(
      account.previousConnectionStatus,
    );

  if (
    currentStatus === "connected" &&
    previousStatus &&
    previousStatus !== "connected"
  ) {
    return createAccountConnectedNotification(
      account,
      eventDate,
    );
  }

  if (
    currentStatus === "disconnected"
  ) {
    return createAccountDisconnectedNotification(
      account,
      eventDate,
    );
  }

  if (currentStatus === "error") {
    return createAccountConnectionErrorNotification(
      account,
      eventDate,
    );
  }

  if (currentStatus === "syncing") {
    return createAccountConnectionSyncingNotification(
      account,
      eventDate,
    );
  }

  return null;
}

function createSyncNotification(
  account: ConnectedAccountData,
  eventDate: Date,
): NotificationItem | null {
  const currentStatus =
    normalizeSyncStatus(
      account.syncStatus,
    );

  const previousStatus =
    normalizeSyncStatus(
      account.previousSyncStatus,
    );

  if (currentStatus === "failed") {
    return createSyncFailedNotification(
      account,
      eventDate,
    );
  }

  if (
    currentStatus === "success" &&
    previousStatus &&
    previousStatus !== "success"
  ) {
    return createSyncCompletedNotification(
      account,
      eventDate,
    );
  }

  if (currentStatus === "syncing") {
    return createSyncInProgressNotification(
      account,
      eventDate,
    );
  }

  if (currentStatus === "pending") {
    return createSyncPendingNotification(
      account,
      eventDate,
    );
  }

  return null;
}

function createAccountConnectedNotification(
  account: ConnectedAccountData,
  eventDate: Date,
): NotificationItem {
  const displayName =
    getAccountDisplayName(account);

  return {
    id: createNotificationId(
      "account",
      account.id,
      "connected",
    ),
    category: "account",
    priority: "low",
    title: `${account.name} connected`,
    message: `${displayName} is now connected to CASE Budget.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "View account",
    href: createAccountHref(account.id),
  };
}

function createAccountDisconnectedNotification(
  account: ConnectedAccountData,
  eventDate: Date,
): NotificationItem {
  const displayName =
    getAccountDisplayName(account);

  return {
    id: createNotificationId(
      "account",
      account.id,
      "disconnected",
    ),
    category: "account",
    priority: "critical",
    title: `${account.name} needs to be reconnected`,
    message: `${displayName} is disconnected and is not currently syncing balances or transactions.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Reconnect account",
    href: createAccountHref(account.id),
  };
}

function createAccountConnectionErrorNotification(
  account: ConnectedAccountData,
  eventDate: Date,
): NotificationItem {
  const displayName =
    getAccountDisplayName(account);

  return {
    id: createNotificationId(
      "account",
      account.id,
      "connection-error",
    ),
    category: "account",
    priority: "critical",
    title: `${account.name} connection error`,
    message: `CASE Budget cannot currently connect to ${displayName}. Reauthentication may be required.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Fix connection",
    href: createAccountHref(account.id),
  };
}

function createAccountConnectionSyncingNotification(
  account: ConnectedAccountData,
  eventDate: Date,
): NotificationItem {
  const displayName =
    getAccountDisplayName(account);

  return {
    id: createNotificationId(
      "account",
      account.id,
      "connection-syncing",
    ),
    category: "account",
    priority: "low",
    title: `${account.name} is connecting`,
    message: `CASE Budget is establishing a secure connection to ${displayName}.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "View account",
    href: createAccountHref(account.id),
  };
}

function createSyncFailedNotification(
  account: ConnectedAccountData,
  eventDate: Date,
): NotificationItem {
  const displayName =
    getAccountDisplayName(account);

  return {
    id: createNotificationId(
      "account",
      account.id,
      "sync-failed",
    ),
    category: "account",
    priority: "high",
    title: `${account.name} sync failed`,
    message: `CASE Budget could not retrieve the latest balances or transactions from ${displayName}.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Retry sync",
    href: createAccountHref(account.id),
  };
}

function createSyncCompletedNotification(
  account: ConnectedAccountData,
  eventDate: Date,
): NotificationItem {
  const syncDate =
    parseDate(account.lastSyncedAt) ??
    eventDate;

  return {
    id: createNotificationId(
      "account",
      account.id,
      `sync-complete-${formatDateTimeKey(
        syncDate,
      )}`,
    ),
    category: "account",
    priority: "low",
    title: `${account.name} sync completed`,
    message:
      "The latest account balance and transactions are now available.",
    createdAt: syncDate.toISOString(),
    read: false,
    actionLabel: "View account",
    href: createAccountHref(account.id),
  };
}

function createSyncInProgressNotification(
  account: ConnectedAccountData,
  eventDate: Date,
): NotificationItem {
  const displayName =
    getAccountDisplayName(account);

  return {
    id: createNotificationId(
      "account",
      account.id,
      "sync-in-progress",
    ),
    category: "account",
    priority: "low",
    title: `${account.name} sync is in progress`,
    message: `CASE Budget is retrieving the latest activity from ${displayName}.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "View account",
    href: createAccountHref(account.id),
  };
}

function createSyncPendingNotification(
  account: ConnectedAccountData,
  eventDate: Date,
): NotificationItem {
  return {
    id: createNotificationId(
      "account",
      account.id,
      "sync-pending",
    ),
    category: "account",
    priority: "low",
    title: `${account.name} sync is pending`,
    message:
      "The account is waiting for its next scheduled synchronization.",
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "View account",
    href: createAccountHref(account.id),
  };
}

function createStaleAccountNotification(
  account: ConnectedAccountData,
  asOfDate: Date,
  eventDate: Date,
): NotificationItem | null {
  const connectionStatus =
    normalizeConnectionStatus(
      account.connectionStatus,
    );

  const syncStatus =
    normalizeSyncStatus(
      account.syncStatus,
    );

  if (
    connectionStatus !==
      "connected" ||
    syncStatus === "syncing"
  ) {
    return null;
  }

  const lastSyncedAt =
    parseDate(account.lastSyncedAt);

  if (!lastSyncedAt) {
    return null;
  }

  const daysSinceLastSync =
    differenceInCalendarDays(
      asOfDate,
      lastSyncedAt,
    );

  if (
    daysSinceLastSync <
    ACCOUNT_STALE_AFTER_DAYS
  ) {
    return null;
  }

  return {
    id: createNotificationId(
      "account",
      account.id,
      `stale-${formatDateKey(
        lastSyncedAt,
      )}`,
    ),
    category: "account",
    priority:
      getStaleAccountPriority(
        daysSinceLastSync,
      ),
    title: `${account.name} has not synced recently`,
    message:
      buildStaleAccountMessage(
        account,
        daysSinceLastSync,
      ),
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Refresh account",
    href: createAccountHref(account.id),
  };
}

function buildStaleAccountMessage(
  account: ConnectedAccountData,
  daysSinceLastSync: number,
): string {
  const displayName =
    getAccountDisplayName(account);

  if (
    daysSinceLastSync ===
    ACCOUNT_STALE_AFTER_DAYS
  ) {
    return `${displayName} has not synced for ${daysSinceLastSync} days. Your balance and transactions may be outdated.`;
  }

  return `${displayName} last synced ${daysSinceLastSync} days ago. Reconnect or refresh the account to retrieve current information.`;
}

function getStaleAccountPriority(
  daysSinceLastSync: number,
): NotificationPriority {
  if (
    daysSinceLastSync >=
    ACCOUNT_CRITICAL_STALE_AFTER_DAYS
  ) {
    return "high";
  }

  return "medium";
}

function getAccountDisplayName(
  account: ConnectedAccountData,
): string {
  const institutionName =
    account.institutionName?.trim();

  if (!institutionName) {
    return account.name;
  }

  return `${account.name} at ${institutionName}`;
}

function resolveAccountEventDate(
  account: ConnectedAccountData,
  fallbackDate: Date,
): Date {
  return resolveEntityTimestamp(
    account,
    fallbackDate,
    [
      account.lastSyncedAt,
    ],
  );
}

function normalizeConnectionStatus(
  status:
    | AccountConnectionStatus
    | null
    | undefined,
): AccountConnectionStatus | null {
  if (!status) {
    return null;
  }

  return status;
}

function normalizeSyncStatus(
  status:
    | AccountSyncStatus
    | null
    | undefined,
): AccountSyncStatus | null {
  if (!status) {
    return null;
  }

  return status;
}

function createAccountHref(
  accountId: string,
): string {
  return `/dashboard/accounts?accountId=${encodeURIComponent(
    accountId,
  )}`;
}