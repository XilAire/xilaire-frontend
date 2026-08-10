"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";
import {
  useBills,
} from "@/components/providers/BillsProvider";

import {
  buildMultiPeriodBillPlans,
  resolvePlanningPreferences,
  summarizePayPeriodBillPlan,
} from "@/lib/pay-cycles/pay-period-bill-planner";
import {
  generatePayPeriods,
  getNextPayDate,
  normalizePayCycle,
  validatePayCycleDates,
} from "@/lib/pay-cycles/pay-cycle-utils";

import type {
  CreatePayCycleData,
  PayCycleData,
  PayCyclePlannerSummary,
  PayCyclePlanningPreferences,
  PayCycleProjection,
  PayPeriodBillPlan,
  PayPeriodData,
  UpdatePayCycleData,
} from "@/types/pay-cycle";

type PayCyclePlansById = Record<
  string,
  PayPeriodBillPlan[]
>;

type PayPeriodsById = Record<
  string,
  PayPeriodData[]
>;

type PayCycleProjectionsById = Record<
  string,
  PayCycleProjection
>;

type PayCyclesContextValue = {
  payCycles: PayCycleData[];
  activePayCycles: PayCycleData[];

  preferences: PayCyclePlanningPreferences;

  projectedPayPeriods: PayPeriodData[];
  projectedPayPeriodsByCycle:
    PayPeriodsById;

  billPlans: PayPeriodBillPlan[];
  billPlansByCycle:
    PayCyclePlansById;

  projections:
    PayCycleProjection[];
  projectionsByCycle:
    PayCycleProjectionsById;

  nextPayCycle:
    PayCycleData | null;
  nextPayPeriod:
    PayPeriodData | null;
  nextBillPlan:
    PayPeriodBillPlan | null;

  plannerSummary:
    PayCyclePlannerSummary;

  addPayCycle: (
    input: CreatePayCycleData,
  ) => PayCycleData;

  updatePayCycle: (
    input: UpdatePayCycleData,
  ) => void;

  deletePayCycle: (
    payCycleId: string,
  ) => void;

  getPayCycleById: (
    payCycleId: string,
  ) => PayCycleData | null;

  setPayCycleStatus: (
    payCycleId: string,
    status: PayCycleData["status"],
  ) => void;

  setPreferences: (
    preferences: Partial<
      PayCyclePlanningPreferences
    >,
  ) => void;

  updatePreferences: (
    preferences:
      PayCyclePlanningPreferences,
  ) => void;

  resetPreferences: () => void;

  regeneratePlans: () => void;
};

export type PayCyclesProviderProps = {
  children: ReactNode;
  initialPayCycles?: PayCycleData[];
  initialPreferences?: Partial<
    PayCyclePlanningPreferences
  >;
  projectionCount?: number;
};

type StoredPayCyclesState = {
  payCycles: PayCycleData[];
  preferences:
    PayCyclePlanningPreferences;
};

const PAY_CYCLES_STORAGE_KEY =
  "case-budget:pay-cycles:v2";

const LEGACY_PAY_CYCLES_STORAGE_KEY =
  "case-budget:pay-cycles:v1";

const DEFAULT_PROJECTION_COUNT =
  12;

const EMPTY_PLANNER_SUMMARY:
  PayCyclePlannerSummary = {
    activePayCycleCount: 0,
    nextPayDate:
      undefined,
    nextExpectedIncome: 0,
    billsDueBeforeNextPaycheck: 0,
    billAmountDueBeforeNextPaycheck: 0,
    recommendedPaymentAmount: 0,
    remainingAfterRecommendations: 0,
    pastDueBillCount: 0,
    insufficientFundsBillCount: 0,
  };

const PayCyclesContext =
  createContext<
    PayCyclesContextValue | undefined
  >(undefined);

