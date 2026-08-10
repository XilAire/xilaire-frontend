import type {
  AccountData,
} from "@/components/providers/AccountsProvider";
import type {
  DebtData,
} from "@/components/providers/DebtsProvider";
import type {
  GoalData,
} from "@/components/providers/GoalsProvider";

import type {
  BillData,
} from "@/types/bill";
import type {
  TransactionData,
} from "@/types/transaction";

export type DashboardActivityType =
  | "income-added"
  | "transaction-added"
  | "transaction-pending"
  | "transaction-cleared"
  | "transaction-transfer"
  | "transaction-categorized"
  | "bill-added"
  | "bill-paid"
  | "budget-updated"
  | "goal-created"
  | "goal-contribution"
  | "debt-payment"
  | "account-added"
  | "account-connected"
  | "account-balance-updated"
  | "member-added"
  | "workspace-updated"
  | "security"
  | "general";

export type DashboardActivityCategory =
  | "budget"
  | "transactions"
  | "bills"
  | "goals"
  | "debts"
  | "accounts"
  | "workspace"
  | "security";

export type DashboardActivityActor = {
  id?: string;
  name: string;
  initials?: string;
  avatarUrl?: string;
};

export type DashboardActivityAction = {
  label: string;
  href: string;
};

export type DashboardActivityItem = {
  id: string;
  type: DashboardActivityType;
  category: DashboardActivityCategory;
  title: string;
  description?: string;
  occurredAt: string;
  actor?: DashboardActivityActor;
  amount?: number;
  metadata?: string[];
  action?: DashboardActivityAction;
  isUnread?: boolean;
};

export type DashboardBudgetActivityInput = {
  id: string;
  title: string;
  description?: string;
  occurredAt: string;
  metadata?: string[];
  action?: DashboardActivityAction;
  isUnread?: boolean;
};

export type DashboardWorkspaceActivityInput = {
  id: string;
  type:
    | "member-added"
    | "workspace-updated";
  title: string;
  description?: string;
  occurredAt: string;
  actor?: DashboardActivityActor;
  metadata?: string[];
  action?: DashboardActivityAction;
  isUnread?: boolean;
};

export type DashboardSecurityActivityInput = {
  id: string;
  title: string;
  description?: string;
  occurredAt: string;
  actor?: DashboardActivityActor;
  metadata?: string[];
  action?: DashboardActivityAction;
  isUnread?: boolean;
};

export type BuildDashboardActivityFeedInput = {
  transactions?: TransactionData[];
  bills?: BillData[];
  goals?: GoalData[];
  debts?: DebtData[];
  accounts?: AccountData[];
  budgetActivities?: DashboardBudgetActivityInput[];
  workspaceActivities?: DashboardWorkspaceActivityInput[];
  securityActivities?: DashboardSecurityActivityInput[];
  defaultActor?: DashboardActivityActor;
  unreadAfter?: string;
  maxItems?: number;
};

const DEFAULT_MAX_ITEMS =
  50;

