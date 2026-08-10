export type AiCoachPriority =
  | "critical"
  | "high"
  | "medium"
  | "low";

export type AiCoachInsightType =
  | "cash-flow"
  | "spending"
  | "savings"
  | "emergency-fund"
  | "debt"
  | "bills"
  | "budget"
  | "net-worth"
  | "investments"
  | "general";

export type AiCoachInsightTone =
  | "positive"
  | "warning"
  | "neutral"
  | "informational";

export type AiCoachAction = {
  label: string;
  href: string;
};

export type AiCoachInsight = {
  id: string;

  type:
    AiCoachInsightType;

  priority:
    AiCoachPriority;

  tone:
    AiCoachInsightTone;

  title:
    string;

  description:
    string;

  valueLabel:
    string | null;

  action:
    AiCoachAction | null;
};

export type AiCoachSuggestedPrompt = {
  id: string;

  label:
    string;

  prompt:
    string;

  category:
    AiCoachInsightType;
};

export type AiCoachTransaction = {
  id: string;

  date: string;

  amount: number;

  type:
    | "income"
    | "expense"
    | "transfer";

  status:
    | "pending"
    | "cleared";

  merchant?:
    string | null;

  categoryName?:
    string | null;

  categoryGroupName?:
    string | null;
};

export type AiCoachAccount = {
  id: string;

  name:
    string;

  type:
    string;

  balance:
    number;

  includeInNetWorth?:
    boolean;
};

export type AiCoachDebt = {
  id: string;

  name:
    string;

  currentBalance:
    number;

  interestRate?:
    number | null;

  minimumPayment?:
    number | null;

  isActive?:
    boolean;
};

export type AiCoachGoal = {
  id: string;

  name:
    string;

  currentAmount:
    number;

  targetAmount:
    number;

  targetDate?:
    string | null;

  status?:
    string | null;

  isEmergencyFund?:
    boolean;
};

export type AiCoachBill = {
  id: string;

  name:
    string;

  amount:
    number;

  dueDate?:
    string | null;

  status?:
    string | null;
};

export type AiCoachBudgetItem = {
  id: string;

  name:
    string;

  groupName?:
    string | null;

  assigned:
    number;

  spent:
    number;
};

export type AiCoachInvestmentAccount = {
  id: string;

  name:
    string;

  marketValue:
    number;

  costBasis?:
    number | null;
};

export type AiCoachDateRange = {
  startDate:
    string;

  endDate:
    string;
};

export type AiCoachFinancialContext = {
  period:
    AiCoachDateRange;

  income:
    number;

  expenses:
    number;

  cashFlow:
    number;

  savingsRate:
    number | null;

  totalAssets:
    number;

  totalLiabilities:
    number;

  netWorth:
    number;

  emergencyFundBalance:
    number;

  emergencyFundMonths:
    number | null;

  totalDebt:
    number;

  minimumDebtPayments:
    number;

  overdueBillCount:
    number;

  upcomingBillCount:
    number;

  budgetAssigned:
    number;

  budgetSpent:
    number;

  budgetRemaining:
    number;

  investmentValue:
    number;

  investmentCostBasis:
    number;

  investmentGainLoss:
    number;

  transactionCount:
    number;

  accountCount:
    number;

  goalCount:
    number;

  billCount:
    number;

  debtCount:
    number;

  investmentAccountCount:
    number;
};

export type AiCoachSummary = {
  context:
    AiCoachFinancialContext;

  headline:
    string;

  summary:
    string;

  insights:
    AiCoachInsight[];

  suggestedPrompts:
    AiCoachSuggestedPrompt[];

  topInsight:
    AiCoachInsight | null;

  hasFinancialData:
    boolean;
};

export type BuildAiCoachSummaryInput = {
  transactions:
    AiCoachTransaction[];

  accounts:
    AiCoachAccount[];

  debts?:
    AiCoachDebt[];

  goals?:
    AiCoachGoal[];

  bills?:
    AiCoachBill[];

  budgetItems?:
    AiCoachBudgetItem[];

  investments?:
    AiCoachInvestmentAccount[];

  dateRange?:
    AiCoachDateRange;

  today?:
    Date;
};

const PRIORITY_ORDER: Record<
  AiCoachPriority,
  number
> = {
  critical:
    4,

  high:
    3,

  medium:
    2,

  low:
    1,
};

