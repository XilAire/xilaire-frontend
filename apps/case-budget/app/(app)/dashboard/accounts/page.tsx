"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import AccountsOverview, {
  type AccountConnectionSummary,
  type AccountOverviewData,
} from "@/components/accounts/AccountsOverview";

import type {
  ConnectPlaidAccountResult,
} from "@/components/accounts/ConnectPlaidAccountModal";

import {
  useAccounts,
  type AccountData,
  type AccountType,
} from "@/components/providers/AccountsProvider";

import {
  useApp,
} from "@/components/providers/AppProvider";

type FinancialConnectionApiRecord = {
  id: string;

  provider:
    | "manual"
    | "plaid"
    | "snaptrade";

  category:
    | "banking"
    | "investments";

  institutionName:
    string;

  displayName:
    string;

  status:
    | "pending"
    | "connected"
    | "syncing"
    | "error"
    | "disconnected"
    | "reauthentication-required";

  health:
    | "healthy"
    | "attention-required"
    | "unavailable"
    | "unknown";

  lastSuccessfulSyncAt?:
    string;

  lastErrorMessage?:
    string;

  requiresReauthentication:
    boolean;

  metadata?:
    Record<
      string,
      string | number | boolean | null
    >;
};

type FinancialConnectionsApiResponse = {
  connections:
    FinancialConnectionApiRecord[];

  count:
    number;
};

type PlaidSyncApiResponse = {
  sync: {
    createdCount:
      number;

    updatedCount:
      number;

    unchangedCount:
      number;

    deactivatedCount:
      number;

    skippedCount:
      number;
  };
};

type ApiErrorResponse = {
  error?: {
    code?:
      string;

    message?:
      string;

    requestId?:
      string;
  };
};

const FINANCIAL_CONNECTIONS_ENDPOINT =
  "/api/financial-connections";

export default function AccountsPage() {
  const {
    accounts,
  } =
    useAccounts();

  const {
    activeWorkspace,
    openQuickAdd,
  } =
    useApp();

  const [
    connections,
    setConnections,
  ] = useState<
    AccountConnectionSummary[]
  >(
    [],
  );

  const [
    isLoadingConnections,
    setIsLoadingConnections,
  ] = useState(
    true,
  );

  const [
    connectionLoadError,
    setConnectionLoadError,
  ] = useState<
    string | null
  >(
    null,
  );

  const connectionRequestRef =
    useRef<
      AbortController | null
    >(
      null,
    );

  const overviewAccounts =
    useMemo<
      AccountOverviewData[]
    >(
      () =>
        accounts.map(
          mapAccountToOverview,
        ),
      [
        accounts,
      ],
    );

  const workspaceName =
    activeWorkspace?.name ??
    "Personal";

  const loadFinancialConnections =
    useCallback(
      async () => {
        connectionRequestRef.current?.abort();

        const abortController =
          new AbortController();

        connectionRequestRef.current =
          abortController;

        setIsLoadingConnections(
          true,
        );

        setConnectionLoadError(
          null,
        );

        try {
          const response =
            await fetch(
              FINANCIAL_CONNECTIONS_ENDPOINT,
              {
                method:
                  "GET",

                cache:
                  "no-store",

                signal:
                  abortController.signal,

                headers: {
                  Accept:
                    "application/json",
                },
              },
            );

          const responseBody =
            await readJsonResponse(
              response,
            );

          if (
            !response.ok
          ) {
            throw new AccountsPageError(
              getApiErrorMessage(
                responseBody,
                "CASE Budget could not load your connected institutions.",
              ),
            );
          }

          if (
            !isFinancialConnectionsApiResponse(
              responseBody,
            )
          ) {
            throw new AccountsPageError(
              "The financial connections response was incomplete.",
            );
          }

          setConnections(
            responseBody.connections
              .filter(
                (
                  connection,
                ) =>
                  connection.provider !==
                  "manual",
              )
              .map(
                mapFinancialConnectionToSummary,
              ),
          );
        } catch (
          error
        ) {
          if (
            isAbortError(
              error,
            )
          ) {
            return;
          }

          setConnectionLoadError(
            error instanceof
            AccountsPageError
              ? error.message
              : "CASE Budget could not load your connected institutions.",
          );
        } finally {
          if (
            connectionRequestRef.current ===
            abortController
          ) {
            connectionRequestRef.current =
              null;

            setIsLoadingConnections(
              false,
            );
          }
        }
      },
      [],
    );

  const syncPlaidConnection =
    useCallback(
      async (
        connectionId:
          string,
      ) => {
        const response =
          await fetch(
            `/api/plaid/connections/${encodeURIComponent(
              connectionId,
            )}/sync`,
            {
              method:
                "POST",

              cache:
                "no-store",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify({
                  mode:
                    "standard",
                }),
            },
          );

        const responseBody =
          await readJsonResponse(
            response,
          );

        if (
          !response.ok
        ) {
          throw new AccountsPageError(
            getApiErrorMessage(
              responseBody,
              "The institution connected, but CASE Budget could not import its accounts.",
            ),
          );
        }

        if (
          !isPlaidSyncApiResponse(
            responseBody,
          )
        ) {
          throw new AccountsPageError(
            "The Plaid account synchronization response was incomplete.",
          );
        }

        return responseBody;
      },
      [],
    );

  const handlePlaidConnected =
    useCallback(
      async (
        result:
          ConnectPlaidAccountResult,
      ) => {
        setConnectionLoadError(
          null,
        );

        setConnections(
          (
            currentConnections,
          ) =>
            upsertConnectionSummary(
              currentConnections,
              mapConnectedPlaidResultToSummary(
                result,
              ),
            ),
        );

        try {
          await syncPlaidConnection(
            result.connection.id,
          );

          await loadFinancialConnections();
        } catch (
          error
        ) {
          setConnectionLoadError(
            error instanceof
            AccountsPageError
              ? error.message
              : "The institution connected, but CASE Budget could not import its accounts.",
          );

          await loadFinancialConnections();
        }
      },
      [
        loadFinancialConnections,
        syncPlaidConnection,
      ],
    );

  useEffect(
    () => {
      void loadFinancialConnections();

      return () => {
        connectionRequestRef.current?.abort();
      };
    },
    [
      loadFinancialConnections,
      activeWorkspace?.id,
    ],
  );

  return (
    <div className="space-y-4">
      {isLoadingConnections ? (
        <ConnectionsLoadingBanner />
      ) : null}

      {connectionLoadError ? (
        <ConnectionsErrorBanner
          message={
            connectionLoadError
          }
          onRetry={
            () => {
              void loadFinancialConnections();
            }
          }
          onDismiss={
            () =>
              setConnectionLoadError(
                null,
              )
          }
        />
      ) : null}

      <AccountsOverview
        accounts={
          overviewAccounts
        }
        connections={
          connections
        }
        title="Accounts"
        description={`Manage the cash, credit, debt, and investment accounts for ${workspaceName}.`}
        onAddManualAccount={
          openQuickAdd
        }
        onPlaidConnected={
          handlePlaidConnected
        }
      />
    </div>
  );
}

