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
  createActivity as createActivityAction,
} from "@/actions/investments/create-activity";

import {
  createHolding as createHoldingAction,
} from "@/actions/investments/create-holding";

import {
  createInvestmentAccount as createInvestmentAccountAction,
} from "@/actions/investments/create-investment-account";

import {
  createInvestmentPerformanceSnapshot as createInvestmentPerformanceSnapshotAction,
} from "@/actions/investments/create-investment-performance-snapshot";

import {
  deleteActivity as deleteActivityAction,
} from "@/actions/investments/delete-activity";

import {
  deleteHolding as deleteHoldingAction,
} from "@/actions/investments/delete-holding";

import {
  deleteInvestmentAccount as deleteInvestmentAccountAction,
} from "@/actions/investments/delete-investment-account";

import {
  deleteInvestmentPerformanceSnapshot as deleteInvestmentPerformanceSnapshotAction,
} from "@/actions/investments/delete-investment-performance-snapshot";

import {
  updateActivity as updateActivityAction,
} from "@/actions/investments/update-activity";

import {
  updateHolding as updateHoldingAction,
} from "@/actions/investments/update-holding";

import {
  updateInvestmentAccount as updateInvestmentAccountAction,
} from "@/actions/investments/update-investment-account";

import {
  updateInvestmentPerformanceSnapshot as updateInvestmentPerformanceSnapshotAction,
} from "@/actions/investments/update-investment-performance-snapshot";

import type {
  CreateInvestmentAccountData,
  CreateInvestmentActivityData,
  CreateInvestmentHoldingData,
  CreateInvestmentPerformanceSnapshotData,
  InvestmentAccountData,
  InvestmentActivityData,
  InvestmentHoldingData,
  InvestmentPerformanceSnapshot,
  UpdateInvestmentAccountData,
  UpdateInvestmentActivityData,
  UpdateInvestmentHoldingData,
  UpdateInvestmentPerformanceSnapshotData,
} from "@/types/investment";

export type {
  CreateInvestmentAccountData,
  CreateInvestmentActivityData,
  CreateInvestmentHoldingData,
  CreateInvestmentPerformanceSnapshotData,
  InvestmentAccountData,
  InvestmentAccountType,
  InvestmentActivityData,
  InvestmentActivityType,
  InvestmentConnectionStatus,
  InvestmentHoldingData,
  InvestmentHoldingType,
  InvestmentPerformanceSnapshot,
  UpdateInvestmentAccountData,
  UpdateInvestmentActivityData,
  UpdateInvestmentHoldingData,
  UpdateInvestmentPerformanceSnapshotData,
} from "@/types/investment";

export type InvestmentAccountSummary = {
  investmentAccountId:
    string;

  cashBalance:
    number;

  holdingsMarketValue:
    number;

  totalMarketValue:
    number;

  totalCostBasis:
    number;

  unrealizedGain:
    number;

  unrealizedGainPercentage:
    number;

  annualDividendIncome:
    number;

  holdingCount:
    number;
};