export function buildAiCoachSummary({
  transactions,
  accounts,
  debts = [],
  goals = [],
  bills = [],
  budgetItems = [],
  investments = [],
  dateRange,
  today =
    new Date(),
}: BuildAiCoachSummaryInput): AiCoachSummary {
  const period =
    dateRange ??
    getCurrentMonthDateRange(
      today,
    );

  const clearedTransactions =
    transactions.filter(
      (
        transaction,
      ) =>
        transaction.status ===
          "cleared" &&
        isDateWithinRange(
          transaction.date,
          period,
        ),
    );

  const income =
    sumTransactionsByType(
      clearedTransactions,
      "income",
    );

  const expenses =
    sumTransactionsByType(
      clearedTransactions,
      "expense",
    );

  const cashFlow =
    income -
    expenses;

  const savingsRate =
    calculateSavingsRate(
      income,
      expenses,
    );

  const accountPosition =
    calculateAccountPosition(
      accounts,
    );

  const activeDebts =
    debts.filter(
      (
        debt,
      ) =>
        debt.isActive !==
        false,
    );

  const totalDebt =
    activeDebts.reduce(
      (
        total,
        debt,
      ) =>
        total +
        normalizePositiveAmount(
          debt.currentBalance,
        ),
      0,
    );

  const minimumDebtPayments =
    activeDebts.reduce(
      (
        total,
        debt,
      ) =>
        total +
        normalizePositiveAmount(
          debt.minimumPayment ??
          0,
        ),
      0,
    );

  const totalLiabilities =
    Math.max(
      accountPosition
        .totalLiabilities,
      totalDebt,
    );

  const netWorth =
    accountPosition
      .totalAssets -
    totalLiabilities;

  const emergencyFundBalance =
    calculateEmergencyFundBalance(
      goals,
    );

  const emergencyFundMonths =
    expenses >
    0
      ? emergencyFundBalance /
        expenses
      : null;

  const billHealth =
    calculateBillHealth({
      bills,
      today,
    });

  const budgetAssigned =
    budgetItems.reduce(
      (
        total,
        item,
      ) =>
        total +
        normalizePositiveAmount(
          item.assigned,
        ),
      0,
    );

  const budgetSpent =
    budgetItems.reduce(
      (
        total,
        item,
      ) =>
        total +
        normalizePositiveAmount(
          item.spent,
        ),
      0,
    );

  const budgetRemaining =
    budgetAssigned -
    budgetSpent;

  const investmentValue =
    investments.reduce(
      (
        total,
        investment,
      ) =>
        total +
        normalizePositiveAmount(
          investment.marketValue,
        ),
      0,
    );

  const investmentCostBasis =
    investments.reduce(
      (
        total,
        investment,
      ) =>
        total +
        normalizePositiveAmount(
          investment.costBasis ??
          investment.marketValue,
        ),
      0,
    );

  const investmentGainLoss =
    investmentValue -
    investmentCostBasis;

  const context:
    AiCoachFinancialContext = {
    period,

    income:
      roundCurrency(
        income,
      ),

    expenses:
      roundCurrency(
        expenses,
      ),

    cashFlow:
      roundCurrency(
        cashFlow,
      ),

    savingsRate:
      savingsRate ===
      null
        ? null
        : roundPercentage(
            savingsRate,
          ),

    totalAssets:
      roundCurrency(
        accountPosition
          .totalAssets,
      ),

    totalLiabilities:
      roundCurrency(
        totalLiabilities,
      ),

    netWorth:
      roundCurrency(
        netWorth,
      ),

    emergencyFundBalance:
      roundCurrency(
        emergencyFundBalance,
      ),

    emergencyFundMonths:
      emergencyFundMonths ===
      null
        ? null
        : roundSingleDecimal(
            emergencyFundMonths,
          ),

    totalDebt:
      roundCurrency(
        totalDebt,
      ),

    minimumDebtPayments:
      roundCurrency(
        minimumDebtPayments,
      ),

    overdueBillCount:
      billHealth
        .overdueBillCount,

    upcomingBillCount:
      billHealth
        .upcomingBillCount,

    budgetAssigned:
      roundCurrency(
        budgetAssigned,
      ),

    budgetSpent:
      roundCurrency(
        budgetSpent,
      ),

    budgetRemaining:
      roundCurrency(
        budgetRemaining,
      ),

    investmentValue:
      roundCurrency(
        investmentValue,
      ),

    investmentCostBasis:
      roundCurrency(
        investmentCostBasis,
      ),

    investmentGainLoss:
      roundCurrency(
        investmentGainLoss,
      ),

    transactionCount:
      clearedTransactions.length,

    accountCount:
      accounts.length,

    goalCount:
      goals.length,

    billCount:
      bills.length,

    debtCount:
      activeDebts.length,

    investmentAccountCount:
      investments.length,
  };

  const insights =
    buildInsights({
      context,

      transactions:
        clearedTransactions,

      debts:
        activeDebts,

      budgetItems,
    });

  const sortedInsights =
    sortInsights(
      insights,
    );

  const hasFinancialData =
    hasMeaningfulFinancialData(
      context,
    );

  return {
    context,

    headline:
      buildCoachHeadline({
        context,
        hasFinancialData,
      }),

    summary:
      buildCoachSummary({
        context,
        hasFinancialData,
      }),

    insights:
      sortedInsights,

    suggestedPrompts:
      buildSuggestedPrompts({
        context,
        hasFinancialData,
      }),

    topInsight:
      sortedInsights[0] ??
      null,

    hasFinancialData,
  };
}

