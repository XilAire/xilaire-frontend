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
  cloneBudgetGroups,
  cloneIncomeSources,
  copyBudgetGroupsForNewMonth,
  copyIncomeSourcesForNewMonth,
  createDateFromMonthKey,
  createId,
  createMonthDate,
  createMonthKey,
  formatMonthLabel,
  shiftMonth,
} from "@/lib/budget/month-utils";

import type {
  BudgetCategoryData,
  BudgetCategoryGroupData,
  BudgetIncomeSource,
  BudgetIncomeStatus,
  BudgetMonthData,
  BudgetMonthsByKey,
  CreateBudgetGroupData,
} from "@/types/budget";

const BUDGET_MONTHS_STORAGE_KEY =
  "case-budget:budget-months:v2";

const SELECTED_MONTH_STORAGE_KEY =
  "case-budget:selected-month:v2";

const LEGACY_BUDGET_MONTHS_STORAGE_KEY =
  "case-budget:budget-months:v1";

const LEGACY_SELECTED_MONTH_STORAGE_KEY =
  "case-budget:selected-month:v1";

const LEGACY_DEMO_MONTH_KEY =
  "2026-07";

const LEGACY_DEMO_INCOME_IDS =
  new Set([
    "income-primary-paycheck",
    "income-secondary-paycheck",
    "income-side-business",
  ]);

const LEGACY_DEMO_GROUP_IDS =
  new Set([
    "group-housing",
    "group-transportation",
    "group-food",
    "group-savings",
    "group-personal",
    "group-debt",
  ]);

export type BudgetTotals = {
  plannedIncome: number;
  receivedIncome: number;
  assignedAmount: number;
  spentAmount: number;
  remainingAmount: number;
};

export type BudgetMonthNavigation = {
  monthLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
};

export type CreateIncomeData = {
  name: string;
  amount: number;
  receivedAmount: number;
};

export type UpdateIncomeData = {
  id: string;
  name: string;
  amount: number;
  receivedAmount: number;
};

export type CreateBudgetItemData = {
  name: string;
  assignedAmount: number;
};

export type BudgetItemLocation = {
  group: BudgetCategoryGroupData;
  item: BudgetCategoryData;
};

type BudgetContextValue = {
  selectedMonth: Date;
  selectedMonthKey: string;
  selectedBudgetMonth: BudgetMonthData | undefined;
  hasSelectedBudget: boolean;

  budgetMonths: BudgetMonthsByKey;
  incomeSources: BudgetIncomeSource[];
  budgetGroups: BudgetCategoryGroupData[];

  previousMonth: Date;
  previousMonthKey: string;
  canCopyPreviousMonth: boolean;
  returnBudgetMonthKey: string | null;

  monthNavigation: BudgetMonthNavigation;
  totals: BudgetTotals;

  navigateToMonth: (
    month: Date,
  ) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  createBlankBudget: () => void;
  copyPreviousMonth: () => void;
  returnToExistingBudget: () => void;

  addIncome: (
    income: CreateIncomeData,
  ) => BudgetIncomeSource | null;
  updateIncome: (
    income: UpdateIncomeData,
  ) => void;
  deleteIncome: (
    incomeSourceId: string,
  ) => void;

  addBudgetGroup: (
    group: CreateBudgetGroupData,
  ) => BudgetCategoryGroupData | null;
  updateBudgetGroup: (
    group: BudgetCategoryGroupData,
  ) => void;
  deleteBudgetGroup: (
    groupId: string,
  ) => void;

  addBudgetItem: (
    groupId: string,
    item: CreateBudgetItemData,
  ) => BudgetCategoryData | null;
  updateBudgetItem: (
    groupId: string,
    item: BudgetCategoryData,
  ) => void;
  updateBudgetItemById: (
    itemId: string,
    updates: Partial<
      Pick<
        BudgetCategoryData,
        | "name"
        | "assignedAmount"
        | "spentAmount"
      >
    >,
  ) => void;
  adjustBudgetItemSpentAmount: (
    itemId: string,
    amountDelta: number,
  ) => void;
  deleteBudgetItem: (
    groupId: string,
    itemId: string,
  ) => void;

  getBudgetItemById: (
    itemId: string,
  ) => BudgetItemLocation | null;
};

