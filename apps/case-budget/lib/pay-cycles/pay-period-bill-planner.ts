import type {
  BillData,
} from "@/types/bill";

import type {
  BillPaymentPriority,
  BillPaymentRecommendation,
  BillPaymentRecommendationReason,
  BillPaymentRecommendationStatus,
  PayCycleData,
  PayCyclePlannerSummary,
  PayCyclePlanningPreferences,
  PayPeriodBillPlan,
  PayPeriodBillPlanStatus,
  PayPeriodData,
} from "@/types/pay-cycle";

export type BuildPayPeriodBillPlanInput = {
  payCycle: PayCycleData;
  payPeriod: PayPeriodData;
  bills: BillData[];

  nextPayPeriod?: PayPeriodData;
  currentAccountBalance?: number;

  preferences?: Partial<
    PayCyclePlanningPreferences
  >;

  asOfDate?: string;
};

export type BuildMultiPeriodBillPlansInput = {
  payCycle: PayCycleData;
  payPeriods: PayPeriodData[];
  bills: BillData[];

  currentAccountBalance?: number;

  preferences?: Partial<
    PayCyclePlanningPreferences
  >;

  asOfDate?: string;
};

export type BillPlannerCandidate = {
  bill: BillData;

  amountDue: number;
  dueDate: string;
  planningDate: string;

  priority: BillPaymentPriority;

  isPastDue: boolean;
  isAutopay: boolean;
  isCriticalService: boolean;
  isMinimumDebtPayment: boolean;

  dueBeforeNextPaycheck: boolean;
  daysUntilDue: number;

  reasons:
    BillPaymentRecommendationReason[];
};

export type BillPlannerValidationResult = {
  isValid: boolean;
  errors: string[];
};

const DEFAULT_PLANNING_PREFERENCES:
  PayCyclePlanningPreferences = {
    minimumCashReserve: 0,

    prioritizePastDueBills: true,
    prioritizeAutopayBills: true,
    prioritizeMinimumDebtPayments: true,
    prioritizeCriticalServices: true,
    criticalBillsOverridePriority: true,

    allowPartialBillFunding: true,
    useCurrentAccountBalance: true,
    includePendingIncome: false,

    lookAheadPayPeriods: 3,
    planningWindowDays: 45,
    billPlanningWindowDays: 45,

    extraCashStrategy:
      "keep-available",
    extraCashDebtPercentage: 50,
    extraCashSavingsPercentage: 50,

    criticalBillIds: [],
    lowPriorityBillIds: [],
  };

const CRITICAL_BILL_KEYWORDS = [
  "mortgage",
  "rent",
  "electric",
  "electricity",
  "water",
  "sewer",
  "gas",
  "insurance",
  "health insurance",
  "car insurance",
  "auto insurance",
  "home insurance",
  "property tax",
  "child care",
  "daycare",
  "medical",
] as const;

const DEBT_BILL_KEYWORDS = [
  "credit card",
  "loan",
  "mortgage",
  "debt",
  "student loan",
  "vehicle loan",
  "auto loan",
  "personal loan",
] as const;

const BILL_PRIORITY_WEIGHT:
  Record<
    BillPaymentPriority,
    number
  > = {
    critical: 4,
    high: 3,
    normal: 2,
    low: 1,
  };

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

export function buildPayPeriodBillPlan({
  payCycle,
  payPeriod,
  bills,
  nextPayPeriod,
  currentAccountBalance = 0,
  preferences,
  asOfDate = getTodayDateString(),
}: BuildPayPeriodBillPlanInput): PayPeriodBillPlan {
  const validation =
    validateBillPlannerInput({
      payCycle,
      payPeriod,
      bills,
      nextPayPeriod,
      currentAccountBalance,
      preferences,
      asOfDate,
    });

  if (
    !validation.isValid
  ) {
    throw new Error(
      validation.errors.join(
        " ",
      ),
    );
  }

  const resolvedPreferences =
    resolvePlanningPreferences(
      preferences,
    );

  const normalizedAsOfDate =
    normalizeDateString(
      asOfDate,
    );

  const expectedPayDate =
    normalizeDateString(
      payPeriod.expectedPayDate,
    );

  const nextExpectedPayDate =
    nextPayPeriod
      ? normalizeDateString(
          nextPayPeriod.expectedPayDate,
        )
      : undefined;

  const expectedIncome =
    normalizeCurrency(
      payPeriod.actualAmount ??
        payPeriod.expectedAmount,
    );

  const normalizedAccountBalance =
    normalizeCurrency(
      currentAccountBalance,
    );

  const reserveAmount =
    normalizeCurrency(
      resolvedPreferences.minimumCashReserve,
    );

  const availableCash =
    normalizeCurrency(
      expectedIncome +
        (
          resolvedPreferences.useCurrentAccountBalance
            ? normalizedAccountBalance
            : 0
        ),
    );

  const availableToAllocate =
    normalizeCurrency(
      Math.max(
        0,
        availableCash -
          reserveAmount,
      ),
    );

  const candidates =
    buildBillPlannerCandidates({
      bills,
      payPeriod,
      nextPayPeriod,
      preferences:
        resolvedPreferences,
      asOfDate:
        normalizedAsOfDate,
    });

  const allocationResult =
    allocateBillsToPayPeriod({
      payCycle,
      payPeriod,
      candidates,
      availableToAllocate,
      preferences:
        resolvedPreferences,
      generatedAt:
        createGeneratedTimestamp(
          normalizedAsOfDate,
        ),
    });

  const recommendations =
    allocationResult.recommendations;

  const allocatedAmount =
    normalizeCurrency(
      recommendations.reduce(
        (
          total,
          recommendation,
        ) =>
          total +
          recommendation.recommendedAmount,
        0,
      ),
    );

  const remainingAfterAllocation =
    normalizeCurrency(
      Math.max(
        0,
        availableToAllocate -
          allocatedAmount,
      ),
    );

  const coveredBillCount =
    recommendations.filter(
      (
        recommendation,
      ) =>
        recommendation.status ===
          "fully-funded" ||
        recommendation.status ===
          "scheduled" ||
        recommendation.status ===
          "paid",
    ).length;

  const partiallyCoveredBillCount =
    recommendations.filter(
      (
        recommendation,
      ) =>
        recommendation.status ===
        "partially-funded",
    ).length;

  const uncoveredBillCount =
    recommendations.filter(
      (
        recommendation,
      ) =>
        recommendation.status ===
          "insufficient-funds" ||
        recommendation.recommendedAmount <=
          0,
    ).length;

  const pastDueBillCount =
    recommendations.filter(
      (
        recommendation,
      ) =>
        recommendation.isPastDue,
    ).length;

  return {
    id:
      createBillPlanId(
        payCycle.id,
        payPeriod.id,
      ),

    payCycleId:
      payCycle.id,
    payPeriodId:
      payPeriod.id,

    expectedPayDate,
    nextExpectedPayDate,

    expectedIncome,
    currentAccountBalance:
      normalizedAccountBalance,

    minimumCashReserve:
      reserveAmount,
    availableToAllocate,
    allocatedAmount,
    remainingAfterAllocation,

    recommendations,

    coveredBillCount,
    partiallyCoveredBillCount,
    uncoveredBillCount,
    pastDueBillCount,

    status:
      resolvePlanStatus(
        recommendations,
      ),

    generatedAt:
      createGeneratedTimestamp(
        normalizedAsOfDate,
      ),
  };
}