export function buildDashboardActivityFeed({
  transactions = [],
  bills = [],
  goals = [],
  debts = [],
  accounts = [],
  budgetActivities = [],
  workspaceActivities = [],
  securityActivities = [],
  defaultActor,
  unreadAfter,
  maxItems = DEFAULT_MAX_ITEMS,
}: BuildDashboardActivityFeedInput): DashboardActivityItem[] {
  const unreadAfterTimestamp =
    parseTimestamp(
      unreadAfter,
    );

  const activities: DashboardActivityItem[] = [
    ...transactions.flatMap(
      (
        transaction,
      ) =>
        buildTransactionActivities(
          transaction,
          defaultActor,
          unreadAfterTimestamp,
        ),
    ),
    ...bills.flatMap(
      (
        bill,
      ) =>
        buildBillActivities(
          bill,
          defaultActor,
          unreadAfterTimestamp,
        ),
    ),
    ...goals.flatMap(
      (
        goal,
      ) =>
        buildGoalActivities(
          goal,
          defaultActor,
          unreadAfterTimestamp,
        ),
    ),
    ...debts.flatMap(
      (
        debt,
      ) =>
        buildDebtActivities(
          debt,
          defaultActor,
          unreadAfterTimestamp,
        ),
    ),
    ...accounts.flatMap(
      (
        account,
      ) =>
        buildAccountActivities(
          account,
          defaultActor,
          unreadAfterTimestamp,
        ),
    ),
    ...budgetActivities.map(
      (
        activity,
      ): DashboardActivityItem => ({
        id:
          `budget-${activity.id}`,
        type:
          "budget-updated",
        category:
          "budget",
        title:
          activity.title,
        description:
          activity.description,
        occurredAt:
          normalizeDateTime(
            activity.occurredAt,
          ),
        actor:
          defaultActor,
        metadata:
          cleanMetadata(
            activity.metadata,
          ),
        action:
          activity.action ?? {
            label:
              "Open budget",
            href:
              "/dashboard/budget",
          },
        isUnread:
          activity.isUnread ??
          isUnreadActivity(
            activity.occurredAt,
            unreadAfterTimestamp,
          ),
      }),
    ),
    ...workspaceActivities.map(
      (
        activity,
      ): DashboardActivityItem => ({
        id:
          `workspace-${activity.id}`,
        type:
          activity.type,
        category:
          "workspace",
        title:
          activity.title,
        description:
          activity.description,
        occurredAt:
          normalizeDateTime(
            activity.occurredAt,
          ),
        actor:
          activity.actor ??
          defaultActor,
        metadata:
          cleanMetadata(
            activity.metadata,
          ),
        action:
          activity.action,
        isUnread:
          activity.isUnread ??
          isUnreadActivity(
            activity.occurredAt,
            unreadAfterTimestamp,
          ),
      }),
    ),
    ...securityActivities.map(
      (
        activity,
      ): DashboardActivityItem => ({
        id:
          `security-${activity.id}`,
        type:
          "security",
        category:
          "security",
        title:
          activity.title,
        description:
          activity.description,
        occurredAt:
          normalizeDateTime(
            activity.occurredAt,
          ),
        actor:
          activity.actor ??
          defaultActor,
        metadata:
          cleanMetadata(
            activity.metadata,
          ),
        action:
          activity.action ?? {
            label:
              "Security settings",
            href:
              "/dashboard/settings?section=security",
          },
        isUnread:
          activity.isUnread ??
          isUnreadActivity(
            activity.occurredAt,
            unreadAfterTimestamp,
          ),
      }),
    ),
  ];

  return deduplicateActivities(
    activities,
  )
    .sort(
      (
        firstActivity,
        secondActivity,
      ) =>
        getTimestamp(
          secondActivity.occurredAt,
        ) -
        getTimestamp(
          firstActivity.occurredAt,
        ),
    )
    .slice(
      0,
      normalizeMaxItems(
        maxItems,
      ),
    );
}

