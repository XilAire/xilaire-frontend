import type {
  AccountData,
} from "@/components/providers/AccountsProvider";

import type {
  TransactionData,
} from "@/types/transaction";

export type ReportPeriodPreset =
  | "this-month"
  | "last-month"
  | "year-to-date"
  | "last-30-days"
  | "last-90-days"
  | "custom";

export type ReportDateRange = {
  startDate: string;
  endDate: string;
};

export type ReportTransactionTotals = {
  income: number;
  expenses: number;
  transfers: number;
  netCashFlow: number;
  clearedIncome: number;
  clearedExpenses: number;
  pendingIncome: number;
  pendingExpenses: number;
  transactionCount: number;
  clearedTransactionCount: number;
  pendingTransactionCount: number;
};

export type ReportAccountTotals = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  includedAccountCount: number;
  assetAccountCount: number;
  liabilityAccountCount: number;
};

export type ReportCategoryBreakdownItem = {
  id: string;
  name: string;
  groupName: string;
  amount: number;
  transactionCount: number;
  percentage: number;
};

export type ReportIncomeBreakdownItem = {
  id: string;
  name: string;
  groupName: string;
  amount: number;
  transactionCount: number;
  percentage: number;
};

export type ReportAccountBreakdownItem = {
  accountId: string;
  accountName: string;
  accountType: string;
  amount: number;
  transactionCount: number;
  percentage: number;
};

export type ReportMonthlyPoint = {
  month: string;
  label: string;
  income: number;
  expenses: number;
  transfers: number;
  netCashFlow: number;
  transactionCount: number;
};

export type ReportDailyPoint = {
  date: string;
  income: number;
  expenses: number;
  transfers: number;
  netCashFlow: number;
  transactionCount: number;
};

export type ReportSummary = {
  period: ReportDateRange;
  transactionTotals: ReportTransactionTotals;
  accountTotals: ReportAccountTotals;
  spendingByCategory: ReportCategoryBreakdownItem[];
  incomeByCategory: ReportIncomeBreakdownItem[];
  spendingByAccount: ReportAccountBreakdownItem[];
  monthlyTrend: ReportMonthlyPoint[];
  dailyTrend: ReportDailyPoint[];
};

export type BuildReportSummaryInput = {
  transactions: TransactionData[];
  accounts: AccountData[];
  dateRange: ReportDateRange;
};

export type ResolveReportDateRangeInput = {
  preset: ReportPeriodPreset;
  referenceDate?: Date;
  customStartDate?: string;
  customEndDate?: string;
};

export function buildReportSummary({
  transactions,
  accounts,
  dateRange,
}: BuildReportSummaryInput): ReportSummary {
  const normalizedRange =
    normalizeDateRange(
      dateRange,
    );

  const periodTransactions =
    filterTransactionsByDateRange(
      transactions,
      normalizedRange,
    );

  return {
    period:
      normalizedRange,

    transactionTotals:
      calculateTransactionTotals(
        periodTransactions,
      ),

    accountTotals:
      calculateAccountTotals(
        accounts,
      ),

    spendingByCategory:
      calculateSpendingByCategory(
        periodTransactions,
      ),

    incomeByCategory:
      calculateIncomeByCategory(
        periodTransactions,
      ),

    spendingByAccount:
      calculateSpendingByAccount(
        periodTransactions,
      ),

    monthlyTrend:
      calculateMonthlyTrend(
        periodTransactions,
        normalizedRange,
      ),

    dailyTrend:
      calculateDailyTrend(
        periodTransactions,
        normalizedRange,
      ),
  };
}

