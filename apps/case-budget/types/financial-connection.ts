export type FinancialDataProvider =
  | "manual"
  | "plaid"
  | "snaptrade";

export type FinancialConnectionCategory =
  | "banking"
  | "investments";

export type FinancialConnectionStatus =
  | "pending"
  | "connected"
  | "syncing"
  | "error"
  | "disconnected"
  | "reauthentication-required";

export type FinancialConnectionHealth =
  | "healthy"
  | "attention-required"
  | "unavailable"
  | "unknown";

export type FinancialSyncStatus =
  | "idle"
  | "queued"
  | "syncing"
  | "completed"
  | "completed-with-warnings"
  | "failed";

export type FinancialSyncTrigger =
  | "initial"
  | "manual"
  | "scheduled"
  | "webhook"
  | "reauthentication";

export type FinancialSyncResource =
  | "connections"
  | "accounts"
  | "balances"
  | "transactions"
  | "recurring-transactions"
  | "liabilities"
  | "investment-accounts"
  | "investment-holdings"
  | "investment-activities"
  | "performance-snapshots";

export type FinancialConnectionCapability =
  | "accounts"
  | "balances"
  | "transactions"
  | "recurring-transactions"
  | "liabilities"
  | "investments"
  | "investment-holdings"
  | "investment-activities"
  | "investment-orders"
  | "identity";

export type FinancialConnectionErrorCode =
  | "authentication-failed"
  | "authorization-revoked"
  | "connection-expired"
  | "institution-unavailable"
  | "provider-unavailable"
  | "rate-limited"
  | "sync-failed"
  | "reauthentication-required"
  | "invalid-configuration"
  | "invalid-webhook"
  | "resource-not-found"
  | "unknown";

export type FinancialConnectionData = {
  id: string;

  workspaceId: string;
  userId: string;

  provider: FinancialDataProvider;
  category: FinancialConnectionCategory;

  providerUserId?: string;
  providerConnectionId?: string;
  providerInstitutionId?: string;

  institutionName: string;
  institutionLogoUrl?: string;

  displayName: string;

  status: FinancialConnectionStatus;
  health: FinancialConnectionHealth;

  capabilities: FinancialConnectionCapability[];

  lastSyncStatus: FinancialSyncStatus;
  lastSyncTrigger?: FinancialSyncTrigger;

  lastSyncStartedAt?: string;
  lastSyncCompletedAt?: string;
  lastSuccessfulSyncAt?: string;

  lastErrorCode?: FinancialConnectionErrorCode;
  lastErrorMessage?: string;

  requiresReauthentication: boolean;

  metadata?: Record<
    string,
    string | number | boolean | null
  >;

  createdAt: string;
  updatedAt: string;
  disconnectedAt?: string;
};

export type CreateFinancialConnectionData = {
  workspaceId: string;
  userId: string;

  provider: FinancialDataProvider;
  category: FinancialConnectionCategory;

  providerUserId?: string;
  providerConnectionId?: string;
  providerInstitutionId?: string;

  institutionName: string;
  institutionLogoUrl?: string;

  displayName?: string;

  status?: FinancialConnectionStatus;
  health?: FinancialConnectionHealth;

  capabilities?: FinancialConnectionCapability[];

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
};

export type UpdateFinancialConnectionData = Partial<
  Omit<
    FinancialConnectionData,
    | "id"
    | "workspaceId"
    | "userId"
    | "provider"
    | "category"
    | "createdAt"
  >
>;

export type FinancialSyncRunData = {
  id: string;

  connectionId: string;
  workspaceId: string;
  userId: string;

  provider: FinancialDataProvider;
  trigger: FinancialSyncTrigger;
  status: FinancialSyncStatus;

  requestedResources: FinancialSyncResource[];
  completedResources: FinancialSyncResource[];
  failedResources: FinancialSyncResource[];

  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsSkipped: number;

  warningCount: number;
  errorCount: number;

  errorCode?: FinancialConnectionErrorCode;
  errorMessage?: string;

  startedAt: string;
  completedAt?: string;

  createdAt: string;
  updatedAt: string;
};

export type CreateFinancialSyncRunData = {
  connectionId: string;
  workspaceId: string;
  userId: string;

  provider: FinancialDataProvider;
  trigger: FinancialSyncTrigger;

  requestedResources: FinancialSyncResource[];
};

export type UpdateFinancialSyncRunData = Partial<
  Omit<
    FinancialSyncRunData,
    | "id"
    | "connectionId"
    | "workspaceId"
    | "userId"
    | "provider"
    | "trigger"
    | "createdAt"
  >
>;

export type FinancialWebhookEventStatus =
  | "received"
  | "processing"
  | "processed"
  | "ignored"
  | "failed";

export type FinancialWebhookEventData = {
  id: string;

  provider: FinancialDataProvider;

  providerEventId?: string;
  providerConnectionId?: string;

  eventType: string;
  status: FinancialWebhookEventStatus;

  payloadHash?: string;

  attemptCount: number;

  receivedAt: string;
  processedAt?: string;

  errorMessage?: string;

  createdAt: string;
  updatedAt: string;
};

export type CreateFinancialWebhookEventData = {
  provider: FinancialDataProvider;

  providerEventId?: string;
  providerConnectionId?: string;

  eventType: string;

  payloadHash?: string;

  receivedAt?: string;
};

export type FinancialProviderUserData = {
  id: string;

  workspaceId: string;
  userId: string;

  provider: Exclude<
    FinancialDataProvider,
    "manual"
  >;

  providerUserId: string;

  providerUserSecretReference?: string;

  createdAt: string;
  updatedAt: string;
};