function buildTransactionActivities(
  transaction: TransactionData,
  actor: DashboardActivityActor | undefined,
  unreadAfterTimestamp: number | null,
): DashboardActivityItem[] {
  const occurredAt =
    normalizeDateTime(
      getOptionalString(
        transaction,
        "updatedAt",
      ) ??
      getOptionalString(
        transaction,
        "createdAt",
      ) ??
      transaction.date,
    );

  const transactionLabel =
    getTransactionLabel(
      transaction,
    );

  const categoryName =
    transaction.category?.name;

  const accountName =
    transaction.account?.name;

  const destinationAccountId =
    transaction.transferAccountId;

  const destinationAccountLabel =
    transaction.type ===
      "transfer" &&
    destinationAccountId
      ? getTransferDestinationLabel(
          destinationAccountId,
        )
      : undefined;

  const baseMetadata =
    cleanMetadata([
      categoryName,
      accountName,
      destinationAccountLabel
        ? `To ${destinationAccountLabel}`
        : undefined,
      formatTransactionStatus(
        transaction.status,
      ),
    ]);

  const action:
    DashboardActivityAction = {
      label:
        "View transaction",
      href:
        `/dashboard/transactions?transactionId=${encodeURIComponent(
          transaction.id,
        )}`,
    };

  if (
    transaction.type ===
    "transfer"
  ) {
    return [
      {
        id:
          `transaction-transfer-${transaction.id}`,
        type:
          "transaction-transfer",
        category:
          "transactions",
        title:
          `${transactionLabel} transfer recorded`,
        description:
          destinationAccountLabel
            ? `${formatCurrency(
                transaction.amount,
              )} moved from ${
                accountName ??
                "the source account"
              } to ${destinationAccountLabel}.`
            : `${formatCurrency(
                transaction.amount,
              )} was recorded as an account transfer.`,
        occurredAt,
        actor,
        amount:
          Math.abs(
            transaction.amount,
          ),
        metadata:
          baseMetadata,
        action,
        isUnread:
          isUnreadActivity(
            occurredAt,
            unreadAfterTimestamp,
          ),
      },
    ];
  }

  const isIncome =
    transaction.type ===
    "income";

  const statusActivityType:
    DashboardActivityType =
      transaction.status ===
      "pending"
        ? "transaction-pending"
        : "transaction-cleared";

  const activities:
    DashboardActivityItem[] = [
      {
        id:
          `transaction-${transaction.id}`,
        type:
          isIncome
            ? "income-added"
            : "transaction-added",
        category:
          "transactions",
        title:
          isIncome
            ? `${transactionLabel} income added`
            : `${transactionLabel} expense added`,
        description:
          isIncome
            ? `An income transaction for ${formatCurrency(
                transaction.amount,
              )} was recorded.`
            : categoryName
              ? `The expense was recorded in ${categoryName}.`
              : "A new expense transaction was recorded.",
        occurredAt,
        actor,
        amount:
          Math.abs(
            transaction.amount,
          ),
        metadata:
          baseMetadata,
        action,
        isUnread:
          isUnreadActivity(
            occurredAt,
            unreadAfterTimestamp,
          ),
      },
      {
        id:
          `transaction-status-${transaction.id}-${transaction.status}`,
        type:
          statusActivityType,
        category:
          "transactions",
        title:
          transaction.status ===
          "pending"
            ? `${transactionLabel} is pending`
            : `${transactionLabel} cleared`,
        description:
          transaction.status ===
          "pending"
            ? "This transaction has not yet affected cleared cash-flow totals."
            : isIncome
              ? "This income is included in cleared cash-flow totals."
              : "This expense is included in cleared cash-flow and account balances.",
        occurredAt,
        actor,
        amount:
          Math.abs(
            transaction.amount,
          ),
        metadata:
          baseMetadata,
        action,
        isUnread:
          isUnreadActivity(
            occurredAt,
            unreadAfterTimestamp,
          ),
      },
    ];

  if (
    categoryName
  ) {
    activities.push({
      id:
        `transaction-category-${transaction.id}`,
      type:
        "transaction-categorized",
      category:
        "transactions",
      title:
        `${transactionLabel} categorized`,
      description:
        `The transaction is assigned to ${categoryName}.`,
      occurredAt,
      actor,
      amount:
        Math.abs(
          transaction.amount,
        ),
      metadata:
        cleanMetadata([
          categoryName,
          transaction.category?.groupName,
          accountName,
        ]),
      action,
      isUnread:
        isUnreadActivity(
          occurredAt,
          unreadAfterTimestamp,
        ),
    });
  }

  return activities;
}