export default function PayCyclesProvider({
  children,
  initialPayCycles = [],
  initialPreferences,
  projectionCount =
    DEFAULT_PROJECTION_COUNT,
}: PayCyclesProviderProps) {
  const {
    accounts,
  } = useAccounts();

  const {
    bills,
  } = useBills();

  const initialPreferencesValue =
    useMemo(
      () =>
        resolvePlanningPreferences(
          initialPreferences,
        ),
      [
        initialPreferences,
      ],
    );

  const [
    payCycles,
    setPayCycles,
  ] = useState<PayCycleData[]>(
    () =>
      sortPayCycles(
        initialPayCycles.map(
          normalizePayCycle,
        ),
      ),
  );

  const [
    preferences,
    setPreferencesState,
  ] =
    useState<PayCyclePlanningPreferences>(
      initialPreferencesValue,
    );

  const [
    hasHydratedStorage,
    setHasHydratedStorage,
  ] = useState(
    false,
  );

  const [
    regenerationVersion,
    setRegenerationVersion,
  ] = useState(
    0,
  );

  const payCyclesRef =
    useRef<PayCycleData[]>(
      payCycles,
    );

  useEffect(
    () => {
      payCyclesRef.current =
        payCycles;
    },
    [
      payCycles,
    ],
  );

  useEffect(
    () => {
      const storedState =
        loadStoredPayCyclesState();

      if (
        storedState
      ) {
        setPayCycles(
          sortPayCycles(
            storedState.payCycles,
          ),
        );

        setPreferencesState(
          storedState.preferences,
        );
      }

      setHasHydratedStorage(
        true,
      );
    },
    [],
  );

  useEffect(
    () => {
      try {
        window.localStorage.removeItem(
          LEGACY_PAY_CYCLES_STORAGE_KEY,
        );
      } catch {
        // Local storage may be unavailable.
      }
    },
    [],
  );

  useEffect(
    () => {
      if (
        !hasHydratedStorage
      ) {
        return;
      }

      const storedState:
        StoredPayCyclesState = {
          payCycles,
          preferences,
        };

      try {
        window.localStorage.setItem(
          PAY_CYCLES_STORAGE_KEY,
          JSON.stringify(
            storedState,
          ),
        );
      } catch {
        // Local storage may be unavailable or full.
      }
    },
    [
      hasHydratedStorage,
      payCycles,
      preferences,
    ],
  );

  const activePayCycles =
    useMemo(
      () =>
        payCycles.filter(
          (
            payCycle,
          ) =>
            payCycle.status ===
            "active" &&
            payCycle.includeInBillPlanning,
        ),
      [
        payCycles,
      ],
    );

  const projectedPayPeriodsByCycle =
    useMemo<PayPeriodsById>(
      () => {
        void regenerationVersion;

        return activePayCycles.reduce<
          PayPeriodsById
        >(
          (
            result,
            payCycle,
          ) => {
            try {
              result[
                payCycle.id
              ] =
                generatePayPeriods(
                  payCycle,
                  {
                    count:
                      normalizeProjectionCount(
                        projectionCount,
                      ),
                    includeCompleted:
                      false,
                    includeSkipped:
                      false,
                    referenceDate:
                      getTodayDateString(),
                  },
                );
            } catch {
              result[
                payCycle.id
              ] = [];
            }

            return result;
          },
          {},
        );
      },
      [
        activePayCycles,
        projectionCount,
        regenerationVersion,
      ],
    );

  const projectedPayPeriods =
    useMemo(
      () =>
        Object.values(
          projectedPayPeriodsByCycle,
        )
          .flat()
          .sort(
            comparePayPeriods,
          ),
      [
        projectedPayPeriodsByCycle,
      ],
    );

  const billPlansByCycle =
    useMemo<PayCyclePlansById>(
      () => {
        void regenerationVersion;

        return activePayCycles.reduce<
          PayCyclePlansById
        >(
          (
            result,
            payCycle,
          ) => {
            const payPeriods =
              projectedPayPeriodsByCycle[
                payCycle.id
              ] ??
              [];

            if (
              payPeriods.length ===
              0
            ) {
              result[
                payCycle.id
              ] = [];

              return result;
            }

            const accountBalance =
              getPlanningAccountBalance(
                payCycle.accountId,
                accounts,
              );

            try {
              result[
                payCycle.id
              ] =
                buildMultiPeriodBillPlans({
                  payCycle,
                  payPeriods,
                  bills,
                  currentAccountBalance:
                    accountBalance,
                  preferences,
                  asOfDate:
                    getTodayDateString(),
                });
            } catch {
              result[
                payCycle.id
              ] = [];
            }

            return result;
          },
          {},
        );
      },
      [
        accounts,
        activePayCycles,
        bills,
        preferences,
        projectedPayPeriodsByCycle,
        regenerationVersion,
      ],
    );

  const billPlans =
    useMemo(
      () =>
        Object.values(
          billPlansByCycle,
        )
          .flat()
          .sort(
            compareBillPlans,
          ),
      [
        billPlansByCycle,
      ],
    );

  const projectionsByCycle =
    useMemo<PayCycleProjectionsById>(
      () =>
        activePayCycles.reduce<
          PayCycleProjectionsById
        >(
          (
            result,
            payCycle,
          ) => {
            const payPeriods =
              projectedPayPeriodsByCycle[
                payCycle.id
              ] ??
              [];

            const plans =
              billPlansByCycle[
                payCycle.id
              ] ??
              [];

            result[
              payCycle.id
            ] =
              createPayCycleProjection(
                payCycle,
                payPeriods,
                plans,
              );

            return result;
          },
          {},
        ),
      [
        activePayCycles,
        billPlansByCycle,
        projectedPayPeriodsByCycle,
      ],
    );

  const projections =
    useMemo(
      () =>
        Object.values(
          projectionsByCycle,
        ).sort(
          compareProjections,
        ),
      [
        projectionsByCycle,
      ],
    );

  const nextPayPeriod =
    projectedPayPeriods[
      0
    ] ??
    null;

  const nextPayCycle =
    useMemo(
      () => {
        if (
          !nextPayPeriod
        ) {
          return null;
        }

        return (
          activePayCycles.find(
            (
              payCycle,
            ) =>
              payCycle.id ===
              nextPayPeriod.payCycleId,
          ) ??
          null
        );
      },
      [
        activePayCycles,
        nextPayPeriod,
      ],
    );

  const nextBillPlan =
    useMemo(
      () => {
        if (
          !nextPayPeriod
        ) {
          return null;
        }

        return (
          billPlans.find(
            (
              plan,
            ) =>
              plan.payPeriodId ===
              nextPayPeriod.id,
          ) ??
          null
        );
      },
      [
        billPlans,
        nextPayPeriod,
      ],
    );

  const plannerSummary =
    useMemo(
      () =>
        createPlannerSummary(
          activePayCycles.length,
          billPlans,
        ),
      [
        activePayCycles.length,
        billPlans,
      ],
    );

  const addPayCycle =
    useCallback(
      (
        input:
          CreatePayCycleData,
      ) => {
        const timestamp =
          new Date().toISOString();

        const preferredId =
          createPayCycleId();

        const payCycle =
          normalizePayCycle({
            id:
              preferredId,
            name:
              input.name.trim(),
            employerName:
              normalizeOptionalText(
                input.employerName,
              ),
            incomeType:
              input.incomeType,
            frequency:
              input.frequency,
            amountType:
              input.amountType,
            expectedNetAmount:
              normalizeCurrency(
                input.expectedNetAmount,
              ),
            minimumExpectedAmount:
              normalizeOptionalCurrency(
                input.minimumExpectedAmount,
              ),
            maximumExpectedAmount:
              normalizeOptionalCurrency(
                input.maximumExpectedAmount,
              ),
            startDate:
              input.startDate,
            nextPayDate:
              input.nextPayDate,
            lastPayDate:
              undefined,
            endDate:
              input.endDate,
            accountId:
              input.accountId,
            semimonthlyRule:
              input.semimonthlyRule,
            customRule:
              input.customRule,
            dayAdjustment:
              input.dayAdjustment,
            includeInBillPlanning:
              input.includeInBillPlanning,
            includeInBudgetIncome:
              input.includeInBudgetIncome,
            notes:
              normalizeOptionalText(
                input.notes,
              ),
            status:
              "active",
            createdAt:
              timestamp,
            updatedAt:
              timestamp,
          });

        assertValidPayCycle(
          payCycle,
        );

        setPayCycles(
          (
            currentPayCycles,
          ) => {
            const storedPayCycle:
              PayCycleData = {
                ...payCycle,
                id:
                  currentPayCycles.some(
                    (
                      currentPayCycle,
                    ) =>
                      currentPayCycle.id ===
                      preferredId,
                  )
                    ? createUniquePayCycleId(
                        currentPayCycles,
                      )
                    : preferredId,
              };

            return sortPayCycles([
              ...currentPayCycles,
              storedPayCycle,
            ]);
          },
        );

        return payCycle;
      },
      [],
    );

  const updatePayCycle =
    useCallback(
      (
        input:
          UpdatePayCycleData,
      ) => {
        const existingPayCycle =
          payCyclesRef.current.find(
            (
              payCycle,
            ) =>
              payCycle.id ===
              input.id,
          );

        if (
          !existingPayCycle
        ) {
          return;
        }

        const updatedPayCycle =
          normalizePayCycle({
            ...existingPayCycle,
            ...input,
            name:
              input.name.trim(),
            employerName:
              normalizeOptionalText(
                input.employerName,
              ),
            expectedNetAmount:
              normalizeCurrency(
                input.expectedNetAmount,
              ),
            minimumExpectedAmount:
              normalizeOptionalCurrency(
                input.minimumExpectedAmount,
              ),
            maximumExpectedAmount:
              normalizeOptionalCurrency(
                input.maximumExpectedAmount,
              ),
            notes:
              normalizeOptionalText(
                input.notes,
              ),
            updatedAt:
              new Date().toISOString(),
          });

        assertValidPayCycle(
          updatedPayCycle,
        );

        setPayCycles(
          (
            currentPayCycles,
          ) =>
            sortPayCycles(
              currentPayCycles.map(
                (
                  payCycle,
                ) =>
                  payCycle.id ===
                  input.id
                    ? updatedPayCycle
                    : payCycle,
              ),
            ),
        );
      },
      [],
    );

  const deletePayCycle =
    useCallback(
      (
        payCycleId:
          string,
      ) => {
        setPayCycles(
          (
            currentPayCycles,
          ) =>
            currentPayCycles.filter(
              (
                payCycle,
              ) =>
                payCycle.id !==
                payCycleId,
            ),
        );
      },
      [],
    );

  const getPayCycleById =
    useCallback(
      (
        payCycleId:
          string,
      ) =>
        payCyclesRef.current.find(
          (
            payCycle,
          ) =>
            payCycle.id ===
            payCycleId,
        ) ??
        null,
      [],
    );

  const setPayCycleStatus =
    useCallback(
      (
        payCycleId:
          string,
        status:
          PayCycleData["status"],
      ) => {
        setPayCycles(
          (
            currentPayCycles,
          ) =>
            currentPayCycles.map(
              (
                payCycle,
              ) =>
                payCycle.id ===
                payCycleId
                  ? {
                      ...payCycle,
                      status,
                      updatedAt:
                        new Date().toISOString(),
                    }
                  : payCycle,
            ),
        );
      },
      [],
    );

  const setPreferences =
    useCallback(
      (
        updates:
          Partial<
            PayCyclePlanningPreferences
          >,
      ) => {
        setPreferencesState(
          (
            currentPreferences,
          ) =>
            resolvePlanningPreferences({
              ...currentPreferences,
              ...updates,
            }),
        );

        setRegenerationVersion(
          (
            currentVersion,
          ) =>
            currentVersion +
            1,
        );
      },
      [],
    );

  const updatePreferences =
    useCallback(
      (
        nextPreferences:
          PayCyclePlanningPreferences,
      ) => {
        setPreferencesState(
          resolvePlanningPreferences(
            nextPreferences,
          ),
        );

        setRegenerationVersion(
          (
            currentVersion,
          ) =>
            currentVersion +
            1,
        );
      },
      [],
    );

  const resetPreferences =
    useCallback(
      () => {
        setPreferencesState(
          resolvePlanningPreferences(
            initialPreferences,
          ),
        );

        setRegenerationVersion(
          (
            currentVersion,
          ) =>
            currentVersion +
            1,
        );
      },
      [
        initialPreferences,
      ],
    );

  const regeneratePlans =
    useCallback(
      () => {
        setRegenerationVersion(
          (
            currentVersion,
          ) =>
            currentVersion +
            1,
        );
      },
      [],
    );

  const value =
    useMemo<PayCyclesContextValue>(
      () => ({
        payCycles,
        activePayCycles,

        preferences,

        projectedPayPeriods,
        projectedPayPeriodsByCycle,

        billPlans,
        billPlansByCycle,

        projections,
        projectionsByCycle,

        nextPayCycle,
        nextPayPeriod,
        nextBillPlan,

        plannerSummary,

        addPayCycle,
        updatePayCycle,
        deletePayCycle,
        getPayCycleById,
        setPayCycleStatus,

        setPreferences,
        updatePreferences,
        resetPreferences,

        regeneratePlans,
      }),
      [
        activePayCycles,
        addPayCycle,
        billPlans,
        billPlansByCycle,
        deletePayCycle,
        getPayCycleById,
        nextBillPlan,
        nextPayCycle,
        nextPayPeriod,
        payCycles,
        plannerSummary,
        preferences,
        projectedPayPeriods,
        projectedPayPeriodsByCycle,
        projections,
        projectionsByCycle,
        regeneratePlans,
        resetPreferences,
        setPayCycleStatus,
        setPreferences,
        updatePayCycle,
        updatePreferences,
      ],
    );

  return (
    <PayCyclesContext.Provider
      value={
        value
      }
    >
      {children}
    </PayCyclesContext.Provider>
  );
}