export function resolveReportDateRange({
  preset,
  referenceDate =
    new Date(),
  customStartDate,
  customEndDate,
}: ResolveReportDateRangeInput): ReportDateRange {
  const localReferenceDate =
    new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
    );

  switch (
    preset
  ) {
    case "this-month":
      return {
        startDate:
          toLocalDateString(
            new Date(
              localReferenceDate.getFullYear(),
              localReferenceDate.getMonth(),
              1,
            ),
          ),

        endDate:
          toLocalDateString(
            new Date(
              localReferenceDate.getFullYear(),
              localReferenceDate.getMonth() +
                1,
              0,
            ),
          ),
      };

    case "last-month":
      return {
        startDate:
          toLocalDateString(
            new Date(
              localReferenceDate.getFullYear(),
              localReferenceDate.getMonth() -
                1,
              1,
            ),
          ),

        endDate:
          toLocalDateString(
            new Date(
              localReferenceDate.getFullYear(),
              localReferenceDate.getMonth(),
              0,
            ),
          ),
      };

    case "year-to-date":
      return {
        startDate:
          `${localReferenceDate.getFullYear()}-01-01`,

        endDate:
          toLocalDateString(
            localReferenceDate,
          ),
      };

    case "last-30-days":
      return {
        startDate:
          toLocalDateString(
            addDays(
              localReferenceDate,
              -29,
            ),
          ),

        endDate:
          toLocalDateString(
            localReferenceDate,
          ),
      };

    case "last-90-days":
      return {
        startDate:
          toLocalDateString(
            addDays(
              localReferenceDate,
              -89,
            ),
          ),

        endDate:
          toLocalDateString(
            localReferenceDate,
          ),
      };

    case "custom": {
      const startDate =
        normalizeDateString(
          customStartDate,
        );

      const endDate =
        normalizeDateString(
          customEndDate,
        );

      if (
        !startDate ||
        !endDate
      ) {
        return resolveReportDateRange({
          preset:
            "this-month",

          referenceDate:
            localReferenceDate,
        });
      }

      return normalizeDateRange({
        startDate,
        endDate,
      });
    }

    default:
      return resolveReportDateRange({
        preset:
          "this-month",

        referenceDate:
          localReferenceDate,
      });
  }
}

export function filterTransactionsByDateRange(
  transactions:
    TransactionData[],
  dateRange:
    ReportDateRange,
) {
  const normalizedRange =
    normalizeDateRange(
      dateRange,
    );

  return transactions.filter(
    (
      transaction,
    ) => {
      const transactionDate =
        normalizeDateString(
          transaction.date,
        );

      if (
        !transactionDate
      ) {
        return false;
      }

      return (
        transactionDate >=
          normalizedRange.startDate &&
        transactionDate <=
          normalizedRange.endDate
      );
    },
  );
}

export function calculateTransactionTotals(
  transactions:
    TransactionData[],
): ReportTransactionTotals {
  return transactions.reduce<ReportTransactionTotals>(
    (
      totals,
      transaction,
    ) => {
      const amount =
        normalizeMoney(
          transaction.amount,
        );

      totals.transactionCount +=
        1;

      if (
        transaction.status ===
        "cleared"
      ) {
        totals.clearedTransactionCount +=
          1;
      } else {
        totals.pendingTransactionCount +=
          1;
      }

      if (
        transaction.type ===
        "income"
      ) {
        totals.income =
          normalizeMoney(
            totals.income +
              amount,
          );

        if (
          transaction.status ===
          "cleared"
        ) {
          totals.clearedIncome =
            normalizeMoney(
              totals.clearedIncome +
                amount,
            );
        } else {
          totals.pendingIncome =
            normalizeMoney(
              totals.pendingIncome +
                amount,
            );
        }

        return totals;
      }

      if (
        transaction.type ===
        "expense"
      ) {
        totals.expenses =
          normalizeMoney(
            totals.expenses +
              amount,
          );

        if (
          transaction.status ===
          "cleared"
        ) {
          totals.clearedExpenses =
            normalizeMoney(
              totals.clearedExpenses +
                amount,
            );
        } else {
          totals.pendingExpenses =
            normalizeMoney(
              totals.pendingExpenses +
                amount,
            );
        }

        return totals;
      }

      if (
        transaction.type ===
        "transfer"
      ) {
        totals.transfers =
          normalizeMoney(
            totals.transfers +
              amount,
          );
      }

      return totals;
    },
    {
      income: 0,
      expenses: 0,
      transfers: 0,
      netCashFlow: 0,
      clearedIncome: 0,
      clearedExpenses: 0,
      pendingIncome: 0,
      pendingExpenses: 0,
      transactionCount: 0,
      clearedTransactionCount: 0,
      pendingTransactionCount: 0,
    },
  );
}

export function calculateClearedTransactionTotals(
  transactions:
    TransactionData[],
): ReportTransactionTotals {
  return calculateTransactionTotals(
    transactions.filter(
      (
        transaction,
      ) =>
        transaction.status ===
        "cleared",
    ),
  );
}