function buildBillActivities(
  bill: BillData,
  actor: DashboardActivityActor | undefined,
  unreadAfterTimestamp: number | null,
): DashboardActivityItem[] {
  const createdAt =
    normalizeDateTime(
      bill.createdAt ??
      bill.dueDate,
    );

  const updatedAt =
    normalizeDateTime(
      bill.updatedAt ??
      bill.createdAt ??
      bill.dueDate,
    );

  const paidAt =
    getOptionalString(
      bill,
      "paidAt",
    ) ??
    getOptionalString(
      bill,
      "paidDate",
    );

  const activities:
    DashboardActivityItem[] = [
      {
        id:
          `bill-added-${bill.id}`,
        type:
          "bill-added",
        category:
          "bills",
        title:
          `${bill.name} bill added`,
        description:
          bill.payee
            ? `A bill for ${bill.payee} was added.`
            : "A new bill was added.",
        occurredAt:
          createdAt,
        actor,
        amount:
          Math.abs(
            bill.amount,
          ),
        metadata:
          cleanMetadata([
            formatBillStatus(
              bill.status,
            ),
            bill.account?.name,
            bill.budgetItem?.name,
          ]),
        action: {
          label:
            "View bill",
          href:
            `/dashboard/bills?billId=${encodeURIComponent(
              bill.id,
            )}`,
        },
        isUnread:
          isUnreadActivity(
            createdAt,
            unreadAfterTimestamp,
          ),
      },
    ];

  if (
    bill.status ===
      "paid" ||
    paidAt
  ) {
    const paidOccurredAt =
      normalizeDateTime(
        paidAt ??
        updatedAt,
      );

    activities.push({
      id:
        `bill-paid-${bill.id}`,
      type:
        "bill-paid",
      category:
        "bills",
      title:
        `${bill.name} marked as paid`,
      description:
        "The bill payment was recorded successfully.",
      occurredAt:
        paidOccurredAt,
      actor,
      amount:
        Math.abs(
          bill.amount,
        ),
      metadata:
        cleanMetadata([
          bill.account?.name,
          bill.budgetItem?.name,
        ]),
      action: {
        label:
          "View bill",
        href:
          `/dashboard/bills?billId=${encodeURIComponent(
            bill.id,
          )}`,
      },
      isUnread:
        isUnreadActivity(
          paidOccurredAt,
          unreadAfterTimestamp,
        ),
    });
  }

  return activities;
}

function buildGoalActivities(
  goal: GoalData,
  actor: DashboardActivityActor | undefined,
  unreadAfterTimestamp: number | null,
): DashboardActivityItem[] {
  const createdAt =
    normalizeDateTime(
      goal.createdAt,
    );

  const updatedAt =
    normalizeDateTime(
      goal.updatedAt,
    );

  const activities:
    DashboardActivityItem[] = [
      {
        id:
          `goal-created-${goal.id}`,
        type:
          "goal-created",
        category:
          "goals",
        title:
          `${goal.name} goal created`,
        description:
          `The savings target is ${formatCurrency(
            goal.targetAmount,
          )}.`,
        occurredAt:
          createdAt,
        actor,
        amount:
          goal.targetAmount,
        metadata:
          cleanMetadata([
            formatGoalStatus(
              goal.status,
            ),
            goal.targetDate
              ? `Target ${formatDate(
                  goal.targetDate,
                )}`
              : undefined,
          ]),
        action: {
          label:
            "View goal",
          href:
            `/dashboard/goals?goalId=${encodeURIComponent(
              goal.id,
            )}`,
        },
        isUnread:
          isUnreadActivity(
            createdAt,
            unreadAfterTimestamp,
          ),
      },
    ];

  if (
    isMeaningfullyLater(
      updatedAt,
      createdAt,
    ) &&
    goal.currentAmount >
      0
  ) {
    const progress =
      goal.targetAmount >
      0
        ? Math.min(
            100,
            (
              goal.currentAmount /
              goal.targetAmount
            ) *
              100,
          )
        : 0;

    activities.push({
      id:
        `goal-contribution-${goal.id}-${updatedAt}`,
      type:
        "goal-contribution",
      category:
        "goals",
      title:
        `${goal.name} progress updated`,
      description:
        `The goal is now ${formatPercentage(
          progress,
        )} complete.`,
      occurredAt:
        updatedAt,
      actor,
      amount:
        goal.currentAmount,
      metadata:
        cleanMetadata([
          formatCurrency(
            goal.currentAmount,
          ) + " saved",
          formatGoalStatus(
            goal.status,
          ),
        ]),
      action: {
        label:
          "View goal",
        href:
          `/dashboard/goals?goalId=${encodeURIComponent(
            goal.id,
          )}`,
      },
      isUnread:
        isUnreadActivity(
          updatedAt,
          unreadAfterTimestamp,
        ),
    });
  }

  return activities;
}