export function usePayCycles() {
  const context =
    useContext(
      PayCyclesContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "usePayCycles must be used within a PayCyclesProvider.",
    );
  }

  return context;
}

function createPayCycleProjection(
  payCycle: PayCycleData,
  payPeriods: PayPeriodData[],
  plans: PayPeriodBillPlan[],
): PayCycleProjection {
  const totalProjectedIncome =
    normalizeCurrency(
      payPeriods.reduce(
        (
          total,
          payPeriod,
        ) =>
          total +
          (
            payPeriod.actualAmount ??
            payPeriod.expectedAmount
          ),
        0,
      ),
    );

  const totalRecommendedBillPayments =
    normalizeCurrency(
      plans.reduce(
        (
          total,
          plan,
        ) =>
          total +
          plan.allocatedAmount,
        0,
      ),
    );

  const projectedRemainingCash =
    normalizeCurrency(
      plans.length >
        0
        ? plans[
            plans.length -
              1
          ].remainingAfterAllocation
        : totalProjectedIncome
    );

  const uncoveredRecommendations =
    plans.flatMap(
      (
        plan,
      ) =>
        plan.recommendations.filter(
          (
            recommendation,
          ) =>
            recommendation.status ===
              "insufficient-funds" ||
            recommendation.remainingBillAmount >
              0.005,
        ),
    );

  return {
    payCycleId:
      payCycle.id,

    projectedPayPeriods:
      payPeriods,

    totalProjectedIncome,
    totalRecommendedBillPayments,
    projectedRemainingCash,

    uncoveredBillAmount:
      normalizeCurrency(
        uncoveredRecommendations.reduce(
          (
            total,
            recommendation,
          ) =>
            total +
            recommendation.remainingBillAmount,
          0,
        ),
      ),
    uncoveredBillCount:
      uncoveredRecommendations.length,

    firstProjectedPayDate:
      payPeriods[
        0
      ]?.expectedPayDate,
    lastProjectedPayDate:
      payPeriods[
        payPeriods.length -
          1
      ]?.expectedPayDate,
  };
}

