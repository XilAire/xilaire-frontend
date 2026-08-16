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
  archivePayCycle as archivePayCycleAction,
} from "@/actions/pay-cycles/archive-pay-cycle";
import {
  createPayCycle as createPayCycleAction,
} from "@/actions/pay-cycles/create-pay-cycle";
import {
  getPayCycles,
} from "@/actions/pay-cycles/get-pay-cycles";
import {
  resetPayCyclePreferences as resetPayCyclePreferencesAction,
} from "@/actions/pay-cycles/reset-pay-cycle-preferences";
import {
  updatePayCycle as updatePayCycleAction,
} from "@/actions/pay-cycles/update-pay-cycle";
import {
  updatePayCyclePreferences as updatePayCyclePreferencesAction,
} from "@/actions/pay-cycles/update-pay-cycle-preferences";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";
import {
  useApp,
} from "@/components/providers/AppProvider";
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
  ) => Promise<PayCycleData>;

  updatePayCycle: (
    input: UpdatePayCycleData,
  ) => Promise<void>;

  deletePayCycle: (
    payCycleId: string,
  ) => Promise<void>;

  getPayCycleById: (
    payCycleId: string,
  ) => PayCycleData | null;

  setPayCycleStatus: (
    payCycleId: string,
    status: PayCycleData["status"],
  ) => Promise<void>;

  setPreferences: (
    preferences: Partial<
      PayCyclePlanningPreferences
    >,
  ) => Promise<void>;

  updatePreferences: (
    preferences:
      PayCyclePlanningPreferences,
  ) => Promise<void>;

  resetPreferences: () => Promise<void>;

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

  const {
    activeWorkspaceId,
  } = useApp();

  const workspaceId =
    activeWorkspaceId.trim() ||
    null;

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
      let cancelled =
        false;

      if (
        !workspaceId
      ) {
        setPayCycles(
          [],
        );

        setPreferencesState(
          initialPreferencesValue,
        );

        return;
      }

      void (
        async () => {
          try {
            const result =
              await getPayCycles({
                workspaceId,
              });

            if (
              cancelled
            ) {
              return;
            }

            if (
              !result.success
            ) {
              throw new Error(
                result.error,
              );
            }

            setPayCycles(
              sortPayCycles(
                result.payCycles.map(
                  normalizePayCycle,
                ),
              ),
            );

            setPreferencesState(
              resolvePlanningPreferences(
                result.preferences,
              ),
            );

            setRegenerationVersion(
              (
                currentVersion,
              ) =>
                currentVersion +
                1,
            );
          } catch (
            error
          ) {
            if (
              cancelled
            ) {
              return;
            }

            console.error(
              "Unable to load pay cycles for the active workspace.",
              error,
            );

            setPayCycles(
              [],
            );

            setPreferencesState(
              initialPreferencesValue,
            );
          }
        }
      )();

      return () => {
        cancelled =
          true;
      };
    },
    [
      initialPreferencesValue,
      workspaceId,
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
      async (
        input:
          CreatePayCycleData,
      ) => {
        if (
          !workspaceId
        ) {
          throw new Error(
            "A workspace is required to create a pay cycle.",
          );
        }

        const result =
          await createPayCycleAction({
            workspaceId,
            payCycle:
              input,
          });

        if (
          !result.success
        ) {
          throw new Error(
            result.error,
          );
        }

        const payCycle =
          normalizePayCycle(
            result.payCycle,
          );

        assertValidPayCycle(
          payCycle,
        );

        setPayCycles(
          (
            currentPayCycles,
          ) =>
            sortPayCycles([
              ...currentPayCycles.filter(
                (
                  currentPayCycle,
                ) =>
                  currentPayCycle.id !==
                  payCycle.id,
              ),
              payCycle,
            ]),
        );

        return payCycle;
      },
      [
        workspaceId,
      ],
    );

  const updatePayCycle =
    useCallback(
      async (
        input:
          UpdatePayCycleData,
      ) => {
        if (
          !workspaceId
        ) {
          throw new Error(
            "A workspace is required to update a pay cycle.",
          );
        }

        const result =
          await updatePayCycleAction({
            workspaceId,
            payCycle:
              input,
          });

        if (
          !result.success
        ) {
          throw new Error(
            result.error,
          );
        }

        const updatedPayCycle =
          normalizePayCycle(
            result.payCycle,
          );

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
                  updatedPayCycle.id
                    ? updatedPayCycle
                    : payCycle,
              ),
            ),
        );
      },
      [
        workspaceId,
      ],
    );

  const deletePayCycle =
    useCallback(
      async (
        payCycleId:
          string,
      ) => {
        if (
          !workspaceId
        ) {
          throw new Error(
            "A workspace is required to archive a pay cycle.",
          );
        }

        const result =
          await archivePayCycleAction({
            workspaceId,
            payCycleId,
          });

        if (
          !result.success
        ) {
          throw new Error(
            result.error,
          );
        }

        const archivedPayCycle =
          normalizePayCycle(
            result.payCycle,
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
                  archivedPayCycle.id
                    ? archivedPayCycle
                    : payCycle,
              ),
            ),
        );
      },
      [
        workspaceId,
      ],
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
      async (
        payCycleId:
          string,
        status:
          PayCycleData["status"],
      ) => {
        if (
          !workspaceId
        ) {
          throw new Error(
            "A workspace is required to change a pay cycle status.",
          );
        }

        const existingPayCycle =
          payCyclesRef.current.find(
            (
              payCycle,
            ) =>
              payCycle.id ===
              payCycleId,
          );

        if (
          !existingPayCycle
        ) {
          throw new Error(
            "The pay cycle could not be found.",
          );
        }

        if (
          status ===
          "archived"
        ) {
          await deletePayCycle(
            payCycleId,
          );

          return;
        }

        await updatePayCycle({
          ...existingPayCycle,
          status,
        });
      },
      [
        deletePayCycle,
        updatePayCycle,
        workspaceId,
      ],
    );

  const persistPreferences =
    useCallback(
      async (
        nextPreferences:
          PayCyclePlanningPreferences,
      ) => {
        if (
          !workspaceId
        ) {
          throw new Error(
            "A workspace is required to update pay cycle preferences.",
          );
        }

        const resolvedPreferences =
          resolvePlanningPreferences(
            nextPreferences,
          );

        const result =
          await updatePayCyclePreferencesAction({
            workspaceId,
            preferences:
              resolvedPreferences,
          });

        if (
          !result.success
        ) {
          throw new Error(
            result.error,
          );
        }

        setPreferencesState(
          resolvePlanningPreferences(
            result.preferences,
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
        workspaceId,
      ],
    );

  const setPreferences =
    useCallback(
      async (
        updates:
          Partial<
            PayCyclePlanningPreferences
          >,
      ) => {
        const nextPreferences =
          resolvePlanningPreferences({
            ...preferences,
            ...updates,
          });

        await persistPreferences(
          nextPreferences,
        );
      },
      [
        persistPreferences,
        preferences,
      ],
    );

  const updatePreferences =
    useCallback(
      async (
        nextPreferences:
          PayCyclePlanningPreferences,
      ) => {
        await persistPreferences(
          nextPreferences,
        );
      },
      [
        persistPreferences,
      ],
    );

  const resetPreferences =
    useCallback(
      async () => {
        if (
          !workspaceId
        ) {
          throw new Error(
            "A workspace is required to reset pay cycle preferences.",
          );
        }

        const result =
          await resetPayCyclePreferencesAction({
            workspaceId,
          });

        if (
          !result.success
        ) {
          throw new Error(
            result.error,
          );
        }

        setPreferencesState(
          resolvePlanningPreferences(
            result.preferences,
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
        workspaceId,
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