export function buildMultiPeriodBillPlans({
  payCycle,
  payPeriods,
  bills,
  currentAccountBalance = 0,
  preferences,
  asOfDate = getTodayDateString(),
}: BuildMultiPeriodBillPlansInput) {
  if (
    payPeriods.length ===
    0
  ) {
    return [];
  }

  const resolvedPreferences =
    resolvePlanningPreferences(
      preferences,
    );

  const sortedPayPeriods =
    [
      ...payPeriods,
    ]
      .sort(
        (
          firstPeriod,
          secondPeriod,
        ) =>
          firstPeriod.expectedPayDate.localeCompare(
            secondPeriod.expectedPayDate,
          ),
      )
      .slice(
        0,
        resolvedPreferences.lookAheadPayPeriods,
      );

  const assignedBillIds =
    new Set<string>();

  let rollingAccountBalance =
    normalizeCurrency(
      currentAccountBalance,
    );

  return sortedPayPeriods.map(
    (
      payPeriod,
      index,
    ) => {
      const eligibleBills =
        bills.filter(
          (
            bill,
          ) =>
            !assignedBillIds.has(
              bill.id,
            ),
        );

      const nextPayPeriod =
        sortedPayPeriods[
          index +
            1
        ];

      const plan =
        buildPayPeriodBillPlan({
          payCycle,
          payPeriod,
          nextPayPeriod,
          bills:
            eligibleBills,
          currentAccountBalance:
            rollingAccountBalance,
          preferences:
            resolvedPreferences,
          asOfDate,
        });

      plan.recommendations.forEach(
        (
          recommendation,
        ) => {
          if (
            recommendation.status ===
              "fully-funded" ||
            recommendation.status ===
              "scheduled" ||
            recommendation.status ===
              "paid"
          ) {
            assignedBillIds.add(
              recommendation.billId,
            );
          }
        },
      );

      rollingAccountBalance =
        normalizeCurrency(
          Math.max(
            0,
            plan.remainingAfterAllocation +
              plan.minimumCashReserve,
          ),
        );

      return plan;
    },
  );
}

export function buildBillPlannerCandidates({
  bills,
  payPeriod,
  nextPayPeriod,
  preferences,
  asOfDate,
}: {
  bills: BillData[];
  payPeriod: PayPeriodData;
  nextPayPeriod?: PayPeriodData;
  preferences:
    PayCyclePlanningPreferences;
  asOfDate: string;
}) {
  const normalizedAsOfDate =
    normalizeDateString(
      asOfDate,
    );

  const currentPayDate =
    normalizeDateString(
      payPeriod.expectedPayDate,
    );

  const nextPayDate =
    nextPayPeriod
      ? normalizeDateString(
          nextPayPeriod.expectedPayDate,
        )
      : addDaysToDateString(
          currentPayDate,
          preferences.billPlanningWindowDays,
        );

  const planningWindowEnd =
    addDaysToDateString(
      currentPayDate,
      preferences.billPlanningWindowDays,
    );

  return bills
    .filter(
      (
        bill,
      ) =>
        shouldIncludeBill(
          bill,
          normalizedAsOfDate,
          planningWindowEnd,
        ),
    )
    .map(
      (
        bill,
      ): BillPlannerCandidate => {
        const dueDate =
          normalizeDateString(
            bill.dueDate,
          );

        const autopayDate =
          getOptionalDateString(
            bill,
            [
              "autopayDate",
              "nextAutopayDate",
              "draftDate",
              "paymentDate",
            ],
          );

        const planningDate =
          autopayDate &&
          compareDateStrings(
            autopayDate,
            dueDate,
          ) <=
            0
            ? autopayDate
            : dueDate;

        const isPastDue =
          bill.status ===
            "past-due" ||
          compareDateStrings(
            dueDate,
            normalizedAsOfDate,
          ) <
            0;

        const isAutopay =
          bill.paymentMethod ===
            "autopay";

        const isCriticalService =
          isCriticalBill(
            bill,
            preferences,
          );

        const isMinimumDebtPayment =
          isDebtBill(
            bill,
          ) &&
          getBillMinimumPayment(
            bill,
          ) >
            0;

        const priority =
          resolveBillPriority(
            bill,
            {
              isPastDue,
              isAutopay,
              isCriticalService,
              isMinimumDebtPayment,
            },
            preferences,
          );

        const dueBeforeNextPaycheck =
          compareDateStrings(
            planningDate,
            nextPayDate,
          ) <
            0 ||
          compareDateStrings(
            planningDate,
            nextPayDate,
          ) ===
            0;

        const reasons =
          resolveRecommendationReasons({
            bill,
            isPastDue,
            isAutopay,
            isCriticalService,
            isMinimumDebtPayment,
            dueBeforeNextPaycheck,
            priority,
            preferences,
          });

        return {
          bill,

          amountDue:
            getBillAmountDue(
              bill,
            ),
          dueDate,
          planningDate,

          priority,

          isPastDue,
          isAutopay,
          isCriticalService,
          isMinimumDebtPayment,

          dueBeforeNextPaycheck,
          daysUntilDue:
            differenceInCalendarDays(
              dueDate,
              normalizedAsOfDate,
            ),

          reasons,
        };
      },
    )
    .sort(
      (
        firstCandidate,
        secondCandidate,
      ) =>
        compareBillPlannerCandidates(
          firstCandidate,
          secondCandidate,
          preferences,
        ),
    );
}

