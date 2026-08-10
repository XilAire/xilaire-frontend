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

export type InvestmentAccountType =
  | "brokerage"
  | "retirement"
  | "ira"
  | "roth-ira"
  | "401k"
  | "403b"
  | "529"
  | "hsa"
  | "crypto"
  | "other";

export type InvestmentConnectionStatus =
  | "manual"
  | "connected"
  | "disconnected"
  | "error"
  | "pending";

export type InvestmentHoldingType =
  | "stock"
  | "etf"
  | "mutual-fund"
  | "bond"
  | "option"
  | "crypto"
  | "cash"
  | "real-estate"
  | "commodity"
  | "other";

export type InvestmentActivityType =
  | "contribution"
  | "withdrawal"
  | "buy"
  | "sell"
  | "dividend"
  | "interest"
  | "fee"
  | "transfer"
  | "adjustment";

export type InvestmentAccountData = {
  id: string;
  name: string;
  institution?: string;
  type: InvestmentAccountType;
  linkedAccountId?: string;
  currency: string;
  cashBalance: number;
  isIncludedInNetWorth: boolean;
  connectionStatus: InvestmentConnectionStatus;
  lastSyncedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type InvestmentHoldingData = {
  id: string;
  investmentAccountId: string;
  symbol?: string;
  name: string;
  type: InvestmentHoldingType;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedGain: number;
  unrealizedGainPercentage: number;
  annualDividendIncome?: number;
  lastPriceUpdatedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type InvestmentActivityData = {
  id: string;
  investmentAccountId: string;
  holdingId?: string;
  type: InvestmentActivityType;
  date: string;
  amount: number;
  quantity?: number;
  pricePerUnit?: number;
  fees?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type InvestmentPerformanceSnapshot = {
  id: string;
  date: string;

  portfolioValue: number;
  costBasis: number;
  cashValue: number;

  dailyGain: number;
  dailyGainPercentage: number;

  createdAt: string;
  updatedAt: string;
};

export type CreateInvestmentPerformanceSnapshotData = {
  date: string;

  portfolioValue: number;
  costBasis: number;
  cashValue: number;
};

export type UpdateInvestmentPerformanceSnapshotData = Partial<
  Omit<
    InvestmentPerformanceSnapshot,
    | "id"
    | "dailyGain"
    | "dailyGainPercentage"
    | "createdAt"
  >
>;

export type CreateInvestmentAccountData = {
  name: string;
  institution?: string;
  type: InvestmentAccountType;
  linkedAccountId?: string;
  currency?: string;
  cashBalance?: number;
  isIncludedInNetWorth?: boolean;
  connectionStatus?: InvestmentConnectionStatus;
  lastSyncedAt?: string;
  notes?: string;
};

export type UpdateInvestmentAccountData = Partial<
  Omit<
    InvestmentAccountData,
    "id" | "createdAt"
  >
>;

export type CreateInvestmentHoldingData = {
  investmentAccountId: string;
  symbol?: string;
  name: string;
  type: InvestmentHoldingType;
  quantity: number;
  averageCost: number;
  currentPrice?: number;
  annualDividendIncome?: number;
  lastPriceUpdatedAt?: string;
  notes?: string;
};

export type UpdateInvestmentHoldingData = Partial<
  Omit<
    InvestmentHoldingData,
    | "id"
    | "investmentAccountId"
    | "marketValue"
    | "costBasis"
    | "unrealizedGain"
    | "unrealizedGainPercentage"
    | "createdAt"
  >
>;

export type CreateInvestmentActivityData = {
  investmentAccountId: string;
  holdingId?: string;
  type: InvestmentActivityType;
  date: string;
  amount: number;
  quantity?: number;
  pricePerUnit?: number;
  fees?: number;
  description?: string;
};

export type UpdateInvestmentActivityData = Partial<
  Omit<
    InvestmentActivityData,
    | "id"
    | "investmentAccountId"
    | "holdingId"
    | "createdAt"
  >
>;

export type InvestmentAccountSummary = {
  investmentAccountId: string;
  cashBalance: number;
  holdingsMarketValue: number;
  totalMarketValue: number;
  totalCostBasis: number;
  unrealizedGain: number;
  unrealizedGainPercentage: number;
  annualDividendIncome: number;
  holdingCount: number;
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

  totalCashBalance: number;
  totalHoldingsMarketValue: number;
  totalInvestmentValue: number;
  totalCostBasis: number;
  totalUnrealizedGain: number;
  totalUnrealizedGainPercentage: number;
  totalAnnualDividendIncome: number;

  addInvestmentAccount: (
    input:
      CreateInvestmentAccountData,
  ) => InvestmentAccountData;

  updateInvestmentAccount: (
    investmentAccountId: string,
    updates:
      UpdateInvestmentAccountData,
  ) => void;

  deleteInvestmentAccount: (
    investmentAccountId: string,
  ) => void;

  getInvestmentAccountById: (
    investmentAccountId: string,
  ) => InvestmentAccountData | null;

  setInvestmentAccountNetWorthInclusion: (
    investmentAccountId: string,
    included: boolean,
  ) => void;

  updateInvestmentAccountCashBalance: (
    investmentAccountId: string,
    cashBalance: number,
  ) => void;

  addHolding: (
    input:
      CreateInvestmentHoldingData,
  ) => InvestmentHoldingData;

  updateHolding: (
    holdingId: string,
    updates:
      UpdateInvestmentHoldingData,
  ) => void;

  deleteHolding: (
    holdingId: string,
  ) => void;

  getHoldingById: (
    holdingId: string,
  ) => InvestmentHoldingData | null;

  getHoldingsForAccount: (
    investmentAccountId: string,
  ) => InvestmentHoldingData[];

  updateHoldingMarketPrice: (
    holdingId: string,
    currentPrice: number,
    updatedAt?: string,
  ) => void;

  addActivity: (
    input:
      CreateInvestmentActivityData,
  ) => InvestmentActivityData;

  updateActivity: (
    activityId: string,
    updates:
      UpdateInvestmentActivityData,
  ) => void;

  deleteActivity: (
    activityId: string,
  ) => void;

  getActivitiesForAccount: (
    investmentAccountId: string,
  ) => InvestmentActivityData[];

  getActivitiesForHolding: (
    holdingId: string,
  ) => InvestmentActivityData[];

  addPerformanceSnapshot: (
    input:
      CreateInvestmentPerformanceSnapshotData,
  ) => InvestmentPerformanceSnapshot;

  updatePerformanceSnapshot: (
    snapshotId: string,
    updates:
      UpdateInvestmentPerformanceSnapshotData,
  ) => void;

  deletePerformanceSnapshot: (
    snapshotId: string,
  ) => void;

  getPerformanceSnapshotById: (
    snapshotId: string,
  ) => InvestmentPerformanceSnapshot | null;

  captureCurrentPerformanceSnapshot: (
    date?: string,
  ) => InvestmentPerformanceSnapshot;

  getAccountSummary: (
    investmentAccountId: string,
  ) => InvestmentAccountSummary;
};

export type InvestmentsProviderProps = {
  children: ReactNode;

  initialInvestmentAccounts?:
    InvestmentAccountData[];

  initialHoldings?:
    InvestmentHoldingData[];

  initialActivities?:
    InvestmentActivityData[];

  initialPerformanceHistory?:
    InvestmentPerformanceSnapshot[];
};

type StoredInvestmentsState = {
  investmentAccounts:
    InvestmentAccountData[];

  holdings:
    InvestmentHoldingData[];

  activities:
    InvestmentActivityData[];

  investmentPerformanceHistory:
    InvestmentPerformanceSnapshot[];
};

const INVESTMENTS_STORAGE_KEY =
  "case-budget:investments:v3";

const LEGACY_INVESTMENTS_STORAGE_KEYS = [
  "case-budget:investments:v2",
  "case-budget:investments:v1",
];

const InvestmentsContext =
  createContext<
    InvestmentsContextValue | undefined
  >(undefined);

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
  ] = useState<
    InvestmentAccountData[]
  >(
    () =>
      normalizeInvestmentAccounts(
        initialInvestmentAccounts,
      ),
  );

  const [
    holdings,
    setHoldings,
  ] = useState<
    InvestmentHoldingData[]
  >(
    () =>
      normalizeHoldings(
        initialHoldings,
      ),
  );

  const [
    activities,
    setActivities,
  ] = useState<
    InvestmentActivityData[]
  >(
    () =>
      normalizeActivities(
        initialActivities,
      ),
  );

  const [
    investmentPerformanceHistory,
    setInvestmentPerformanceHistory,
  ] = useState<
    InvestmentPerformanceSnapshot[]
  >(
    () =>
      normalizePerformanceHistory(
        initialPerformanceHistory,
      ),
  );

  const [
    hasHydratedStorage,
    setHasHydratedStorage,
  ] = useState(
    false,
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

  useEffect(
    () => {
      const storedState =
        loadStoredInvestmentsState();

      if (
        storedState
      ) {
        setInvestmentAccounts(
          storedState.investmentAccounts,
        );

        setHoldings(
          storedState.holdings,
        );

        setActivities(
          storedState.activities,
        );

        setInvestmentPerformanceHistory(
          storedState.investmentPerformanceHistory,
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
      if (
        !hasHydratedStorage
      ) {
        return;
      }

      const storedState:
        StoredInvestmentsState = {
          investmentAccounts,
          holdings,
          activities,
          investmentPerformanceHistory,
        };

      try {
        window.localStorage.setItem(
          INVESTMENTS_STORAGE_KEY,
          JSON.stringify(
            storedState,
          ),
        );

        LEGACY_INVESTMENTS_STORAGE_KEYS.forEach(
          (
            storageKey,
          ) => {
            window.localStorage.removeItem(
              storageKey,
            );
          },
        );
      } catch {
        // Local storage may be unavailable or full.
      }
    },
    [
      activities,
      hasHydratedStorage,
      holdings,
      investmentAccounts,
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
      (
        input:
          CreateInvestmentAccountData,
      ) => {
        const timestamp =
          new Date().toISOString();

        const preferredId =
          createInvestmentAccountId();

        const newAccount:
          InvestmentAccountData = {
            id:
              preferredId,

            name:
              input.name.trim(),

            institution:
              normalizeOptionalText(
                input.institution,
              ),

            type:
              input.type,

            linkedAccountId:
              normalizeOptionalText(
                input.linkedAccountId,
              ),

            currency:
              normalizeCurrencyCode(
                input.currency,
              ),

            cashBalance:
              normalizeCurrency(
                Math.max(
                  0,
                  input.cashBalance ??
                    0,
                ),
              ),

            isIncludedInNetWorth:
              input.isIncludedInNetWorth ??
              true,

            connectionStatus:
              input.connectionStatus ??
              "manual",

            lastSyncedAt:
              normalizeOptionalText(
                input.lastSyncedAt,
              ),

            notes:
              normalizeOptionalText(
                input.notes,
              ),

            createdAt:
              timestamp,

            updatedAt:
              timestamp,
          };

        setInvestmentAccounts(
          (
            currentAccounts,
          ) => {
            const storedAccount = {
              ...newAccount,

              id:
                currentAccounts.some(
                  (
                    account,
                  ) =>
                    account.id ===
                    preferredId,
                )
                  ? createUniqueInvestmentAccountId(
                      currentAccounts,
                    )
                  : preferredId,
            };

            return [
              storedAccount,
              ...currentAccounts,
            ];
          },
        );

        return newAccount;
      },
      [],
    );

  const updateInvestmentAccount =
    useCallback(
      (
        investmentAccountId:
          string,
        updates:
          UpdateInvestmentAccountData,
      ) => {
        setInvestmentAccounts(
          (
            currentAccounts,
          ) =>
            currentAccounts.map(
              (
                account,
              ) => {
                if (
                  account.id !==
                  investmentAccountId
                ) {
                  return account;
                }

                return {
                  ...account,
                  ...updates,

                  id:
                    account.id,

                  name:
                    updates.name?.trim() ||
                    account.name,

                  institution:
                    updates.institution ===
                    undefined
                      ? account.institution
                      : normalizeOptionalText(
                          updates.institution,
                        ),

                  linkedAccountId:
                    updates.linkedAccountId ===
                    undefined
                      ? account.linkedAccountId
                      : normalizeOptionalText(
                          updates.linkedAccountId,
                        ),

                  currency:
                    updates.currency ===
                    undefined
                      ? account.currency
                      : normalizeCurrencyCode(
                          updates.currency,
                        ),

                  cashBalance:
                    updates.cashBalance ===
                    undefined
                      ? account.cashBalance
                      : normalizeCurrency(
                          Math.max(
                            0,
                            updates.cashBalance,
                          ),
                        ),

                  lastSyncedAt:
                    updates.lastSyncedAt ===
                    undefined
                      ? account.lastSyncedAt
                      : normalizeOptionalText(
                          updates.lastSyncedAt,
                        ),

                  notes:
                    updates.notes ===
                    undefined
                      ? account.notes
                      : normalizeOptionalText(
                          updates.notes,
                        ),

                  createdAt:
                    account.createdAt,

                  updatedAt:
                    new Date().toISOString(),
                };
              },
            ),
        );
      },
      [],
    );

  const deleteInvestmentAccount =
    useCallback(
      (
        investmentAccountId:
          string,
      ) => {
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
      (
        investmentAccountId:
          string,
        included:
          boolean,
      ) => {
        updateInvestmentAccount(
          investmentAccountId,
          {
            isIncludedInNetWorth:
              included,
          },
        );
      },
      [
        updateInvestmentAccount,
      ],
    );

  const updateInvestmentAccountCashBalance =
    useCallback(
      (
        investmentAccountId:
          string,
        cashBalance:
          number,
      ) => {
        updateInvestmentAccount(
          investmentAccountId,
          {
            cashBalance:
              normalizeCurrency(
                Math.max(
                  0,
                  cashBalance,
                ),
              ),
          },
        );
      },
      [
        updateInvestmentAccount,
      ],
    );

  const addHolding =
    useCallback(
      (
        input:
          CreateInvestmentHoldingData,
      ) => {
        if (
          !investmentAccountsRef.current.some(
            (
              account,
            ) =>
              account.id ===
              input.investmentAccountId,
          )
        ) {
          throw new Error(
            "The selected investment account does not exist.",
          );
        }

        const timestamp =
          new Date().toISOString();

        const preferredId =
          createHoldingId();

        const newHolding =
          buildHolding({
            id:
              preferredId,

            investmentAccountId:
              input.investmentAccountId,

            symbol:
              normalizeOptionalSymbol(
                input.symbol,
              ),

            name:
              input.name.trim(),

            type:
              input.type,

            quantity:
              normalizeQuantity(
                input.quantity,
              ),

            averageCost:
              normalizeCurrency(
                Math.max(
                  0,
                  input.averageCost,
                ),
              ),

            currentPrice:
              normalizeCurrency(
                Math.max(
                  0,
                  input.currentPrice ??
                    input.averageCost,
                ),
              ),

            annualDividendIncome:
              normalizeOptionalCurrency(
                input.annualDividendIncome,
              ),

            lastPriceUpdatedAt:
              normalizeOptionalText(
                input.lastPriceUpdatedAt,
              ),

            notes:
              normalizeOptionalText(
                input.notes,
              ),

            createdAt:
              timestamp,

            updatedAt:
              timestamp,
          });

        setHoldings(
          (
            currentHoldings,
          ) => {
            const storedHolding = {
              ...newHolding,

              id:
                currentHoldings.some(
                  (
                    holding,
                  ) =>
                    holding.id ===
                    preferredId,
                )
                  ? createUniqueHoldingId(
                      currentHoldings,
                    )
                  : preferredId,
            };

            return [
              storedHolding,
              ...currentHoldings,
            ];
          },
        );

        return newHolding;
      },
      [],
    );

  const updateHolding =
    useCallback(
      (
        holdingId:
          string,
        updates:
          UpdateInvestmentHoldingData,
      ) => {
        setHoldings(
          (
            currentHoldings,
          ) =>
            currentHoldings.map(
              (
                holding,
              ) => {
                if (
                  holding.id !==
                  holdingId
                ) {
                  return holding;
                }

                return buildHolding({
                  ...holding,
                  ...updates,

                  id:
                    holding.id,

                  investmentAccountId:
                    holding.investmentAccountId,

                  symbol:
                    updates.symbol ===
                    undefined
                      ? holding.symbol
                      : normalizeOptionalSymbol(
                          updates.symbol,
                        ),

                  name:
                    updates.name?.trim() ||
                    holding.name,

                  quantity:
                    updates.quantity ===
                    undefined
                      ? holding.quantity
                      : normalizeQuantity(
                          updates.quantity,
                        ),

                  averageCost:
                    updates.averageCost ===
                    undefined
                      ? holding.averageCost
                      : normalizeCurrency(
                          Math.max(
                            0,
                            updates.averageCost,
                          ),
                        ),

                  currentPrice:
                    updates.currentPrice ===
                    undefined
                      ? holding.currentPrice
                      : normalizeCurrency(
                          Math.max(
                            0,
                            updates.currentPrice,
                          ),
                        ),

                  annualDividendIncome:
                    updates.annualDividendIncome ===
                    undefined
                      ? holding.annualDividendIncome
                      : normalizeOptionalCurrency(
                          updates.annualDividendIncome,
                        ),

                  lastPriceUpdatedAt:
                    updates.lastPriceUpdatedAt ===
                    undefined
                      ? holding.lastPriceUpdatedAt
                      : normalizeOptionalText(
                          updates.lastPriceUpdatedAt,
                        ),

                  notes:
                    updates.notes ===
                    undefined
                      ? holding.notes
                      : normalizeOptionalText(
                          updates.notes,
                        ),

                  createdAt:
                    holding.createdAt,

                  updatedAt:
                    new Date().toISOString(),
                });
              },
            ),
        );
      },
      [],
    );

  const deleteHolding =
    useCallback(
      (
        holdingId:
          string,
      ) => {
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

        setActivities(
          (
            currentActivities,
          ) =>
            currentActivities.map(
              (
                activity,
              ) =>
                activity.holdingId ===
                holdingId
                  ? {
                      ...activity,
                      holdingId:
                        undefined,
                      updatedAt:
                        new Date().toISOString(),
                    }
                  : activity,
            ),
        );
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
      (
        holdingId:
          string,
        currentPrice:
          number,
        updatedAt =
          new Date().toISOString(),
      ) => {
        updateHolding(
          holdingId,
          {
            currentPrice:
              normalizeCurrency(
                Math.max(
                  0,
                  currentPrice,
                ),
              ),

            lastPriceUpdatedAt:
              updatedAt,
          },
        );
      },
      [
        updateHolding,
      ],
    );

  const addActivity =
    useCallback(
      (
        input:
          CreateInvestmentActivityData,
      ) => {
        if (
          !investmentAccountsRef.current.some(
            (
              account,
            ) =>
              account.id ===
              input.investmentAccountId,
          )
        ) {
          throw new Error(
            "The selected investment account does not exist.",
          );
        }

        if (
          input.holdingId &&
          !holdingsRef.current.some(
            (
              holding,
            ) =>
              holding.id ===
                input.holdingId &&
              holding.investmentAccountId ===
                input.investmentAccountId,
          )
        ) {
          throw new Error(
            "The selected holding does not belong to this investment account.",
          );
        }

        const timestamp =
          new Date().toISOString();

        const preferredId =
          createActivityId();

        const newActivity:
          InvestmentActivityData = {
            id:
              preferredId,

            investmentAccountId:
              input.investmentAccountId,

            holdingId:
              input.holdingId,

            type:
              input.type,

            date:
              input.date,

            amount:
              normalizeCurrency(
                Math.abs(
                  input.amount,
                ),
              ),

            quantity:
              normalizeOptionalQuantity(
                input.quantity,
              ),

            pricePerUnit:
              normalizeOptionalCurrency(
                input.pricePerUnit,
              ),

            fees:
              normalizeOptionalCurrency(
                input.fees,
              ),

            description:
              normalizeOptionalText(
                input.description,
              ),

            createdAt:
              timestamp,

            updatedAt:
              timestamp,
          };

        setActivities(
          (
            currentActivities,
          ) => {
            const storedActivity = {
              ...newActivity,

              id:
                currentActivities.some(
                  (
                    activity,
                  ) =>
                    activity.id ===
                    preferredId,
                )
                  ? createUniqueActivityId(
                      currentActivities,
                    )
                  : preferredId,
            };

            return sortActivities([
              storedActivity,
              ...currentActivities,
            ]);
          },
        );

        return newActivity;
      },
      [],
    );

  const updateActivity =
    useCallback(
      (
        activityId:
          string,
        updates:
          UpdateInvestmentActivityData,
      ) => {
        setActivities(
          (
            currentActivities,
          ) =>
            sortActivities(
              currentActivities.map(
                (
                  activity,
                ) => {
                  if (
                    activity.id !==
                    activityId
                  ) {
                    return activity;
                  }

                  return {
                    ...activity,
                    ...updates,

                    id:
                      activity.id,

                    investmentAccountId:
                      activity.investmentAccountId,

                    holdingId:
                      activity.holdingId,

                    amount:
                      updates.amount ===
                      undefined
                        ? activity.amount
                        : normalizeCurrency(
                            Math.abs(
                              updates.amount,
                            ),
                          ),

                    quantity:
                      updates.quantity ===
                      undefined
                        ? activity.quantity
                        : normalizeOptionalQuantity(
                            updates.quantity,
                          ),

                    pricePerUnit:
                      updates.pricePerUnit ===
                      undefined
                        ? activity.pricePerUnit
                        : normalizeOptionalCurrency(
                            updates.pricePerUnit,
                          ),

                    fees:
                      updates.fees ===
                      undefined
                        ? activity.fees
                        : normalizeOptionalCurrency(
                            updates.fees,
                          ),

                    description:
                      updates.description ===
                      undefined
                        ? activity.description
                        : normalizeOptionalText(
                            updates.description,
                          ),

                    createdAt:
                      activity.createdAt,

                    updatedAt:
                      new Date().toISOString(),
                  };
                },
              ),
            ),
        );
      },
      [],
    );

  const deleteActivity =
    useCallback(
      (
        activityId:
          string,
      ) => {
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
      (
        input:
          CreateInvestmentPerformanceSnapshotData,
      ) => {
        const timestamp =
          new Date().toISOString();

        const normalizedDate =
          normalizeDateKey(
            input.date,
          );

        const preferredId =
          createPerformanceSnapshotId();

        const candidate:
          InvestmentPerformanceSnapshot = {
            id:
              preferredId,

            date:
              normalizedDate,

            portfolioValue:
              normalizeCurrency(
                Math.max(
                  0,
                  input.portfolioValue,
                ),
              ),

            costBasis:
              normalizeCurrency(
                Math.max(
                  0,
                  input.costBasis,
                ),
              ),

            cashValue:
              normalizeCurrency(
                Math.max(
                  0,
                  input.cashValue,
                ),
              ),

            dailyGain:
              0,

            dailyGainPercentage:
              0,

            createdAt:
              timestamp,

            updatedAt:
              timestamp,
          };

        let storedSnapshot =
          candidate;

        setInvestmentPerformanceHistory(
          (
            currentHistory,
          ) => {
            const existingSnapshot =
              currentHistory.find(
                (
                  snapshot,
                ) =>
                  snapshot.date ===
                  normalizedDate,
              );

            if (
              existingSnapshot
            ) {
              storedSnapshot = {
                ...candidate,

                id:
                  existingSnapshot.id,

                createdAt:
                  existingSnapshot.createdAt,
              };

              return recalculatePerformanceHistory([
                ...currentHistory.filter(
                  (
                    snapshot,
                  ) =>
                    snapshot.id !==
                    existingSnapshot.id,
                ),
                storedSnapshot,
              ]);
            }

            storedSnapshot = {
              ...candidate,

              id:
                currentHistory.some(
                  (
                    snapshot,
                  ) =>
                    snapshot.id ===
                    preferredId,
                )
                  ? createUniquePerformanceSnapshotId(
                      currentHistory,
                    )
                  : preferredId,
            };

            return recalculatePerformanceHistory([
              ...currentHistory,
              storedSnapshot,
            ]);
          },
        );

        return storedSnapshot;
      },
      [],
    );

  const updatePerformanceSnapshot =
    useCallback(
      (
        snapshotId:
          string,
        updates:
          UpdateInvestmentPerformanceSnapshotData,
      ) => {
        setInvestmentPerformanceHistory(
          (
            currentHistory,
          ) =>
            recalculatePerformanceHistory(
              currentHistory.map(
                (
                  snapshot,
                ) => {
                  if (
                    snapshot.id !==
                    snapshotId
                  ) {
                    return snapshot;
                  }

                  return {
                    ...snapshot,
                    ...updates,

                    id:
                      snapshot.id,

                    date:
                      updates.date ===
                      undefined
                        ? snapshot.date
                        : normalizeDateKey(
                            updates.date,
                          ),

                    portfolioValue:
                      updates.portfolioValue ===
                      undefined
                        ? snapshot.portfolioValue
                        : normalizeCurrency(
                            Math.max(
                              0,
                              updates.portfolioValue,
                            ),
                          ),

                    costBasis:
                      updates.costBasis ===
                      undefined
                        ? snapshot.costBasis
                        : normalizeCurrency(
                            Math.max(
                              0,
                              updates.costBasis,
                            ),
                          ),

                    cashValue:
                      updates.cashValue ===
                      undefined
                        ? snapshot.cashValue
                        : normalizeCurrency(
                            Math.max(
                              0,
                              updates.cashValue,
                            ),
                          ),

                    createdAt:
                      snapshot.createdAt,

                    updatedAt:
                      new Date().toISOString(),
                  };
                },
              ),
            ),
        );
      },
      [],
    );

  const deletePerformanceSnapshot =
    useCallback(
      (
        snapshotId:
          string,
      ) => {
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

  const captureCurrentPerformanceSnapshot =
    useCallback(
      (
        date =
          getTodayDateKey(),
      ) => {
        const includedAccounts =
          investmentAccountsRef.current.filter(
            (
              account,
            ) =>
              account.isIncludedInNetWorth,
          );

        const includedIds =
          new Set(
            includedAccounts.map(
              (
                account,
              ) =>
                account.id,
            ),
          );

        const includedCurrentHoldings =
          holdingsRef.current.filter(
            (
              holding,
            ) =>
              includedIds.has(
                holding.investmentAccountId,
              ),
          );

        const cashValue =
          normalizeCurrency(
            includedAccounts.reduce(
              (
                total,
                account,
              ) =>
                total +
                account.cashBalance,
              0,
            ),
          );

        const holdingsValue =
          normalizeCurrency(
            includedCurrentHoldings.reduce(
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
            includedCurrentHoldings.reduce(
              (
                total,
                holding,
              ) =>
                total +
                holding.costBasis,
              0,
            ),
          );

        const timestamp =
          new Date().toISOString();

        const normalizedDate =
          normalizeDateKey(
            date,
          );

        const existingSnapshot =
          investmentPerformanceHistoryRef.current.find(
            (
              snapshot,
            ) =>
              snapshot.date ===
              normalizedDate,
          );

        const snapshot:
          InvestmentPerformanceSnapshot = {
            id:
              existingSnapshot?.id ??
              createPerformanceSnapshotId(),

            date:
              normalizedDate,

            portfolioValue:
              normalizeCurrency(
                cashValue +
                holdingsValue,
              ),

            costBasis,

            cashValue,

            dailyGain:
              0,

            dailyGainPercentage:
              0,

            createdAt:
              existingSnapshot?.createdAt ??
              timestamp,

            updatedAt:
              timestamp,
          };

        setInvestmentPerformanceHistory(
          (
            currentHistory,
          ) =>
            recalculatePerformanceHistory([
              ...currentHistory.filter(
                (
                  currentSnapshot,
                ) =>
                  currentSnapshot.date !==
                  normalizedDate,
              ),
              snapshot,
            ]),
        );

        return snapshot;
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

      captureCurrentPerformanceSnapshot();
    },
    [
      captureCurrentPerformanceSnapshot,
      hasHydratedStorage,
      holdings,
      investmentAccounts,
    ],
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
        captureCurrentPerformanceSnapshot,

        getAccountSummary,
      }),
      [
        activities,
        addActivity,
        addHolding,
        addInvestmentAccount,
        addPerformanceSnapshot,
        captureCurrentPerformanceSnapshot,
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

function buildHolding(
  input:
    Omit<
      InvestmentHoldingData,
      | "marketValue"
      | "costBasis"
      | "unrealizedGain"
      | "unrealizedGainPercentage"
    >,
): InvestmentHoldingData {
  const quantity =
    normalizeQuantity(
      input.quantity,
    );

  const averageCost =
    normalizeCurrency(
      Math.max(
        0,
        input.averageCost,
      ),
    );

  const currentPrice =
    normalizeCurrency(
      Math.max(
        0,
        input.currentPrice,
      ),
    );

  const marketValue =
    normalizeCurrency(
      quantity *
      currentPrice,
    );

  const costBasis =
    normalizeCurrency(
      quantity *
      averageCost,
    );

  const unrealizedGain =
    normalizeCurrency(
      marketValue -
      costBasis,
    );

  return {
    ...input,
    quantity,
    averageCost,
    currentPrice,
    marketValue,
    costBasis,
    unrealizedGain,

    unrealizedGainPercentage:
      calculatePercentage(
        unrealizedGain,
        costBasis,
      ),
  };
}

function loadStoredInvestmentsState():
  StoredInvestmentsState | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const currentState =
    readStoredInvestmentsState(
      INVESTMENTS_STORAGE_KEY,
    );

  if (
    currentState
  ) {
    return currentState;
  }

  for (
    const legacyStorageKey of
    LEGACY_INVESTMENTS_STORAGE_KEYS
  ) {
    const legacyState =
      readStoredInvestmentsState(
        legacyStorageKey,
      );

    if (
      !legacyState
    ) {
      continue;
    }

    try {
      window.localStorage.setItem(
        INVESTMENTS_STORAGE_KEY,
        JSON.stringify(
          legacyState,
        ),
      );

      LEGACY_INVESTMENTS_STORAGE_KEYS.forEach(
        (
          storageKey,
        ) => {
          window.localStorage.removeItem(
            storageKey,
          );
        },
      );
    } catch {
      // Local storage may be unavailable or full.
    }

    return legacyState;
  }

  return null;
}

function readStoredInvestmentsState(
  storageKey:
    string,
):
  StoredInvestmentsState | null {
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
      !isStoredInvestmentsState(
        parsedValue,
      )
    ) {
      window.localStorage.removeItem(
        storageKey,
      );

      return null;
    }

    const investmentAccounts =
      normalizeInvestmentAccounts(
        parsedValue.investmentAccounts,
      );

    const accountIds =
      new Set(
        investmentAccounts.map(
          (
            account,
          ) =>
            account.id,
        ),
      );

    const holdings =
      normalizeHoldings(
        parsedValue.holdings,
      ).filter(
        (
          holding,
        ) =>
          accountIds.has(
            holding.investmentAccountId,
          ),
      );

    const holdingIds =
      new Set(
        holdings.map(
          (
            holding,
          ) =>
            holding.id,
        ),
      );

    const activities =
      normalizeActivities(
        parsedValue.activities,
      )
        .filter(
          (
            activity,
          ) =>
            accountIds.has(
              activity.investmentAccountId,
            ),
        )
        .map(
          (
            activity,
          ) =>
            activity.holdingId &&
            !holdingIds.has(
              activity.holdingId,
            )
              ? {
                  ...activity,
                  holdingId:
                    undefined,
                }
              : activity,
        );

    const investmentPerformanceHistory =
      normalizePerformanceHistory(
        parsedValue.investmentPerformanceHistory ??
        [],
      );

    return {
      investmentAccounts,
      holdings,
      activities,
      investmentPerformanceHistory,
    };
  } catch {
    return null;
  }
}

function isStoredInvestmentsState(
  value:
    unknown,
): value is StoredInvestmentsState {
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
      StoredInvestmentsState
    >;

  return (
    Array.isArray(
      candidate.investmentAccounts,
    ) &&
    candidate.investmentAccounts.every(
      isInvestmentAccountData,
    ) &&
    Array.isArray(
      candidate.holdings,
    ) &&
    candidate.holdings.every(
      isInvestmentHoldingData,
    ) &&
    Array.isArray(
      candidate.activities,
    ) &&
    candidate.activities.every(
      isInvestmentActivityData,
    ) &&
    (
      candidate.investmentPerformanceHistory ===
      undefined ||
      (
        Array.isArray(
          candidate.investmentPerformanceHistory,
        ) &&
        candidate.investmentPerformanceHistory.every(
          isInvestmentPerformanceSnapshot,
        )
      )
    )
  );
}

function isInvestmentAccountData(
  value:
    unknown,
): value is InvestmentAccountData {
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
      InvestmentAccountData
    >;

  return (
    typeof candidate.id ===
      "string" &&
    candidate.id.trim() !==
      "" &&
    typeof candidate.name ===
      "string" &&
    candidate.name.trim() !==
      "" &&
    isInvestmentAccountType(
      candidate.type,
    ) &&
    typeof candidate.currency ===
      "string" &&
    candidate.currency.trim() !==
      "" &&
    typeof candidate.cashBalance ===
      "number" &&
    Number.isFinite(
      candidate.cashBalance,
    ) &&
    typeof candidate.isIncludedInNetWorth ===
      "boolean" &&
    isInvestmentConnectionStatus(
      candidate.connectionStatus,
    ) &&
    typeof candidate.createdAt ===
      "string" &&
    typeof candidate.updatedAt ===
      "string"
  );
}

function isInvestmentHoldingData(
  value:
    unknown,
): value is InvestmentHoldingData {
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
      InvestmentHoldingData
    >;

  return (
    typeof candidate.id ===
      "string" &&
    candidate.id.trim() !==
      "" &&
    typeof candidate.investmentAccountId ===
      "string" &&
    candidate.investmentAccountId.trim() !==
      "" &&
    typeof candidate.name ===
      "string" &&
    candidate.name.trim() !==
      "" &&
    isInvestmentHoldingType(
      candidate.type,
    ) &&
    isFiniteNumber(
      candidate.quantity,
    ) &&
    isFiniteNumber(
      candidate.averageCost,
    ) &&
    isFiniteNumber(
      candidate.currentPrice,
    ) &&
    isFiniteNumber(
      candidate.marketValue,
    ) &&
    isFiniteNumber(
      candidate.costBasis,
    ) &&
    isFiniteNumber(
      candidate.unrealizedGain,
    ) &&
    isFiniteNumber(
      candidate.unrealizedGainPercentage,
    ) &&
    typeof candidate.createdAt ===
      "string" &&
    typeof candidate.updatedAt ===
      "string"
  );
}

function isInvestmentActivityData(
  value:
    unknown,
): value is InvestmentActivityData {
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
      InvestmentActivityData
    >;

  return (
    typeof candidate.id ===
      "string" &&
    candidate.id.trim() !==
      "" &&
    typeof candidate.investmentAccountId ===
      "string" &&
    candidate.investmentAccountId.trim() !==
      "" &&
    isInvestmentActivityType(
      candidate.type,
    ) &&
    typeof candidate.date ===
      "string" &&
    candidate.date.trim() !==
      "" &&
    isFiniteNumber(
      candidate.amount,
    ) &&
    typeof candidate.createdAt ===
      "string" &&
    typeof candidate.updatedAt ===
      "string"
  );
}

function isInvestmentPerformanceSnapshot(
  value:
    unknown,
): value is InvestmentPerformanceSnapshot {
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
      InvestmentPerformanceSnapshot
    >;

  return (
    typeof candidate.id ===
      "string" &&
    candidate.id.trim() !==
      "" &&
    typeof candidate.date ===
      "string" &&
    candidate.date.trim() !==
      "" &&
    isFiniteNumber(
      candidate.portfolioValue,
    ) &&
    isFiniteNumber(
      candidate.costBasis,
    ) &&
    isFiniteNumber(
      candidate.cashValue,
    ) &&
    isFiniteNumber(
      candidate.dailyGain,
    ) &&
    isFiniteNumber(
      candidate.dailyGainPercentage,
    ) &&
    typeof candidate.createdAt ===
      "string" &&
    typeof candidate.updatedAt ===
      "string"
  );
}

function normalizeInvestmentAccounts(
  accounts:
    InvestmentAccountData[],
) {
  return deduplicateById(
    accounts
      .filter(
        isInvestmentAccountData,
      )
      .map(
        (
          account,
        ) => ({
          ...account,

          name:
            account.name.trim(),

          institution:
            normalizeOptionalText(
              account.institution,
            ),

          linkedAccountId:
            normalizeOptionalText(
              account.linkedAccountId,
            ),

          currency:
            normalizeCurrencyCode(
              account.currency,
            ),

          cashBalance:
            normalizeCurrency(
              Math.max(
                0,
                account.cashBalance,
              ),
            ),

          notes:
            normalizeOptionalText(
              account.notes,
            ),
        }),
      ),
    createInvestmentAccountId,
  );
}

function normalizeHoldings(
  holdings:
    InvestmentHoldingData[],
) {
  return deduplicateById(
    holdings
      .filter(
        isInvestmentHoldingData,
      )
      .map(
        (
          holding,
        ) =>
          buildHolding({
            ...holding,

            symbol:
              normalizeOptionalSymbol(
                holding.symbol,
              ),

            name:
              holding.name.trim(),

            annualDividendIncome:
              normalizeOptionalCurrency(
                holding.annualDividendIncome,
              ),

            notes:
              normalizeOptionalText(
                holding.notes,
              ),
          }),
      ),
    createHoldingId,
  );
}

function normalizeActivities(
  activities:
    InvestmentActivityData[],
) {
  return sortActivities(
    deduplicateById(
      activities
        .filter(
          isInvestmentActivityData,
        )
        .map(
          (
            activity,
          ) => ({
            ...activity,

            amount:
              normalizeCurrency(
                Math.abs(
                  activity.amount,
                ),
              ),

            quantity:
              normalizeOptionalQuantity(
                activity.quantity,
              ),

            pricePerUnit:
              normalizeOptionalCurrency(
                activity.pricePerUnit,
              ),

            fees:
              normalizeOptionalCurrency(
                activity.fees,
              ),

            description:
              normalizeOptionalText(
                activity.description,
              ),
          }),
        ),
      createActivityId,
    ),
  );
}

function normalizePerformanceHistory(
  history:
    InvestmentPerformanceSnapshot[],
) {
  const normalizedHistory =
    deduplicateById(
      history
        .filter(
          isInvestmentPerformanceSnapshot,
        )
        .map(
          (
            snapshot,
          ) => ({
            ...snapshot,

            date:
              normalizeDateKey(
                snapshot.date,
              ),

            portfolioValue:
              normalizeCurrency(
                Math.max(
                  0,
                  snapshot.portfolioValue,
                ),
              ),

            costBasis:
              normalizeCurrency(
                Math.max(
                  0,
                  snapshot.costBasis,
                ),
              ),

            cashValue:
              normalizeCurrency(
                Math.max(
                  0,
                  snapshot.cashValue,
                ),
              ),

            dailyGain:
              normalizeCurrency(
                snapshot.dailyGain,
              ),

            dailyGainPercentage:
              normalizePercentage(
                snapshot.dailyGainPercentage,
              ),
          }),
        ),
      createPerformanceSnapshotId,
    );

  const snapshotsByDate =
    new Map<
      string,
      InvestmentPerformanceSnapshot
    >();

  normalizedHistory.forEach(
    (
      snapshot,
    ) => {
      const existingSnapshot =
        snapshotsByDate.get(
          snapshot.date,
        );

      if (
        !existingSnapshot ||
        snapshot.updatedAt >
          existingSnapshot.updatedAt
      ) {
        snapshotsByDate.set(
          snapshot.date,
          snapshot,
        );
      }
    },
  );

  return recalculatePerformanceHistory(
    Array.from(
      snapshotsByDate.values(),
    ),
  );
}

function recalculatePerformanceHistory(
  history:
    InvestmentPerformanceSnapshot[],
) {
  const sortedHistory =
    [...history].sort(
      (
        firstSnapshot,
        secondSnapshot,
      ) =>
        firstSnapshot.date.localeCompare(
          secondSnapshot.date,
        ),
    );

  return sortedHistory.map(
    (
      snapshot,
      index,
    ) => {
      const previousSnapshot =
        index >
        0
          ? sortedHistory[
              index -
              1
            ]
          : null;

      const dailyGain =
        previousSnapshot
          ? normalizeCurrency(
              snapshot.portfolioValue -
              previousSnapshot.portfolioValue,
            )
          : 0;

      const dailyGainPercentage =
        previousSnapshot &&
        previousSnapshot.portfolioValue >
          0
          ? calculatePercentage(
              dailyGain,
              previousSnapshot.portfolioValue,
            )
          : 0;

      return {
        ...snapshot,
        dailyGain,
        dailyGainPercentage,
      };
    },
  );
}

function deduplicateById<
  Item extends {
    id: string;
  },
>(
  items:
    Item[],
  createId: () => string,
) {
  const seenIds =
    new Set<string>();

  return items.map(
    (
      item,
    ) => {
      let nextId =
        item.id;

      while (
        seenIds.has(
          nextId,
        )
      ) {
        nextId =
          createId();
      }

      seenIds.add(
        nextId,
      );

      return nextId ===
        item.id
        ? item
        : {
            ...item,
            id:
              nextId,
          };
    },
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

function createUniqueInvestmentAccountId(
  accounts:
    InvestmentAccountData[],
) {
  return createUniqueId(
    accounts.map(
      (
        account,
      ) =>
        account.id,
    ),
    createInvestmentAccountId,
  );
}

function createUniqueHoldingId(
  holdings:
    InvestmentHoldingData[],
) {
  return createUniqueId(
    holdings.map(
      (
        holding,
      ) =>
        holding.id,
    ),
    createHoldingId,
  );
}

function createUniquePerformanceSnapshotId(
  snapshots:
    InvestmentPerformanceSnapshot[],
) {
  return createUniqueId(
    snapshots.map(
      (
        snapshot,
      ) =>
        snapshot.id,
    ),
    createPerformanceSnapshotId,
  );
}

function createUniqueActivityId(
  activities:
    InvestmentActivityData[],
) {
  return createUniqueId(
    activities.map(
      (
        activity,
      ) =>
        activity.id,
    ),
    createActivityId,
  );
}

function createUniqueId(
  existingIds:
    string[],
  createId: () => string,
) {
  const existingIdSet =
    new Set(
      existingIds,
    );

  let candidateId =
    createId();

  while (
    existingIdSet.has(
      candidateId,
    )
  ) {
    candidateId =
      createId();
  }

  return candidateId;
}

function createInvestmentAccountId() {
  return createEntityId(
    "investment-account",
  );
}

function createHoldingId() {
  return createEntityId(
    "holding",
  );
}

function createActivityId() {
  return createEntityId(
    "investment-activity",
  );
}

function createPerformanceSnapshotId() {
  return createEntityId(
    "investment-performance",
  );
}

function createEntityId(
  prefix:
    string,
) {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(
      36,
    )
    .slice(
      2,
      10,
    )}`;
}

function isInvestmentAccountType(
  value:
    unknown,
): value is InvestmentAccountType {
  return (
    value ===
      "brokerage" ||
    value ===
      "retirement" ||
    value ===
      "ira" ||
    value ===
      "roth-ira" ||
    value ===
      "401k" ||
    value ===
      "403b" ||
    value ===
      "529" ||
    value ===
      "hsa" ||
    value ===
      "crypto" ||
    value ===
      "other"
  );
}

function isInvestmentConnectionStatus(
  value:
    unknown,
): value is InvestmentConnectionStatus {
  return (
    value ===
      "manual" ||
    value ===
      "connected" ||
    value ===
      "disconnected" ||
    value ===
      "error" ||
    value ===
      "pending"
  );
}

function isInvestmentHoldingType(
  value:
    unknown,
): value is InvestmentHoldingType {
  return (
    value ===
      "stock" ||
    value ===
      "etf" ||
    value ===
      "mutual-fund" ||
    value ===
      "bond" ||
    value ===
      "option" ||
    value ===
      "crypto" ||
    value ===
      "cash" ||
    value ===
      "real-estate" ||
    value ===
      "commodity" ||
    value ===
      "other"
  );
}

function isInvestmentActivityType(
  value:
    unknown,
): value is InvestmentActivityType {
  return (
    value ===
      "contribution" ||
    value ===
      "withdrawal" ||
    value ===
      "buy" ||
    value ===
      "sell" ||
    value ===
      "dividend" ||
    value ===
      "interest" ||
    value ===
      "fee" ||
    value ===
      "transfer" ||
    value ===
      "adjustment"
  );
}

function isFiniteNumber(
  value:
    unknown,
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
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

  return Math.round(
    value *
    100,
  ) /
  100;
}

function normalizeOptionalCurrency(
  value:
    number | undefined,
) {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  return normalizeCurrency(
    Math.max(
      0,
      value,
    ),
  );
}

function normalizeQuantity(
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

  return Math.round(
    Math.max(
      0,
      value,
    ) *
    1_000_000,
  ) /
  1_000_000;
}

function normalizeOptionalQuantity(
  value:
    number | undefined,
) {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  return normalizeQuantity(
    value,
  );
}

function normalizeOptionalText(
  value:
    string | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function normalizeOptionalSymbol(
  value:
    string | undefined,
) {
  const normalizedValue =
    value
      ?.trim()
      .toUpperCase();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function normalizeCurrencyCode(
  value:
    string | undefined,
) {
  const normalizedValue =
    value
      ?.trim()
      .toUpperCase();

  return normalizedValue ||
    "USD";
}

function normalizeDateKey(
  value:
    string,
) {
  const dateValue =
    value.slice(
      0,
      10,
    );

  const parsedDate =
    new Date(
      `${dateValue}T00:00:00`,
    );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return getTodayDateKey();
  }

  return [
    parsedDate
      .getFullYear()
      .toString()
      .padStart(
        4,
        "0",
      ),
    (
      parsedDate.getMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0",
      ),
    parsedDate
      .getDate()
      .toString()
      .padStart(
        2,
        "0",
      ),
  ].join(
    "-",
  );
}

function getTodayDateKey() {
  const today =
    new Date();

  return [
    today
      .getFullYear()
      .toString()
      .padStart(
        4,
        "0",
      ),
    (
      today.getMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0",
      ),
    today
      .getDate()
      .toString()
      .padStart(
        2,
        "0",
      ),
  ].join(
    "-",
  );
}

function normalizePercentage(
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

  return Math.round(
    value *
    100,
  ) /
  100;
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

  return Math.round(
    (
      value /
      base
    ) *
    100 *
    100,
  ) /
  100;
}
