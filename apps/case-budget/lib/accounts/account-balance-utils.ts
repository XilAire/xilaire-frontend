import type {
  AccountClassification,
  AccountData,
} from "@/components/providers/AccountsProvider";

import type {
  TransactionData,
  TransactionType,
} from "@/types/transaction";

export type AccountBalanceDirection =
  | "apply"
  | "reverse";

export type AccountBalanceDelta = {
  accountId: string;
  balanceDelta: number;
  availableBalanceDelta?: number;
};

export type TransactionBalanceImpact = {
  transactionId: string;
  sourceAccountId: string;
  destinationAccountId?: string;
  deltas: AccountBalanceDelta[];
};

export type ApplyTransactionToAccountsResult = {
  accounts: AccountData[];
  impact: TransactionBalanceImpact;
};

export type ApplyTransactionToAccountsOptions = {
  direction?: AccountBalanceDirection;
  destinationAccountId?: string;
  updateAvailableBalance?: boolean;
  timestamp?: string;
};

export function applyTransactionToAccounts(
  accounts: AccountData[],
  transaction: TransactionData,
  options: ApplyTransactionToAccountsOptions = {},
): ApplyTransactionToAccountsResult {
  const {
    direction = "apply",
    destinationAccountId,
    updateAvailableBalance = true,
    timestamp = new Date().toISOString(),
  } = options;

  const impact =
    getTransactionBalanceImpact(
      accounts,
      transaction,
      {
        direction,
        destinationAccountId,
        updateAvailableBalance,
      },
    );

  return {
    accounts:
      applyAccountBalanceDeltas(
        accounts,
        impact.deltas,
        timestamp,
      ),
    impact,
  };
}

export function reverseTransactionFromAccounts(
  accounts: AccountData[],
  transaction: TransactionData,
  options: Omit<
    ApplyTransactionToAccountsOptions,
    "direction"
  > = {},
) {
  return applyTransactionToAccounts(
    accounts,
    transaction,
    {
      ...options,
      direction:
        "reverse",
    },
  );
}

export function replaceTransactionInAccounts(
  accounts: AccountData[],
  previousTransaction: TransactionData,
  nextTransaction: TransactionData,
  options: {
    previousDestinationAccountId?: string;
    nextDestinationAccountId?: string;
    updateAvailableBalance?: boolean;
    timestamp?: string;
  } = {},
): ApplyTransactionToAccountsResult {
  const {
    previousDestinationAccountId,
    nextDestinationAccountId,
    updateAvailableBalance = true,
    timestamp = new Date().toISOString(),
  } = options;

  const reversedResult =
    reverseTransactionFromAccounts(
      accounts,
      previousTransaction,
      {
        destinationAccountId:
          previousDestinationAccountId,
        updateAvailableBalance,
        timestamp,
      },
    );

  return applyTransactionToAccounts(
    reversedResult.accounts,
    nextTransaction,
    {
      destinationAccountId:
        nextDestinationAccountId,
      updateAvailableBalance,
      timestamp,
    },
  );
}

export function getTransactionBalanceImpact(
  accounts: AccountData[],
  transaction: TransactionData,
  options: {
    direction?: AccountBalanceDirection;
    destinationAccountId?: string;
    updateAvailableBalance?: boolean;
  } = {},
): TransactionBalanceImpact {
  const {
    direction = "apply",
    destinationAccountId,
    updateAvailableBalance = true,
  } = options;

  const sourceAccount =
    accounts.find(
      (
        account,
      ) =>
        account.id ===
        transaction.account.id,
    );

  if (!sourceAccount) {
    return {
      transactionId:
        transaction.id,
      sourceAccountId:
        transaction.account.id,
      destinationAccountId,
      deltas: [],
    };
  }

  const normalizedAmount =
    normalizeCurrency(
      Math.abs(
        transaction.amount,
      ),
    );

  if (
    normalizedAmount ===
    0
  ) {
    return {
      transactionId:
        transaction.id,
      sourceAccountId:
        sourceAccount.id,
      destinationAccountId,
      deltas: [],
    };
  }

  const multiplier =
    direction ===
    "apply"
      ? 1
      : -1;

  if (
    transaction.type ===
    "transfer"
  ) {
    return getTransferBalanceImpact(
      accounts,
      transaction,
      sourceAccount,
      destinationAccountId,
      normalizedAmount,
      multiplier,
      updateAvailableBalance,
    );
  }

  const sourceDelta =
    calculateTransactionDelta(
      sourceAccount,
      transaction.type,
      normalizedAmount,
    ) *
    multiplier;

  return {
    transactionId:
      transaction.id,
    sourceAccountId:
      sourceAccount.id,
    deltas: [
      createBalanceDelta(
        sourceAccount,
        sourceDelta,
        updateAvailableBalance,
      ),
    ],
  };
}

export function calculateTransactionDelta(
  account: AccountData,
  transactionType: Exclude<
    TransactionType,
    "transfer"
  >,
  amount: number,
) {
  const normalizedAmount =
    normalizeCurrency(
      Math.abs(
        amount,
      ),
    );

  if (
    normalizedAmount ===
    0
  ) {
    return 0;
  }

  if (
    account.classification ===
    "liability"
  ) {
    return transactionType ===
      "expense"
      ? normalizedAmount
      : -normalizedAmount;
  }

  return transactionType ===
    "expense"
    ? -normalizedAmount
    : normalizedAmount;
}