function createPlannerSummary(
  activePayCycleCount: number,
  plans: PayPeriodBillPlan[],
): PayCyclePlannerSummary {
  const nextPlan =
    plans[
      0
    ];

  if (
    !nextPlan
  ) {
    return {
      ...EMPTY_PLANNER_SUMMARY,
      activePayCycleCount,
    };
  }

  const nextSummary =
    summarizePayPeriodBillPlan(
      nextPlan,
    );

  return {
    ...nextSummary,
    activePayCycleCount,
  };
}

function getPlanningAccountBalance(
  accountId: string | undefined,
  accounts: ReturnType<
    typeof useAccounts
  >["accounts"],
) {
  if (
    !accountId
  ) {
    return 0;
  }

  const account =
    accounts.find(
      (
        candidateAccount,
      ) =>
        candidateAccount.id ===
        accountId,
    );

  if (
    !account
  ) {
    return 0;
  }

  const availableBalance =
    account.availableBalance ??
    account.balance;

  if (
    account.classification ===
    "liability"
  ) {
    return 0;
  }

  return normalizeCurrency(
    Math.max(
      0,
      availableBalance,
    ),
  );
}

function assertValidPayCycle(
  payCycle: PayCycleData,
) {
  const validation =
    validatePayCycleDates(
      payCycle,
    );

  if (
    !validation.isValid
  ) {
    throw new Error(
      validation.errors.join(
        " ",
      ),
    );
  }
}