function buildDebtActivities(
  debt: DebtData,
  actor: DashboardActivityActor | undefined,
  unreadAfterTimestamp: number | null,
): DashboardActivityItem[] {
  const createdAt =
    normalizeDateTime(
      debt.createdAt,
    );

  const updatedAt =
    normalizeDateTime(
      debt.updatedAt,
    );

  const activities:
    DashboardActivityItem[] = [
      {
        id:
          `debt-added-${debt.id}`,
        type:
          "general",
        category:
          "debts",
        title:
          `${debt.name} debt added`,
        description:
          `The starting balance is ${formatCurrency(
            debt.originalBalance,
          )}.`,
        occurredAt:
          createdAt,
        actor,
        amount:
          debt.currentBalance,
        metadata:
          cleanMetadata([
            debt.lender,
            formatDebtType(
              debt.type,
            ),
          ]),
        action: {
          label:
            "View debt",
          href:
            `/dashboard/debts?debtId=${encodeURIComponent(
              debt.id,
            )}`,
        },
        isUnread:
          isUnreadActivity(
            createdAt,
            unreadAfterTimestamp,
          ),
      },
    ];

  if (
    isMeaningfullyLater(
      updatedAt,
      createdAt,
    ) &&
    debt.currentBalance <
      debt.originalBalance
  ) {
    const amountPaid =
      Math.max(
        0,
        debt.originalBalance -
          debt.currentBalance,
      );

    activities.push({
      id:
        `debt-payment-${debt.id}-${updatedAt}`,
      type:
        "debt-payment",
      category:
        "debts",
      title:
        `${debt.name} payment progress updated`,
      description:
        debt.status ===
        "paid-off"
          ? "The debt has been paid off."
          : `The remaining balance is ${formatCurrency(
              debt.currentBalance,
            )}.`,
      occurredAt:
        updatedAt,
      actor,
      amount:
        amountPaid,
      metadata:
        cleanMetadata([
          formatDebtType(
            debt.type,
          ),
          debt.status ===
          "paid-off"
            ? "Paid off"
            : undefined,
        ]),
      action: {
        label:
          "View debt",
        href:
          `/dashboard/debts?debtId=${encodeURIComponent(
            debt.id,
          )}`,
      },
      isUnread:
        isUnreadActivity(
          updatedAt,
          unreadAfterTimestamp,
        ),
    });
  }

  return activities;
}

