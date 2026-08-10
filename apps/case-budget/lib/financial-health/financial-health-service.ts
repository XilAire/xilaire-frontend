export type FinancialHealthStatus =
  | "excellent"
  | "good"
  | "fair"
  | "needs-attention"
  | "not-enough-data";

export type FinancialHealthFactorStatus =
  | "strong"
  | "stable"
  | "watch"
  | "risk"
  | "not-enough-data";

export type FinancialHealthFactorId =
  | "cash-flow"
  | "savings"
  | "debt"
  | "emergency-fund"
  | "bills";

export type FinancialHealthTransaction = {
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
};

export type FinancialHealthAccount = {
  id: string;
  balance: number;
  type: string;
  includeInNetWorth?: boolean;
};

export type FinancialHealthDebt = {
  id: string;
  currentBalance: number;
  minimumPayment?: number | null;
  isActive?: boolean;
};

export type FinancialHealthGoal = {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  status?: string | null;
  isEmergencyFund?: boolean;
};

export type FinancialHealthBill = {
  id: string;
  amount: number;
  status?: string | null;
  dueDate?: string | null;
};

export type FinancialHealthDateRange = {
  startDate: string;
  endDate: string;
};

export type FinancialHealthFactor = {
  id: FinancialHealthFactorId;
  label: string;
  score: number | null;
  weight: number;
  weightedScore: number | null;
  status: FinancialHealthFactorStatus;
  title: string;
  description: string;
  valueLabel: string;
  actionLabel: string | null;
  actionHref: string | null;
};

export type FinancialHealthSummary = {
  score: number | null;
  status: FinancialHealthStatus;

  period: FinancialHealthDateRange;

  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;

  savingsRate: number | null;

  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;

  debtToAssetsRatio: number | null;

  emergencyFundBalance: number;
  emergencyFundMonths: number | null;

  overdueBillCount: number;
  upcomingBillCount: number;

  factors: FinancialHealthFactor[];

  strongestFactor:
    FinancialHealthFactor | null;

  weakestFactor:
    FinancialHealthFactor | null;

  hasEnoughData: boolean;
};

export type BuildFinancialHealthSummaryInput = {
  transactions:
    FinancialHealthTransaction[];

  accounts:
    FinancialHealthAccount[];

  debts?:
    FinancialHealthDebt[];

  goals?:
    FinancialHealthGoal[];

  bills?:
    FinancialHealthBill[];

  dateRange?:
    FinancialHealthDateRange;

  today?:
    Date;
};

const FACTOR_WEIGHTS: Record<
  FinancialHealthFactorId,
  number
> = {
  "cash-flow":
    0.25,

  savings:
    0.25,

  debt:
    0.2,

  "emergency-fund":
    0.2,

  bills:
    0.1,
};