function buildInsights({
  context,
  transactions,
  debts,
  budgetItems,
}: {
  context:
    AiCoachFinancialContext;

  transactions:
    AiCoachTransaction[];

  debts:
    AiCoachDebt[];

  budgetItems:
    AiCoachBudgetItem[];
}) {
  const insights:
    AiCoachInsight[] =
    [];

  const cashFlowInsight =
    buildCashFlowInsight(
      context,
    );

  if (
    cashFlowInsight
  ) {
    insights.push(
      cashFlowInsight,
    );
  }

  const savingsInsight =
    buildSavingsInsight(
      context,
    );

  if (
    savingsInsight
  ) {
    insights.push(
      savingsInsight,
    );
  }

  const emergencyFundInsight =
    buildEmergencyFundInsight(
      context,
    );

  if (
    emergencyFundInsight
  ) {
    insights.push(
      emergencyFundInsight,
    );
  }

  const debtInsight =
    buildDebtInsight({
      context,
      debts,
    });

  if (
    debtInsight
  ) {
    insights.push(
      debtInsight,
    );
  }

  const billsInsight =
    buildBillsInsight(
      context,
    );

  if (
    billsInsight
  ) {
    insights.push(
      billsInsight,
    );
  }

  const budgetInsight =
    buildBudgetInsight({
      context,
      budgetItems,
    });

  if (
    budgetInsight
  ) {
    insights.push(
      budgetInsight,
    );
  }

  const spendingInsight =
    buildSpendingInsight(
      transactions,
    );

  if (
    spendingInsight
  ) {
    insights.push(
      spendingInsight,
    );
  }

  const netWorthInsight =
    buildNetWorthInsight(
      context,
    );

  if (
    netWorthInsight
  ) {
    insights.push(
      netWorthInsight,
    );
  }

  const investmentInsight =
    buildInvestmentInsight(
      context,
    );

  if (
    investmentInsight
  ) {
    insights.push(
      investmentInsight,
    );
  }

  return insights;
}

function buildCashFlowInsight(
  context:
    AiCoachFinancialContext,
): AiCoachInsight | null {
  if (
    context.income <=
      0 &&
    context.expenses <=
      0
  ) {
    return null;
  }

  if (
    context.cashFlow <
    0
  ) {
    return {
      id:
        "negative-cash-flow",

      type:
        "cash-flow",

      priority:
        "critical",

      tone:
        "warning",

      title:
        "Your spending is currently above your income",

      description:
        `Cleared expenses exceed cleared income by ${formatCurrency(
          Math.abs(
            context.cashFlow,
          ),
        )} this month. Reducing spending or increasing available income should be the first priority.`,

      valueLabel:
        formatCurrency(
          context.cashFlow,
        ),

      action: {
        label:
          "Review cash flow",

        href:
          "/dashboard/reports",
      },
    };
  }

  if (
    context.income >
      0 &&
    context.cashFlow /
      context.income >=
      0.2
  ) {
    return {
      id:
        "strong-cash-flow",

      type:
        "cash-flow",

      priority:
        "low",

      tone:
        "positive",

      title:
        "Your monthly cash flow has healthy room",

      description:
        "A meaningful share of your cleared income remains after spending. That gives you flexibility to build savings, reduce debt, or invest.",

      valueLabel:
        formatCurrency(
          context.cashFlow,
        ),

      action: {
        label:
          "Review reports",

        href:
          "/dashboard/reports",
      },
    };
  }

  return {
    id:
      "positive-cash-flow",

    type:
      "cash-flow",

    priority:
      "medium",

    tone:
      "neutral",

    title:
      "Your cash flow is positive, but the margin could be stronger",

    description:
      `You currently have ${formatCurrency(
        context.cashFlow,
      )} remaining after cleared expenses. Protecting more of that income would improve financial flexibility.`,

    valueLabel:
      formatCurrency(
        context.cashFlow,
      ),

    action: {
      label:
        "Review spending",

      href:
        "/dashboard/transactions",
    },
  };
}

function buildSavingsInsight(
  context:
    AiCoachFinancialContext,
): AiCoachInsight | null {
  if (
    context.savingsRate ===
    null
  ) {
    return null;
  }

  if (
    context.savingsRate <
    0
  ) {
    return {
      id:
        "negative-savings-rate",

      type:
        "savings",

      priority:
        "high",

      tone:
        "warning",

      title:
        "Your current savings rate is negative",

      description:
        "More money is leaving than coming in during the current period. Restoring positive monthly cash flow should come before increasing long-term savings contributions.",

      valueLabel:
        formatPercentage(
          context.savingsRate,
        ),

      action: {
        label:
          "Review budget",

        href:
          "/dashboard/budget",
      },
    };
  }

  if (
    context.savingsRate >=
    20
  ) {
    return {
      id:
        "strong-savings-rate",

      type:
        "savings",

      priority:
        "low",

      tone:
        "positive",

      title:
        "You are retaining a strong share of your income",

      description:
        "Your current savings rate is at or above 20%. Maintaining this level can create meaningful long-term financial momentum.",

      valueLabel:
        formatPercentage(
          context.savingsRate,
        ),

      action: {
        label:
          "View goals",

        href:
          "/dashboard/goals",
      },
    };
  }

  return {
    id:
      "savings-rate-opportunity",

    type:
      "savings",

    priority:
      context.savingsRate <
        10
        ? "high"
        : "medium",

    tone:
      context.savingsRate <
        10
        ? "warning"
        : "informational",

    title:
      "There is room to increase your savings rate",

    description:
      `You are currently retaining about ${formatPercentage(
        context.savingsRate,
      )} of cleared income after expenses. A higher margin could strengthen emergency savings and long-term goals.`,

    valueLabel:
      formatPercentage(
        context.savingsRate,
      ),

    action: {
      label:
        "Review budget",

      href:
        "/dashboard/budget",
    },
  };
}