export function calculateAccountTotals(
  accounts:
    AccountData[],
): ReportAccountTotals {
  const includedAccounts =
    accounts.filter(
      (
        account,
      ) =>
        account.isIncludedInNetWorth,
    );

  const assetAccounts =
    includedAccounts.filter(
      (
        account,
      ) =>
        account.classification ===
        "asset",
    );

  const liabilityAccounts =
    includedAccounts.filter(
      (
        account,
      ) =>
        account.classification ===
        "liability",
    );

  const totalAssets =
    normalizeMoney(
      assetAccounts.reduce(
        (
          total,
          account,
        ) =>
          total +
          Math.abs(
            normalizeFiniteNumber(
              account.balance,
            ),
          ),
        0,
      ),
    );

  const totalLiabilities =
    normalizeMoney(
      liabilityAccounts.reduce(
        (
          total,
          account,
        ) =>
          total +
          Math.abs(
            normalizeFiniteNumber(
              account.balance,
            ),
          ),
        0,
      ),
    );

  return {
    totalAssets,

    totalLiabilities,

    netWorth:
      normalizeMoney(
        totalAssets -
          totalLiabilities,
      ),

    includedAccountCount:
      includedAccounts.length,

    assetAccountCount:
      assetAccounts.length,

    liabilityAccountCount:
      liabilityAccounts.length,
  };
}

export function calculateSpendingByCategory(
  transactions:
    TransactionData[],
): ReportCategoryBreakdownItem[] {
  const expenseTransactions =
    transactions.filter(
      (
        transaction,
      ) =>
        transaction.type ===
          "expense" &&
        transaction.status ===
          "cleared",
    );

  const categoryMap =
    new Map<
      string,
      {
        id: string;
        name: string;
        groupName: string;
        amount: number;
        transactionCount: number;
      }
    >();

  for (
    const transaction
    of expenseTransactions
  ) {
    const categoryId =
      transaction.category?.id?.trim() ||
      "uncategorized";

    const categoryName =
      transaction.category?.name?.trim() ||
      "Uncategorized";

    const groupName =
      transaction.category?.groupName?.trim() ||
      "Uncategorized";

    const current =
      categoryMap.get(
        categoryId,
      ) ?? {
        id:
          categoryId,

        name:
          categoryName,

        groupName,

        amount: 0,

        transactionCount: 0,
      };

    current.amount =
      normalizeMoney(
        current.amount +
          normalizeMoney(
            transaction.amount,
          ),
      );

    current.transactionCount +=
      1;

    categoryMap.set(
      categoryId,
      current,
    );
  }

  const total =
    Array.from(
      categoryMap.values(),
    ).reduce(
      (
        runningTotal,
        item,
      ) =>
        runningTotal +
        item.amount,
      0,
    );

  return Array.from(
    categoryMap.values(),
  )
    .map(
      (
        item,
      ) => ({
        ...item,

        amount:
          normalizeMoney(
            item.amount,
          ),

        percentage:
          calculatePercentage(
            item.amount,
            total,
          ),
      }),
    )
    .sort(
      (
        firstItem,
        secondItem,
      ) =>
        secondItem.amount -
        firstItem.amount,
    );
}

export function calculateIncomeByCategory(
  transactions:
    TransactionData[],
): ReportIncomeBreakdownItem[] {
  const incomeTransactions =
    transactions.filter(
      (
        transaction,
      ) =>
        transaction.type ===
          "income" &&
        transaction.status ===
          "cleared",
    );

  const categoryMap =
    new Map<
      string,
      {
        id: string;
        name: string;
        groupName: string;
        amount: number;
        transactionCount: number;
      }
    >();

  for (
    const transaction
    of incomeTransactions
  ) {
    const categoryId =
      transaction.category?.id?.trim() ||
      "income";

    const categoryName =
      transaction.category?.name?.trim() ||
      "Income";

    const groupName =
      transaction.category?.groupName?.trim() ||
      "Income";

    const current =
      categoryMap.get(
        categoryId,
      ) ?? {
        id:
          categoryId,

        name:
          categoryName,

        groupName,

        amount: 0,

        transactionCount: 0,
      };

    current.amount =
      normalizeMoney(
        current.amount +
          normalizeMoney(
            transaction.amount,
          ),
      );

    current.transactionCount +=
      1;

    categoryMap.set(
      categoryId,
      current,
    );
  }

  const total =
    Array.from(
      categoryMap.values(),
    ).reduce(
      (
        runningTotal,
        item,
      ) =>
        runningTotal +
        item.amount,
      0,
    );

  return Array.from(
    categoryMap.values(),
  )
    .map(
      (
        item,
      ) => ({
        ...item,

        amount:
          normalizeMoney(
            item.amount,
          ),

        percentage:
          calculatePercentage(
            item.amount,
            total,
          ),
      }),
    )
    .sort(
      (
        firstItem,
        secondItem,
      ) =>
        secondItem.amount -
        firstItem.amount,
    );
}