function loadStoredPayCyclesState():
  StoredPayCyclesState | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const currentState =
    readStoredPayCyclesState(
      PAY_CYCLES_STORAGE_KEY,
    );

  if (
    currentState
  ) {
    return currentState;
  }

  const legacyState =
    readStoredPayCyclesState(
      LEGACY_PAY_CYCLES_STORAGE_KEY,
    );

  if (
    !legacyState
  ) {
    return null;
  }

  try {
    window.localStorage.setItem(
      PAY_CYCLES_STORAGE_KEY,
      JSON.stringify(
        legacyState,
      ),
    );

    window.localStorage.removeItem(
      LEGACY_PAY_CYCLES_STORAGE_KEY,
    );
  } catch {
    // Local storage may be unavailable or full.
  }

  return legacyState;
}

function readStoredPayCyclesState(
  storageKey: string,
):
  StoredPayCyclesState | null {
  try {
    const rawValue =
      window.localStorage.getItem(
        storageKey,
      );

    if (
      !rawValue
    ) {
      return null;
    }

    const parsedValue:
      unknown =
      JSON.parse(
        rawValue,
      );

    if (
      !isStoredPayCyclesState(
        parsedValue,
      )
    ) {
      window.localStorage.removeItem(
        storageKey,
      );

      return null;
    }

    const validPayCycles =
      parsedValue.payCycles
        .map(
          normalizePayCycle,
        )
        .filter(
          (
            payCycle,
          ) =>
            validatePayCycleDates(
              payCycle,
            ).isValid,
        );

    return {
      payCycles:
        sortPayCycles(
          deduplicatePayCycles(
            validPayCycles,
          ),
        ),
      preferences:
        resolvePlanningPreferences(
          parsedValue.preferences,
        ),
    };
  } catch {
    return null;
  }
}