function buildEmergencyFundInsight(
  context:
    AiCoachFinancialContext,
): AiCoachInsight | null {
  if (
    context.emergencyFundBalance <=
      0
  ) {
    return {
      id:
        "no-emergency-fund",

      type:
        "emergency-fund",

      priority:
        "high",

      tone:
        "warning",

      title:
        "An emergency reserve is not currently identified",

      description:
        "Building a dedicated cash reserve can reduce the chance that an unexpected expense has to be financed with debt.",

      valueLabel:
        null,

      action: {
        label:
          "Create savings goal",

        href:
          "/dashboard/goals",
      },
    };
  }

  if (
    context.emergencyFundMonths ===
    null
  ) {
    return {
      id:
        "emergency-fund-needs-expenses",

      type:
        "emergency-fund",

      priority:
        "medium",

      tone:
        "informational",

      title:
        "Your emergency savings is being tracked",

      description:
        "Once enough monthly spending history is available, CASE Budget can estimate how many months of expenses your reserve could cover.",

      valueLabel:
        formatCurrency(
          context.emergencyFundBalance,
        ),

      action: {
        label:
          "View savings goals",

        href:
          "/dashboard/goals",
      },
    };
  }

  if (
    context.emergencyFundMonths >=
    3
  ) {
    return {
      id:
        "healthy-emergency-fund",

      type:
        "emergency-fund",

      priority:
        "low",

      tone:
        "positive",

      title:
        "Your emergency reserve has a solid foundation",

      description:
        `Your tracked reserve could cover approximately ${formatMonths(
          context.emergencyFundMonths,
        )} of current cleared expenses.`,

      valueLabel:
        formatMonths(
          context.emergencyFundMonths,
        ),

      action: {
        label:
          "View savings goals",

        href:
          "/dashboard/goals",
      },
    };
  }

  return {
    id:
      "emergency-fund-gap",

    type:
      "emergency-fund",

    priority:
      context.emergencyFundMonths <
        1
        ? "high"
        : "medium",

    tone:
      "warning",

    title:
      "Your emergency reserve could use more coverage",

    description:
      `Your tracked reserve currently covers approximately ${formatMonths(
        context.emergencyFundMonths,
      )} of cleared monthly expenses.`,

    valueLabel:
      formatMonths(
        context.emergencyFundMonths,
      ),

    action: {
      label:
        "Build emergency savings",

      href:
        "/dashboard/goals",
    },
  };
}

function buildDebtInsight({
  context,
  debts,
}: {
  context:
    AiCoachFinancialContext;

  debts:
    AiCoachDebt[];
}): AiCoachInsight | null {
  if (
    context.totalDebt <=
    0
  ) {
    return null;
  }

  const highestInterestDebt =
    getHighestInterestDebt(
      debts,
    );

  if (
    highestInterestDebt &&
    (
      highestInterestDebt
        .interestRate ??
      0
    ) >=
      10
  ) {
    return {
      id:
        "high-interest-debt",

      type:
        "debt",

      priority:
        "high",

      tone:
        "warning",

      title:
        `${highestInterestDebt.name} has a high interest rate`,

      description:
        `At ${formatPercentage(
          highestInterestDebt
            .interestRate ??
          0,
        )}, this debt may be one of the most expensive balances in your plan. Paying extra toward high-interest debt can reduce future interest costs.`,

      valueLabel:
        formatCurrency(
          highestInterestDebt
            .currentBalance,
        ),

      action: {
        label:
          "Review debt payoff",

        href:
          "/dashboard/debt",
      },
    };
  }

  return {
    id:
      "tracked-debt",

    type:
      "debt",

    priority:
      "medium",

    tone:
      "informational",

    title:
      "Keep your debt payoff moving forward",

    description:
      `You currently have ${formatCurrency(
        context.totalDebt,
      )} of active debt tracked. Extra payments above the minimum can accelerate payoff and reduce interest.`,

    valueLabel:
      formatCurrency(
        context.totalDebt,
      ),

    action: {
      label:
        "Review debt payoff",

      href:
        "/dashboard/debt",
    },
  };
}