type InvestmentsContextValue = {
  investmentAccounts:
    InvestmentAccountData[];

  holdings:
    InvestmentHoldingData[];

  activities:
    InvestmentActivityData[];

  investmentPerformanceHistory:
    InvestmentPerformanceSnapshot[];

  includedInvestmentAccounts:
    InvestmentAccountData[];

  totalCashBalance:
    number;

  totalHoldingsMarketValue:
    number;

  totalInvestmentValue:
    number;

  totalCostBasis:
    number;

  totalUnrealizedGain:
    number;

  totalUnrealizedGainPercentage:
    number;

  totalAnnualDividendIncome:
    number;

  addInvestmentAccount: (
    input:
      CreateInvestmentAccountData,
  ) => Promise<InvestmentAccountData>;

  updateInvestmentAccount: (
    investmentAccountId:
      string,
    updates:
      UpdateInvestmentAccountData,
  ) => Promise<InvestmentAccountData>;

  deleteInvestmentAccount: (
    investmentAccountId:
      string,
  ) => Promise<void>;

  getInvestmentAccountById: (
    investmentAccountId:
      string,
  ) => InvestmentAccountData | null;

  setInvestmentAccountNetWorthInclusion: (
    investmentAccountId:
      string,
    included:
      boolean,
  ) => Promise<InvestmentAccountData>;

  updateInvestmentAccountCashBalance: (
    investmentAccountId:
      string,
    cashBalance:
      number,
  ) => Promise<InvestmentAccountData>;

  addHolding: (
    input:
      CreateInvestmentHoldingData,
  ) => Promise<InvestmentHoldingData>;

  updateHolding: (
    holdingId:
      string,
    updates:
      UpdateInvestmentHoldingData,
  ) => Promise<InvestmentHoldingData>;

  deleteHolding: (
    holdingId:
      string,
  ) => Promise<void>;

  getHoldingById: (
    holdingId:
      string,
  ) => InvestmentHoldingData | null;

  getHoldingsForAccount: (
    investmentAccountId:
      string,
  ) => InvestmentHoldingData[];

  updateHoldingMarketPrice: (
    holdingId:
      string,
    currentPrice:
      number,
    updatedAt?:
      string,
  ) => Promise<InvestmentHoldingData>;

  addActivity: (
    input:
      CreateInvestmentActivityData,
  ) => Promise<InvestmentActivityData>;

  updateActivity: (
    activityId:
      string,
    updates:
      UpdateInvestmentActivityData,
  ) => Promise<InvestmentActivityData>;

  deleteActivity: (
    activityId:
      string,
  ) => Promise<void>;

  getActivitiesForAccount: (
    investmentAccountId:
      string,
  ) => InvestmentActivityData[];

  getActivitiesForHolding: (
    holdingId:
      string,
  ) => InvestmentActivityData[];

  addPerformanceSnapshot: (
    input:
      CreateInvestmentPerformanceSnapshotData,
  ) => Promise<InvestmentPerformanceSnapshot>;

  updatePerformanceSnapshot: (
    snapshotId:
      string,
    updates:
      UpdateInvestmentPerformanceSnapshotData,
  ) => Promise<InvestmentPerformanceSnapshot>;

  deletePerformanceSnapshot: (
    snapshotId:
      string,
  ) => Promise<void>;

  getPerformanceSnapshotById: (
    snapshotId:
      string,
  ) => InvestmentPerformanceSnapshot | null;

  getAccountSummary: (
    investmentAccountId:
      string,
  ) => InvestmentAccountSummary;
};

export type InvestmentsProviderProps = {
  children:
    ReactNode;

  initialInvestmentAccounts?:
    InvestmentAccountData[];

  initialHoldings?:
    InvestmentHoldingData[];

  initialActivities?:
    InvestmentActivityData[];

  initialPerformanceHistory?:
    InvestmentPerformanceSnapshot[];
};

const InvestmentsContext =
  createContext<
    InvestmentsContextValue | undefined
  >(
    undefined,
  );