function isStoredPayCyclesState(
  value: unknown,
): value is StoredPayCyclesState {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return false;
  }

  const candidate =
    value as Partial<
      StoredPayCyclesState
    >;

  return (
    Array.isArray(
      candidate.payCycles,
    ) &&
    candidate.payCycles.every(
      isPayCycleData,
    ) &&
    Boolean(
      candidate.preferences &&
      typeof candidate.preferences ===
        "object" &&
      !Array.isArray(
        candidate.preferences,
      ),
    )
  );
}

function isPayCycleData(
  value: unknown,
): value is PayCycleData {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return false;
  }

  const candidate =
    value as Partial<
      PayCycleData
    >;

  return (
    typeof candidate.id ===
      "string" &&
    typeof candidate.name ===
      "string" &&
    typeof candidate.frequency ===
      "string" &&
    typeof candidate.amountType ===
      "string" &&
    typeof candidate.incomeType ===
      "string" &&
    typeof candidate.expectedNetAmount ===
      "number" &&
    typeof candidate.startDate ===
      "string" &&
    typeof candidate.nextPayDate ===
      "string" &&
    typeof candidate.dayAdjustment ===
      "string" &&
    typeof candidate.includeInBillPlanning ===
      "boolean" &&
    typeof candidate.includeInBudgetIncome ===
      "boolean" &&
    typeof candidate.status ===
      "string" &&
    typeof candidate.createdAt ===
      "string" &&
    typeof candidate.updatedAt ===
      "string"
  );
}