function buildBillsInsight(
  context:
    AiCoachFinancialContext,
): AiCoachInsight | null {
  if (
    context.billCount <=
    0
  ) {
    return null;
  }

  if (
    context.overdueBillCount >
    0
  ) {
    return {
      id:
        "overdue-bills",

      type:
        "bills",

      priority:
        "critical",

      tone:
        "warning",

      title:
        `${context.overdueBillCount} bill${
          context.overdueBillCount ===
          1
            ? " is"
            : "s are"
        } overdue`,

      description:
        "Review past-due obligations first to reduce the risk of late fees, service interruptions, or additional pressure on your cash flow.",

      valueLabel:
        `${context.overdueBillCount} overdue`,

      action: {
        label:
          "Review bills",

        href:
          "/dashboard/bills",
      },
    };
  }

  if (
    context.upcomingBillCount >
    0
  ) {
    return {
      id:
        "upcoming-bills",

      type:
        "bills",

      priority:
        "medium",

      tone:
        "informational",

      title:
        `${context.upcomingBillCount} bill${
          context.upcomingBillCount ===
          1
            ? " is"
            : "s are"
        } due within seven days`,

      description:
        "Make sure enough cash is available in the appropriate accounts before these upcoming obligations are due.",

      valueLabel:
        `${context.upcomingBillCount} upcoming`,

      action: {
        label:
          "Review bills",

        href:
          "/dashboard/bills",
      },
    };
  }

  return {
    id:
      "bills-current",

    type:
      "bills",

    priority:
      "low",

    tone:
      "positive",

    title:
      "Your tracked bills are currently on schedule",

    description:
      "There are no overdue tracked bills and nothing is due within the next seven days.",

    valueLabel:
      "On schedule",

    action: {
      label:
        "View bills",

      href:
        "/dashboard/bills",
    },
  };
}

function buildBudgetInsight({
  context,
  budgetItems,
}: {
  context:
    AiCoachFinancialContext;

  budgetItems:
    AiCoachBudgetItem[];
}): AiCoachInsight | null {
  if (
    budgetItems.length ===
    0 ||
    context.budgetAssigned <=
    0
  ) {
    return null;
  }

  const overBudgetItems =
    budgetItems
      .filter(
        (
          item,
        ) =>
          item.spent >
          item.assigned &&
          item.assigned >
          0,
      )
      .sort(
        (
          firstItem,
          secondItem,
        ) =>
          (
            secondItem.spent -
            secondItem.assigned
          ) -
          (
            firstItem.spent -
            firstItem.assigned
          ),
      );

  if (
    overBudgetItems.length >
    0
  ) {
    const largestOverage =
      overBudgetItems[0];

    const overageAmount =
      largestOverage.spent -
      largestOverage.assigned;

    return {
      id:
        "over-budget-items",

      type:
        "budget",

      priority:
        "high",

      tone:
        "warning",

      title:
        `${largestOverage.name} is over its assigned amount`,

      description:
        `${overBudgetItems.length} budget item${
          overBudgetItems.length ===
          1
            ? " is"
            : "s are"
        } currently over plan. ${largestOverage.name} is over by ${formatCurrency(
          overageAmount,
        )}.`,

      valueLabel:
        formatCurrency(
          overageAmount,
        ),

      action: {
        label:
          "Review budget",

        href:
          "/dashboard/budget",
      },
    };
  }

  return {
    id:
      "budget-on-track",

    type:
      "budget",

    priority:
      "low",

    tone:
      "positive",

    title:
      "Your tracked budget items are currently within plan",

    description:
      `${formatCurrency(
        context.budgetRemaining,
      )} remains across currently assigned budget items.`,

    valueLabel:
      formatCurrency(
        context.budgetRemaining,
      ),

    action: {
      label:
        "View budget",

      href:
        "/dashboard/budget",
    },
  };
}

function buildSpendingInsight(
  transactions:
    AiCoachTransaction[],
): AiCoachInsight | null {
  const expenseTransactions =
    transactions.filter(
      (
        transaction,
      ) =>
        transaction.type ===
        "expense",
    );

  if (
    expenseTransactions.length ===
    0
  ) {
    return null;
  }

  const categoryTotals =
    new Map<
      string,
      number
    >();

  for (
    const transaction
    of expenseTransactions
  ) {
    const categoryName =
      transaction.categoryName
        ?.trim() ||
      "Uncategorized";

    const existingAmount =
      categoryTotals.get(
        categoryName,
      ) ??
      0;

    categoryTotals.set(
      categoryName,
      existingAmount +
        normalizePositiveAmount(
          transaction.amount,
        ),
    );
  }

  const sortedCategories =
    [
      ...categoryTotals
        .entries(),
    ].sort(
      (
        firstCategory,
        secondCategory,
      ) =>
        secondCategory[1] -
        firstCategory[1],
    );

  const topCategory =
    sortedCategories[0];

  if (
    !topCategory
  ) {
    return null;
  }

  const [
    categoryName,
    amount,
  ] =
    topCategory;

  return {
    id:
      "top-spending-category",

    type:
      "spending",

    priority:
      "medium",

    tone:
      "informational",

    title:
      `${categoryName} is your largest spending area this month`,

    description:
      `Cleared spending in ${categoryName} totals ${formatCurrency(
        amount,
      )}. Reviewing your largest categories is often the quickest way to find meaningful savings opportunities.`,

    valueLabel:
      formatCurrency(
        amount,
      ),

    action: {
      label:
        "Review transactions",

      href:
        "/dashboard/transactions",
    },
  };
}