export default function InvestmentsProvider({
  children,
  initialInvestmentAccounts = [],
  initialHoldings = [],
  initialActivities = [],
  initialPerformanceHistory = [],
}: InvestmentsProviderProps) {
  const [
    investmentAccounts,
    setInvestmentAccounts,
  ] =
    useState<
      InvestmentAccountData[]
    >(
      initialInvestmentAccounts,
    );

  const [
    holdings,
    setHoldings,
  ] =
    useState<
      InvestmentHoldingData[]
    >(
      initialHoldings,
    );

  const [
    activities,
    setActivities,
  ] =
    useState<
      InvestmentActivityData[]
    >(
      () =>
        sortActivities(
          initialActivities,
        ),
    );

  /*
   * Performance history is canonical server-backed state.
   *
   * Mutations always complete through authenticated server actions first.
   * Local React state is reconciled only after the database mutation succeeds.
   */
  const [
    investmentPerformanceHistory,
    setInvestmentPerformanceHistory,
  ] =
    useState<
      InvestmentPerformanceSnapshot[]
    >(
      () =>
        sortPerformanceSnapshots(
          initialPerformanceHistory,
        ),
    );

  const investmentAccountsRef =
    useRef(
      investmentAccounts,
    );

  const holdingsRef =
    useRef(
      holdings,
    );

  const activitiesRef =
    useRef(
      activities,
    );

  const investmentPerformanceHistoryRef =
    useRef(
      investmentPerformanceHistory,
    );

  useEffect(
    () => {
      investmentAccountsRef.current =
        investmentAccounts;
    },
    [
      investmentAccounts,
    ],
  );

  useEffect(
    () => {
      holdingsRef.current =
        holdings;
    },
    [
      holdings,
    ],
  );

  useEffect(
    () => {
      activitiesRef.current =
        activities;
    },
    [
      activities,
    ],
  );

  useEffect(
    () => {
      investmentPerformanceHistoryRef.current =
        investmentPerformanceHistory;
    },
    [
      investmentPerformanceHistory,
    ],
  );

  const includedInvestmentAccounts =
    useMemo(
      () =>
        investmentAccounts.filter(
          (
            account,
          ) =>
            account.isIncludedInNetWorth,
        ),
      [
        investmentAccounts,
      ],
    );

  const includedAccountIds =
    useMemo(
      () =>
        new Set(
          includedInvestmentAccounts.map(
            (
              account,
            ) =>
              account.id,
          ),
        ),
      [
        includedInvestmentAccounts,
      ],
    );

  const includedHoldings =
    useMemo(
      () =>
        holdings.filter(
          (
            holding,
          ) =>
            includedAccountIds.has(
              holding.investmentAccountId,
            ),
        ),
      [
        holdings,
        includedAccountIds,
      ],
    );

  const totalCashBalance =
    useMemo(
      () =>
        normalizeCurrency(
          includedInvestmentAccounts.reduce(
            (
              total,
              account,
            ) =>
              total +
              account.cashBalance,
            0,
          ),
        ),
      [
        includedInvestmentAccounts,
      ],
    );

  const totalHoldingsMarketValue =
    useMemo(
      () =>
        normalizeCurrency(
          includedHoldings.reduce(
            (
              total,
              holding,
            ) =>
              total +
              holding.marketValue,
            0,
          ),
        ),
      [
        includedHoldings,
      ],
    );

  const totalInvestmentValue =
    useMemo(
      () =>
        normalizeCurrency(
          totalCashBalance +
          totalHoldingsMarketValue,
        ),
      [
        totalCashBalance,
        totalHoldingsMarketValue,
      ],
    );

  const totalCostBasis =
    useMemo(
      () =>
        normalizeCurrency(
          includedHoldings.reduce(
            (
              total,
              holding,
            ) =>
              total +
              holding.costBasis,
            0,
          ),
        ),
      [
        includedHoldings,
      ],
    );

  const totalUnrealizedGain =
    useMemo(
      () =>
        normalizeCurrency(
          totalHoldingsMarketValue -
          totalCostBasis,
        ),
      [
        totalCostBasis,
        totalHoldingsMarketValue,
      ],
    );

  const totalUnrealizedGainPercentage =
    useMemo(
      () =>
        calculatePercentage(
          totalUnrealizedGain,
          totalCostBasis,
        ),
      [
        totalCostBasis,
        totalUnrealizedGain,
      ],
    );

  const totalAnnualDividendIncome =
    useMemo(
      () =>
        normalizeCurrency(
          includedHoldings.reduce(
            (
              total,
              holding,
            ) =>
              total +
              (
                holding.annualDividendIncome ??
                0
              ),
            0,
          ),
        ),
      [
        includedHoldings,
      ],
    );

  const addInvestmentAccount =
    useCallback(
      async (
        input:
          CreateInvestmentAccountData,
      ) => {
        const result =
          await createInvestmentAccountAction(
            input,
          );

        if (
          !result.success ||
          !result.account
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not create the investment account.",
          );
        }

        const account =
          result.account;

        setInvestmentAccounts(
          (
            currentAccounts,
          ) =>
            upsertById(
              currentAccounts,
              account,
              true,
            ),
        );

        return account;
      },
      [],
    );

  const updateInvestmentAccount =
    useCallback(
      async (
        investmentAccountId:
          string,
        updates:
          UpdateInvestmentAccountData,
      ) => {
        const result =
          await updateInvestmentAccountAction({
            investmentAccountId,
            updates,
          });

        if (
          !result.success ||
          !result.account
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not update the investment account.",
          );
        }

        const account =
          result.account;

        setInvestmentAccounts(
          (
            currentAccounts,
          ) =>
            upsertById(
              currentAccounts,
              account,
              false,
            ),
        );

        return account;
      },
      [],
    );

  const deleteInvestmentAccount =
    useCallback(
      async (
        investmentAccountId:
          string,
      ) => {
        const result =
          await deleteInvestmentAccountAction({
            investmentAccountId,
          });

        if (
          !result.success
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not delete the investment account.",
          );
        }

        setInvestmentAccounts(
          (
            currentAccounts,
          ) =>
            currentAccounts.filter(
              (
                account,
              ) =>
                account.id !==
                investmentAccountId,
            ),
        );

        setHoldings(
          (
            currentHoldings,
          ) =>
            currentHoldings.filter(
              (
                holding,
              ) =>
                holding.investmentAccountId !==
                investmentAccountId,
            ),
        );

        setActivities(
          (
            currentActivities,
          ) =>
            currentActivities.filter(
              (
                activity,
              ) =>
                activity.investmentAccountId !==
                investmentAccountId,
            ),
        );
      },
      [],
    );

  const getInvestmentAccountById =
    useCallback(
      (
        investmentAccountId:
          string,
      ) =>
        investmentAccountsRef.current.find(
          (
            account,
          ) =>
            account.id ===
            investmentAccountId,
        ) ??
        null,
      [],
    );

  const setInvestmentAccountNetWorthInclusion =
    useCallback(
      async (
        investmentAccountId:
          string,
        included:
          boolean,
      ) =>
        updateInvestmentAccount(
          investmentAccountId,
          {
            isIncludedInNetWorth:
              included,
          },
        ),
      [
        updateInvestmentAccount,
      ],
    );

  const updateInvestmentAccountCashBalance =
    useCallback(
      async (
        investmentAccountId:
          string,
        cashBalance:
          number,
      ) =>
        updateInvestmentAccount(
          investmentAccountId,
          {
            cashBalance,
          },
        ),
      [
        updateInvestmentAccount,
      ],
    );

  const addHolding =
    useCallback(
      async (
        input:
          CreateInvestmentHoldingData,
      ) => {
        const result =
          await createHoldingAction(
            input,
          );

        if (
          !result.success ||
          !result.holding
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not create the investment holding.",
          );
        }

        const holding =
          result.holding;

        setHoldings(
          (
            currentHoldings,
          ) =>
            upsertById(
              currentHoldings,
              holding,
              true,
            ),
        );

        return holding;
      },
      [],
    );

  const updateHolding =
    useCallback(
      async (
        holdingId:
          string,
        updates:
          UpdateInvestmentHoldingData,
      ) => {
        const result =
          await updateHoldingAction({
            holdingId,
            updates,
          });

        if (
          !result.success ||
          !result.holding
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not update the investment holding.",
          );
        }

        const holding =
          result.holding;

        setHoldings(
          (
            currentHoldings,
          ) =>
            upsertById(
              currentHoldings,
              holding,
              false,
            ),
        );

        return holding;
      },
      [],
    );

  const deleteHolding =
    useCallback(
      async (
        holdingId:
          string,
      ) => {
        const result =
          await deleteHoldingAction({
            holdingId,
          });

        if (
          !result.success
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not delete the investment holding.",
          );
        }

        setHoldings(
          (
            currentHoldings,
          ) =>
            currentHoldings.filter(
              (
                holding,
              ) =>
                holding.id !==
                holdingId,
            ),
        );

        /*
         * The database foreign-key behavior is canonical. We do not mutate
         * surviving activity records locally to invent a holding relationship.
         * Server-provided props will reconcile on the next server refresh.
         */
      },
      [],
    );

  const getHoldingById =
    useCallback(
      (
        holdingId:
          string,
      ) =>
        holdingsRef.current.find(
          (
            holding,
          ) =>
            holding.id ===
            holdingId,
        ) ??
        null,
      [],
    );

  const getHoldingsForAccount =
    useCallback(
      (
        investmentAccountId:
          string,
      ) =>
        holdingsRef.current.filter(
          (
            holding,
          ) =>
            holding.investmentAccountId ===
            investmentAccountId,
        ),
      [],
    );

  const updateHoldingMarketPrice =
    useCallback(
      async (
        holdingId:
          string,
        currentPrice:
          number,
        updatedAt =
          new Date().toISOString(),
      ) =>
        updateHolding(
          holdingId,
          {
            currentPrice,
            lastPriceUpdatedAt:
              updatedAt,
          },
        ),
      [
        updateHolding,
      ],
    );

  const addActivity =
    useCallback(
      async (
        input:
          CreateInvestmentActivityData,
      ) => {
        const result =
          await createActivityAction(
            input,
          );

        if (
          !result.success ||
          !result.activity
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not create the investment activity.",
          );
        }

        const activity =
          result.activity;

        setActivities(
          (
            currentActivities,
          ) =>
            sortActivities(
              upsertById(
                currentActivities,
                activity,
                true,
              ),
            ),
        );

        return activity;
      },
      [],
    );

  const updateActivity =
    useCallback(
      async (
        activityId:
          string,
        updates:
          UpdateInvestmentActivityData,
      ) => {
        const result =
          await updateActivityAction({
            activityId,
            updates,
          });

        if (
          !result.success ||
          !result.activity
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not update the investment activity.",
          );
        }

        const activity =
          result.activity;

        setActivities(
          (
            currentActivities,
          ) =>
            sortActivities(
              upsertById(
                currentActivities,
                activity,
                false,
              ),
            ),
        );

        return activity;
      },
      [],
    );

  const deleteActivity =
    useCallback(
      async (
        activityId:
          string,
      ) => {
        const result =
          await deleteActivityAction({
            activityId,
          });

        if (
          !result.success
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not delete the investment activity.",
          );
        }

        setActivities(
          (
            currentActivities,
          ) =>
            currentActivities.filter(
              (
                activity,
              ) =>
                activity.id !==
                activityId,
            ),
        );
      },
      [],
    );

  const getActivitiesForAccount =
    useCallback(
      (
        investmentAccountId:
          string,
      ) =>
        activitiesRef.current.filter(
          (
            activity,
          ) =>
            activity.investmentAccountId ===
            investmentAccountId,
        ),
      [],
    );

  const getActivitiesForHolding =
    useCallback(
      (
        holdingId:
          string,
      ) =>
        activitiesRef.current.filter(
          (
            activity,
          ) =>
            activity.holdingId ===
            holdingId,
        ),
      [],
    );

  const addPerformanceSnapshot =
    useCallback(
      async (
        input:
          CreateInvestmentPerformanceSnapshotData,
      ) => {
        const result =
          await createInvestmentPerformanceSnapshotAction(
            input,
          );

        if (
          !result.success ||
          !result.snapshot
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not save the investment performance snapshot.",
          );
        }

        const snapshot =
          result.snapshot;

        setInvestmentPerformanceHistory(
          (
            currentHistory,
          ) =>
            sortPerformanceSnapshots(
              upsertPerformanceSnapshot(
                currentHistory,
                snapshot,
              ),
            ),
        );

        return snapshot;
      },
      [],
    );

  const updatePerformanceSnapshot =
    useCallback(
      async (
        snapshotId:
          string,
        updates:
          UpdateInvestmentPerformanceSnapshotData,
      ) => {
        const result =
          await updateInvestmentPerformanceSnapshotAction({
            snapshotId,
            updates,
          });

        if (
          !result.success ||
          !result.snapshot
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not update the investment performance snapshot.",
          );
        }

        const snapshot =
          result.snapshot;

        setInvestmentPerformanceHistory(
          (
            currentHistory,
          ) =>
            sortPerformanceSnapshots(
              upsertById(
                currentHistory,
                snapshot,
                false,
              ),
            ),
        );

        return snapshot;
      },
      [],
    );

  const deletePerformanceSnapshot =
    useCallback(
      async (
        snapshotId:
          string,
      ) => {
        const result =
          await deleteInvestmentPerformanceSnapshotAction({
            snapshotId,
          });

        if (
          !result.success
        ) {
          throw new Error(
            result.error?.message ??
              "CASE Budget could not delete the investment performance snapshot.",
          );
        }

        setInvestmentPerformanceHistory(
          (
            currentHistory,
          ) =>
            recalculatePerformanceHistory(
              currentHistory.filter(
                (
                  snapshot,
                ) =>
                  snapshot.id !==
                  snapshotId,
              ),
            ),
        );
      },
      [],
    );

  const getPerformanceSnapshotById =
    useCallback(
      (
        snapshotId:
          string,
      ) =>
        investmentPerformanceHistoryRef.current.find(
          (
            snapshot,
          ) =>
            snapshot.id ===
            snapshotId,
        ) ??
        null,
      [],
    );

  const getAccountSummary =
    useCallback(
      (
        investmentAccountId:
          string,
      ) => {
        const account =
          investmentAccountsRef.current.find(
            (
              currentAccount,
            ) =>
              currentAccount.id ===
              investmentAccountId,
          );

        const accountHoldings =
          holdingsRef.current.filter(
            (
              holding,
            ) =>
              holding.investmentAccountId ===
              investmentAccountId,
          );

        const holdingsMarketValue =
          normalizeCurrency(
            accountHoldings.reduce(
              (
                total,
                holding,
              ) =>
                total +
                holding.marketValue,
              0,
            ),
          );

        const costBasis =
          normalizeCurrency(
            accountHoldings.reduce(
              (
                total,
                holding,
              ) =>
                total +
                holding.costBasis,
              0,
            ),
          );

        const unrealizedGain =
          normalizeCurrency(
            holdingsMarketValue -
            costBasis,
          );

        return {
          investmentAccountId,

          cashBalance:
            account?.cashBalance ??
            0,

          holdingsMarketValue,

          totalMarketValue:
            normalizeCurrency(
              (
                account?.cashBalance ??
                0
              ) +
              holdingsMarketValue,
            ),

          totalCostBasis:
            costBasis,

          unrealizedGain,

          unrealizedGainPercentage:
            calculatePercentage(
              unrealizedGain,
              costBasis,
            ),

          annualDividendIncome:
            normalizeCurrency(
              accountHoldings.reduce(
                (
                  total,
                  holding,
                ) =>
                  total +
                  (
                    holding.annualDividendIncome ??
                    0
                  ),
                0,
              ),
            ),

          holdingCount:
            accountHoldings.length,
        };
      },
      [],
    );

  const value =
    useMemo<
      InvestmentsContextValue
    >(
      () => ({
        investmentAccounts,
        holdings,
        activities,
        investmentPerformanceHistory,
        includedInvestmentAccounts,

        totalCashBalance,
        totalHoldingsMarketValue,
        totalInvestmentValue,
        totalCostBasis,
        totalUnrealizedGain,
        totalUnrealizedGainPercentage,
        totalAnnualDividendIncome,

        addInvestmentAccount,
        updateInvestmentAccount,
        deleteInvestmentAccount,
        getInvestmentAccountById,
        setInvestmentAccountNetWorthInclusion,
        updateInvestmentAccountCashBalance,

        addHolding,
        updateHolding,
        deleteHolding,
        getHoldingById,
        getHoldingsForAccount,
        updateHoldingMarketPrice,

        addActivity,
        updateActivity,
        deleteActivity,
        getActivitiesForAccount,
        getActivitiesForHolding,

        addPerformanceSnapshot,
        updatePerformanceSnapshot,
        deletePerformanceSnapshot,
        getPerformanceSnapshotById,

        getAccountSummary,
      }),
      [
        activities,
        addActivity,
        addHolding,
        addPerformanceSnapshot,
        addInvestmentAccount,
        deleteActivity,
        deleteHolding,
        deleteInvestmentAccount,
        deletePerformanceSnapshot,
        getAccountSummary,
        getActivitiesForAccount,
        getActivitiesForHolding,
        getHoldingById,
        getHoldingsForAccount,
        getInvestmentAccountById,
        getPerformanceSnapshotById,
        holdings,
        includedInvestmentAccounts,
        investmentAccounts,
        investmentPerformanceHistory,
        setInvestmentAccountNetWorthInclusion,
        totalAnnualDividendIncome,
        totalCashBalance,
        totalCostBasis,
        totalHoldingsMarketValue,
        totalInvestmentValue,
        totalUnrealizedGain,
        totalUnrealizedGainPercentage,
        updateActivity,
        updateHolding,
        updateHoldingMarketPrice,
        updateInvestmentAccount,
        updateInvestmentAccountCashBalance,
        updatePerformanceSnapshot,
      ],
    );

  return (
    <InvestmentsContext.Provider
      value={
        value
      }
    >
      {children}
    </InvestmentsContext.Provider>
  );
}