export function calculateSpendingByAccount(
  transactions:
    TransactionData[],
): ReportAccountBreakdownItem[] {
  const expenseTransactions =
    transactions.filter(
      (
        transaction,
      ) =>
        transaction.type ===
          "expense" &&
        transaction.status ===
          "cleared",
    );

  const accountMap =
    new Map<
      string,
      {
        accountId: string;
        accountName: string;
        accountType: string;
        amount: number;
        transactionCount: number;
      }
    >();

  for (
    const transaction
    of expenseTransactions
  ) {
    const accountId =
      transaction.account.id.trim();

    const accountName =
      transaction.account.name.trim() ||
      "Account";

    const accountType =
      transaction.account.type;

    const current =
      accountMap.get(
        accountId,
      ) ?? {
        accountId,

        accountName,

        accountType,

        amount: 0,

        transactionCount: 0,
      };

    current.amount =
      normalizeMoney(
        current.amount +
          normalizeMoney(
            transaction.amount,
          ),
      );

    current.transactionCount +=
      1;

    accountMap.set(
      accountId,
      current,
    );
  }

  const total =
    Array.from(
      accountMap.values(),
    ).reduce(
      (
        runningTotal,
        item,
      ) =>
        runningTotal +
        item.amount,
      0,
    );

  return Array.from(
    accountMap.values(),
  )
    .map(
      (
        item,
      ) => ({
        ...item,

        amount:
          normalizeMoney(
            item.amount,
          ),

        percentage:
          calculatePercentage(
            item.amount,
            total,
          ),
      }),
    )
    .sort(
      (
        firstItem,
        secondItem,
      ) =>
        secondItem.amount -
        firstItem.amount,
    );
}

export function calculateMonthlyTrend(
  transactions:
    TransactionData[],
  dateRange:
    ReportDateRange,
): ReportMonthlyPoint[] {
  const normalizedRange =
    normalizeDateRange(
      dateRange,
    );

  const months =
    enumerateMonths(
      normalizedRange,
    );

  const monthlyMap =
    new Map<
      string,
      ReportMonthlyPoint
    >();

  for (
    const month
    of months
  ) {
    monthlyMap.set(
      month,
      {
        month,

        label:
          formatMonthLabel(
            month,
          ),

        income: 0,

        expenses: 0,

        transfers: 0,

        netCashFlow: 0,

        transactionCount: 0,
      },
    );
  }

  const filteredTransactions =
    filterTransactionsByDateRange(
      transactions,
      normalizedRange,
    );

  for (
    const transaction
    of filteredTransactions
  ) {
    const date =
      normalizeDateString(
        transaction.date,
      );

    if (
      !date
    ) {
      continue;
    }

    const month =
      date.slice(
        0,
        7,
      );

    const point =
      monthlyMap.get(
        month,
      );

    if (
      !point
    ) {
      continue;
    }

    const amount =
      normalizeMoney(
        transaction.amount,
      );

    point.transactionCount +=
      1;

    if (
      transaction.status !==
      "cleared"
    ) {
      continue;
    }

    if (
      transaction.type ===
      "income"
    ) {
      point.income =
        normalizeMoney(
          point.income +
            amount,
        );
    } else if (
      transaction.type ===
      "expense"
    ) {
      point.expenses =
        normalizeMoney(
          point.expenses +
            amount,
        );
    } else if (
      transaction.type ===
      "transfer"
    ) {
      point.transfers =
        normalizeMoney(
          point.transfers +
            amount,
        );
    }
  }

  return Array.from(
    monthlyMap.values(),
  ).map(
    (
      point,
    ) => ({
      ...point,

      netCashFlow:
        normalizeMoney(
          point.income -
            point.expenses,
        ),
    }),
  );
}