function buildNetWorthInsight(
  context:
    AiCoachFinancialContext,
): AiCoachInsight | null {
  if (
    context.accountCount <=
      0 &&
    context.totalDebt <=
      0
  ) {
    return null;
  }

  if (
    context.netWorth <
    0
  ) {
    return {
      id:
        "negative-net-worth",

      type:
        "net-worth",

      priority:
        "high",

      tone:
        "warning",

      title:
        "Tracked liabilities currently exceed tracked assets",

      description:
        "A negative net worth is not a permanent condition. Consistently reducing liabilities while building cash and investment assets can improve it over time.",

      valueLabel:
        formatCurrency(
          context.netWorth,
        ),

      action: {
        label:
          "Review net worth",

        href:
          "/dashboard/net-worth",
      },
    };
  }

  return {
    id:
      "positive-net-worth",

    type:
      "net-worth",

    priority:
      "low",

    tone:
      "positive",

    title:
      "Your tracked net worth is positive",

    description:
      "Continue growing assets while managing liabilities to strengthen your overall financial position.",

    valueLabel:
      formatCurrency(
        context.netWorth,
      ),

    action: {
      label:
        "Review net worth",

      href:
        "/dashboard/net-worth",
    },
  };
}

function buildInvestmentInsight(
  context:
    AiCoachFinancialContext,
): AiCoachInsight | null {
  if (
    context.investmentAccountCount <=
      0
  ) {
    return null;
  }

  const isPositive =
    context.investmentGainLoss >=
    0;

  return {
    id:
      "investment-position",

    type:
      "investments",

    priority:
      "low",

    tone:
      isPositive
        ? "positive"
        : "informational",

    title:
      isPositive
        ? "Your tracked investments are above cost basis"
        : "Your tracked investments are below cost basis",

    description:
      "Investment performance should be considered in the context of your goals, time horizon, diversification, and overall financial plan.",

    valueLabel:
      formatCurrency(
        context.investmentGainLoss,
      ),

    action: {
      label:
        "Review investments",

      href:
        "/dashboard/investments",
    },
  };
}

function buildSuggestedPrompts({
  context,
  hasFinancialData,
}: {
  context:
    AiCoachFinancialContext;

  hasFinancialData:
    boolean;
}): AiCoachSuggestedPrompt[] {
  if (
    !hasFinancialData
  ) {
    return [
      {
        id:
          "getting-started",

        label:
          "How should I get started?",

        prompt:
          "Review my current CASE Budget workspace and tell me what financial information I should add first.",

        category:
          "general",
      },

      {
        id:
          "build-budget",

        label:
          "Help me build my first budget",

        prompt:
          "Help me create a practical zero-based budget and explain what information I need to enter.",

        category:
          "budget",
      },

      {
        id:
          "emergency-fund-start",

        label:
          "How much emergency savings do I need?",

        prompt:
          "Explain how I should determine an emergency fund target and how to build toward it.",

        category:
          "emergency-fund",
      },
    ];
  }

  const prompts:
    AiCoachSuggestedPrompt[] =
    [
      {
        id:
          "monthly-review",

        label:
          "Review my month",

        prompt:
          "Review my current month's income, spending, cash flow, bills, savings, and debt. Tell me what is going well and what I should prioritize next.",

        category:
          "general",
      },

      {
        id:
          "reduce-spending",

        label:
          "Where can I cut spending?",

        prompt:
          "Analyze my current spending and identify the areas where reducing expenses would have the biggest impact.",

        category:
          "spending",
      },

      {
        id:
          "improve-savings",

        label:
          "How can I save more?",

        prompt:
          "Review my current income, spending, cash flow, and savings rate and suggest a realistic way to increase savings.",

        category:
          "savings",
      },
    ];

  if (
    context.totalDebt >
    0
  ) {
    prompts.push({
      id:
        "debt-strategy",

      label:
        "Help me pay off debt",

      prompt:
        "Review my tracked debts and recommend how I should prioritize extra payments while protecting my monthly cash flow.",

      category:
        "debt",
    });
  }

  if (
    context.emergencyFundMonths ===
      null ||
    context.emergencyFundMonths <
      3
  ) {
    prompts.push({
      id:
        "emergency-plan",

      label:
        "Build my emergency fund",

      prompt:
        "Review my current expenses and savings and help me build a realistic emergency fund plan.",

      category:
        "emergency-fund",
    });
  }

  if (
    context.investmentAccountCount >
    0
  ) {
    prompts.push({
      id:
        "investment-review",

      label:
        "Review my investments",

      prompt:
        "Review my tracked investment position in the context of my cash flow, debt, emergency savings, and overall financial plan.",

      category:
        "investments",
    });
  }

  return prompts.slice(
    0,
    6,
  );
}