export function allocateBillsToPayPeriod({
  payCycle,
  payPeriod,
  candidates,
  availableToAllocate,
  preferences,
  generatedAt,
}: {
  payCycle: PayCycleData;
  payPeriod: PayPeriodData;
  candidates: BillPlannerCandidate[];
  availableToAllocate: number;
  preferences:
    PayCyclePlanningPreferences;
  generatedAt: string;
}) {
  let remainingAvailable =
    normalizeCurrency(
      Math.max(
        0,
        availableToAllocate,
      ),
    );

  const recommendations:
    BillPaymentRecommendation[] =
      [];

  candidates.forEach(
    (
      candidate,
      index,
    ) => {
      const targetAmount =
        getTargetFundingAmount(
          candidate,
        );

      const recommendedAmount =
        calculateRecommendedAmount({
          targetAmount,
          remainingAvailable,
          allowPartialFunding:
            preferences.allowPartialBillFunding,
        });

      const remainingBillAmount =
        normalizeCurrency(
          Math.max(
            0,
            targetAmount -
              recommendedAmount,
          ),
        );

      const status =
        resolveRecommendationStatus({
          candidate,
          targetAmount,
          recommendedAmount,
          remainingBillAmount,
        });

      const recommendation:
        BillPaymentRecommendation = {
          id:
            createRecommendationId(
              payPeriod.id,
              candidate.bill.id,
            ),

          payPeriodId:
            payPeriod.id,
          payCycleId:
            payCycle.id,
          billId:
            candidate.bill.id,

          billName:
            candidate.bill.name,
          billDueDate:
            candidate.dueDate,

          billAmount:
            normalizeCurrency(
              candidate.amountDue,
            ),
          recommendedAmount,
          remainingBillAmount,

          priority:
            candidate.priority,
          status,

          reasons:
            getFinalRecommendationReasons(
              candidate.reasons,
              status,
            ),

          recommendationOrder:
            index +
            1,

          dueBeforeNextPaycheck:
            candidate.dueBeforeNextPaycheck,
          isPastDue:
            candidate.isPastDue,
          isAutopay:
            candidate.isAutopay,

          sourceAccountId:
            candidate.bill.account?.id ??
            payCycle.accountId,

          explanation:
            buildRecommendationExplanation({
              candidate,
              targetAmount,
              recommendedAmount,
              remainingBillAmount,
              status,
            }),

          createdAt:
            generatedAt,
          updatedAt:
            generatedAt,
        };

      recommendations.push(
        recommendation,
      );

      remainingAvailable =
        normalizeCurrency(
          Math.max(
            0,
            remainingAvailable -
              recommendedAmount,
          ),
        );
    },
  );

  return {
    recommendations,
    remainingAvailable,
  };
}

export function summarizePayPeriodBillPlan(
  plan: PayPeriodBillPlan,
): PayCyclePlannerSummary {
  const billsDueBeforeNextPaycheck =
    plan.recommendations.filter(
      (
        recommendation,
      ) =>
        recommendation.dueBeforeNextPaycheck,
    );

  return {
    activePayCycleCount:
      1,

    nextPayDate:
      plan.expectedPayDate,
    nextExpectedIncome:
      normalizeCurrency(
        plan.expectedIncome,
      ),

    billsDueBeforeNextPaycheck:
      billsDueBeforeNextPaycheck.length,
    billAmountDueBeforeNextPaycheck:
      normalizeCurrency(
        billsDueBeforeNextPaycheck.reduce(
          (
            total,
            recommendation,
          ) =>
            total +
            recommendation.billAmount,
          0,
        ),
      ),

    recommendedPaymentAmount:
      normalizeCurrency(
        plan.allocatedAmount,
      ),
    remainingAfterRecommendations:
      normalizeCurrency(
        plan.remainingAfterAllocation,
      ),

    pastDueBillCount:
      plan.pastDueBillCount,
    insufficientFundsBillCount:
      plan.recommendations.filter(
        (
          recommendation,
        ) =>
          recommendation.status ===
          "insufficient-funds",
      ).length,
  };
}