export type FinancialConnectionSummary = {
  totalConnections: number;
  connectedConnections: number;
  syncingConnections: number;
  connectionsNeedingAttention: number;
  disconnectedConnections: number;

  lastSuccessfulSyncAt?: string;
};

export type FinancialProviderConfiguration = {
  provider: FinancialDataProvider;

  displayName: string;
  category: FinancialConnectionCategory;

  enabled: boolean;

  capabilities: FinancialConnectionCapability[];

  supportsManualRefresh: boolean;
  supportsWebhooks: boolean;
  supportsReauthentication: boolean;
  supportsDisconnect: boolean;
};

export type FinancialConnectionAction =
  | "connect"
  | "refresh"
  | "reauthenticate"
  | "disconnect"
  | "view-details";

export type FinancialConnectionActionAvailability = {
  action: FinancialConnectionAction;
  enabled: boolean;
  reason?: string;
};

export function isFinancialDataProvider(
  value: unknown,
): value is FinancialDataProvider {
  return (
    value === "manual" ||
    value === "plaid" ||
    value === "snaptrade"
  );
}

export function isFinancialConnectionCategory(
  value: unknown,
): value is FinancialConnectionCategory {
  return (
    value === "banking" ||
    value === "investments"
  );
}

export function isFinancialConnectionStatus(
  value: unknown,
): value is FinancialConnectionStatus {
  return (
    value === "pending" ||
    value === "connected" ||
    value === "syncing" ||
    value === "error" ||
    value === "disconnected" ||
    value === "reauthentication-required"
  );
}

export function isFinancialSyncStatus(
  value: unknown,
): value is FinancialSyncStatus {
  return (
    value === "idle" ||
    value === "queued" ||
    value === "syncing" ||
    value === "completed" ||
    value === "completed-with-warnings" ||
    value === "failed"
  );
}

export function getFinancialConnectionHealth(
  connection: Pick<
    FinancialConnectionData,
    | "status"
    | "lastSyncStatus"
    | "requiresReauthentication"
  >,
): FinancialConnectionHealth {
  if (
    connection.status === "disconnected"
  ) {
    return "unavailable";
  }

  if (
    connection.requiresReauthentication ||
    connection.status ===
      "reauthentication-required" ||
    connection.status === "error" ||
    connection.lastSyncStatus === "failed"
  ) {
    return "attention-required";
  }

  if (
    connection.status === "connected" ||
    connection.status === "syncing"
  ) {
    return "healthy";
  }

  return "unknown";
}

export function getFinancialConnectionActions(
  connection: Pick<
    FinancialConnectionData,
    | "provider"
    | "status"
    | "requiresReauthentication"
  >,
): FinancialConnectionActionAvailability[] {
  const isManual =
    connection.provider === "manual";

  const isDisconnected =
    connection.status === "disconnected";

  const needsReauthentication =
    connection.requiresReauthentication ||
    connection.status ===
      "reauthentication-required";

  return [
    {
      action: "view-details",
      enabled: true,
    },
    {
      action: "refresh",
      enabled:
        !isManual &&
        !isDisconnected &&
        !needsReauthentication,
      reason:
        isManual
          ? "Manual accounts cannot be synchronized."
          : isDisconnected
            ? "Reconnect this account before refreshing."
            : needsReauthentication
              ? "Reauthenticate this connection before refreshing."
              : undefined,
    },
    {
      action: "reauthenticate",
      enabled:
        !isManual &&
        !isDisconnected &&
        needsReauthentication,
      reason:
        isManual
          ? "Manual accounts do not require authentication."
          : isDisconnected
            ? "This connection has been disconnected."
            : !needsReauthentication
              ? "This connection does not currently require reauthentication."
              : undefined,
    },
    {
      action: "disconnect",
      enabled:
        !isManual &&
        !isDisconnected,
      reason:
        isManual
          ? "Manual accounts can be deleted instead of disconnected."
          : isDisconnected
            ? "This connection is already disconnected."
            : undefined,
    },
  ];
}

export const FINANCIAL_PROVIDER_CONFIGURATIONS:
  Record<
    FinancialDataProvider,
    FinancialProviderConfiguration
  > = {
    manual: {
      provider: "manual",
      displayName: "Manual",
      category: "banking",
      enabled: true,
      capabilities: [
        "accounts",
        "balances",
        "transactions",
        "liabilities",
        "investments",
        "investment-holdings",
        "investment-activities",
      ],
      supportsManualRefresh: false,
      supportsWebhooks: false,
      supportsReauthentication: false,
      supportsDisconnect: false,
    },

    plaid: {
      provider: "plaid",
      displayName: "Plaid",
      category: "banking",
      enabled: true,
      capabilities: [
        "accounts",
        "balances",
        "transactions",
        "recurring-transactions",
        "liabilities",
        "investments",
        "investment-holdings",
        "investment-activities",
      ],
      supportsManualRefresh: true,
      supportsWebhooks: true,
      supportsReauthentication: true,
      supportsDisconnect: true,
    },

    snaptrade: {
      provider: "snaptrade",
      displayName: "SnapTrade",
      category: "investments",
      enabled: true,
      capabilities: [
        "accounts",
        "balances",
        "investments",
        "investment-holdings",
        "investment-activities",
        "investment-orders",
      ],
      supportsManualRefresh: true,
      supportsWebhooks: true,
      supportsReauthentication: true,
      supportsDisconnect: true,
    },
  };