function buildCoachHeadline({
  context,
  hasFinancialData,
}: {
  context:
    AiCoachFinancialContext;

  hasFinancialData:
    boolean;
}) {
  if (
    !hasFinancialData
  ) {
    return "Add your financial data and I’ll help you build a plan.";
  }

  if (
    context.overdueBillCount >
    0
  ) {
    return "Let’s get your overdue obligations back under control.";
  }

  if (
    context.cashFlow <
    0
  ) {
    return "Your first priority is restoring positive monthly cash flow.";
  }

  if (
    context.emergencyFundMonths !==
      null &&
    context.emergencyFundMonths <
      1
  ) {
    return "Your cash flow is working, but your emergency cushion needs attention.";
  }

  if (
    context.totalDebt >
      0 &&
    context.savingsRate !==
      null &&
    context.savingsRate >
      10
  ) {
    return "You have room to make meaningful progress on your next financial goal.";
  }

  if (
    context.savingsRate !==
      null &&
    context.savingsRate >=
      20
  ) {
    return "Your current month is showing strong financial momentum.";
  }

  return "You’re building a clearer financial picture. Let’s decide what to improve next.";
}

function buildCoachSummary({
  context,
  hasFinancialData,
}: {
  context:
    AiCoachFinancialContext;

  hasFinancialData:
    boolean;
}) {
  if (
    !hasFinancialData
  ) {
    return "AI Coach uses your real CASE Budget activity to provide personalized guidance. Add transactions, accounts, bills, goals, or debt information to begin.";
  }

  const parts:
    string[] =
    [];

  if (
    context.income >
    0
  ) {
    parts.push(
      `You have ${formatCurrency(
        context.income,
      )} of cleared income this month`,
    );
  }

  if (
    context.expenses >
    0
  ) {
    parts.push(
      `${formatCurrency(
        context.expenses,
      )} of cleared spending`,
    );
  }

  if (
    context.cashFlow !==
    0
  ) {
    parts.push(
      `and ${formatCurrency(
        context.cashFlow,
      )} of net cash flow`,
    );
  }

  if (
    parts.length ===
    0
  ) {
    return "Your financial accounts and planning data are available. Add more transaction history to unlock deeper monthly coaching.";
  }

  return `${parts.join(
    ", ",
  )}. The recommendations below are based on your current workspace data.`;
}

function sortInsights(
  insights:
    AiCoachInsight[],
) {
  return [
    ...insights,
  ].sort(
    (
      firstInsight,
      secondInsight,
    ) => {
      const priorityDifference =
        PRIORITY_ORDER[
          secondInsight
            .priority
        ] -
        PRIORITY_ORDER[
          firstInsight
            .priority
        ];

      if (
        priorityDifference !==
        0
      ) {
        return priorityDifference;
      }

      return firstInsight
        .title
        .localeCompare(
          secondInsight
            .title,
        );
    },
  );
}

function hasMeaningfulFinancialData(
  context:
    AiCoachFinancialContext,
) {
  return (
    context.transactionCount >
      0 ||
    context.accountCount >
      0 ||
    context.goalCount >
      0 ||
    context.billCount >
      0 ||
    context.debtCount >
      0 ||
    context.investmentAccountCount >
      0 ||
    context.budgetAssigned >
      0
  );
}

function calculateAccountPosition(
  accounts:
    AiCoachAccount[],
) {
  let totalAssets =
    0;

  let totalLiabilities =
    0;

  for (
    const account
    of accounts
  ) {
    if (
      account.includeInNetWorth ===
      false
    ) {
      continue;
    }

    const balance =
      normalizeFiniteNumber(
        account.balance,
      );

    if (
      isLiabilityAccountType(
        account.type,
      )
    ) {
      totalLiabilities +=
        Math.abs(
          balance,
        );

      continue;
    }

    if (
      balance >=
      0
    ) {
      totalAssets +=
        balance;
    } else {
      totalLiabilities +=
        Math.abs(
          balance,
        );
    }
  }

  return {
    totalAssets:
      roundCurrency(
        totalAssets,
      ),

    totalLiabilities:
      roundCurrency(
        totalLiabilities,
      ),
  };
}

function calculateEmergencyFundBalance(
  goals:
    AiCoachGoal[],
) {
  return goals
    .filter(
      (
        goal,
      ) =>
        goal.isEmergencyFund ===
          true ||
        isEmergencyFundName(
          goal.name,
        ),
    )
    .reduce(
      (
        total,
        goal,
      ) =>
        total +
        normalizePositiveAmount(
          goal.currentAmount,
        ),
      0,
    );
}

function calculateBillHealth({
  bills,
  today,
}: {
  bills:
    AiCoachBill[];

  today:
    Date;
}) {
  const todayKey =
    formatDateKey(
      today,
    );

  const upcomingKey =
    formatDateKey(
      addDays(
        today,
        7,
      ),
    );

  let overdueBillCount =
    0;

  let upcomingBillCount =
    0;

  for (
    const bill
    of bills
  ) {
    if (
      isPaidBillStatus(
        bill.status,
      )
    ) {
      continue;
    }

    const dueDate =
      normalizeDateString(
        bill.dueDate,
      );

    if (
      !dueDate
    ) {
      continue;
    }

    if (
      dueDate <
      todayKey
    ) {
      overdueBillCount +=
        1;

      continue;
    }

    if (
      dueDate <=
      upcomingKey
    ) {
      upcomingBillCount +=
        1;
    }
  }

  return {
    overdueBillCount,
    upcomingBillCount,
  };
}