function mapAccountToOverview(
  account:
    AccountData,
): AccountOverviewData {
  return {
    id:
      account.id,

    name:
      account.name,

    institutionName:
      account.institution,

    type:
      mapAccountType(
        account.type,
      ),

    provider:
      account.connectionStatus ===
      "manual"
        ? "manual"
        : "plaid",

    balance:
      account.balance,

    availableBalance:
      account.availableBalance,

    currency:
      account.currency,

    status:
      account.connectionStatus ===
      "disconnected"
        ? "inactive"
        : "active",

    lastUpdatedAt:
      account.lastSyncedAt ??
      account.updatedAt,
  };
}

function mapAccountType(
  accountType:
    AccountType,
): AccountOverviewData["type"] {
  switch (
    accountType
  ) {
    case "checking":
      return "checking";

    case "savings":
      return "savings";

    case "cash":
      return "cash";

    case "credit-card":
      return "credit-card";

    case "mortgage":
    case "loan":
      return "loan";

    case "investment":
    case "retirement":
      return "investment";

    case "real-estate":
    case "vehicle":
    case "other":
    default:
      return "other";
  }
}

function mapFinancialConnectionToSummary(
  connection:
    FinancialConnectionApiRecord,
): AccountConnectionSummary {
  return {
    id:
      connection.id,

    provider:
      connection.provider ===
      "snaptrade"
        ? "snaptrade"
        : "plaid",

    category:
      connection.category,

    institutionName:
      connection.institutionName,

    displayName:
      connection.displayName,

    status:
      connection.status,

    health:
      connection.health,

    accountCount:
      readAccountCount(
        connection.metadata,
      ),

    lastSuccessfulSyncAt:
      connection.lastSuccessfulSyncAt,

    lastErrorMessage:
      connection.lastErrorMessage,

    requiresReauthentication:
      connection.requiresReauthentication,
  };
}

function mapConnectedPlaidResultToSummary(
  result:
    ConnectPlaidAccountResult,
): AccountConnectionSummary {
  return {
    id:
      result.connection.id,

    provider:
      "plaid",

    category:
      result.connection.category,

    institutionName:
      result.connection.institutionName,

    displayName:
      result.connection.institutionName,

    status:
      result.connection.status,

    health:
      result.connection.status ===
      "connected"
        ? "healthy"
        : "attention-required",

    accountCount:
      result.accounts.length,

    lastSuccessfulSyncAt:
      undefined,

    lastErrorMessage:
      undefined,

    requiresReauthentication:
      false,
  };
}