export type BudgetProviderProps = {
  children: ReactNode;
  initialMonth?: Date;
  initialBudgetMonths?: BudgetMonthsByKey;
};

function getIncomeStatus(
  plannedAmount: number,
  receivedAmount: number,
): BudgetIncomeStatus {
  if (
    plannedAmount > 0 &&
    receivedAmount >= plannedAmount
  ) {
    return "received";
  }

  if (receivedAmount > 0) {
    return "partial";
  }

  return "planned";
}

function createDefaultSelectedMonth() {
  const currentDate =
    new Date();

  return createMonthDate(
    currentDate.getFullYear(),
    currentDate.getMonth(),
  );
}

function createInitialBudgetMonths():
  BudgetMonthsByKey {
  return {};
}

function isBudgetMonthEmpty(
  budgetMonth:
    BudgetMonthData | undefined,
) {
  if (
    !budgetMonth
  ) {
    return true;
  }

  return (
    budgetMonth.incomeSources.length ===
      0 &&
    budgetMonth.budgetGroups.length ===
      0
  );
}

function cloneBudgetMonths(
  budgetMonths: BudgetMonthsByKey,
): BudgetMonthsByKey {
  return Object.fromEntries(
    Object.entries(
      budgetMonths,
    ).map(
      ([
        monthKey,
        month,
      ]) => [
        monthKey,
        {
          ...month,
          monthKey,
          incomeSources:
            cloneIncomeSources(
              month.incomeSources,
            ),
          budgetGroups:
            cloneBudgetGroups(
              month.budgetGroups,
            ),
        },
      ],
    ),
  );
}

function isBudgetMonthsByKey(
  value: unknown,
): value is BudgetMonthsByKey {
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

  return Object.entries(
    value,
  ).every(
    ([
      monthKey,
      month,
    ]) => {
      if (
        !month ||
        typeof month !==
          "object" ||
        Array.isArray(
          month,
        )
      ) {
        return false;
      }

      const candidate =
        month as Partial<BudgetMonthData>;

      return (
        typeof monthKey ===
          "string" &&
        typeof candidate.monthKey ===
          "string" &&
        Array.isArray(
          candidate.incomeSources,
        ) &&
        Array.isArray(
          candidate.budgetGroups,
        )
      );
    },
  );
}

function loadStoredBudgetMonths() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const currentBudgetMonths =
    readStoredBudgetMonths(
      BUDGET_MONTHS_STORAGE_KEY,
    );

  if (
    currentBudgetMonths
  ) {
    return currentBudgetMonths;
  }

  const legacyBudgetMonths =
    readStoredBudgetMonths(
      LEGACY_BUDGET_MONTHS_STORAGE_KEY,
    );

  if (
    !legacyBudgetMonths
  ) {
    return null;
  }

  const migratedBudgetMonths =
    migrateLegacyBudgetMonths(
      legacyBudgetMonths,
    );

  try {
    window.localStorage.setItem(
      BUDGET_MONTHS_STORAGE_KEY,
      JSON.stringify(
        migratedBudgetMonths,
      ),
    );

    window.localStorage.removeItem(
      LEGACY_BUDGET_MONTHS_STORAGE_KEY,
    );
  } catch {
    // Local storage may be unavailable or full.
  }

  return migratedBudgetMonths;
}

function readStoredBudgetMonths(
  storageKey: string,
) {
  try {
    const storedValue =
      window.localStorage.getItem(
        storageKey,
      );

    if (
      !storedValue
    ) {
      return null;
    }

    const parsedValue:
      unknown =
      JSON.parse(
        storedValue,
      );

    if (
      !isBudgetMonthsByKey(
        parsedValue,
      )
    ) {
      window.localStorage.removeItem(
        storageKey,
      );

      return null;
    }

    return cloneBudgetMonths(
      parsedValue,
    );
  } catch {
    return null;
  }
}

function migrateLegacyBudgetMonths(
  legacyBudgetMonths:
    BudgetMonthsByKey,
): BudgetMonthsByKey {
  return Object.fromEntries(
    Object.entries(
      legacyBudgetMonths,
    ).filter(
      ([
        monthKey,
        budgetMonth,
      ]) =>
        !isUntouchedLegacyDemoMonth(
          monthKey,
          budgetMonth,
        ),
    ),
  );
}

