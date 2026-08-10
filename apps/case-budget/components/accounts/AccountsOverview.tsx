"use client";

import {
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import ConnectPlaidAccountModal, {
  type ConnectPlaidAccountModalError,
  type ConnectPlaidAccountResult,
} from "@/components/accounts/ConnectPlaidAccountModal";

export type AccountOverviewType =
  | "checking"
  | "savings"
  | "credit-card"
  | "cash"
  | "loan"
  | "investment"
  | "other";

export type AccountOverviewProvider =
  | "manual"
  | "plaid"
  | "snaptrade";

export type AccountOverviewStatus =
  | "active"
  | "inactive"
  | "closed";

export type AccountOverviewData = {
  id: string;

  name: string;
  institutionName?: string;

  type: AccountOverviewType;
  provider: AccountOverviewProvider;

  balance: number;
  availableBalance?: number;

  currency?: string;
  mask?: string;

  status?: AccountOverviewStatus;

  connectionId?: string;

  lastUpdatedAt?: string;
};

export type AccountConnectionStatus =
  | "pending"
  | "connected"
  | "syncing"
  | "error"
  | "disconnected"
  | "reauthentication-required";

export type AccountConnectionHealth =
  | "healthy"
  | "attention-required"
  | "unavailable"
  | "unknown";

export type AccountConnectionSummary = {
  id: string;

  provider:
    | "plaid"
    | "snaptrade";

  category:
    | "banking"
    | "investments";

  institutionName: string;
  displayName?: string;

  status: AccountConnectionStatus;
  health: AccountConnectionHealth;

  accountCount?: number;

  lastSuccessfulSyncAt?: string;
  lastErrorMessage?: string;

  requiresReauthentication?: boolean;
};

export type AccountsOverviewProps = {
  accounts?: AccountOverviewData[];
  connections?: AccountConnectionSummary[];

  onAddManualAccount?: () => void;

  onAccountSelect?: (
    account:
      AccountOverviewData,
  ) => void;

  onConnectionSelect?: (
    connection:
      AccountConnectionSummary,
  ) => void;

  onPlaidConnected?: (
    result:
      ConnectPlaidAccountResult,
  ) => void;

  title?: string;
  description?: string;

  className?: string;
};

type PlaidModalState = {
  isOpen: boolean;

  mode:
    | "create"
    | "update";

  connectionId?: string;
};

const DEFAULT_PLAID_MODAL_STATE:
  PlaidModalState = {
    isOpen:
      false,

    mode:
      "create",

    connectionId:
      undefined,
  };

export default function AccountsOverview({
  accounts = [],
  connections = [],
  onAddManualAccount,
  onAccountSelect,
  onConnectionSelect,
  onPlaidConnected,
  title = "Accounts",
  description = "Manage your cash, credit, debt, and investment accounts in one place.",
  className,
}: AccountsOverviewProps) {
  const router =
    useRouter();

  const [
    plaidModalState,
    setPlaidModalState,
  ] =
    useState<PlaidModalState>(
      DEFAULT_PLAID_MODAL_STATE,
    );

  const [
    connectionError,
    setConnectionError,
  ] =
    useState<string | null>(
      null,
    );

  const accountSummary =
    useMemo(
      () =>
        calculateAccountSummary(
          accounts,
        ),
      [
        accounts,
      ],
    );

  const groupedAccounts =
    useMemo(
      () =>
        groupAccounts(
          accounts,
        ),
      [
        accounts,
      ],
    );

  const activeConnections =
    useMemo(
      () =>
        connections.filter(
          (
            connection,
          ) =>
            connection.status !==
            "disconnected",
        ),
      [
        connections,
      ],
    );

  const openNewPlaidConnection =
    useCallback(
      () => {
        setConnectionError(
          null,
        );

        setPlaidModalState({
          isOpen:
            true,

          mode:
            "create",

          connectionId:
            undefined,
        });
      },
      [],
    );

  const openPlaidReauthentication =
    useCallback(
      (
        connection:
          AccountConnectionSummary,
      ) => {
        setConnectionError(
          null,
        );

        setPlaidModalState({
          isOpen:
            true,

          mode:
            "update",

          connectionId:
            connection.id,
        });
      },
      [],
    );

  const closePlaidModal =
    useCallback(
      () => {
        setPlaidModalState(
          DEFAULT_PLAID_MODAL_STATE,
        );
      },
      [],
    );

  const handlePlaidConnected =
    useCallback(
      (
        result:
          ConnectPlaidAccountResult,
      ) => {
        setConnectionError(
          null,
        );

        router.refresh();

        onPlaidConnected?.(
          result,
        );
      },
      [
        onPlaidConnected,
        router,
      ],
    );

  const handlePlaidError =
    useCallback(
      (
        error:
          ConnectPlaidAccountModalError,
      ) => {
        setConnectionError(
          error.message,
        );
      },
      [],
    );

  const rootClassName =
    [
      "mx-auto w-full max-w-[1600px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7",

      className,
    ]
      .filter(
        Boolean,
      )
      .join(
        " ",
      );

  return (
    <>
      <section
        className={
          rootClassName
        }
        aria-labelledby="accounts-overview-title"
      >
        <AccountsHeader
          title={
            title
          }
          description={
            description
          }
          onConnectBank={
            openNewPlaidConnection
          }
          onAddManualAccount={
            onAddManualAccount
          }
        />

        {connectionError ? (
          <InlineAlert
            message={
              connectionError
            }
            onDismiss={
              () =>
                setConnectionError(
                  null,
                )
            }
          />
        ) : null}

        <AccountSummaryCards
          summary={
            accountSummary
          }
        />

        <ConnectedInstitutions
          connections={
            activeConnections
          }
          onConnectBank={
            openNewPlaidConnection
          }
          onConnectionSelect={
            onConnectionSelect
          }
          onReconnect={
            openPlaidReauthentication
          }
        />

        {accounts.length >
        0 ? (
          <div className="space-y-5">
            <AccountGroup
              title="Cash accounts"
              description="Checking, savings, and cash accounts."
              accounts={
                groupedAccounts.cash
              }
              emptyMessage="No cash accounts yet."
              onAccountSelect={
                onAccountSelect
              }
            />

            <AccountGroup
              title="Credit and debt"
              description="Credit cards, loans, and other balances you owe."
              accounts={
                groupedAccounts.debt
              }
              emptyMessage="No credit or debt accounts yet."
              onAccountSelect={
                onAccountSelect
              }
            />

            <AccountGroup
              title="Investments"
              description="Brokerage, retirement, and other investment accounts."
              accounts={
                groupedAccounts.investments
              }
              emptyMessage="No investment accounts yet."
              onAccountSelect={
                onAccountSelect
              }
            />

            {groupedAccounts.other.length >
            0 ? (
              <AccountGroup
                title="Other accounts"
                description="Accounts that do not fit another category."
                accounts={
                  groupedAccounts.other
                }
                emptyMessage="No other accounts."
                onAccountSelect={
                  onAccountSelect
                }
              />
            ) : null}
          </div>
        ) : (
          <AccountsEmptyState
            hasConnections={
              activeConnections.length >
              0
            }
            onConnectBank={
              openNewPlaidConnection
            }
            onAddManualAccount={
              onAddManualAccount
            }
          />
        )}
      </section>

      <ConnectPlaidAccountModal
        isOpen={
          plaidModalState.isOpen
        }
        mode={
          plaidModalState.mode
        }
        connectionId={
          plaidModalState.connectionId
        }
        onClose={
          closePlaidModal
        }
        onConnected={
          handlePlaidConnected
        }
        onError={
          handlePlaidError
        }
      />
    </>
  );
}

function AccountsHeader({
  title,
  description,
  onConnectBank,
  onAddManualAccount,
}: {
  title:
    string;

  description:
    string;

  onConnectBank: () => void;

  onAddManualAccount?: () => void;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
          Financial accounts
        </p>

        <h1
          id="accounts-overview-title"
          className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl"
        >
          {title}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {onAddManualAccount ? (
          <button
            type="button"
            onClick={
              onAddManualAccount
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <PlusIcon />

            Add manually
          </button>
        ) : null}

        <button
          type="button"
          onClick={
            onConnectBank
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <LinkIcon />

          Connect bank
        </button>
      </div>
    </header>
  );
}

function AccountSummaryCards({
  summary,
}: {
  summary:
    ReturnType<
      typeof calculateAccountSummary
    >;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Cash"
        value={
          formatCurrency(
            summary.cash,
          )
        }
        detail="Checking, savings, and cash"
        icon={
          <WalletIcon />
        }
      />

      <SummaryCard
        title="Credit and debt"
        value={
          formatCurrency(
            summary.debt,
          )
        }
        detail="Balances currently owed"
        icon={
          <CreditCardIcon />
        }
      />

      <SummaryCard
        title="Investments"
        value={
          formatCurrency(
            summary.investments,
          )
        }
        detail="Brokerage and retirement"
        icon={
          <ChartIcon />
        }
      />

      <SummaryCard
        title="Net account value"
        value={
          formatCurrency(
            summary.netValue,
          )
        }
        detail={`${summary.accountCount} ${
          summary.accountCount ===
          1
            ? "account"
            : "accounts"
        }`}
        icon={
          <ScaleIcon />
        }
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  icon,
}: {
  title:
    string;

  value:
    string;

  detail:
    string;

  icon:
    ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {value}
          </p>

          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {detail}
          </p>
        </div>

        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          {icon}
        </span>
      </div>
    </article>
  );
}

function ConnectedInstitutions({
  connections,
  onConnectBank,
  onConnectionSelect,
  onReconnect,
}: {
  connections:
    AccountConnectionSummary[];

  onConnectBank: () => void;

  onConnectionSelect?: (
    connection:
      AccountConnectionSummary,
  ) => void;

  onReconnect: (
    connection:
      AccountConnectionSummary,
  ) => void;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Connected institutions
          </h2>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage live bank and brokerage connections.
          </p>
        </div>

        <button
          type="button"
          onClick={
            onConnectBank
          }
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <PlusIcon />

          Add connection
        </button>
      </div>

      {connections.length >
      0 ? (
        <div className="divide-y divide-[var(--border-subtle)]">
          {connections.map(
            (
              connection,
            ) => (
              <ConnectionRow
                key={
                  connection.id
                }
                connection={
                  connection
                }
                onSelect={
                  onConnectionSelect
                }
                onReconnect={
                  onReconnect
                }
              />
            ),
          )}
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
            <BuildingIcon />
          </div>

          <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
            No institutions connected
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
            Connect a financial institution through Plaid to begin importing live account data.
          </p>
        </div>
      )}
    </section>
  );
}

function ConnectionRow({
  connection,
  onSelect,
  onReconnect,
}: {
  connection:
    AccountConnectionSummary;

  onSelect?: (
    connection:
      AccountConnectionSummary,
  ) => void;

  onReconnect: (
    connection:
      AccountConnectionSummary,
  ) => void;
}) {
  const needsAttention =
    connection.requiresReauthentication ||
    connection.status ===
      "reauthentication-required" ||
    connection.status ===
      "error" ||
    connection.health ===
      "attention-required";

  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={
          () =>
            onSelect?.(
              connection,
            )
        }
        disabled={
          !onSelect
        }
        className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none disabled:cursor-default"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--primary)]">
          {connection.provider ===
          "plaid" ? (
            <BankIcon />
          ) : (
            <ChartIcon />
          )}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
            {connection.displayName ??
              connection.institutionName}
          </span>

          <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
            {getConnectionDescription(
              connection,
            )}
          </span>
        </span>
      </button>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <ConnectionStatusBadge
          connection={
            connection
          }
        />

        {needsAttention &&
        connection.provider ===
          "plaid" ? (
          <button
            type="button"
            onClick={
              () =>
                onReconnect(
                  connection,
                )
            }
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-3 text-xs font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            Reconnect
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ConnectionStatusBadge({
  connection,
}: {
  connection:
    AccountConnectionSummary;
}) {
  const presentation =
    getConnectionStatusPresentation(
      connection,
    );

  return (
    <span
      className={[
        "inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold",

        presentation.className,
      ].join(
        " ",
      )}
    >
      {presentation.label}
    </span>
  );
}

function AccountGroup({
  title,
  description,
  accounts,
  emptyMessage,
  onAccountSelect,
}: {
  title:
    string;

  description:
    string;

  accounts:
    AccountOverviewData[];

  emptyMessage:
    string;

  onAccountSelect?: (
    account:
      AccountOverviewData,
  ) => void;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <div className="border-b border-[var(--border-subtle)] px-5 py-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          {title}
        </h2>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      {accounts.length >
      0 ? (
        <div className="divide-y divide-[var(--border-subtle)]">
          {accounts.map(
            (
              account,
            ) => (
              <AccountRow
                key={
                  account.id
                }
                account={
                  account
                }
                onSelect={
                  onAccountSelect
                }
              />
            ),
          )}
        </div>
      ) : (
        <p className="px-5 py-7 text-sm text-[var(--text-muted)]">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

function AccountRow({
  account,
  onSelect,
}: {
  account:
    AccountOverviewData;

  onSelect?: (
    account:
      AccountOverviewData,
  ) => void;
}) {
  const currency =
    account.currency ??
    "USD";

  return (
    <button
      type="button"
      onClick={
        () =>
          onSelect?.(
            account,
          )
      }
      disabled={
        !onSelect
      }
      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left outline-none transition hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)] disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--primary)]">
          {getAccountIcon(
            account.type,
          )}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
            {account.name}
          </span>

          <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
            {getAccountSecondaryText(
              account,
            )}
          </span>
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold text-[var(--text-primary)]">
          {formatCurrency(
            account.balance,
            currency,
          )}
        </span>

        <span className="mt-1 block text-xs text-[var(--text-muted)]">
          {account.availableBalance !==
          undefined
            ? `${formatCurrency(
                account.availableBalance,
                currency,
              )} available`
            : getUpdatedLabel(
                account.lastUpdatedAt,
              )}
        </span>
      </span>
    </button>
  );
}

function AccountsEmptyState({
  hasConnections,
  onConnectBank,
  onAddManualAccount,
}: {
  hasConnections:
    boolean;

  onConnectBank: () => void;

  onAddManualAccount?: () => void;
}) {
  return (
    <section className="rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface-default)] px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <WalletIcon
          size={
            28
          }
        />
      </div>

      <h2 className="mt-5 text-xl font-bold text-[var(--text-primary)]">
        {hasConnections
          ? "Accounts are ready to sync"
          : "Build your complete financial picture"}
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--text-muted)]">
        {hasConnections
          ? "Your institution is connected. Account balances will appear here after the first account synchronization is implemented."
          : "Connect a bank securely through Plaid or add an account manually to begin tracking balances and net worth."}
      </p>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={
            onConnectBank
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <LinkIcon />

          Connect bank
        </button>

        {onAddManualAccount ? (
          <button
            type="button"
            onClick={
              onAddManualAccount
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <PlusIcon />

            Add manually
          </button>
        ) : null}
      </div>
    </section>
  );
}

function InlineAlert({
  message,
  onDismiss,
}: {
  message:
    string;

  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-[var(--danger)]">
          <WarningIcon />
        </span>

        <p className="text-sm leading-6 text-[var(--text-primary)]">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={
          onDismiss
        }
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-default)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        aria-label="Dismiss connection error"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function calculateAccountSummary(
  accounts:
    AccountOverviewData[],
) {
  let cash =
    0;

  let debt =
    0;

  let investments =
    0;

  let other =
    0;

  for (
    const account of accounts
  ) {
    switch (
      account.type
    ) {
      case "checking":
      case "savings":
      case "cash":
        cash +=
          account.balance;

        break;

      case "credit-card":
      case "loan":
        debt +=
          Math.abs(
            account.balance,
          );

        break;

      case "investment":
        investments +=
          account.balance;

        break;

      case "other":
      default:
        other +=
          account.balance;

        break;
    }
  }

  return {
    cash,
    debt,
    investments,
    other,

    netValue:
      cash +
      investments +
      other -
      debt,

    accountCount:
      accounts.length,
  };
}

function groupAccounts(
  accounts:
    AccountOverviewData[],
) {
  return {
    cash:
      accounts.filter(
        (
          account,
        ) =>
          account.type ===
            "checking" ||
          account.type ===
            "savings" ||
          account.type ===
            "cash",
      ),

    debt:
      accounts.filter(
        (
          account,
        ) =>
          account.type ===
            "credit-card" ||
          account.type ===
            "loan",
      ),

    investments:
      accounts.filter(
        (
          account,
        ) =>
          account.type ===
          "investment",
      ),

    other:
      accounts.filter(
        (
          account,
        ) =>
          account.type ===
          "other",
      ),
  };
}

function getConnectionDescription(
  connection:
    AccountConnectionSummary,
) {
  const parts = [
    connection.provider ===
    "plaid"
      ? "Plaid"
      : "SnapTrade",

    connection.accountCount !==
    undefined
      ? `${connection.accountCount} ${
          connection.accountCount ===
          1
            ? "account"
            : "accounts"
        }`
      : undefined,

    connection.lastSuccessfulSyncAt
      ? `Synced ${formatRelativeDate(
          connection.lastSuccessfulSyncAt,
        )}`
      : undefined,
  ].filter(
    Boolean,
  );

  return parts.join(
    " • ",
  );
}

function getConnectionStatusPresentation(
  connection:
    AccountConnectionSummary,
) {
  if (
    connection.requiresReauthentication ||
    connection.status ===
      "reauthentication-required"
  ) {
    return {
      label:
        "Reconnect",

      className:
        "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]",
    };
  }

  switch (
    connection.status
  ) {
    case "connected":
      return {
        label:
          "Connected",

        className:
          "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
      };

    case "syncing":
      return {
        label:
          "Syncing",

        className:
          "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]",
      };

    case "pending":
      return {
        label:
          "Pending",

        className:
          "bg-[var(--surface-muted)] text-[var(--text-muted)]",
      };

    case "error":
      return {
        label:
          "Needs attention",

        className:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
      };

    case "disconnected":
      return {
        label:
          "Disconnected",

        className:
          "bg-[var(--surface-muted)] text-[var(--text-muted)]",
      };

    default:
      return {
        label:
          "Unknown",

        className:
          "bg-[var(--surface-muted)] text-[var(--text-muted)]",
      };
  }
}

function getAccountSecondaryText(
  account:
    AccountOverviewData,
) {
  return [
    account.institutionName,

    formatAccountType(
      account.type,
    ),

    account.mask
      ? `•••• ${account.mask}`
      : undefined,

    account.provider ===
    "manual"
      ? "Manual"
      : account.provider ===
        "plaid"
        ? "Plaid"
        : "SnapTrade",
  ]
    .filter(
      Boolean,
    )
    .join(
      " • ",
    );
}

function formatAccountType(
  type:
    AccountOverviewType,
) {
  switch (
    type
  ) {
    case "checking":
      return "Checking";

    case "savings":
      return "Savings";

    case "credit-card":
      return "Credit card";

    case "cash":
      return "Cash";

    case "loan":
      return "Loan";

    case "investment":
      return "Investment";

    case "other":
    default:
      return "Other";
  }
}

function getUpdatedLabel(
  value:
    string | undefined,
) {
  return value
    ? `Updated ${formatRelativeDate(
        value,
      )}`
    : "Balance";
}

function formatCurrency(
  value:
    number,
  currency =
    "USD",
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency,

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  ).format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatRelativeDate(
  value:
    string,
) {
  const timestamp =
    new Date(
      value,
    ).getTime();

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return "recently";
  }

  const differenceInMinutes =
    Math.round(
      (
        timestamp -
        Date.now()
      ) /
        60_000,
    );

  const relativeFormatter =
    new Intl.RelativeTimeFormat(
      "en-US",
      {
        numeric:
          "auto",
      },
    );

  if (
    Math.abs(
      differenceInMinutes,
    ) <
    60
  ) {
    return relativeFormatter.format(
      differenceInMinutes,
      "minute",
    );
  }

  const differenceInHours =
    Math.round(
      differenceInMinutes /
        60,
    );

  if (
    Math.abs(
      differenceInHours,
    ) <
    24
  ) {
    return relativeFormatter.format(
      differenceInHours,
      "hour",
    );
  }

  const differenceInDays =
    Math.round(
      differenceInHours /
        24,
    );

  return relativeFormatter.format(
    differenceInDays,
    "day",
  );
}

function getAccountIcon(
  type:
    AccountOverviewType,
) {
  switch (
    type
  ) {
    case "checking":
    case "savings":
      return <BankIcon />;

    case "credit-card":
      return <CreditCardIcon />;

    case "cash":
      return <WalletIcon />;

    case "loan":
      return <ScaleIcon />;

    case "investment":
      return <ChartIcon />;

    case "other":
    default:
      return <BuildingIcon />;
  }
}

function PlusIcon() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function LinkIcon() {
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
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </svg>
  );
}

function WalletIcon({
  size = 20,
}: {
  size?:
    number;
}) {
  return (
    <svg
      width={
        size
      }
      height={
        size
      }
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h14v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />
      <path d="M16 13h.01" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 10 9-7 9 7" />
      <path d="M5 10v9" />
      <path d="M9 10v9" />
      <path d="M15 10v9" />
      <path d="M19 10v9" />
      <path d="M3 19h18" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="5"
        width="20"
        height="14"
        rx="2"
      />
      <path d="M2 10h20" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 4 3 5-7" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m16 16 3-8 3 8a5 5 0 0 1-6 0Z" />
      <path d="m2 16 3-8 3 8a5 5 0 0 1-6 0Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h18" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21h18" />
      <path d="M6 21V7l6-4 6 4v14" />
      <path d="M9 10h.01" />
      <path d="M9 14h.01" />
      <path d="M9 18h.01" />
      <path d="M15 10h.01" />
      <path d="M15 14h.01" />
      <path d="M15 18h.01" />
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
