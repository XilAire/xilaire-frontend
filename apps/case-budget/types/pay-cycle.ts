export type PayCycleFrequency =
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "quarterly"
  | "irregular"
  | "custom";

export type PayCycleIncomeType =
  | "salary"
  | "hourly"
  | "commission"
  | "benefit"
  | "pension"
  | "retirement"
  | "business"
  | "other";

export type PayCycleAmountType =
  | "fixed"
  | "estimated"
  | "variable";

export type PayCycleStatus =
  | "active"
  | "paused"
  | "archived";

export type PayCycleDayAdjustment =
  | "none"
  | "previous-business-day"
  | "next-business-day";

export type PayCycleSemimonthlyRule = {
  firstDayOfMonth: number;
  secondDayOfMonth: number;
};

export type PayCycleCustomRule = {
  intervalCount: number;
  intervalUnit:
    | "day"
    | "week"
    | "month";
};

export type PayCycleData = {
  id: string;

  name: string;
  employerName?: string;
  incomeType: PayCycleIncomeType;

  frequency: PayCycleFrequency;
  amountType: PayCycleAmountType;

  expectedNetAmount: number;
  minimumExpectedAmount?: number;
  maximumExpectedAmount?: number;

  startDate: string;
  nextPayDate: string;
  lastPayDate?: string;
  endDate?: string;

  accountId?: string;

  semimonthlyRule?: PayCycleSemimonthlyRule;
  customRule?: PayCycleCustomRule;

  dayAdjustment: PayCycleDayAdjustment;

  includeInBillPlanning: boolean;
  includeInBudgetIncome: boolean;

  notes?: string;

  status: PayCycleStatus;

  createdAt: string;
  updatedAt: string;
};

export type CreatePayCycleData = {
  name: string;
  employerName?: string;
  incomeType: PayCycleIncomeType;

  frequency: PayCycleFrequency;
  amountType: PayCycleAmountType;

  expectedNetAmount: number;
  minimumExpectedAmount?: number;
  maximumExpectedAmount?: number;

  startDate: string;
  nextPayDate: string;
  endDate?: string;

  accountId?: string;

  semimonthlyRule?: PayCycleSemimonthlyRule;
  customRule?: PayCycleCustomRule;

  dayAdjustment: PayCycleDayAdjustment;

  includeInBillPlanning: boolean;
  includeInBudgetIncome: boolean;

  notes?: string;
};

export type UpdatePayCycleData = {
  id: string;

  name: string;
  employerName?: string;
  incomeType: PayCycleIncomeType;

  frequency: PayCycleFrequency;
  amountType: PayCycleAmountType;

  expectedNetAmount: number;
  minimumExpectedAmount?: number;
  maximumExpectedAmount?: number;

  startDate: string;
  nextPayDate: string;
  lastPayDate?: string;
  endDate?: string;

  accountId?: string;

  semimonthlyRule?: PayCycleSemimonthlyRule;
  customRule?: PayCycleCustomRule;

  dayAdjustment: PayCycleDayAdjustment;

  includeInBillPlanning: boolean;
  includeInBudgetIncome: boolean;

  notes?: string;

  status: PayCycleStatus;
};

export type PayPeriodStatus =
  | "projected"
  | "current"
  | "completed"
  | "skipped";

export type PayPeriodData = {
  id: string;
  payCycleId: string;

  periodStartDate: string;
  periodEndDate: string;
  expectedPayDate: string;
  actualPayDate?: string;

  expectedAmount: number;
  actualAmount?: number;

  availableForBills: number;
  reservedAmount: number;
  remainingAmount: number;

  destinationAccountId?: string;

  status: PayPeriodStatus;
};

export type BillPaymentPriority =
  | "critical"
  | "high"
  | "normal"
  | "low";

export type BillPaymentRecommendationStatus =
  | "recommended"
  | "partially-funded"
  | "fully-funded"
  | "scheduled"
  | "paid"
  | "deferred"
  | "insufficient-funds"
  | "manual-review";

export type BillPaymentRecommendationReason =
  | "due-before-next-paycheck"
  | "past-due"
  | "critical-service"
  | "minimum-debt-payment"
  | "autopay-before-next-paycheck"
  | "insufficient-future-income"
  | "cash-flow-optimization"
  | "user-priority"
  | "manual-selection";