function isUntouchedLegacyDemoMonth(
  monthKey: string,
  budgetMonth:
    BudgetMonthData,
) {
  if (
    monthKey !==
      LEGACY_DEMO_MONTH_KEY ||
    budgetMonth.monthKey !==
      LEGACY_DEMO_MONTH_KEY
  ) {
    return false;
  }

  if (
    budgetMonth.incomeSources.length !==
      3 ||
    budgetMonth.budgetGroups.length !==
      6
  ) {
    return false;
  }

  const hasExpectedIncome =
    budgetMonth.incomeSources.every(
      (
        incomeSource,
      ) =>
        LEGACY_DEMO_INCOME_IDS.has(
          incomeSource.id,
        ),
    );

  const hasExpectedGroups =
    budgetMonth.budgetGroups.every(
      (
        group,
      ) =>
        LEGACY_DEMO_GROUP_IDS.has(
          group.id,
        ),
    );

  if (
    !hasExpectedIncome ||
    !hasExpectedGroups
  ) {
    return false;
  }

  return (
    matchesLegacyIncomeSource(
      budgetMonth,
      "income-primary-paycheck",
      "Primary Paycheck",
      3200,
      3200,
    ) &&
    matchesLegacyIncomeSource(
      budgetMonth,
      "income-secondary-paycheck",
      "Secondary Paycheck",
      1800,
      900,
    ) &&
    matchesLegacyIncomeSource(
      budgetMonth,
      "income-side-business",
      "Side Business",
      500,
      0,
    ) &&
    matchesLegacyBudgetItem(
      budgetMonth,
      "category-mortgage",
      1850,
      1850,
    ) &&
    matchesLegacyBudgetItem(
      budgetMonth,
      "category-electricity",
      220,
      184.37,
    ) &&
    matchesLegacyBudgetItem(
      budgetMonth,
      "category-car-payment",
      525,
      525,
    ) &&
    matchesLegacyBudgetItem(
      budgetMonth,
      "category-groceries",
      650,
      478.24,
    ) &&
    matchesLegacyBudgetItem(
      budgetMonth,
      "category-emergency-fund",
      300,
      300,
    ) &&
    matchesLegacyBudgetItem(
      budgetMonth,
      "category-personal-spending",
      200,
      136.52,
    )
  );
}

function matchesLegacyIncomeSource(
  budgetMonth:
    BudgetMonthData,
  incomeSourceId: string,
  name: string,
  amount: number,
  receivedAmount: number,
) {
  const incomeSource =
    budgetMonth.incomeSources.find(
      (
        currentIncomeSource,
      ) =>
        currentIncomeSource.id ===
        incomeSourceId,
    );

  return (
    incomeSource?.name ===
      name &&
    incomeSource.amount ===
      amount &&
    incomeSource.receivedAmount ===
      receivedAmount
  );
}

function matchesLegacyBudgetItem(
  budgetMonth:
    BudgetMonthData,
  itemId: string,
  assignedAmount: number,
  spentAmount: number,
) {
  for (
    const group of
    budgetMonth.budgetGroups
  ) {
    const item =
      group.categories.find(
        (
          currentItem,
        ) =>
          currentItem.id ===
          itemId,
      );

    if (
      item
    ) {
      return (
        item.assignedAmount ===
          assignedAmount &&
        item.spentAmount ===
          spentAmount
      );
    }
  }

  return false;
}

function loadStoredSelectedMonth() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const currentSelectedMonth =
    readStoredSelectedMonth(
      SELECTED_MONTH_STORAGE_KEY,
    );

  if (
    currentSelectedMonth
  ) {
    return currentSelectedMonth;
  }

  const legacySelectedMonth =
    readStoredSelectedMonth(
      LEGACY_SELECTED_MONTH_STORAGE_KEY,
    );

  if (
    !legacySelectedMonth
  ) {
    return null;
  }

  const migratedSelectedMonth =
    createMonthKey(
      legacySelectedMonth,
    ) ===
    LEGACY_DEMO_MONTH_KEY
      ? createDefaultSelectedMonth()
      : legacySelectedMonth;

  try {
    window.localStorage.setItem(
      SELECTED_MONTH_STORAGE_KEY,
      createMonthKey(
        migratedSelectedMonth,
      ),
    );

    window.localStorage.removeItem(
      LEGACY_SELECTED_MONTH_STORAGE_KEY,
    );
  } catch {
    // Local storage may be unavailable or full.
  }

  return migratedSelectedMonth;
}