export function useInvestments() {
  const context =
    useContext(
      InvestmentsContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useInvestments must be used within an InvestmentsProvider.",
    );
  }

  return context;
}

function upsertById<
  Item extends {
    id:
      string;
  },
>(
  items:
    Item[],
  item:
    Item,
  prependWhenNew:
    boolean,
) {
  const existingIndex =
    items.findIndex(
      (
        currentItem,
      ) =>
        currentItem.id ===
        item.id,
    );

  if (
    existingIndex ===
    -1
  ) {
    return prependWhenNew
      ? [
          item,
          ...items,
        ]
      : [
          ...items,
          item,
        ];
  }

  return items.map(
    (
      currentItem,
    ) =>
      currentItem.id ===
      item.id
        ? item
        : currentItem,
  );
}

function sortActivities(
  activities:
    InvestmentActivityData[],
) {
  return [
    ...activities,
  ].sort(
    (
      firstActivity,
      secondActivity,
    ) => {
      const dateComparison =
        secondActivity.date.localeCompare(
          firstActivity.date,
        );

      if (
        dateComparison !==
        0
      ) {
        return dateComparison;
      }

      return secondActivity.createdAt.localeCompare(
        firstActivity.createdAt,
      );
    },
  );
}

function upsertPerformanceSnapshot(
  snapshots:
    InvestmentPerformanceSnapshot[],
  snapshot:
    InvestmentPerformanceSnapshot,
) {
  const withoutMatchingDate =
    snapshots.filter(
      (
        currentSnapshot,
      ) =>
        currentSnapshot.id ===
          snapshot.id ||
        currentSnapshot.date !==
          snapshot.date,
    );

  return upsertById(
    withoutMatchingDate,
    snapshot,
    false,
  );
}