function upsertConnectionSummary(
  connections:
    AccountConnectionSummary[],
  incomingConnection:
    AccountConnectionSummary,
) {
  const existingIndex =
    connections.findIndex(
      (
        connection,
      ) =>
        connection.id ===
        incomingConnection.id,
    );

  if (
    existingIndex ===
    -1
  ) {
    return [
      incomingConnection,
      ...connections,
    ];
  }

  return connections.map(
    (
      connection,
      index,
    ) =>
      index ===
      existingIndex
        ? incomingConnection
        : connection,
  );
}

function readAccountCount(
  metadata:
    Record<
      string,
      string | number | boolean | null
    > | undefined,
) {
  const value =
    metadata?.selectedAccountCount;

  return typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
    ? value
    : undefined;
}

function ConnectionsLoadingBanner() {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 py-3 text-sm text-[var(--text-muted)]"
    >
      <SpinnerIcon />

      <span>
        Loading connected institutions…
      </span>
    </div>
  );
}

function ConnectionsErrorBanner({
  message,
  onRetry,
  onDismiss,
}: {
  message:
    string;

  onRetry: () => void;

  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[var(--danger)]">
          <WarningIcon />
        </span>

        <p className="text-sm leading-6 text-[var(--text-primary)]">
          {message}
        </p>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          onClick={
            onRetry
          }
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Retry
        </button>

        <button
          type="button"
          onClick={
            onDismiss
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-default)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          aria-label="Dismiss connection error"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

async function readJsonResponse(
  response:
    Response,
) {
  const contentType =
    response.headers.get(
      "content-type",
    ) ??
    "";

  if (
    !contentType.includes(
      "application/json",
    )
  ) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getApiErrorMessage(
  value:
    unknown,
  fallbackMessage:
    string,
) {
  if (
    !isApiErrorResponse(
      value,
    )
  ) {
    return fallbackMessage;
  }

  return value.error?.message ??
    fallbackMessage;
}

function isFinancialConnectionsApiResponse(
  value:
    unknown,
): value is FinancialConnectionsApiResponse {
  if (
    !isPlainObject(
      value,
    ) ||
    !Array.isArray(
      value.connections,
    ) ||
    typeof value.count !==
      "number"
  ) {
    return false;
  }

  return value.connections.every(
    isFinancialConnectionApiRecord,
  );
}

function isFinancialConnectionApiRecord(
  value:
    unknown,
): value is FinancialConnectionApiRecord {
  if (
    !isPlainObject(
      value,
    )
  ) {
    return false;
  }

  return (
    typeof value.id ===
      "string" &&
    (
      value.provider ===
        "manual" ||
      value.provider ===
        "plaid" ||
      value.provider ===
        "snaptrade"
    ) &&
    (
      value.category ===
        "banking" ||
      value.category ===
        "investments"
    ) &&
    typeof value.institutionName ===
      "string" &&
    typeof value.displayName ===
      "string" &&
    isConnectionStatus(
      value.status,
    ) &&
    isConnectionHealth(
      value.health,
    ) &&
    typeof value.requiresReauthentication ===
      "boolean"
  );
}

function isPlaidSyncApiResponse(
  value:
    unknown,
): value is PlaidSyncApiResponse {
  if (
    !isPlainObject(
      value,
    ) ||
    !isPlainObject(
      value.sync,
    )
  ) {
    return false;
  }

  return [
    value.sync.createdCount,
    value.sync.updatedCount,
    value.sync.unchangedCount,
    value.sync.deactivatedCount,
    value.sync.skippedCount,
  ].every(
    (
      count,
    ) =>
      typeof count ===
        "number" &&
      Number.isFinite(
        count,
      ),
  );
}

function isApiErrorResponse(
  value:
    unknown,
): value is ApiErrorResponse {
  return (
    isPlainObject(
      value,
    ) &&
    (
      value.error ===
        undefined ||
      isPlainObject(
        value.error,
      )
    )
  );
}

function isConnectionStatus(
  value:
    unknown,
): value is AccountConnectionSummary["status"] {
  return (
    value ===
      "pending" ||
    value ===
      "connected" ||
    value ===
      "syncing" ||
    value ===
      "error" ||
    value ===
      "disconnected" ||
    value ===
      "reauthentication-required"
  );
}

function isConnectionHealth(
  value:
    unknown,
): value is AccountConnectionSummary["health"] {
  return (
    value ===
      "healthy" ||
    value ===
      "attention-required" ||
    value ===
      "unavailable" ||
    value ===
      "unknown"
  );
}

function isPlainObject(
  value:
    unknown,
): value is Record<
  string,
  any
> {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value,
      ),
  );
}

function isAbortError(
  error:
    unknown,
) {
  return (
    error instanceof
      DOMException &&
    error.name ===
      "AbortError"
  );
}

class AccountsPageError extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "AccountsPageError";
  }
}

function SpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 animate-spin text-[var(--primary)]"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WarningIcon() {
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
      <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CloseIcon() {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