export function summarizeExtraCashRecommendation(
  plan:
    PayPeriodBillPlan,
  preferences:
    PayCyclePlanningPreferences,
) {
  const remainingCash =
    normalizeCurrency(
      Math.max(
        0,
        plan.remainingAfterAllocation,
      ),
    );

  const debtAmount =
    preferences.extraCashStrategy ===
      "debt"
      ? remainingCash
      : preferences.extraCashStrategy ===
          "split"
        ? normalizeCurrency(
            remainingCash *
              (
                preferences.extraCashDebtPercentage /
                100
              ),
          )
        : 0;

  const savingsAmount =
    preferences.extraCashStrategy ===
      "savings"
      ? remainingCash
      : preferences.extraCashStrategy ===
          "split"
        ? normalizeCurrency(
            remainingCash *
              (
                preferences.extraCashSavingsPercentage /
                100
              ),
          )
        : 0;

  const keepAvailableAmount =
    preferences.extraCashStrategy ===
    "keep-available"
      ? remainingCash
      : normalizeCurrency(
          Math.max(
            0,
            remainingCash -
              debtAmount -
              savingsAmount,
          ),
        );

  return {
    strategy:
      preferences.extraCashStrategy,
    remainingCash,
    debtAmount,
    savingsAmount,
    keepAvailableAmount,
  };
}


export function resolvePlanningPreferences(
  preferences?: Partial<
    PayCyclePlanningPreferences
  >,
): PayCyclePlanningPreferences {
  const requestedPlanningWindow =
    preferences?.planningWindowDays ??
    preferences?.billPlanningWindowDays ??
    DEFAULT_PLANNING_PREFERENCES.planningWindowDays;

  const planningWindowDays =
    normalizeNonNegativeInteger(
      requestedPlanningWindow,
      DEFAULT_PLANNING_PREFERENCES.planningWindowDays,
    );

  const extraCashStrategy =
    normalizeExtraCashStrategy(
      preferences?.extraCashStrategy,
    );

  let extraCashDebtPercentage =
    normalizePercentage(
      preferences?.extraCashDebtPercentage,
      DEFAULT_PLANNING_PREFERENCES.extraCashDebtPercentage,
    );

  let extraCashSavingsPercentage =
    normalizePercentage(
      preferences?.extraCashSavingsPercentage,
      DEFAULT_PLANNING_PREFERENCES.extraCashSavingsPercentage,
    );

  if (
    extraCashStrategy ===
    "split"
  ) {
    const allocationTotal =
      extraCashDebtPercentage +
      extraCashSavingsPercentage;

    if (
      allocationTotal !==
      100
    ) {
      extraCashDebtPercentage =
        DEFAULT_PLANNING_PREFERENCES.extraCashDebtPercentage;

      extraCashSavingsPercentage =
        DEFAULT_PLANNING_PREFERENCES.extraCashSavingsPercentage;
    }
  }

  return {
    ...DEFAULT_PLANNING_PREFERENCES,
    ...preferences,

    minimumCashReserve:
      normalizeCurrency(
        Math.max(
          0,
          preferences?.minimumCashReserve ??
            DEFAULT_PLANNING_PREFERENCES.minimumCashReserve,
        ),
      ),

    prioritizePastDueBills:
      preferences?.prioritizePastDueBills ??
      DEFAULT_PLANNING_PREFERENCES.prioritizePastDueBills,

    prioritizeAutopayBills:
      preferences?.prioritizeAutopayBills ??
      DEFAULT_PLANNING_PREFERENCES.prioritizeAutopayBills,

    prioritizeMinimumDebtPayments:
      preferences?.prioritizeMinimumDebtPayments ??
      DEFAULT_PLANNING_PREFERENCES.prioritizeMinimumDebtPayments,

    prioritizeCriticalServices:
      preferences?.prioritizeCriticalServices ??
      DEFAULT_PLANNING_PREFERENCES.prioritizeCriticalServices,

    criticalBillsOverridePriority:
      preferences?.criticalBillsOverridePriority ??
      DEFAULT_PLANNING_PREFERENCES.criticalBillsOverridePriority,

    allowPartialBillFunding:
      preferences?.allowPartialBillFunding ??
      DEFAULT_PLANNING_PREFERENCES.allowPartialBillFunding,

    useCurrentAccountBalance:
      preferences?.useCurrentAccountBalance ??
      DEFAULT_PLANNING_PREFERENCES.useCurrentAccountBalance,

    includePendingIncome:
      preferences?.includePendingIncome ??
      DEFAULT_PLANNING_PREFERENCES.includePendingIncome,

    lookAheadPayPeriods:
      normalizePositiveInteger(
        preferences?.lookAheadPayPeriods,
        DEFAULT_PLANNING_PREFERENCES.lookAheadPayPeriods,
      ),

    planningWindowDays,
    billPlanningWindowDays:
      planningWindowDays,

    extraCashStrategy,
    extraCashDebtPercentage,
    extraCashSavingsPercentage,

    criticalBillIds:
      normalizeStringList(
        preferences?.criticalBillIds ??
          DEFAULT_PLANNING_PREFERENCES.criticalBillIds,
      ),

    lowPriorityBillIds:
      normalizeStringList(
        preferences?.lowPriorityBillIds ??
          DEFAULT_PLANNING_PREFERENCES.lowPriorityBillIds,
      ),
  };
}