function calculateSavingsRate(
  income:
    number,

  expenses:
    number,
) {
  if (
    income <=
    0
  ) {
    return null;
  }

  return (
    (
      income -
      expenses
    ) /
    income
  ) *
    100;
}

function sumTransactionsByType(
  transactions:
    AiCoachTransaction[],

  type:
    AiCoachTransaction["type"],
) {
  return transactions
    .filter(
      (
        transaction,
      ) =>
        transaction.type ===
        type,
    )
    .reduce(
      (
        total,
        transaction,
      ) =>
        total +
        normalizePositiveAmount(
          transaction.amount,
        ),
      0,
    );
}

function getHighestInterestDebt(
  debts:
    AiCoachDebt[],
) {
  return [
    ...debts,
  ]
    .filter(
      (
        debt,
      ) =>
        debt.interestRate !==
          null &&
        debt.interestRate !==
          undefined &&
        Number.isFinite(
          debt.interestRate,
        ),
    )
    .sort(
      (
        firstDebt,
        secondDebt,
      ) =>
        (
          secondDebt
            .interestRate ??
          0
        ) -
        (
          firstDebt
            .interestRate ??
          0
        ),
    )[0] ??
    null;
}

function getCurrentMonthDateRange(
  today:
    Date,
): AiCoachDateRange {
  const year =
    today.getFullYear();

  const month =
    today.getMonth();

  return {
    startDate:
      formatDateKey(
        new Date(
          year,
          month,
          1,
        ),
      ),

    endDate:
      formatDateKey(
        new Date(
          year,
          month +
            1,
          0,
        ),
      ),
  };
}

function isDateWithinRange(
  value:
    string,

  period:
    AiCoachDateRange,
) {
  const date =
    normalizeDateString(
      value,
    );

  if (
    !date
  ) {
    return false;
  }

  return (
    date >=
      period.startDate &&
    date <=
      period.endDate
  );
}

function isLiabilityAccountType(
  value:
    string,
) {
  const normalizedValue =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[_\s]+/g,
        "-",
      );

  return (
    normalizedValue ===
      "credit-card" ||
    normalizedValue ===
      "credit" ||
    normalizedValue ===
      "loan" ||
    normalizedValue ===
      "mortgage" ||
    normalizedValue ===
      "line-of-credit" ||
    normalizedValue ===
      "liability"
  );
}

function isEmergencyFundName(
  value:
    string,
) {
  const normalizedValue =
    value
      .trim()
      .toLowerCase();

  return (
    normalizedValue.includes(
      "emergency fund",
    ) ||
    normalizedValue.includes(
      "emergency savings",
    )
  );
}

function isPaidBillStatus(
  value:
    string | null | undefined,
) {
  const normalizedValue =
    value
      ?.trim()
      .toLowerCase();

  return (
    normalizedValue ===
      "paid" ||
    normalizedValue ===
      "completed" ||
    normalizedValue ===
      "cancelled" ||
    normalizedValue ===
      "canceled"
  );
}

function normalizeDateString(
  value:
    string | null | undefined,
) {
  if (
    !value
  ) {
    return null;
  }

  const match =
    value
      .trim()
      .match(
        /^(\d{4})-(\d{2})-(\d{2})/,
      );

  if (
    !match
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function addDays(
  date:
    Date,

  days:
    number,
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

function formatDateKey(
  date:
    Date,
) {
  const year =
    date
      .getFullYear()
      .toString();

  const month =
    (
      date.getMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0",
      );

  const day =
    date
      .getDate()
      .toString()
      .padStart(
        2,
        "0",
      );

  return `${year}-${month}-${day}`;
}

function normalizePositiveAmount(
  value:
    number,
) {
  return Math.abs(
    normalizeFiniteNumber(
      value,
    ),
  );
}

function normalizeFiniteNumber(
  value:
    number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return value;
}

function roundCurrency(
  value:
    number,
) {
  return Math.round(
    normalizeFiniteNumber(
      value,
    ) *
      100,
  ) /
    100;
}

function roundPercentage(
  value:
    number,
) {
  return Math.round(
    normalizeFiniteNumber(
      value,
    ) *
      10,
  ) /
    10;
}

function roundSingleDecimal(
  value:
    number,
) {
  return Math.round(
    normalizeFiniteNumber(
      value,
    ) *
      10,
  ) /
    10;
}

function formatCurrency(
  value:
    number,
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
    normalizeFiniteNumber(
      value,
    ),
  );
}

function formatPercentage(
  value:
    number,
) {
  return `${roundPercentage(
    value,
  )}%`;
}

function formatMonths(
  value:
    number,
) {
  const months =
    roundSingleDecimal(
      value,
    );

  return `${months} month${
    months ===
    1
      ? ""
      : "s"
  }`;
}