function sortPayCycles(
  payCycles: PayCycleData[],
) {
  return [
    ...payCycles,
  ].sort(
    (
      firstPayCycle,
      secondPayCycle,
    ) => {
      const firstNextDate =
        getSortableNextPayDate(
          firstPayCycle,
        );

      const secondNextDate =
        getSortableNextPayDate(
          secondPayCycle,
        );

      const dateComparison =
        firstNextDate.localeCompare(
          secondNextDate,
        );

      if (
        dateComparison !==
        0
      ) {
        return dateComparison;
      }

      return firstPayCycle.name.localeCompare(
        secondPayCycle.name,
      );
    },
  );
}

function getSortableNextPayDate(
  payCycle: PayCycleData,
) {
  try {
    const today =
      getTodayDateString();

    if (
      payCycle.nextPayDate >=
      today
    ) {
      return payCycle.nextPayDate;
    }

    return getNextPayDate(
      payCycle,
      today,
    );
  } catch {
    return "9999-12-31";
  }
}

function comparePayPeriods(
  firstPayPeriod: PayPeriodData,
  secondPayPeriod: PayPeriodData,
) {
  const dateComparison =
    firstPayPeriod.expectedPayDate.localeCompare(
      secondPayPeriod.expectedPayDate,
    );

  if (
    dateComparison !==
    0
  ) {
    return dateComparison;
  }

  return firstPayPeriod.id.localeCompare(
    secondPayPeriod.id,
  );
}

function compareBillPlans(
  firstPlan: PayPeriodBillPlan,
  secondPlan: PayPeriodBillPlan,
) {
  const dateComparison =
    firstPlan.expectedPayDate.localeCompare(
      secondPlan.expectedPayDate,
    );

  if (
    dateComparison !==
    0
  ) {
    return dateComparison;
  }

  return firstPlan.id.localeCompare(
    secondPlan.id,
  );
}

function compareProjections(
  firstProjection:
    PayCycleProjection,
  secondProjection:
    PayCycleProjection,
) {
  return (
    firstProjection.firstProjectedPayDate ??
    "9999-12-31"
  ).localeCompare(
    secondProjection.firstProjectedPayDate ??
    "9999-12-31",
  );
}

function createUniquePayCycleId(
  payCycles: PayCycleData[],
) {
  const existingIds =
    new Set(
      payCycles.map(
        (
          payCycle,
        ) =>
          payCycle.id,
      ),
    );

  let candidateId =
    createPayCycleId();

  while (
    existingIds.has(
      candidateId,
    )
  ) {
    candidateId =
      createPayCycleId();
  }

  return candidateId;
}

function deduplicatePayCycles(
  payCycles: PayCycleData[],
) {
  const seenIds =
    new Set<string>();

  return payCycles.map(
    (
      payCycle,
    ) => {
      if (
        !seenIds.has(
          payCycle.id,
        )
      ) {
        seenIds.add(
          payCycle.id,
        );

        return payCycle;
      }

      const uniquePayCycle = {
        ...payCycle,
        id:
          createUniquePayCycleId(
            payCycles,
          ),
      };

      seenIds.add(
        uniquePayCycle.id,
      );

      return uniquePayCycle;
    },
  );
}

function createPayCycleId() {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return `pay-cycle-${crypto.randomUUID()}`;
  }

  return `pay-cycle-${Date.now()}-${Math.random()
    .toString(
      36,
    )
    .slice(
      2,
      10,
    )}`;
}

function normalizeProjectionCount(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return DEFAULT_PROJECTION_COUNT;
  }

  return Math.min(
    260,
    Math.max(
      1,
      Math.floor(
        value,
      ),
    ),
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

function normalizeOptionalCurrency(
  value: number | undefined,
) {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  return normalizeCurrency(
    value,
  );
}

function normalizeOptionalText(
  value: string | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function getTodayDateString() {
  const today =
    new Date();

  const year =
    today
      .getFullYear()
      .toString()
      .padStart(
        4,
        "0",
      );

  const month =
    (
      today.getMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0",
      );

  const day =
    today
      .getDate()
      .toString()
      .padStart(
        2,
        "0",
      );

  return `${year}-${month}-${day}`;
}