export function validateBillPlannerInput({
  payCycle,
  payPeriod,
  bills,
  nextPayPeriod,
  currentAccountBalance = 0,
  preferences,
  asOfDate = getTodayDateString(),
}: BuildPayPeriodBillPlanInput): BillPlannerValidationResult {
  const errors:
    string[] = [];

  if (
    !payCycle.id
  ) {
    errors.push(
      "The pay cycle must have an ID.",
    );
  }

  if (
    !payPeriod.id
  ) {
    errors.push(
      "The pay period must have an ID.",
    );
  }

  if (
    payPeriod.payCycleId !==
    payCycle.id
  ) {
    errors.push(
      "The pay period does not belong to the supplied pay cycle.",
    );
  }

  if (
    !isValidDateString(
      payPeriod.expectedPayDate,
    )
  ) {
    errors.push(
      "The expected pay date is invalid.",
    );
  }

  if (
    nextPayPeriod &&
    !isValidDateString(
      nextPayPeriod.expectedPayDate,
    )
  ) {
    errors.push(
      "The next expected pay date is invalid.",
    );
  }

  if (
    nextPayPeriod &&
    isValidDateString(
      payPeriod.expectedPayDate,
    ) &&
    isValidDateString(
      nextPayPeriod.expectedPayDate,
    ) &&
    compareDateStrings(
      nextPayPeriod.expectedPayDate,
      payPeriod.expectedPayDate,
    ) <=
      0
  ) {
    errors.push(
      "The next pay period must occur after the current pay period.",
    );
  }

  if (
    !Number.isFinite(
      payPeriod.expectedAmount,
    ) ||
    payPeriod.expectedAmount <
      0
  ) {
    errors.push(
      "The expected pay-period amount must be a valid non-negative number.",
    );
  }

  if (
    !Number.isFinite(
      currentAccountBalance,
    )
  ) {
    errors.push(
      "The current account balance must be a valid number.",
    );
  }

  if (
    !isValidDateString(
      asOfDate.slice(
        0,
        10,
      ),
    )
  ) {
    errors.push(
      "The planner as-of date is invalid.",
    );
  }

  const resolvedPreferences =
    resolvePlanningPreferences(
      preferences,
    );

  if (
    resolvedPreferences.minimumCashReserve <
    0
  ) {
    errors.push(
      "The minimum cash reserve cannot be negative.",
    );
  }

  if (
    resolvedPreferences.planningWindowDays <
      0 ||
    resolvedPreferences.planningWindowDays >
      365
  ) {
    errors.push(
      "The planning window must be between 0 and 365 days.",
    );
  }

  if (
    resolvedPreferences.extraCashStrategy ===
      "split" &&
    resolvedPreferences.extraCashDebtPercentage +
      resolvedPreferences.extraCashSavingsPercentage !==
      100
  ) {
    errors.push(
      "Debt and savings extra-cash percentages must total 100%.",
    );
  }

  bills.forEach(
    (
      bill,
    ) => {
      if (
        !bill.id
      ) {
        errors.push(
          "Every bill must have an ID.",
        );
      }

      if (
        !bill.name
      ) {
        errors.push(
          "Every bill must have a name.",
        );
      }

      if (
        !Number.isFinite(
          bill.amount,
        ) ||
        bill.amount <
          0
      ) {
        errors.push(
          `Bill "${bill.name}" has an invalid amount.`,
        );
      }

      if (
        !isValidDateString(
          bill.dueDate,
        )
      ) {
        errors.push(
          `Bill "${bill.name}" has an invalid due date.`,
        );
      }
    },
  );

  return {
    isValid:
      errors.length ===
      0,
    errors:
      Array.from(
        new Set(
          errors,
        ),
      ),
  };
}

function shouldIncludeBill(
  bill: BillData,
  asOfDate: string,
  planningWindowEnd: string,
) {
  if (
    bill.status ===
    "paid"
  ) {
    return false;
  }

  const extendedStatus =
    getOptionalString(
      bill,
      [
        "status",
      ],
    );

  if (
    extendedStatus ===
      "cancelled"
  ) {
    return false;
  }

  const dueDate =
    normalizeDateString(
      bill.dueDate,
    );

  return (
    compareDateStrings(
      dueDate,
      planningWindowEnd,
    ) <=
      0 ||
    compareDateStrings(
      dueDate,
      asOfDate,
    ) <
      0
  );
}

function getBillAmountDue(
  bill: BillData,
) {
  const remainingAmount =
    getOptionalNumber(
      bill,
      [
        "remainingAmount",
        "amountRemaining",
        "unpaidAmount",
        "balanceDue",
      ],
    );

  if (
    remainingAmount !==
      undefined
  ) {
    return normalizeCurrency(
      Math.max(
        0,
        remainingAmount,
      ),
    );
  }

  return normalizeCurrency(
    Math.max(
      0,
      bill.amount,
    ),
  );
}

function getTargetFundingAmount(
  candidate: BillPlannerCandidate,
) {
  const minimumPayment =
    getBillMinimumPayment(
      candidate.bill,
    );

  if (
    candidate.isMinimumDebtPayment &&
    minimumPayment >
      0
  ) {
    return normalizeCurrency(
      Math.min(
        candidate.amountDue,
        minimumPayment,
      ),
    );
  }

  return normalizeCurrency(
    candidate.amountDue,
  );
}

function getBillMinimumPayment(
  bill: BillData,
) {
  return normalizeCurrency(
    Math.max(
      0,
      getOptionalNumber(
        bill,
        [
          "minimumPayment",
          "minimumAmount",
          "minimumDue",
        ],
      ) ??
        0,
    ),
  );
}