export function calculateTransferDelta(
  account: AccountData,
  transferRole:
    | "source"
    | "destination",
  amount: number,
) {
  const normalizedAmount =
    normalizeCurrency(
      Math.abs(
        amount,
      ),
    );

  if (
    normalizedAmount ===
    0
  ) {
    return 0;
  }

  if (
    transferRole ===
    "source"
  ) {
    return account.classification ===
      "liability"
      ? normalizedAmount
      : -normalizedAmount;
  }

  return account.classification ===
    "liability"
    ? -normalizedAmount
    : normalizedAmount;
}

export function applyAccountBalanceDeltas(
  accounts: AccountData[],
  deltas: AccountBalanceDelta[],
  timestamp = new Date().toISOString(),
) {
  if (
    deltas.length ===
    0
  ) {
    return accounts;
  }

  const deltaMap =
    new Map<
      string,
      AccountBalanceDelta
    >();

  deltas.forEach(
    (
      delta,
    ) => {
      const currentDelta =
        deltaMap.get(
          delta.accountId,
        );

      deltaMap.set(
        delta.accountId,
        {
          accountId:
            delta.accountId,
          balanceDelta:
            normalizeCurrency(
              (
                currentDelta
                  ?.balanceDelta ??
                0
              ) +
                delta.balanceDelta,
            ),
          availableBalanceDelta:
            delta.availableBalanceDelta ===
              undefined &&
            currentDelta?.availableBalanceDelta ===
              undefined
              ? undefined
              : normalizeCurrency(
                  (
                    currentDelta
                      ?.availableBalanceDelta ??
                    0
                  ) +
                    (
                      delta.availableBalanceDelta ??
                      0
                    ),
                ),
        },
      );
    },
  );

  return accounts.map(
    (
      account,
    ) => {
      const delta =
        deltaMap.get(
          account.id,
        );

      if (!delta) {
        return account;
      }

      return {
        ...account,
        balance:
          normalizeCurrency(
            account.balance +
              delta.balanceDelta,
          ),
        availableBalance:
          getNextAvailableBalance(
            account,
            delta,
          ),
        updatedAt:
          timestamp,
      };
    },
  );
}

export function getAccountBalanceAfterDelta(
  account: AccountData,
  delta: number,
) {
  return normalizeCurrency(
    account.balance +
      delta,
  );
}

export function normalizeCurrency(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      value * 100,
    ) / 100
  );
}

export function isLiabilityAccount(
  account:
    | Pick<
        AccountData,
        "classification"
      >
    | AccountClassification,
) {
  if (
    typeof account ===
    "string"
  ) {
    return account ===
      "liability";
  }

  return account.classification ===
    "liability";
}

function getTransferBalanceImpact(
  accounts: AccountData[],
  transaction: TransactionData,
  sourceAccount: AccountData,
  destinationAccountId: string | undefined,
  amount: number,
  multiplier: number,
  updateAvailableBalance: boolean,
): TransactionBalanceImpact {
  const destinationAccount =
    destinationAccountId
      ? accounts.find(
          (
            account,
          ) =>
            account.id ===
            destinationAccountId,
        )
      : undefined;

  const sourceDelta =
    calculateTransferDelta(
      sourceAccount,
      "source",
      amount,
    ) *
    multiplier;

  const deltas: AccountBalanceDelta[] = [
    createBalanceDelta(
      sourceAccount,
      sourceDelta,
      updateAvailableBalance,
    ),
  ];

  if (
    destinationAccount &&
    destinationAccount.id !==
      sourceAccount.id
  ) {
    const destinationDelta =
      calculateTransferDelta(
        destinationAccount,
        "destination",
        amount,
      ) *
      multiplier;

    deltas.push(
      createBalanceDelta(
        destinationAccount,
        destinationDelta,
        updateAvailableBalance,
      ),
    );
  }

  return {
    transactionId:
      transaction.id,
    sourceAccountId:
      sourceAccount.id,
    destinationAccountId:
      destinationAccount?.id ??
      destinationAccountId,
    deltas,
  };
}

function createBalanceDelta(
  account: AccountData,
  balanceDelta: number,
  updateAvailableBalance: boolean,
): AccountBalanceDelta {
  return {
    accountId:
      account.id,
    balanceDelta:
      normalizeCurrency(
        balanceDelta,
      ),
    availableBalanceDelta:
      updateAvailableBalance &&
      account.availableBalance !==
        undefined
        ? normalizeCurrency(
            balanceDelta,
          )
        : undefined,
  };
}

function getNextAvailableBalance(
  account: AccountData,
  delta: AccountBalanceDelta,
) {
  if (
    account.availableBalance ===
      undefined
  ) {
    return undefined;
  }

  if (
    delta.availableBalanceDelta ===
      undefined
  ) {
    return account.availableBalance;
  }

  return normalizeCurrency(
    account.availableBalance +
      delta.availableBalanceDelta,
  );
}