export function calculateDailyTrend(
  transactions:
    TransactionData[],
  dateRange:
    ReportDateRange,
): ReportDailyPoint[] {
  const normalizedRange =
    normalizeDateRange(
      dateRange,
    );

  const dates =
    enumerateDates(
      normalizedRange,
    );

  const dailyMap =
    new Map<
      string,
      ReportDailyPoint
    >();

  for (
    const date
    of dates
  ) {
    dailyMap.set(
      date,
      {
        date,

        income: 0,

        expenses: 0,

        transfers: 0,

        netCashFlow: 0,

        transactionCount: 0,
      },
    );
  }

  const filteredTransactions =
    filterTransactionsByDateRange(
      transactions,
      normalizedRange,
    );

  for (
    const transaction
    of filteredTransactions
  ) {
    const date =
      normalizeDateString(
        transaction.date,
      );

    if (
      !date
    ) {
      continue;
    }

    const point =
      dailyMap.get(
        date,
      );

    if (
      !point
    ) {
      continue;
    }

    const amount =
      normalizeMoney(
        transaction.amount,
      );

    point.transactionCount +=
      1;

    if (
      transaction.status !==
      "cleared"
    ) {
      continue;
    }

    if (
      transaction.type ===
      "income"
    ) {
      point.income =
        normalizeMoney(
          point.income +
            amount,
        );
    } else if (
      transaction.type ===
      "expense"
    ) {
      point.expenses =
        normalizeMoney(
          point.expenses +
            amount,
        );
    } else if (
      transaction.type ===
      "transfer"
    ) {
      point.transfers =
        normalizeMoney(
          point.transfers +
            amount,
        );
    }
  }

  return Array.from(
    dailyMap.values(),
  ).map(
    (
      point,
    ) => ({
      ...point,

      netCashFlow:
        normalizeMoney(
          point.income -
            point.expenses,
        ),
    }),
  );
}

export function calculateSavingsRate(
  income: number,
  expenses: number,
) {
  const normalizedIncome =
    normalizeMoney(
      income,
    );

  const normalizedExpenses =
    normalizeMoney(
      expenses,
    );

  if (
    normalizedIncome <=
    0
  ) {
    return 0;
  }

  return normalizePercentage(
    (
      (
        normalizedIncome -
        normalizedExpenses
      ) /
      normalizedIncome
    ) *
      100,
  );
}

export function calculateExpenseRatio(
  income: number,
  expenses: number,
) {
  const normalizedIncome =
    normalizeMoney(
      income,
    );

  const normalizedExpenses =
    normalizeMoney(
      expenses,
    );

  if (
    normalizedIncome <=
    0
  ) {
    return 0;
  }

  return normalizePercentage(
    (
      normalizedExpenses /
      normalizedIncome
    ) *
      100,
  );
}

export function calculatePeriodChange(
  currentValue: number,
  previousValue: number,
) {
  const normalizedCurrent =
    normalizeMoney(
      currentValue,
    );

  const normalizedPrevious =
    normalizeMoney(
      previousValue,
    );

  const amount =
    normalizeMoney(
      normalizedCurrent -
        normalizedPrevious,
    );

  const percentage =
    normalizedPrevious ===
    0
      ? null
      : normalizePercentage(
          (
            amount /
            Math.abs(
              normalizedPrevious,
            )
          ) *
            100,
        );

  return {
    amount,
    percentage,
  };
}

export function getPreviousDateRange(
  dateRange:
    ReportDateRange,
): ReportDateRange {
  const normalizedRange =
    normalizeDateRange(
      dateRange,
    );

  const start =
    parseLocalDate(
      normalizedRange.startDate,
    );

  const end =
    parseLocalDate(
      normalizedRange.endDate,
    );

  const durationInDays =
    Math.max(
      1,
      getDifferenceInDays(
        start,
        end,
      ) +
        1,
    );

  const previousEnd =
    addDays(
      start,
      -1,
    );

  const previousStart =
    addDays(
      previousEnd,
      -
        (
          durationInDays -
          1
        ),
    );

  return {
    startDate:
      toLocalDateString(
        previousStart,
      ),

    endDate:
      toLocalDateString(
        previousEnd,
      ),
  };
}

export function normalizeDateRange(
  dateRange:
    ReportDateRange,
): ReportDateRange {
  const startDate =
    normalizeDateString(
      dateRange.startDate,
    );

  const endDate =
    normalizeDateString(
      dateRange.endDate,
    );

  if (
    !startDate ||
    !endDate
  ) {
    const fallback =
      resolveReportDateRange({
        preset:
          "this-month",
      });

    return fallback;
  }

  if (
    startDate <=
    endDate
  ) {
    return {
      startDate,
      endDate,
    };
  }

  return {
    startDate:
      endDate,

    endDate:
      startDate,
  };
}

export function isDateWithinRange(
  date: string,
  dateRange:
    ReportDateRange,
) {
  const normalizedDate =
    normalizeDateString(
      date,
    );

  if (
    !normalizedDate
  ) {
    return false;
  }

  const normalizedRange =
    normalizeDateRange(
      dateRange,
    );

  return (
    normalizedDate >=
      normalizedRange.startDate &&
    normalizedDate <=
      normalizedRange.endDate
  );
}