function isCriticalBill(
  bill: BillData,
  preferences:
    PayCyclePlanningPreferences,
) {
  if (
    preferences.criticalBillIds.includes(
      bill.id,
    )
  ) {
    return true;
  }

  const explicitPriority =
    getOptionalString(
      bill,
      [
        "priority",
        "billPriority",
      ],
    );

  if (
    explicitPriority ===
      "critical"
  ) {
    return true;
  }

  const essentialFlag =
    getOptionalBoolean(
      bill,
      [
        "essential",
        "isEssential",
        "criticalService",
      ],
    );

  if (
    essentialFlag ===
    true
  ) {
    return true;
  }

  const searchableText =
    [
      bill.name,
      bill.payee,
      bill.budgetItem?.name,
      bill.budgetItem?.categoryName,
    ]
      .filter(
        (
          value,
        ): value is string =>
          Boolean(
            value,
          ),
      )
      .join(
        " ",
      )
      .toLowerCase();

  return CRITICAL_BILL_KEYWORDS.some(
    (
      keyword,
    ) =>
      searchableText.includes(
        keyword,
      ),
  );
}

function isDebtBill(
  bill: BillData,
) {
  const debtFlag =
    getOptionalBoolean(
      bill,
      [
        "isDebt",
        "debtPayment",
      ],
    );

  if (
    debtFlag ===
    true
  ) {
    return true;
  }

  const searchableText =
    [
      bill.name,
      bill.payee,
      bill.budgetItem?.name,
      bill.budgetItem?.categoryName,
    ]
      .filter(
        (
          value,
        ): value is string =>
          Boolean(
            value,
          ),
      )
      .join(
        " ",
      )
      .toLowerCase();

  return DEBT_BILL_KEYWORDS.some(
    (
      keyword,
    ) =>
      searchableText.includes(
        keyword,
      ),
  );
}

function resolveBillPriority(
  bill: BillData,
  signals: {
    isPastDue: boolean;
    isAutopay: boolean;
    isCriticalService: boolean;
    isMinimumDebtPayment: boolean;
  },
  preferences:
    PayCyclePlanningPreferences,
): BillPaymentPriority {
  if (
    preferences.lowPriorityBillIds.includes(
      bill.id,
    )
  ) {
    return "low";
  }

  if (
    signals.isCriticalService &&
    preferences.prioritizeCriticalServices &&
    preferences.criticalBillsOverridePriority
  ) {
    return "critical";
  }

  const explicitPriority =
    getOptionalString(
      bill,
      [
        "priority",
        "billPriority",
      ],
    );

  if (
    isBillPaymentPriority(
      explicitPriority,
    )
  ) {
    return explicitPriority;
  }

  if (
    signals.isPastDue &&
    preferences.prioritizePastDueBills
  ) {
    return "critical";
  }

  if (
    signals.isCriticalService &&
    preferences.prioritizeCriticalServices
  ) {
    return "high";
  }

  if (
    signals.isAutopay &&
    preferences.prioritizeAutopayBills
  ) {
    return "high";
  }

  if (
    signals.isMinimumDebtPayment &&
    preferences.prioritizeMinimumDebtPayments
  ) {
    return "high";
  }

  return "normal";
}

function resolveRecommendationReasons({
  bill,
  isPastDue,
  isAutopay,
  isCriticalService,
  isMinimumDebtPayment,
  dueBeforeNextPaycheck,
  priority,
  preferences,
}: {
  bill: BillData;
  isPastDue: boolean;
  isAutopay: boolean;
  isCriticalService: boolean;
  isMinimumDebtPayment: boolean;
  dueBeforeNextPaycheck: boolean;
  priority: BillPaymentPriority;
  preferences:
    PayCyclePlanningPreferences;
}) {
  const reasons:
    BillPaymentRecommendationReason[] =
      [];

  if (
    isPastDue &&
    preferences.prioritizePastDueBills
  ) {
    reasons.push(
      "past-due",
    );
  }

  if (
    dueBeforeNextPaycheck
  ) {
    reasons.push(
      "due-before-next-paycheck",
    );
  }

  if (
    isCriticalService &&
    preferences.prioritizeCriticalServices
  ) {
    reasons.push(
      "critical-service",
    );
  }

  if (
    isMinimumDebtPayment &&
    preferences.prioritizeMinimumDebtPayments
  ) {
    reasons.push(
      "minimum-debt-payment",
    );
  }

  if (
    isAutopay &&
    preferences.prioritizeAutopayBills
  ) {
    reasons.push(
      "autopay-before-next-paycheck",
    );
  }

  if (
    priority ===
      "critical" ||
    priority ===
      "high"
  ) {
    reasons.push(
      "user-priority",
    );
  }

  if (
    reasons.length ===
    0
  ) {
    reasons.push(
      "cash-flow-optimization",
    );
  }

  return Array.from(
    new Set(
      reasons,
    ),
  );
}

function compareBillPlannerCandidates(
  firstCandidate:
    BillPlannerCandidate,
  secondCandidate:
    BillPlannerCandidate,
  preferences:
    PayCyclePlanningPreferences,
) {
  if (
    preferences.prioritizePastDueBills &&
    firstCandidate.isPastDue !==
      secondCandidate.isPastDue
  ) {
    return firstCandidate.isPastDue
      ? -1
      : 1;
  }

  if (
    preferences.criticalBillsOverridePriority &&
    preferences.prioritizeCriticalServices &&
    firstCandidate.isCriticalService !==
      secondCandidate.isCriticalService
  ) {
    return firstCandidate.isCriticalService
      ? -1
      : 1;
  }

  if (
    firstCandidate.dueBeforeNextPaycheck !==
    secondCandidate.dueBeforeNextPaycheck
  ) {
    return firstCandidate.dueBeforeNextPaycheck
      ? -1
      : 1;
  }

  const priorityDifference =
    BILL_PRIORITY_WEIGHT[
      secondCandidate.priority
    ] -
    BILL_PRIORITY_WEIGHT[
      firstCandidate.priority
    ];

  if (
    priorityDifference !==
    0
  ) {
    return priorityDifference;
  }

  if (
    preferences.prioritizeMinimumDebtPayments &&
    firstCandidate.isMinimumDebtPayment !==
      secondCandidate.isMinimumDebtPayment
  ) {
    return firstCandidate.isMinimumDebtPayment
      ? -1
      : 1;
  }

  if (
    preferences.prioritizeAutopayBills &&
    firstCandidate.isAutopay !==
      secondCandidate.isAutopay
  ) {
    return firstCandidate.isAutopay
      ? -1
      : 1;
  }

  const dateDifference =
    compareDateStrings(
      firstCandidate.planningDate,
      secondCandidate.planningDate,
    );

  if (
    dateDifference !==
    0
  ) {
    return dateDifference;
  }

  const amountDifference =
    firstCandidate.amountDue -
    secondCandidate.amountDue;

  if (
    amountDifference !==
    0
  ) {
    return amountDifference;
  }

  return firstCandidate.bill.name.localeCompare(
    secondCandidate.bill.name,
  );
}