export type BillPaymentRecommendation = {
  id: string;

  payPeriodId: string;
  payCycleId: string;
  billId: string;

  billName: string;
  billDueDate: string;

  billAmount: number;
  recommendedAmount: number;
  remainingBillAmount: number;

  priority: BillPaymentPriority;
  status: BillPaymentRecommendationStatus;

  reasons: BillPaymentRecommendationReason[];

  recommendationOrder: number;

  dueBeforeNextPaycheck: boolean;
  isPastDue: boolean;
  isAutopay: boolean;

  sourceAccountId?: string;

  explanation: string;

  createdAt: string;
  updatedAt: string;
};

export type PayPeriodBillPlanStatus =
  | "draft"
  | "recommended"
  | "approved"
  | "partially-funded"
  | "fully-funded"
  | "completed";

export type PayPeriodBillPlan = {
  id: string;

  payCycleId: string;
  payPeriodId: string;

  expectedPayDate: string;
  nextExpectedPayDate?: string;

  expectedIncome: number;
  currentAccountBalance: number;

  minimumCashReserve: number;
  availableToAllocate: number;
  allocatedAmount: number;
  remainingAfterAllocation: number;

  recommendations: BillPaymentRecommendation[];

  coveredBillCount: number;
  partiallyCoveredBillCount: number;
  uncoveredBillCount: number;
  pastDueBillCount: number;

  status: PayPeriodBillPlanStatus;

  generatedAt: string;
  approvedAt?: string;
  completedAt?: string;
};

export type PayCycleExtraCashStrategy =
  | "keep-available"
  | "debt"
  | "savings"
  | "split";

export type PayCyclePlanningPreferences = {
  /**
   * Minimum amount the planner should attempt
   * to leave available after assigning bills.
   */
  minimumCashReserve: number;

  /**
   * Allows the planner to reserve less than the
   * full balance of a bill when funds are limited.
   */
  allowPartialBillFunding: boolean;

  /**
   * Gives overdue bills priority over bills that
   * have not yet reached their due date.
   */
  prioritizePastDueBills: boolean;

  /**
   * Gives bills using autopay additional priority
   * when they are due before the following paycheck.
   */
  prioritizeAutopayBills: boolean;

  /**
   * Gives required debt minimums priority during
   * bill allocation.
   */
  prioritizeMinimumDebtPayments: boolean;

  /**
   * Gives critical services such as housing,
   * utilities, insurance, and transportation
   * priority during allocation.
   */
  prioritizeCriticalServices: boolean;

  /**
   * Allows critical obligations to move ahead of
   * the normal bill priority order.
   */
  criticalBillsOverridePriority: boolean;

  /**
   * Allows the current deposit-account balance to
   * be included when calculating available cash.
   */
  useCurrentAccountBalance: boolean;

  /**
   * Allows eligible pending income to be considered
   * when building projected plans.
   */
  includePendingIncome: boolean;

  /**
   * Number of future pay periods the planner should
   * consider when distributing obligations.
   */
  lookAheadPayPeriods: number;

  /**
   * Number of days after a payday that bills may be
   * considered for assignment to that paycheck.
   */
  planningWindowDays: number;

  /**
   * Legacy-compatible planning-window value used by
   * the current bill-planning utility.
   *
   * This should remain synchronized with
   * planningWindowDays until the planner utility is
   * migrated to the new property name.
   */
  billPlanningWindowDays: number;

  /**
   * Strategy used for money remaining after bills
   * and the minimum cash reserve are covered.
   */
  extraCashStrategy: PayCycleExtraCashStrategy;

  /**
   * Percentage of extra cash recommended for debt
   * when extraCashStrategy is set to "split".
   */
  extraCashDebtPercentage: number;

  /**
   * Percentage of extra cash recommended for savings
   * when extraCashStrategy is set to "split".
   */
  extraCashSavingsPercentage: number;

  /**
   * Bill IDs that should always receive critical
   * priority.
   */
  criticalBillIds: string[];

  /**
   * Bill IDs that should receive lower priority when
   * available income is limited.
   */
  lowPriorityBillIds: string[];
};

export type PayCycleProjection = {
  payCycleId: string;

  projectedPayPeriods: PayPeriodData[];

  totalProjectedIncome: number;
  totalRecommendedBillPayments: number;
  projectedRemainingCash: number;

  uncoveredBillAmount: number;
  uncoveredBillCount: number;

  firstProjectedPayDate?: string;
  lastProjectedPayDate?: string;
};

export type PayCyclePlannerSummary = {
  activePayCycleCount: number;

  nextPayDate?: string;
  nextExpectedIncome: number;

  billsDueBeforeNextPaycheck: number;
  billAmountDueBeforeNextPaycheck: number;

  recommendedPaymentAmount: number;
  remainingAfterRecommendations: number;

  pastDueBillCount: number;
  insufficientFundsBillCount: number;
};