export function formatReportDateRange(
  dateRange:
    ReportDateRange,
) {
  const normalizedRange =
    normalizeDateRange(
      dateRange,
    );

  const startDate =
    parseLocalDate(
      normalizedRange.startDate,
    );

  const endDate =
    parseLocalDate(
      normalizedRange.endDate,
    );

  const formatter =
    new Intl.DateTimeFormat(
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

  if (
    normalizedRange.startDate ===
    normalizedRange.endDate
  ) {
    return formatter.format(
      startDate,
    );
  }

  return `${formatter.format(
    startDate,
  )} – ${formatter.format(
    endDate,
  )}`;
}

export function normalizeMoney(
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
      value *
        100,
    ) /
    100
  );
}

export function normalizePercentage(
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
      value *
        100,
    ) /
    100
  );
}

function calculatePercentage(
  amount: number,
  total: number,
) {
  if (
    total <=
    0
  ) {
    return 0;
  }

  return normalizePercentage(
    (
      amount /
      total
    ) *
      100,
  );
}

function enumerateMonths(
  dateRange:
    ReportDateRange,
) {
  const normalizedRange =
    normalizeDateRange(
      dateRange,
    );

  const startDate =
    parseLocalDate(
      normalizedRange.startDate,
    );

  const endDate =
    parseLocalDate(
      normalizedRange.endDate,
    );

  const months:
    string[] =
    [];

  const cursor =
    new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1,
    );

  const finalMonth =
    new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      1,
    );

  while (
    cursor <=
    finalMonth
  ) {
    months.push(
      `${cursor.getFullYear()}-${String(
        cursor.getMonth() +
          1,
      ).padStart(
        2,
        "0",
      )}`,
    );

    cursor.setMonth(
      cursor.getMonth() +
        1,
    );
  }

  return months;
}

function enumerateDates(
  dateRange:
    ReportDateRange,
) {
  const normalizedRange =
    normalizeDateRange(
      dateRange,
    );

  const startDate =
    parseLocalDate(
      normalizedRange.startDate,
    );

  const endDate =
    parseLocalDate(
      normalizedRange.endDate,
    );

  const dates:
    string[] =
    [];

  const cursor =
    new Date(
      startDate,
    );

  while (
    cursor <=
    endDate
  ) {
    dates.push(
      toLocalDateString(
        cursor,
      ),
    );

    cursor.setDate(
      cursor.getDate() +
        1,
    );
  }

  return dates;
}

function formatMonthLabel(
  month: string,
) {
  const [
    yearString,
    monthString,
  ] =
    month.split(
      "-",
    );

  const year =
    Number(
      yearString,
    );

  const monthIndex =
    Number(
      monthString,
    ) -
    1;

  if (
    !Number.isFinite(
      year,
    ) ||
    !Number.isFinite(
      monthIndex,
    )
  ) {
    return month;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",
      year:
        "numeric",
    },
  ).format(
    new Date(
      year,
      monthIndex,
      1,
    ),
  );
}

function normalizeDateString(
  value:
    string |
    null |
    undefined,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalizedValue,
    )
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] =
    normalizedValue
      .split(
        "-",
      )
      .map(
        Number,
      );

  const date =
    new Date(
      year,
      month -
        1,
      day,
    );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month -
        1 ||
    date.getDate() !==
      day
  ) {
    return null;
  }

  return normalizedValue;
}

function parseLocalDate(
  value: string,
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split(
        "-",
      )
      .map(
        Number,
      );

  return new Date(
    year,
    month -
      1,
    day,
  );
}

function toLocalDateString(
  date: Date,
) {
  return [
    date.getFullYear(),

    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      "0",
    ),

    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    ),
  ].join(
    "-",
  );
}

function addDays(
  date: Date,
  days: number,
) {
  const result =
    new Date(
      date,
    );

  result.setDate(
    result.getDate() +
      days,
  );

  return result;
}

function getDifferenceInDays(
  startDate: Date,
  endDate: Date,
) {
  const millisecondsPerDay =
    24 *
    60 *
    60 *
    1000;

  const startUtc =
    Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );

  const endUtc =
    Date.UTC(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
    );

  return Math.round(
    (
      endUtc -
      startUtc
    ) /
      millisecondsPerDay,
  );
}

function normalizeFiniteNumber(
  value: number,
) {
  return Number.isFinite(
    value,
  )
    ? value
    : 0;
}