function calculateRecommendedAmount({
  targetAmount,
  remainingAvailable,
  allowPartialFunding,
}: {
  targetAmount: number;
  remainingAvailable: number;
  allowPartialFunding: boolean;
}) {
  if (
    targetAmount <=
      0 ||
    remainingAvailable <=
      0
  ) {
    return 0;
  }

  if (
    remainingAvailable >=
    targetAmount
  ) {
    return normalizeCurrency(
      targetAmount,
    );
  }

  if (
    !allowPartialFunding
  ) {
    return 0;
  }

  return normalizeCurrency(
    remainingAvailable,
  );
}

function resolveRecommendationStatus({
  candidate,
  targetAmount,
  recommendedAmount,
  remainingBillAmount,
}: {
  candidate: BillPlannerCandidate;
  targetAmount: number;
  recommendedAmount: number;
  remainingBillAmount: number;
}): BillPaymentRecommendationStatus {
  if (
    candidate.bill.status ===
    "paid"
  ) {
    return "paid";
  }

  if (
    recommendedAmount <=
    0
  ) {
    return "insufficient-funds";
  }

  if (
    remainingBillAmount >
      0.005
  ) {
    return "partially-funded";
  }

  if (
    candidate.isAutopay
  ) {
    return "scheduled";
  }

  if (
    recommendedAmount >=
    targetAmount
  ) {
    return "fully-funded";
  }

  return "recommended";
}

function getFinalRecommendationReasons(
  reasons:
    BillPaymentRecommendationReason[],
  status:
    BillPaymentRecommendationStatus,
) {
  if (
    status !==
    "insufficient-funds"
  ) {
    return reasons;
  }

  return Array.from(
    new Set([
      ...reasons,
      "insufficient-future-income" as const,
    ]),
  );
}

function buildRecommendationExplanation({
  candidate,
  targetAmount,
  recommendedAmount,
  remainingBillAmount,
  status,
}: {
  candidate: BillPlannerCandidate;
  targetAmount: number;
  recommendedAmount: number;
  remainingBillAmount: number;
  status:
    BillPaymentRecommendationStatus;
}) {
  const dueDescription =
    candidate.isPastDue
      ? `was due on ${formatReadableDate(
          candidate.dueDate,
        )}`
      : `is due on ${formatReadableDate(
          candidate.dueDate,
        )}`;

  if (
    status ===
    "insufficient-funds"
  ) {
    return `${candidate.bill.name} ${dueDescription}, but there is not enough available money in this pay period to fund the recommended ${formatCurrency(
      targetAmount,
    )}.`;
  }

  if (
    status ===
    "partially-funded"
  ) {
    return `Reserve ${formatCurrency(
      recommendedAmount,
    )} for ${candidate.bill.name}. Another ${formatCurrency(
      remainingBillAmount,
    )} will still be needed before the bill ${dueDescription}.`;
  }

  if (
    candidate.isAutopay
  ) {
    return `Reserve ${formatCurrency(
      recommendedAmount,
    )} for ${candidate.bill.name} because it is set to autopay and ${dueDescription}.`;
  }

  if (
    candidate.isPastDue
  ) {
    return `Pay ${formatCurrency(
      recommendedAmount,
    )} toward ${candidate.bill.name} because it is past due.`;
  }

  if (
    candidate.dueBeforeNextPaycheck
  ) {
    return `Pay or reserve ${formatCurrency(
      recommendedAmount,
    )} for ${candidate.bill.name} because it is due before the next paycheck.`;
  }

  return `Reserve ${formatCurrency(
    recommendedAmount,
  )} for ${candidate.bill.name} to keep the upcoming bill covered on time.`;
}

function resolvePlanStatus(
  recommendations:
    BillPaymentRecommendation[],
): PayPeriodBillPlanStatus {
  if (
    recommendations.length ===
    0
  ) {
    return "draft";
  }

  const hasInsufficientFunds =
    recommendations.some(
      (
        recommendation,
      ) =>
        recommendation.status ===
        "insufficient-funds",
    );

  const hasPartialFunding =
    recommendations.some(
      (
        recommendation,
      ) =>
        recommendation.status ===
        "partially-funded",
    );

  const allCovered =
    recommendations.every(
      (
        recommendation,
      ) =>
        [
          "fully-funded",
          "scheduled",
          "paid",
        ].includes(
          recommendation.status,
        ),
    );

  if (
    allCovered
  ) {
    return "fully-funded";
  }

  if (
    hasPartialFunding ||
    hasInsufficientFunds
  ) {
    return "partially-funded";
  }

  return "recommended";
}