function buildAccountActivities(
  account: AccountData,
  actor: DashboardActivityActor | undefined,
  unreadAfterTimestamp: number | null,
): DashboardActivityItem[] {
  const createdAt =
    normalizeDateTime(
      account.createdAt,
    );

  const updatedAt =
    normalizeDateTime(
      account.updatedAt,
    );

  const activities:
    DashboardActivityItem[] = [
      {
        id:
          `account-added-${account.id}`,
        type:
          "account-added",
        category:
          "accounts",
        title:
          `${account.name} account added`,
        description:
          account.institution
            ? `${account.institution} was added to your accounts.`
            : "A manual account was added.",
        occurredAt:
          createdAt,
        actor,
        amount:
          Math.abs(
            account.balance,
          ),
        metadata:
          cleanMetadata([
            formatAccountType(
              account.type,
            ),
            account.classification ===
            "asset"
              ? "Asset"
              : "Liability",
            account.isIncludedInNetWorth
              ? "Included in net worth"
              : undefined,
          ]),
        action: {
          label:
            "View account",
          href:
            `/dashboard/accounts?accountId=${encodeURIComponent(
              account.id,
            )}`,
        },
        isUnread:
          isUnreadActivity(
            createdAt,
            unreadAfterTimestamp,
          ),
      },
    ];

  if (
    isMeaningfullyLater(
      updatedAt,
      createdAt,
    )
  ) {
    activities.push({
      id:
        `account-balance-updated-${account.id}-${updatedAt}`,
      type:
        "account-balance-updated",
      category:
        "accounts",
      title:
        `${account.name} balance updated`,
      description:
        account.classification ===
        "liability"
          ? `The current liability balance is ${formatCurrency(
              account.balance,
            )}.`
          : `The current account balance is ${formatCurrency(
              account.balance,
            )}.`,
      occurredAt:
        updatedAt,
      actor,
      amount:
        Math.abs(
          account.balance,
        ),
      metadata:
        cleanMetadata([
          formatAccountType(
            account.type,
          ),
          account.availableBalance !==
          undefined
            ? `Available ${formatCurrency(
                account.availableBalance,
              )}`
            : undefined,
          account.isIncludedInNetWorth
            ? "Included in net worth"
            : "Excluded from net worth",
        ]),
      action: {
        label:
          "View account",
        href:
          `/dashboard/accounts?accountId=${encodeURIComponent(
            account.id,
          )}`,
      },
      isUnread:
        isUnreadActivity(
          updatedAt,
          unreadAfterTimestamp,
        ),
    });
  }

  if (
    account.connectionStatus ===
      "connected"
  ) {
    const connectedAt =
      normalizeDateTime(
        account.lastSyncedAt ??
        updatedAt,
      );

    activities.push({
      id:
        `account-connected-${account.id}`,
      type:
        "account-connected",
      category:
        "accounts",
      title:
        `${account.name} connected`,
      description:
        account.institution
          ? `${account.institution} is connected for account updates.`
          : "The account is connected for updates.",
      occurredAt:
        connectedAt,
      actor,
      metadata:
        cleanMetadata([
          formatAccountType(
            account.type,
          ),
          account.lastSyncedAt
            ? `Synced ${formatDateTime(
                account.lastSyncedAt,
              )}`
            : undefined,
        ]),
      action: {
        label:
          "View account",
        href:
          `/dashboard/accounts?accountId=${encodeURIComponent(
            account.id,
          )}`,
      },
      isUnread:
        isUnreadActivity(
          connectedAt,
          unreadAfterTimestamp,
        ),
    });
  }

  return activities;
}

function getTransferDestinationLabel(
  accountId: string,
) {
  const normalizedAccountId =
    accountId
      .trim()
      .replace(
        /^account-/,
        "",
      )
      .replace(
        /[-_]+/g,
        " ",
      );

  if (
    normalizedAccountId ===
    ""
  ) {
    return "destination account";
  }

  return normalizedAccountId
    .split(
      /\s+/,
    )
    .filter(
      Boolean,
    )
    .map(
      (
        word,
      ) =>
        `${word
          .charAt(
            0,
          )
          .toUpperCase()}${word.slice(
          1,
        )}`,
    )
    .join(
      " ",
    );
}

function getTransactionLabel(
  transaction: TransactionData,
) {
  const merchant =
    transaction.merchant?.trim();

  if (merchant) {
    return merchant;
  }

  return transaction.type ===
    "income"
    ? "Income"
    : transaction.type ===
        "transfer"
      ? "Transfer"
      : "Transaction";
}

function formatTransactionStatus(
  status:
    TransactionData["status"],
) {
  switch (status) {
    case "cleared":
      return "Cleared";

    case "pending":
      return "Pending";

    default:
      return undefined;
  }
}

function formatBillStatus(
  status:
    BillData["status"],
) {
  switch (status) {
    case "paid":
      return "Paid";

    case "past-due":
      return "Past due";

    case "due-soon":
      return "Due soon";

    case "upcoming":
      return "Upcoming";

    default:
      return undefined;
  }
}

function formatGoalStatus(
  status:
    GoalData["status"],
) {
  switch (status) {
    case "completed":
      return "Completed";

    case "paused":
      return "Paused";

    case "active":
    default:
      return "Active";
  }
}

function formatDebtType(
  type:
    DebtData["type"],
) {
  return type
    .split(
      "-",
    )
    .map(
      (
        word,
      ) =>
        `${word
          .charAt(
            0,
          )
          .toUpperCase()}${word.slice(
          1,
        )}`,
    )
    .join(
      " ",
    );
}