function readStoredSelectedMonth(
  storageKey: string,
) {
  try {
    const storedMonthKey =
      window.localStorage.getItem(
        storageKey,
      );

    if (
      !storedMonthKey
    ) {
      return null;
    }

    const selectedMonth =
      createDateFromMonthKey(
        storedMonthKey,
      );

    if (
      Number.isNaN(
        selectedMonth.getTime(),
      )
    ) {
      window.localStorage.removeItem(
        storageKey,
      );

      return null;
    }

    return selectedMonth;
  } catch {
    return null;
  }
}

const BudgetContext =
  createContext<
    BudgetContextValue | undefined
  >(undefined);

export default function BudgetProvider({
  children,
  initialMonth,
  initialBudgetMonths,
}: BudgetProviderProps) {
  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState<Date>(
    () =>
      initialMonth
        ? createMonthDate(
            initialMonth.getFullYear(),
            initialMonth.getMonth(),
          )
        : createDefaultSelectedMonth(),
  );

  const [
    budgetMonths,
    setBudgetMonths,
  ] = useState<BudgetMonthsByKey>(
    () =>
      initialBudgetMonths
        ? cloneBudgetMonths(
            initialBudgetMonths,
          )
        : createInitialBudgetMonths(),
  );

  const hasHydratedStorage =
    useRef(
      false,
    );

  useEffect(
    () => {
      const storedBudgetMonths =
        loadStoredBudgetMonths();

      const storedSelectedMonth =
        loadStoredSelectedMonth();

      if (
        storedBudgetMonths
      ) {
        setBudgetMonths(
          storedBudgetMonths,
        );
      }

      if (
        storedSelectedMonth
      ) {
        setSelectedMonth(
          createMonthDate(
            storedSelectedMonth.getFullYear(),
            storedSelectedMonth.getMonth(),
          ),
        );
      }

      hasHydratedStorage.current =
        true;
    },
    [],
  );

  useEffect(
    () => {
      try {
        window.localStorage.removeItem(
          LEGACY_BUDGET_MONTHS_STORAGE_KEY,
        );

        window.localStorage.removeItem(
          LEGACY_SELECTED_MONTH_STORAGE_KEY,
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
        !hasHydratedStorage.current
      ) {
        return;
      }

      try {
        window.localStorage.setItem(
          BUDGET_MONTHS_STORAGE_KEY,
          JSON.stringify(
            budgetMonths,
          ),
        );
      } catch {
        // Local storage may be unavailable or full.
      }
    },
    [budgetMonths],
  );

  useEffect(
    () => {
      if (
        !hasHydratedStorage.current
      ) {
        return;
      }

      try {
        window.localStorage.setItem(
          SELECTED_MONTH_STORAGE_KEY,
          createMonthKey(
            selectedMonth,
          ),
        );
      } catch {
        // Local storage may be unavailable or full.
      }
    },
    [selectedMonth],
  );

  const selectedMonthKey =
    useMemo(
      () =>
        createMonthKey(
          selectedMonth,
        ),
      [selectedMonth],
    );

  const selectedBudgetMonth =
    budgetMonths[
      selectedMonthKey
    ];

  const hasSelectedBudget =
    selectedBudgetMonth !==
    undefined;

  const previousMonth =
    useMemo(
      () =>
        shiftMonth(
          selectedMonth,
          -1,
        ),
      [selectedMonth],
    );

  const previousMonthKey =
    useMemo(
      () =>
        createMonthKey(
          previousMonth,
        ),
      [previousMonth],
    );

  const previousBudgetMonth =
    budgetMonths[
      previousMonthKey
    ];

  const canCopyPreviousMonth =
    previousBudgetMonth !==
    undefined;

  const existingBudgetMonthKeys =
    useMemo(
      () =>
        Object.keys(
          budgetMonths,
        ).sort(),
      [budgetMonths],
    );

  const returnBudgetMonthKey =
    useMemo(
      () => {
        if (
          existingBudgetMonthKeys.length ===
          0
        ) {
          return null;
        }

        const earlierOrCurrentKeys =
          existingBudgetMonthKeys.filter(
            (
              monthKey,
            ) =>
              monthKey <=
              selectedMonthKey,
          );

        if (
          earlierOrCurrentKeys.length >
          0
        ) {
          return earlierOrCurrentKeys[
            earlierOrCurrentKeys.length -
              1
          ];
        }

        return existingBudgetMonthKeys[0];
      },
      [
        existingBudgetMonthKeys,
        selectedMonthKey,
      ],
    );

  const incomeSources =
    selectedBudgetMonth
      ?.incomeSources ?? [];

  const budgetGroups =
    selectedBudgetMonth
      ?.budgetGroups ?? [];

  const monthNavigation =
    useMemo<BudgetMonthNavigation>(
      () => {
        const nextMonth =
          shiftMonth(
            selectedMonth,
            1,
          );

        return {
          monthLabel:
            formatMonthLabel(
              selectedMonth,
            ),
          previousMonthLabel: `View ${formatMonthLabel(
            previousMonth,
          )} budget`,
          nextMonthLabel: `View ${formatMonthLabel(
            nextMonth,
          )} budget`,
        };
      },
      [
        previousMonth,
        selectedMonth,
      ],
    );

  const totals =
    useMemo<BudgetTotals>(
      () => {
        const plannedIncome =
          incomeSources.reduce(
            (
              total,
              incomeSource,
            ) =>
              total +
              incomeSource.amount,
            0,
          );

        const receivedIncome =
          incomeSources.reduce(
            (
              total,
              incomeSource,
            ) =>
              total +
              incomeSource.receivedAmount,
            0,
          );

        const assignedAmount =
          budgetGroups.reduce(
            (
              groupTotal,
              group,
            ) =>
              groupTotal +
              group.categories.reduce(
                (
                  itemTotal,
                  item,
                ) =>
                  itemTotal +
                  item.assignedAmount,
                0,
              ),
            0,
          );

        const spentAmount =
          budgetGroups.reduce(
            (
              groupTotal,
              group,
            ) =>
              groupTotal +
              group.categories.reduce(
                (
                  itemTotal,
                  item,
                ) =>
                  itemTotal +
                  item.spentAmount,
                0,
              ),
            0,
          );

        return {
          plannedIncome,
          receivedIncome,
          assignedAmount,
          spentAmount,
          remainingAmount:
            plannedIncome -
            assignedAmount,
        };
      },
      [
        budgetGroups,
        incomeSources,
      ],
    );

  const updateSelectedBudgetMonth =
    useCallback(
      (
        updater: (
          currentMonth:
            BudgetMonthData,
        ) => BudgetMonthData,
      ) => {
        setBudgetMonths(
          (
            currentBudgetMonths,
          ) => {
            const currentMonth =
              currentBudgetMonths[
                selectedMonthKey
              ];

            if (!currentMonth) {
              return currentBudgetMonths;
            }

            return {
              ...currentBudgetMonths,
              [selectedMonthKey]:
                updater(
                  currentMonth,
                ),
            };
          },
        );
      },
      [selectedMonthKey],
    );

  const navigateToMonth =
    useCallback(
      (
        month: Date,
      ) => {
        setSelectedMonth(
          createMonthDate(
            month.getFullYear(),
            month.getMonth(),
          ),
        );
      },
      [],
    );

  const goToPreviousMonth =
    useCallback(
      () => {
        navigateToMonth(
          shiftMonth(
            selectedMonth,
            -1,
          ),
        );
      },
      [
        navigateToMonth,
        selectedMonth,
      ],
    );

  const goToNextMonth =
    useCallback(
      () => {
        navigateToMonth(
          shiftMonth(
            selectedMonth,
            1,
          ),
        );
      },
      [
        navigateToMonth,
        selectedMonth,
      ],
    );

  const createBlankBudget =
    useCallback(
      () => {
        setBudgetMonths(
          (
            currentBudgetMonths,
          ) => {
            if (
              currentBudgetMonths[
                selectedMonthKey
              ]
            ) {
              return currentBudgetMonths;
            }

            return {
              ...currentBudgetMonths,
              [selectedMonthKey]: {
                monthKey:
                  selectedMonthKey,
                incomeSources: [],
                budgetGroups: [],
              },
            };
          },
        );
      },
      [selectedMonthKey],
    );

  const copyPreviousMonth =
    useCallback(
      () => {
        setBudgetMonths(
          (
            currentBudgetMonths,
          ) => {
            const sourceMonth =
              currentBudgetMonths[
                previousMonthKey
              ];

            if (
              !sourceMonth
            ) {
              return currentBudgetMonths;
            }

            const targetMonth =
              currentBudgetMonths[
                selectedMonthKey
              ];

            /*
             * Allow the copy operation when the target month does not
             * exist OR when an empty month was created previously.
             *
             * This fixes the silent failure where an empty target month
             * blocked "Copy Previous Month" because the provider only
             * checked whether a month object existed.
             *
             * Never overwrite a month that already contains real budget
             * data. That protects user-entered income, groups, and items.
             */
            if (
              targetMonth &&
              !isBudgetMonthEmpty(
                targetMonth,
              )
            ) {
              return currentBudgetMonths;
            }

            const copiedIncomeSources =
              copyIncomeSourcesForNewMonth(
                sourceMonth.incomeSources,
              );

            const copiedBudgetGroups =
              copyBudgetGroupsForNewMonth(
                sourceMonth.budgetGroups,
              );

            return {
              ...currentBudgetMonths,

              [selectedMonthKey]: {
                monthKey:
                  selectedMonthKey,

                incomeSources:
                  copiedIncomeSources,

                budgetGroups:
                  copiedBudgetGroups,
              },
            };
          },
        );
      },
      [
        previousMonthKey,
        selectedMonthKey,
      ],
    );

  const returnToExistingBudget =
    useCallback(
      () => {
        if (
          !returnBudgetMonthKey
        ) {
          return;
        }

        navigateToMonth(
          createDateFromMonthKey(
            returnBudgetMonthKey,
          ),
        );
      },
      [
        navigateToMonth,
        returnBudgetMonthKey,
      ],
    );

  const addIncome =
    useCallback(
      (
        income: CreateIncomeData,
      ) => {
        if (!hasSelectedBudget) {
          return null;
        }

        const newIncomeSource:
          BudgetIncomeSource = {
            id:
              createId(
                "income",
              ),
            name:
              income.name,
            amount:
              income.amount,
            receivedAmount:
              income.receivedAmount,
            status:
              getIncomeStatus(
                income.amount,
                income.receivedAmount,
              ),
          };

        updateSelectedBudgetMonth(
          (
            currentMonth,
          ) => ({
            ...currentMonth,
            incomeSources: [
              ...currentMonth.incomeSources,
              newIncomeSource,
            ],
          }),
        );

        return newIncomeSource;
      },
      [
        hasSelectedBudget,
        updateSelectedBudgetMonth,
      ],
    );

  const updateIncome =
    useCallback(
      (
        income: UpdateIncomeData,
      ) => {
        if (!hasSelectedBudget) {
          return;
        }

        updateSelectedBudgetMonth(
          (
            currentMonth,
          ) => ({
            ...currentMonth,
            incomeSources:
              currentMonth.incomeSources.map(
                (
                  currentIncomeSource,
                ) =>
                  currentIncomeSource.id ===
                  income.id
                    ? {
                        id:
                          income.id,
                        name:
                          income.name,
                        amount:
                          income.amount,
                        receivedAmount:
                          income.receivedAmount,
                        status:
                          getIncomeStatus(
                            income.amount,
                            income.receivedAmount,
                          ),
                      }
                    : currentIncomeSource,
              ),
          }),
        );
      },
      [
        hasSelectedBudget,
        updateSelectedBudgetMonth,
      ],
    );

  const deleteIncome =
    useCallback(
      (
        incomeSourceId: string,
      ) => {
        if (!hasSelectedBudget) {
          return;
        }

        updateSelectedBudgetMonth(
          (
            currentMonth,
          ) => ({
            ...currentMonth,
            incomeSources:
              currentMonth.incomeSources.filter(
                (
                  incomeSource,
                ) =>
                  incomeSource.id !==
                  incomeSourceId,
              ),
          }),
        );
      },
      [
        hasSelectedBudget,
        updateSelectedBudgetMonth,
      ],
    );

  const addBudgetGroup =
    useCallback(
      (
        group:
          CreateBudgetGroupData,
      ) => {
        if (!hasSelectedBudget) {
          return null;
        }

        const newGroup:
          BudgetCategoryGroupData = {
            id:
              createId(
                "group",
              ),
            name:
              group.name,
            description:
              group.description,
            categories: [],
          };

        updateSelectedBudgetMonth(
          (
            currentMonth,
          ) => ({
            ...currentMonth,
            budgetGroups: [
              ...currentMonth.budgetGroups,
              newGroup,
            ],
          }),
        );

        return newGroup;
      },
      [
        hasSelectedBudget,
        updateSelectedBudgetMonth,
      ],
    );

  const updateBudgetGroup =
    useCallback(
      (
        group:
          BudgetCategoryGroupData,
      ) => {
        if (!hasSelectedBudget) {
          return;
        }

        updateSelectedBudgetMonth(
          (
            currentMonth,
          ) => ({
            ...currentMonth,
            budgetGroups:
              currentMonth.budgetGroups.map(
                (
                  currentGroup,
                ) =>
                  currentGroup.id ===
                  group.id
                    ? group
                    : currentGroup,
              ),
          }),
        );
      },
      [
        hasSelectedBudget,
        updateSelectedBudgetMonth,
      ],
    );

  const deleteBudgetGroup =
    useCallback(
      (
        groupId: string,
      ) => {
        if (!hasSelectedBudget) {
          return;
        }

        updateSelectedBudgetMonth(
          (
            currentMonth,
          ) => ({
            ...currentMonth,
            budgetGroups:
              currentMonth.budgetGroups.filter(
                (
                  currentGroup,
                ) =>
                  currentGroup.id !==
                  groupId,
              ),
          }),
        );
      },
      [
        hasSelectedBudget,
        updateSelectedBudgetMonth,
      ],
    );

  const addBudgetItem =
    useCallback(
      (
        groupId: string,
        item:
          CreateBudgetItemData,
      ) => {
        if (!hasSelectedBudget) {
          return null;
        }

        const newItem:
          BudgetCategoryData = {
            id:
              createId(
                "item",
              ),
            name:
              item.name,
            assignedAmount:
              item.assignedAmount,
            spentAmount: 0,
          };

        updateSelectedBudgetMonth(
          (
            currentMonth,
          ) => ({
            ...currentMonth,
            budgetGroups:
              currentMonth.budgetGroups.map(
                (
                  currentGroup,
                ) =>
                  currentGroup.id ===
                  groupId
                    ? {
                        ...currentGroup,
                        categories: [
                          ...currentGroup.categories,
                          newItem,
                        ],
                      }
                    : currentGroup,
              ),
          }),
        );

        return newItem;
      },
      [
        hasSelectedBudget,
        updateSelectedBudgetMonth,
      ],
    );

  const updateBudgetItem =
    useCallback(
      (
        groupId: string,
        item:
          BudgetCategoryData,
      ) => {
        if (!hasSelectedBudget) {
          return;
        }

        updateSelectedBudgetMonth(
          (
            currentMonth,
          ) => ({
            ...currentMonth,
            budgetGroups:
              currentMonth.budgetGroups.map(
                (
                  currentGroup,
                ) =>
                  currentGroup.id ===
                  groupId
                    ? {
                        ...currentGroup,
                        categories:
                          currentGroup.categories.map(
                            (
                              currentItem,
                            ) =>
                              currentItem.id ===
                              item.id
                                ? item
                                : currentItem,
                          ),
                      }
                    : currentGroup,
              ),
          }),
        );
      },
      [
        hasSelectedBudget,
        updateSelectedBudgetMonth,
      ],
    );

  const updateBudgetItemById =
    useCallback(
      (
        itemId: string,
        updates: Partial<
          Pick<
            BudgetCategoryData,
            | "name"
            | "assignedAmount"
            | "spentAmount"
          >
        >,
      ) => {
        if (!hasSelectedBudget) {
          return;
        }

        updateSelectedBudgetMonth(
          (
            currentMonth,
          ) => ({
            ...currentMonth,
            budgetGroups:
              currentMonth.budgetGroups.map(
                (
                  currentGroup,
                ) => ({
                  ...currentGroup,
                  categories:
                    currentGroup.categories.map(
                      (
                        currentItem,
                      ) =>
                        currentItem.id ===
                        itemId
                          ? {
                              ...currentItem,
                              ...updates,
                            }
                          : currentItem,
                    ),
                }),
              ),
          }),
        );
      },
      [
        hasSelectedBudget,
        updateSelectedBudgetMonth,
      ],
    );

  const adjustBudgetItemSpentAmount =
    useCallback(
      (
        itemId: string,
        amountDelta: number,
      ) => {
        if (
          !hasSelectedBudget ||
          !Number.isFinite(
            amountDelta,
          ) ||
          amountDelta === 0
        ) {
          return;
        }

        updateSelectedBudgetMonth(
          (
            currentMonth,
          ) => ({
            ...currentMonth,
            budgetGroups:
              currentMonth.budgetGroups.map(
                (
                  currentGroup,
                ) => ({
                  ...currentGroup,
                  categories:
                    currentGroup.categories.map(
                      (
                        currentItem,
                      ) => {
                        if (
                          currentItem.id !==
                          itemId
                        ) {
                          return currentItem;
                        }

                        const nextSpentAmount =
                          Math.max(
                            0,
                            currentItem.spentAmount +
                              amountDelta,
                          );

                        return {
                          ...currentItem,
                          spentAmount:
                            nextSpentAmount,
                        };
                      },
                    ),
                }),
              ),
          }),
        );
      },
      [
        hasSelectedBudget,
        updateSelectedBudgetMonth,
      ],
    );

  const deleteBudgetItem =
    useCallback(
      (
        groupId: string,
        itemId: string,
      ) => {
        if (!hasSelectedBudget) {
          return;
        }

        updateSelectedBudgetMonth(
          (
            currentMonth,
          ) => ({
            ...currentMonth,
            budgetGroups:
              currentMonth.budgetGroups.map(
                (
                  currentGroup,
                ) =>
                  currentGroup.id ===
                  groupId
                    ? {
                        ...currentGroup,
                        categories:
                          currentGroup.categories.filter(
                            (
                              currentItem,
                            ) =>
                              currentItem.id !==
                              itemId,
                          ),
                      }
                    : currentGroup,
              ),
          }),
        );
      },
      [
        hasSelectedBudget,
        updateSelectedBudgetMonth,
      ],
    );

  const getBudgetItemById =
    useCallback(
      (
        itemId: string,
      ) => {
        for (
          const group
          of budgetGroups
        ) {
          const item =
            group.categories.find(
              (
                currentItem,
              ) =>
                currentItem.id ===
                itemId,
            );

          if (item) {
            return {
              group,
              item,
            };
          }
        }

        return null;
      },
      [budgetGroups],
    );

  const value =
    useMemo<BudgetContextValue>(
      () => ({
        selectedMonth,
        selectedMonthKey,
        selectedBudgetMonth,
        hasSelectedBudget,

        budgetMonths,
        incomeSources,
        budgetGroups,

        previousMonth,
        previousMonthKey,
        canCopyPreviousMonth,
        returnBudgetMonthKey,

        monthNavigation,
        totals,

        navigateToMonth,
        goToPreviousMonth,
        goToNextMonth,
        createBlankBudget,
        copyPreviousMonth,
        returnToExistingBudget,

        addIncome,
        updateIncome,
        deleteIncome,

        addBudgetGroup,
        updateBudgetGroup,
        deleteBudgetGroup,

        addBudgetItem,
        updateBudgetItem,
        updateBudgetItemById,
        adjustBudgetItemSpentAmount,
        deleteBudgetItem,

        getBudgetItemById,
      }),
      [
        addBudgetGroup,
        addBudgetItem,
        addIncome,
        adjustBudgetItemSpentAmount,
        budgetGroups,
        budgetMonths,
        canCopyPreviousMonth,
        copyPreviousMonth,
        createBlankBudget,
        deleteBudgetGroup,
        deleteBudgetItem,
        deleteIncome,
        getBudgetItemById,
        goToNextMonth,
        goToPreviousMonth,
        hasSelectedBudget,
        incomeSources,
        monthNavigation,
        navigateToMonth,
        previousMonth,
        previousMonthKey,
        returnBudgetMonthKey,
        returnToExistingBudget,
        selectedBudgetMonth,
        selectedMonth,
        selectedMonthKey,
        totals,
        updateBudgetGroup,
        updateBudgetItem,
        updateBudgetItemById,
        updateIncome,
      ],
    );

  return (
    <BudgetContext.Provider
      value={value}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context =
    useContext(
      BudgetContext,
    );

  if (!context) {
    throw new Error(
      "useBudget must be used within a BudgetProvider.",
    );
  }

  return context;
}