function sortPerformanceSnapshots(
  snapshots:
    InvestmentPerformanceSnapshot[],
) {
  return recalculatePerformanceHistory(
    [
      ...snapshots,
    ].sort(
      (
        firstSnapshot,
        secondSnapshot,
      ) =>
        firstSnapshot.date.localeCompare(
          secondSnapshot.date,
        ),
    ),
  );
}

function recalculatePerformanceHistory(
  snapshots:
    InvestmentPerformanceSnapshot[],
) {
  const sortedSnapshots =
    [
      ...snapshots,
    ].sort(
      (
        firstSnapshot,
        secondSnapshot,
      ) =>
        firstSnapshot.date.localeCompare(
          secondSnapshot.date,
        ),
    );

  return sortedSnapshots.map(
    (
      snapshot,
      index,
    ) => {
      const previousSnapshot =
        index >
          0
          ? sortedSnapshots[
              index -
                1
            ]
          : null;

      if (
        !previousSnapshot
      ) {
        return {
          ...snapshot,
          dailyGain:
            0,
          dailyGainPercentage:
            0,
        };
      }

      const dailyGain =
        normalizeCurrency(
          snapshot.portfolioValue -
            previousSnapshot.portfolioValue,
        );

      return {
        ...snapshot,
        dailyGain,

        dailyGainPercentage:
          calculatePercentage(
            dailyGain,
            previousSnapshot.portfolioValue,
          ),
      };
    },
  );
}

function normalizeCurrency(
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

  return (
    Math.round(
      value *
        100,
    ) /
    100
  );
}

function calculatePercentage(
  value:
    number,
  base:
    number,
) {
  if (
    !Number.isFinite(
      value,
    ) ||
    !Number.isFinite(
      base,
    ) ||
    base <=
      0
  ) {
    return 0;
  }

  return (
    Math.round(
      (
        value /
        base
      ) *
        100 *
        100,
    ) /
    100
  );
}