function formatAccountType(
  type:
    AccountData["type"],
) {
  return type
    .split(
      "-",
    )
    .map(
      (
        word,
      ) =>
        `${word
          .charAt(
            0,
          )
          .toUpperCase()}${word.slice(
          1,
        )}`,
    )
    .join(
      " ",
    );
}

function normalizeDateTime(
  value: string,
) {
  const parsedDate =
    new Date(
      value,
    );

  if (
    !Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return parsedDate.toISOString();
  }

  const dateOnly =
    new Date(
      `${value.slice(
        0,
        10,
      )}T12:00:00`,
    );

  if (
    !Number.isNaN(
      dateOnly.getTime(),
    )
  ) {
    return dateOnly.toISOString();
  }

  return new Date(
    0,
  ).toISOString();
}

function isUnreadActivity(
  occurredAt: string,
  unreadAfterTimestamp: number | null,
) {
  if (
    unreadAfterTimestamp ===
    null
  ) {
    return false;
  }

  return (
    getTimestamp(
      occurredAt,
    ) >
    unreadAfterTimestamp
  );
}

function parseTimestamp(
  value:
    | string
    | undefined,
) {
  if (!value) {
    return null;
  }

  const timestamp =
    new Date(
      value,
    ).getTime();

  return Number.isNaN(
    timestamp,
  )
    ? null
    : timestamp;
}

function getTimestamp(
  value: string,
) {
  const timestamp =
    new Date(
      value,
    ).getTime();

  return Number.isNaN(
    timestamp,
  )
    ? 0
    : timestamp;
}

function isMeaningfullyLater(
  laterValue: string,
  earlierValue: string,
) {
  return (
    getTimestamp(
      laterValue,
    ) -
      getTimestamp(
        earlierValue,
      ) >
    1000
  );
}

function getOptionalString(
  value: unknown,
  key: string,
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return undefined;
  }

  const candidate =
    (
      value as Record<
        string,
        unknown
      >
    )[key];

  return typeof candidate ===
    "string"
    ? candidate
    : undefined;
}

function cleanMetadata(
  metadata:
    | (
        | string
        | undefined
        | null
        | false
      )[]
    | undefined,
) {
  if (!metadata) {
    return undefined;
  }

  const cleanedMetadata =
    metadata
      .filter(
        (
          item,
        ): item is string =>
          typeof item ===
            "string" &&
          item.trim() !==
            "",
      )
      .map(
        (
          item,
        ) =>
          item.trim(),
      );

  return cleanedMetadata.length >
    0
    ? Array.from(
        new Set(
          cleanedMetadata,
        ),
      )
    : undefined;
}

function deduplicateActivities(
  activities: DashboardActivityItem[],
) {
  const activityMap =
    new Map<
      string,
      DashboardActivityItem
    >();

  activities.forEach(
    (
      activity,
    ) => {
      const key =
        `${activity.id}-${activity.occurredAt}`;

      activityMap.set(
        key,
        activity,
      );
    },
  );

  return Array.from(
    activityMap.values(),
  );
}

function normalizeMaxItems(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return DEFAULT_MAX_ITEMS;
  }

  return Math.max(
    0,
    Math.floor(
      value,
    ),
  );
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",
      currency:
        "USD",
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2,
    },
  ).format(
    Number.isFinite(
      value,
    )
      ? Math.abs(
          value,
        )
      : 0,
  );
}

function formatPercentage(
  value: number,
) {
  const safeValue =
    Number.isFinite(
      value,
    )
      ? value
      : 0;

  return `${safeValue.toFixed(
    safeValue >=
      100
      ? 0
      : 1,
  )}%`;
}

function formatDate(
  value: string,
) {
  const date =
    new Date(
      `${value.slice(
        0,
        10,
      )}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
    },
  );
}

function formatDateTime(
  value: string,
) {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      hour:
        "numeric",
      minute:
        "2-digit",
    },
  );
}