function createBillPlanId(
  payCycleId: string,
  payPeriodId: string,
) {
  return `bill-plan-${payCycleId}-${payPeriodId}`;
}

function createRecommendationId(
  payPeriodId: string,
  billId: string,
) {
  return `bill-recommendation-${payPeriodId}-${billId}`;
}

function createGeneratedTimestamp(
  asOfDate: string,
) {
  return `${normalizeDateString(
    asOfDate,
  )}T12:00:00.000Z`;
}

function getOptionalString(
  source: unknown,
  keys: string[],
) {
  const record =
    asRecord(
      source,
    );

  if (
    !record
  ) {
    return undefined;
  }

  for (
    const key of keys
  ) {
    const value =
      record[
        key
      ];

    if (
      typeof value ===
        "string" &&
      value.trim() !==
        ""
    ) {
      return value;
    }
  }

  return undefined;
}

function getOptionalDateString(
  source: unknown,
  keys: string[],
) {
  const value =
    getOptionalString(
      source,
      keys,
    );

  if (
    !value
  ) {
    return undefined;
  }

  const normalizedValue =
    value.slice(
      0,
      10,
    );

  return isValidDateString(
    normalizedValue,
  )
    ? normalizedValue
    : undefined;
}

function getOptionalNumber(
  source: unknown,
  keys: string[],
) {
  const record =
    asRecord(
      source,
    );

  if (
    !record
  ) {
    return undefined;
  }

  for (
    const key of keys
  ) {
    const value =
      record[
        key
      ];

    if (
      typeof value ===
        "number" &&
      Number.isFinite(
        value,
      )
    ) {
      return value;
    }
  }

  return undefined;
}

function getOptionalBoolean(
  source: unknown,
  keys: string[],
) {
  const record =
    asRecord(
      source,
    );

  if (
    !record
  ) {
    return undefined;
  }

  for (
    const key of keys
  ) {
    const value =
      record[
        key
      ];

    if (
      typeof value ===
      "boolean"
    ) {
      return value;
    }
  }

  return undefined;
}

function asRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return null;
  }

  return value as Record<
    string,
    unknown
  >;
}

function isBillPaymentPriority(
  value: string | undefined,
): value is BillPaymentPriority {
  return (
    value ===
      "critical" ||
    value ===
      "high" ||
    value ===
      "normal" ||
    value ===
      "low"
  );
}

function differenceInCalendarDays(
  firstDate: string,
  secondDate: string,
) {
  const firstTime =
    parseLocalDate(
      firstDate,
    ).getTime();

  const secondTime =
    parseLocalDate(
      secondDate,
    ).getTime();

  return Math.round(
    (
      firstTime -
      secondTime
    ) /
      86400000,
  );
}

function addDaysToDateString(
  value: string,
  days: number,
) {
  const date =
    parseLocalDate(
      value,
    );

  date.setDate(
    date.getDate() +
      days,
  );

  return formatLocalDate(
    date,
  );
}

function compareDateStrings(
  firstDate: string,
  secondDate: string,
) {
  return firstDate.localeCompare(
    secondDate,
  );
}

function normalizeDateString(
  value: string,
) {
  const normalizedValue =
    value.slice(
      0,
      10,
    );

  if (
    !isValidDateString(
      normalizedValue,
    )
  ) {
    throw new Error(
      `Invalid date value: "${value}". Expected YYYY-MM-DD.`,
    );
  }

  return normalizedValue;
}

function isValidDateString(
  value: string,
) {
  if (
    !ISO_DATE_PATTERN.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    parseLocalDateUnsafe(
      value,
    );

  return (
    date !==
      null &&
    formatLocalDate(
      date,
    ) ===
      value
  );
}

function parseLocalDate(
  value: string,
) {
  const date =
    parseLocalDateUnsafe(
      value,
    );

  if (
    !date
  ) {
    throw new Error(
      `Invalid date value: "${value}".`,
    );
  }

  return date;
}

function parseLocalDateUnsafe(
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

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  const date =
    new Date(
      year,
      month -
        1,
      day,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function formatLocalDate(
  date: Date,
) {
  const year =
    date
      .getFullYear()
      .toString()
      .padStart(
        4,
        "0",
      );

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

function getTodayDateString() {
  return formatLocalDate(
    new Date(),
  );
}

function normalizeCurrency(
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

function normalizePositiveInteger(
  value: number | undefined,
  fallbackValue: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return fallbackValue;
  }

  return Math.max(
    1,
    Math.floor(
      value as number,
    ),
  );
}

function normalizeNonNegativeInteger(
  value: number | undefined,
  fallbackValue: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return fallbackValue;
  }

  return Math.max(
    0,
    Math.floor(
      value as number,
    ),
  );
}

function normalizePercentage(
  value: number | undefined,
  fallbackValue: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return fallbackValue;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        value as number,
      ),
    ),
  );
}

function normalizeExtraCashStrategy(
  value:
    PayCyclePlanningPreferences["extraCashStrategy"] |
    undefined,
): PayCyclePlanningPreferences["extraCashStrategy"] {
  if (
    value ===
      "keep-available" ||
    value ===
      "debt" ||
    value ===
      "savings" ||
    value ===
      "split"
  ) {
    return value;
  }

  return DEFAULT_PLANNING_PREFERENCES.extraCashStrategy;
}

function normalizeStringList(
  values: string[],
) {
  return Array.from(
    new Set(
      values
        .map(
          (
            value,
          ) =>
            value.trim(),
        )
        .filter(
          Boolean,
        ),
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
    normalizeCurrency(
      value,
    ),
  );
}

function formatReadableDate(
  value: string,
) {
  return parseLocalDate(
    value,
  ).toLocaleDateString(
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