export function buildFinancialHealthSummary({
  transactions,
  accounts,
  debts = [],
  goals = [],
  bills = [],
  dateRange,
  today =
    new Date(),
}: BuildFinancialHealthSummaryInput): FinancialHealthSummary {
  const resolvedDateRange =
    dateRange ??
    getCurrentMonthDateRange(
      today,
    );

  const periodTransactions =
    transactions.filter(
      (
        transaction,
      ) =>
        transaction.status ===
          "cleared" &&
        isDateWithinRange(
          transaction.date,
          resolvedDateRange,
        ),
    );

  const monthlyIncome =
    periodTransactions
      .filter(
        (
          transaction,
        ) =>
          transaction.type ===
          "income",
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

  const monthlyExpenses =
    periodTransactions
      .filter(
        (
          transaction,
        ) =>
          transaction.type ===
          "expense",
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

  const monthlyCashFlow =
    monthlyIncome -
    monthlyExpenses;

  const savingsRate =
    calculateSavingsRate(
      monthlyIncome,
      monthlyExpenses,
    );

  const {
    totalAssets,
    totalLiabilities,
  } =
    calculateAccountPosition(
      accounts,
    );

  const activeDebtBalance =
    debts
      .filter(
        (
          debt,
        ) =>
          debt.isActive !==
          false,
      )
      .reduce(
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

  const effectiveLiabilities =
    Math.max(
      totalLiabilities,
      activeDebtBalance,
    );

  const netWorth =
    totalAssets -
    effectiveLiabilities;

  const debtToAssetsRatio =
    calculateDebtToAssetsRatio(
      effectiveLiabilities,
      totalAssets,
    );

  const emergencyFundBalance =
    calculateEmergencyFundBalance(
      goals,
    );

  const emergencyFundMonths =
    calculateEmergencyFundMonths({
      emergencyFundBalance,
      monthlyExpenses,
    });

  const {
    overdueBillCount,
    upcomingBillCount,
  } =
    calculateBillHealth({
      bills,
      today,
    });

  const cashFlowFactor =
    buildCashFlowFactor({
      monthlyIncome,
      monthlyExpenses,
      monthlyCashFlow,
    });

  const savingsFactor =
    buildSavingsFactor({
      monthlyIncome,
      savingsRate,
    });

  const debtFactor =
    buildDebtFactor({
      totalAssets,
      liabilities:
        effectiveLiabilities,
      debtToAssetsRatio,
    });

  const emergencyFundFactor =
    buildEmergencyFundFactor({
      monthlyExpenses,
      emergencyFundBalance,
      emergencyFundMonths,
    });

  const billsFactor =
    buildBillsFactor({
      bills,
      overdueBillCount,
      upcomingBillCount,
    });

  const factors = [
    cashFlowFactor,
    savingsFactor,
    debtFactor,
    emergencyFundFactor,
    billsFactor,
  ];

  const scoredFactors =
    factors.filter(
      (
        factor,
      ) =>
        factor.score !==
        null,
    );

  const scoredWeight =
    scoredFactors.reduce(
      (
        total,
        factor,
      ) =>
        total +
        factor.weight,
      0,
    );

  const weightedTotal =
    scoredFactors.reduce(
      (
        total,
        factor,
      ) =>
        total +
        (
          factor.score ??
          0
        ) *
          factor.weight,
      0,
    );

  const hasEnoughData =
    scoredFactors.length >=
      2 &&
    scoredWeight >
      0;

  const score =
    hasEnoughData
      ? roundWholeNumber(
          weightedTotal /
            scoredWeight,
        )
      : null;

  const strongestFactor =
    getStrongestFactor(
      factors,
    );

  const weakestFactor =
    getWeakestFactor(
      factors,
    );

  return {
    score,

    status:
      getOverallStatus(
        score,
      ),

    period:
      resolvedDateRange,

    monthlyIncome:
      roundCurrency(
        monthlyIncome,
      ),

    monthlyExpenses:
      roundCurrency(
        monthlyExpenses,
      ),

    monthlyCashFlow:
      roundCurrency(
        monthlyCashFlow,
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
        totalAssets,
      ),

    totalLiabilities:
      roundCurrency(
        effectiveLiabilities,
      ),

    netWorth:
      roundCurrency(
        netWorth,
      ),

    debtToAssetsRatio:
      debtToAssetsRatio ===
      null
        ? null
        : roundPercentage(
            debtToAssetsRatio,
          ),

    emergencyFundBalance:
      roundCurrency(
        emergencyFundBalance,
      ),

    emergencyFundMonths:
      emergencyFundMonths ===
      null
        ? null
        : roundToSingleDecimal(
            emergencyFundMonths,
          ),

    overdueBillCount,

    upcomingBillCount,

    factors,

    strongestFactor,

    weakestFactor,

    hasEnoughData,
  };
}

export function calculateSavingsRate(
  income: number,
  expenses: number,
) {
  const safeIncome =
    normalizePositiveAmount(
      income,
    );

  const safeExpenses =
    normalizePositiveAmount(
      expenses,
    );

  if (
    safeIncome <=
    0
  ) {
    return null;
  }

  return (
    (
      safeIncome -
      safeExpenses
    ) /
    safeIncome
  ) *
    100;
}

export function calculateDebtToAssetsRatio(
  liabilities: number,
  assets: number,
) {
  const safeLiabilities =
    normalizePositiveAmount(
      liabilities,
    );

  const safeAssets =
    normalizePositiveAmount(
      assets,
    );

  if (
    safeAssets <=
    0
  ) {
    if (
      safeLiabilities >
      0
    ) {
      return 100;
    }

    return null;
  }

  return (
    safeLiabilities /
    safeAssets
  ) *
    100;
}

export function calculateEmergencyFundMonths({
  emergencyFundBalance,
  monthlyExpenses,
}: {
  emergencyFundBalance:
    number;

  monthlyExpenses:
    number;
}) {
  const safeBalance =
    normalizePositiveAmount(
      emergencyFundBalance,
    );

  const safeExpenses =
    normalizePositiveAmount(
      monthlyExpenses,
    );

  if (
    safeExpenses <=
    0
  ) {
    return null;
  }

  return (
    safeBalance /
    safeExpenses
  );
}

export function getFinancialHealthStatusLabel(
  status:
    FinancialHealthStatus,
) {
  switch (
    status
  ) {
    case "excellent":
      return "Excellent";

    case "good":
      return "Good";

    case "fair":
      return "Fair";

    case "needs-attention":
      return "Needs attention";

    case "not-enough-data":
    default:
      return "Not enough data";
  }
}

export function getFinancialHealthFactorStatusLabel(
  status:
    FinancialHealthFactorStatus,
) {
  switch (
    status
  ) {
    case "strong":
      return "Strong";

    case "stable":
      return "Stable";

    case "watch":
      return "Watch";

    case "risk":
      return "Needs attention";

    case "not-enough-data":
    default:
      return "Not enough data";
  }
}

function buildCashFlowFactor({
  monthlyIncome,
  monthlyExpenses,
  monthlyCashFlow,
}: {
  monthlyIncome:
    number;

  monthlyExpenses:
    number;

  monthlyCashFlow:
    number;
}): FinancialHealthFactor {
  if (
    monthlyIncome <=
      0 &&
    monthlyExpenses <=
      0
  ) {
    return createUnavailableFactor({
      id:
        "cash-flow",

      label:
        "Cash flow",

      title:
        "Add income and spending activity",

      description:
        "CASE Budget needs cleared income and expense transactions before it can evaluate monthly cash flow.",

      valueLabel:
        "No activity",

      actionLabel:
        "View transactions",

      actionHref:
        "/dashboard/transactions",
    });
  }

  if (
    monthlyIncome <=
    0
  ) {
    return createFactor({
      id:
        "cash-flow",

      label:
        "Cash flow",

      score:
        0,

      title:
        "Expenses are not covered by recorded income",

      description:
        "Cleared expenses exist for this period, but there is no cleared income recorded.",

      valueLabel:
        formatCurrency(
          monthlyCashFlow,
        ),

      actionLabel:
        "Review transactions",

      actionHref:
        "/dashboard/transactions",
    });
  }

  const cashFlowMargin =
    (
      monthlyCashFlow /
      monthlyIncome
    ) *
    100;

  const score =
    scoreCashFlowMargin(
      cashFlowMargin,
    );

  return createFactor({
    id:
      "cash-flow",

    label:
      "Cash flow",

    score,

    title:
      cashFlowMargin >=
      20
        ? "Your cash flow has healthy room"
        : cashFlowMargin >=
            0
          ? "Your cash flow is positive"
          : "Spending is exceeding income",

    description:
      cashFlowMargin >=
      20
        ? "A meaningful share of your cleared income remains after expenses."
        : cashFlowMargin >=
            0
          ? "Your cleared income is covering expenses, but there may be room to improve your monthly margin."
          : "Your cleared expenses are currently higher than your cleared income for this period.",

    valueLabel:
      formatCurrency(
        monthlyCashFlow,
      ),

    actionLabel:
      "Review cash flow",

    actionHref:
      "/dashboard/reports",
  });
}

function buildSavingsFactor({
  monthlyIncome,
  savingsRate,
}: {
  monthlyIncome:
    number;

  savingsRate:
    number | null;
}): FinancialHealthFactor {
  if (
    monthlyIncome <=
      0 ||
    savingsRate ===
      null
  ) {
    return createUnavailableFactor({
      id:
        "savings",

      label:
        "Savings rate",

      title:
        "Savings rate needs income data",

      description:
        "Record cleared income before CASE Budget can calculate how much of it remains available for saving.",

      valueLabel:
        "Not available",

      actionLabel:
        "Open budget",

      actionHref:
        "/dashboard/budget",
    });
  }

  const score =
    scoreSavingsRate(
      savingsRate,
    );

  return createFactor({
    id:
      "savings",

    label:
      "Savings rate",

    score,

    title:
      savingsRate >=
      20
        ? "You are retaining a strong share of income"
        : savingsRate >=
            10
          ? "Your savings rate is moving in a healthy direction"
          : savingsRate >=
              0
            ? "There is room to increase what you retain"
            : "Your current savings rate is negative",

    description:
      "Savings rate is based on cleared income minus cleared expenses for the selected month.",

    valueLabel:
      formatPercentage(
        savingsRate,
      ),

    actionLabel:
      "Review budget",

    actionHref:
      "/dashboard/budget",
  });
}

function buildDebtFactor({
  totalAssets,
  liabilities,
  debtToAssetsRatio,
}: {
  totalAssets:
    number;

  liabilities:
    number;

  debtToAssetsRatio:
    number | null;
}): FinancialHealthFactor {
  if (
    totalAssets <=
      0 &&
    liabilities <=
      0
  ) {
    return createUnavailableFactor({
      id:
        "debt",

      label:
        "Debt position",

      title:
        "Add accounts or debt balances",

      description:
        "CASE Budget needs asset or liability balances before it can evaluate your debt position.",

      valueLabel:
        "No balances",

      actionLabel:
        "Manage accounts",

      actionHref:
        "/dashboard/accounts",
    });
  }

  const ratio =
    debtToAssetsRatio ??
    100;

  const score =
    scoreDebtRatio(
      ratio,
    );

  return createFactor({
    id:
      "debt",

    label:
      "Debt position",

    score,

    title:
      ratio <=
      20
        ? "Debt is low relative to assets"
        : ratio <=
            50
          ? "Debt is within a moderate range"
          : ratio <=
              80
            ? "Debt deserves closer attention"
            : "Liabilities are high relative to assets",

    description:
      "This compares tracked liabilities with tracked assets included in your financial picture.",

    valueLabel:
      formatPercentage(
        ratio,
      ),

    actionLabel:
      "Review debt",

    actionHref:
      "/dashboard/debt",
  });
}

function buildEmergencyFundFactor({
  monthlyExpenses,
  emergencyFundBalance,
  emergencyFundMonths,
}: {
  monthlyExpenses:
    number;

  emergencyFundBalance:
    number;

  emergencyFundMonths:
    number | null;
}): FinancialHealthFactor {
  if (
    emergencyFundBalance <=
      0 &&
    emergencyFundMonths ===
      null
  ) {
    return createUnavailableFactor({
      id:
        "emergency-fund",

      label:
        "Emergency fund",

      title:
        "Set up an emergency savings goal",

      description:
        "CASE Budget cannot measure emergency reserves until an emergency-fund goal or balance is available.",

      valueLabel:
        "Not tracked",

      actionLabel:
        "View savings goals",

      actionHref:
        "/dashboard/goals",
    });
  }

  if (
    monthlyExpenses <=
      0 ||
    emergencyFundMonths ===
      null
  ) {
    return createUnavailableFactor({
      id:
        "emergency-fund",

      label:
        "Emergency fund",

      title:
        "Emergency savings is being tracked",

      description:
        "Record cleared monthly expenses so CASE Budget can estimate how many months your emergency fund could cover.",

      valueLabel:
        formatCurrency(
          emergencyFundBalance,
        ),

      actionLabel:
        "View savings goals",

      actionHref:
        "/dashboard/goals",
    });
  }

  const score =
    scoreEmergencyFundMonths(
      emergencyFundMonths,
    );

  return createFactor({
    id:
      "emergency-fund",

    label:
      "Emergency fund",

    score,

    title:
      emergencyFundMonths >=
      6
        ? "Your emergency reserve is well funded"
        : emergencyFundMonths >=
            3
          ? "Your emergency reserve has a solid foundation"
          : emergencyFundMonths >=
              1
            ? "Your emergency reserve is still building"
            : "Your emergency reserve is limited",

    description:
      "Emergency-fund coverage estimates how many months of current cleared expenses your tracked reserve could cover.",

    valueLabel:
      `${roundToSingleDecimal(
        emergencyFundMonths,
      )} month${
        roundToSingleDecimal(
          emergencyFundMonths,
        ) ===
        1
          ? ""
          : "s"
      }`,

    actionLabel:
      "View savings goals",

    actionHref:
      "/dashboard/goals",
  });
}

function buildBillsFactor({
  bills,
  overdueBillCount,
  upcomingBillCount,
}: {
  bills:
    FinancialHealthBill[];

  overdueBillCount:
    number;

  upcomingBillCount:
    number;
}): FinancialHealthFactor {
  if (
    bills.length ===
    0
  ) {
    return createUnavailableFactor({
      id:
        "bills",

      label:
        "Bills",

      title:
        "No bills are being tracked yet",

      description:
        "Add recurring or upcoming bills so CASE Budget can include payment risk in your financial health picture.",

      valueLabel:
        "No bills",

      actionLabel:
        "Manage bills",

      actionHref:
        "/dashboard/bills",
    });
  }

  const score =
    overdueBillCount ===
    0
      ? 100
      : overdueBillCount ===
          1
        ? 65
        : overdueBillCount ===
            2
          ? 40
          : 15;

  return createFactor({
    id:
      "bills",

    label:
      "Bills",

    score,

    title:
      overdueBillCount ===
      0
        ? "Tracked bills are currently on schedule"
        : overdueBillCount ===
            1
          ? "One tracked bill is overdue"
          : `${overdueBillCount} tracked bills are overdue`,

    description:
      overdueBillCount ===
      0
        ? `${upcomingBillCount} bill${
            upcomingBillCount ===
            1
              ? ""
              : "s"
          } are coming due soon.`
        : "Past-due bills can create fees, service interruptions, and unnecessary pressure on cash flow.",

    valueLabel:
      overdueBillCount ===
      0
        ? "No overdue bills"
        : `${overdueBillCount} overdue`,

    actionLabel:
      "Review bills",

    actionHref:
      "/dashboard/bills",
  });
}

function createFactor({
  id,
  label,
  score,
  title,
  description,
  valueLabel,
  actionLabel,
  actionHref,
}: {
  id:
    FinancialHealthFactorId;

  label:
    string;

  score:
    number;

  title:
    string;

  description:
    string;

  valueLabel:
    string;

  actionLabel:
    string | null;

  actionHref:
    string | null;
}): FinancialHealthFactor {
  const normalizedScore =
    clampScore(
      score,
    );

  const weight =
    FACTOR_WEIGHTS[
      id
    ];

  return {
    id,

    label,

    score:
      normalizedScore,

    weight,

    weightedScore:
      normalizedScore *
      weight,

    status:
      getFactorStatus(
        normalizedScore,
      ),

    title,

    description,

    valueLabel,

    actionLabel,

    actionHref,
  };
}

function createUnavailableFactor({
  id,
  label,
  title,
  description,
  valueLabel,
  actionLabel,
  actionHref,
}: {
  id:
    FinancialHealthFactorId;

  label:
    string;

  title:
    string;

  description:
    string;

  valueLabel:
    string;

  actionLabel:
    string | null;

  actionHref:
    string | null;
}): FinancialHealthFactor {
  return {
    id,

    label,

    score:
      null,

    weight:
      FACTOR_WEIGHTS[
        id
      ],

    weightedScore:
      null,

    status:
      "not-enough-data",

    title,

    description,

    valueLabel,

    actionLabel,

    actionHref,
  };
}

function calculateAccountPosition(
  accounts:
    FinancialHealthAccount[],
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
    FinancialHealthGoal[],
) {
  const emergencyGoals =
    goals.filter(
      (
        goal,
      ) =>
        goal.isEmergencyFund ===
          true ||
        isEmergencyFundName(
          goal.name,
        ),
    );

  return emergencyGoals.reduce(
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
    FinancialHealthBill[];

  today:
    Date;
}) {
  const todayKey =
    formatDateKey(
      today,
    );

  const upcomingEndDate =
    addDays(
      today,
      7,
    );

  const upcomingEndKey =
    formatDateKey(
      upcomingEndDate,
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
      dueDate >=
        todayKey &&
      dueDate <=
        upcomingEndKey
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

function scoreCashFlowMargin(
  margin: number,
) {
  if (
    margin >=
    30
  ) {
    return 100;
  }

  if (
    margin >=
    20
  ) {
    return 90;
  }

  if (
    margin >=
    10
  ) {
    return 78;
  }

  if (
    margin >=
    0
  ) {
    return 65;
  }

  if (
    margin >=
    -10
  ) {
    return 40;
  }

  if (
    margin >=
    -25
  ) {
    return 20;
  }

  return 5;
}

function scoreSavingsRate(
  savingsRate: number,
) {
  if (
    savingsRate >=
    25
  ) {
    return 100;
  }

  if (
    savingsRate >=
    20
  ) {
    return 90;
  }

  if (
    savingsRate >=
    15
  ) {
    return 82;
  }

  if (
    savingsRate >=
    10
  ) {
    return 72;
  }

  if (
    savingsRate >=
    5
  ) {
    return 60;
  }

  if (
    savingsRate >=
    0
  ) {
    return 45;
  }

  return 15;
}

function scoreDebtRatio(
  ratio: number,
) {
  if (
    ratio <=
    10
  ) {
    return 100;
  }

  if (
    ratio <=
    20
  ) {
    return 90;
  }

  if (
    ratio <=
    35
  ) {
    return 78;
  }

  if (
    ratio <=
    50
  ) {
    return 65;
  }

  if (
    ratio <=
    70
  ) {
    return 45;
  }

  if (
    ratio <=
    90
  ) {
    return 25;
  }

  return 10;
}

function scoreEmergencyFundMonths(
  months: number,
) {
  if (
    months >=
    6
  ) {
    return 100;
  }

  if (
    months >=
    4
  ) {
    return 90;
  }

  if (
    months >=
    3
  ) {
    return 80;
  }

  if (
    months >=
    2
  ) {
    return 65;
  }

  if (
    months >=
    1
  ) {
    return 50;
  }

  if (
    months >=
    0.5
  ) {
    return 30;
  }

  return 15;
}

function getOverallStatus(
  score:
    number | null,
): FinancialHealthStatus {
  if (
    score ===
    null
  ) {
    return "not-enough-data";
  }

  if (
    score >=
    85
  ) {
    return "excellent";
  }

  if (
    score >=
    70
  ) {
    return "good";
  }

  if (
    score >=
    50
  ) {
    return "fair";
  }

  return "needs-attention";
}

function getFactorStatus(
  score: number,
): FinancialHealthFactorStatus {
  if (
    score >=
    80
  ) {
    return "strong";
  }

  if (
    score >=
    65
  ) {
    return "stable";
  }

  if (
    score >=
    45
  ) {
    return "watch";
  }

  return "risk";
}

function getStrongestFactor(
  factors:
    FinancialHealthFactor[],
) {
  const availableFactors =
    factors.filter(
      (
        factor,
      ): factor is FinancialHealthFactor & {
        score: number;
      } =>
        factor.score !==
        null,
    );

  if (
    availableFactors.length ===
    0
  ) {
    return null;
  }

  return [
    ...availableFactors,
  ].sort(
    (
      firstFactor,
      secondFactor,
    ) =>
      secondFactor.score -
      firstFactor.score,
  )[0] ??
    null;
}

function getWeakestFactor(
  factors:
    FinancialHealthFactor[],
) {
  const availableFactors =
    factors.filter(
      (
        factor,
      ): factor is FinancialHealthFactor & {
        score: number;
      } =>
        factor.score !==
        null,
    );

  if (
    availableFactors.length ===
    0
  ) {
    return null;
  }

  return [
    ...availableFactors,
  ].sort(
    (
      firstFactor,
      secondFactor,
    ) =>
      firstFactor.score -
      secondFactor.score,
  )[0] ??
    null;
}

function getCurrentMonthDateRange(
  today: Date,
): FinancialHealthDateRange {
  const year =
    today.getFullYear();

  const month =
    today.getMonth();

  const startDate =
    new Date(
      year,
      month,
      1,
    );

  const endDate =
    new Date(
      year,
      month +
        1,
      0,
    );

  return {
    startDate:
      formatDateKey(
        startDate,
      ),

    endDate:
      formatDateKey(
        endDate,
      ),
  };
}

function isDateWithinRange(
  value: string,
  dateRange:
    FinancialHealthDateRange,
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
      dateRange.startDate &&
    date <=
      dateRange.endDate
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

  const trimmed =
    value.trim();

  const match =
    trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );

  if (
    !match
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function isLiabilityAccountType(
  value: string,
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
  value: string,
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

function formatDateKey(
  date: Date,
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
  value: number,
) {
  const normalizedValue =
    normalizeFiniteNumber(
      value,
    );

  return Math.abs(
    normalizedValue,
  );
}

function normalizeFiniteNumber(
  value: number,
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

function clampScore(
  value: number,
) {
  return Math.min(
    100,
    Math.max(
      0,
      roundWholeNumber(
        value,
      ),
    ),
  );
}

function roundWholeNumber(
  value: number,
) {
  return Math.round(
    normalizeFiniteNumber(
      value,
    ),
  );
}

function roundCurrency(
  value: number,
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
  value: number,
) {
  return Math.round(
    normalizeFiniteNumber(
      value,
    ) *
      10,
  ) /
    10;
}

function roundToSingleDecimal(
  value: number,
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
    normalizeFiniteNumber(
      value,
    ),
  );
}

function formatPercentage(
  value: number,
) {
  return `${roundPercentage(
    value,
  )}%`;
}