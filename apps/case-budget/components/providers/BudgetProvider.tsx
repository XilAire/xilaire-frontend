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
  archiveBudgetGroup,
} from "@/actions/budget/archive-budget-group";

import {
  archiveBudgetItem,
} from "@/actions/budget/archive-budget-item";

import {
  archiveIncomeSource,
} from "@/actions/budget/archive-income-source";

import {
  copyBudgetMonth,
} from "@/actions/budget/copy-budget-month";

import {
  createBudgetGroup,
} from "@/actions/budget/create-budget-group";

import {
  createBudgetItem,
} from "@/actions/budget/create-budget-item";

import {
  createBudgetMonth,
} from "@/actions/budget/create-budget-month";

import {
  createIncomeSource,
} from "@/actions/budget/create-income-source";

import {
  getBudget,
} from "@/actions/budget/get-budget";

import {
  updateBudgetGroup as updateBudgetGroupAction,
} from "@/actions/budget/update-budget-group";

import {
  updateBudgetItem as updateBudgetItemAction,
} from "@/actions/budget/update-budget-item";

import {
  updateIncomeSource,
} from "@/actions/budget/update-income-source";

import {
  cloneBudgetGroups,
  cloneIncomeSources,
  createDateFromMonthKey,
  createMonthDate,
  createMonthKey,
  formatMonthLabel,
  shiftMonth,
} from "@/lib/budget/month-utils";

import type {
  HouseholdApprovalRequest,
} from "@/types/household/household-approval";

import type {
  BudgetCategoryData,
  BudgetCategoryGroupData,
  BudgetIncomeSource,
  BudgetMonthData,
  BudgetMonthsByKey,
  CreateBudgetGroupData,
} from "@/types/budget";

export type BudgetTotals = {
  plannedIncome:
    number;

  receivedIncome:
    number;

  assignedAmount:
    number;

  spentAmount:
    number;

  rolloverAmount:
    number;

  /**
   * Canonical total availability across all budget items.
   *
   * This is the sum of each item's persisted available_amount and therefore
   * already includes rollover and transaction activity.
   */
  availableAmount:
    number;

  /**
   * Income that has not yet been assigned to budget items.
   *
   * Kept as remainingAmount for compatibility with the existing summary UI.
   * This is intentionally different from availableAmount.
   */
  remainingAmount:
    number;
};

export type BudgetMonthNavigation = {
  monthLabel:
    string;

  previousMonthLabel:
    string;

  nextMonthLabel:
    string;
};

export type CreateIncomeData = {
  name:
    string;

  amount:
    number;

  receivedAmount:
    number;
};

export type UpdateIncomeData = {
  id:
    string;

  name:
    string;

  amount:
    number;

  receivedAmount:
    number;
};

export type CreateBudgetItemData = {
  name:
    string;

  assignedAmount:
    number;

  amountType:
    BudgetCategoryData["amountType"];
};

export type BudgetItemLocation = {
  group:
    BudgetCategoryGroupData;

  item:
    BudgetCategoryData;
};

export type BudgetMutationResult<T> =
  | {
      success:
        true;

      data:
        T;

      approvalRequired:
        false;

      approval:
        null;

      error:
        null;
    }
  | {
      success:
        true;

      data:
        null;

      approvalRequired:
        true;

      approval:
        HouseholdApprovalRequest;

      error:
        null;
    }
  | {
      success:
        false;

      data:
        null;

      approvalRequired:
        false;

      approval:
        null;

      error:
        string;
    };

type BudgetContextValue = {
  selectedMonth:
    Date;

  selectedMonthKey:
    string;

  selectedBudgetMonth:
    BudgetMonthData | undefined;

  hasSelectedBudget:
    boolean;

  budgetMonths:
    BudgetMonthsByKey;

  incomeSources:
    BudgetIncomeSource[];

  budgetGroups:
    BudgetCategoryGroupData[];

  previousMonth:
    Date;

  previousMonthKey:
    string;

  canCopyPreviousMonth:
    boolean;

  returnBudgetMonthKey:
    string | null;

  monthNavigation:
    BudgetMonthNavigation;

  totals:
    BudgetTotals;

  isLoading:
    boolean;

  isMutating:
    boolean;

  error:
    string | null;

  pendingApproval:
    HouseholdApprovalRequest | null;

  clearError:
    () => void;

  clearPendingApproval:
    () => void;

  refreshBudget:
    () => Promise<boolean>;

  navigateToMonth:
    (
      month:
        Date,
    ) => void;

  goToPreviousMonth:
    () => void;

  goToNextMonth:
    () => void;

  createBlankBudget:
    () => Promise<
      BudgetMutationResult<BudgetMonthData>
    >;

  copyPreviousMonth:
    () => Promise<
      BudgetMutationResult<BudgetMonthData>
    >;

  returnToExistingBudget:
    () => void;

  addIncome:
    (
      income:
        CreateIncomeData,
    ) => Promise<
      BudgetMutationResult<BudgetIncomeSource>
    >;

  updateIncome:
    (
      income:
        UpdateIncomeData,
    ) => Promise<
      BudgetMutationResult<BudgetIncomeSource>
    >;

  deleteIncome:
    (
      incomeSourceId:
        string,
    ) => Promise<
      BudgetMutationResult<BudgetIncomeSource>
    >;

  addBudgetGroup:
    (
      group:
        CreateBudgetGroupData,
    ) => Promise<
      BudgetMutationResult<BudgetCategoryGroupData>
    >;

  updateBudgetGroup:
    (
      group:
        BudgetCategoryGroupData,
    ) => Promise<
      BudgetMutationResult<BudgetCategoryGroupData>
    >;

  deleteBudgetGroup:
    (
      groupId:
        string,
    ) => Promise<
      BudgetMutationResult<BudgetCategoryGroupData>
    >;

  addBudgetItem:
    (
      groupId:
        string,
      item:
        CreateBudgetItemData,
    ) => Promise<
      BudgetMutationResult<BudgetCategoryData>
    >;

  updateBudgetItem:
    (
      groupId:
        string,
      item:
        BudgetCategoryData,
    ) => Promise<
      BudgetMutationResult<BudgetCategoryData>
    >;

  updateBudgetItemById:
    (
      itemId:
        string,
      updates:
        Partial<
          Pick<
            BudgetCategoryData,
            | "name"
            | "assignedAmount"
            | "amountType"
          >
        >,
    ) => Promise<
      BudgetMutationResult<BudgetCategoryData>
    >;

  deleteBudgetItem:
    (
      groupId:
        string,
      itemId:
        string,
    ) => Promise<
      BudgetMutationResult<BudgetCategoryData>
    >;

  getBudgetItemById:
    (
      itemId:
        string,
    ) => BudgetItemLocation | null;
};

export type BudgetProviderProps = {
  children:
    ReactNode;

  initialMonth?:
    Date;

  /**
   * The active workspace selected by AppProvider.
   *
   * When this value changes the provider invalidates all in-flight reads,
   * clears the previous workspace's budget from client memory, and reloads
   * the newly active workspace from Supabase.
   *
   * This remains optional temporarily so this file can be introduced before
   * the AppProvider wiring change. AppProvider should pass its canonical
   * activeWorkspaceId in the next step.
   */
  activeWorkspaceId?:
    string | null;

  /**
   * Optional server-rendered bootstrap data.
   *
   * This is never persisted in browser storage. The provider refreshes from
   * Supabase after mount so the database remains canonical.
   */
  initialBudgetMonths?:
    BudgetMonthsByKey;
};

function createDefaultSelectedMonth() {
  const currentDate =
    new Date();

  return createMonthDate(
    currentDate.getFullYear(),
    currentDate.getMonth(),
  );
}

function cloneBudgetMonths(
  budgetMonths:
    BudgetMonthsByKey,
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

function normalizeError(
  error:
    unknown,
  fallback:
    string,
) {
  if (
    error instanceof
      Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function createFailure<T>(
  message:
    string,
): BudgetMutationResult<T> {
  return {
    success:
      false,

    data:
      null,

    approvalRequired:
      false,

    approval:
      null,

    error:
      message,
  };
}

function createApprovalRequired<T>(
  approval:
    HouseholdApprovalRequest,
): BudgetMutationResult<T> {
  return {
    success:
      true,

    data:
      null,

    approvalRequired:
      true,

    approval,

    error:
      null,
  };
}

function createSuccess<T>(
  data:
    T,
): BudgetMutationResult<T> {
  return {
    success:
      true,

    data,

    approvalRequired:
      false,

    approval:
      null,

    error:
      null,
  };
}

const BudgetContext =
  createContext<
    BudgetContextValue | undefined
  >(
    undefined,
  );

export default function BudgetProvider({
  children,
  initialMonth,
  activeWorkspaceId,
  initialBudgetMonths,
}: BudgetProviderProps) {
  const [
    selectedMonth,
    setSelectedMonth,
  ] =
    useState<Date>(
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
  ] =
    useState<BudgetMonthsByKey>(
      () =>
        initialBudgetMonths
          ? cloneBudgetMonths(
              initialBudgetMonths,
            )
          : {},
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      !initialBudgetMonths,
    );

  const [
    mutationCount,
    setMutationCount,
  ] =
    useState(
      0,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    pendingApproval,
    setPendingApproval,
  ] =
    useState<
      HouseholdApprovalRequest | null
    >(
      null,
    );

  const mountedRef =
    useRef(
      true,
    );

  const loadSequenceRef =
    useRef(
      0,
    );

  const activeWorkspaceIdRef =
    useRef<
      string | null | undefined
    >(
      activeWorkspaceId,
    );

  const selectedMonthKey =
    useMemo(
      () =>
        createMonthKey(
          selectedMonth,
        ),
      [
        selectedMonth,
      ],
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
      [
        selectedMonth,
      ],
    );

  const previousMonthKey =
    useMemo(
      () =>
        createMonthKey(
          previousMonth,
        ),
      [
        previousMonth,
      ],
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
      [
        budgetMonths,
      ],
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

        return existingBudgetMonthKeys[
          0
        ];
      },
      [
        existingBudgetMonthKeys,
        selectedMonthKey,
      ],
    );

  const incomeSources =
    selectedBudgetMonth
      ?.incomeSources ??
    [];

  const budgetGroups =
    selectedBudgetMonth
      ?.budgetGroups ??
    [];

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

          previousMonthLabel:
            `View ${formatMonthLabel(
              previousMonth,
            )} budget`,

          nextMonthLabel:
            `View ${formatMonthLabel(
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

        const itemFinancialTotals =
          budgetGroups.reduce(
            (
              groupTotals,
              group,
            ) =>
              group.categories.reduce(
                (
                  totals,
                  item,
                ) => ({
                  spentAmount:
                    totals.spentAmount +
                    item.spentAmount,

                  rolloverAmount:
                    totals.rolloverAmount +
                    item.rolloverAmount,

                  availableAmount:
                    totals.availableAmount +
                    item.availableAmount,
                }),
                groupTotals,
              ),
            {
              spentAmount:
                0,

              rolloverAmount:
                0,

              availableAmount:
                0,
            },
          );

        /*
         * remainingAmount remains the amount of planned income that has not
         * been assigned. It is NOT item availability.
         *
         * availableAmount is the canonical sum of persisted item
         * available_amount values and already accounts for rollover and
         * transaction activity.
         */
        const remainingAmount =
          plannedIncome -
          assignedAmount;

        return {
          plannedIncome,

          receivedIncome,

          assignedAmount,

          spentAmount:
            itemFinancialTotals.spentAmount,

          rolloverAmount:
            itemFinancialTotals.rolloverAmount,

          availableAmount:
            itemFinancialTotals.availableAmount,

          remainingAmount,
        };
      },
      [
        budgetGroups,
        incomeSources,
      ],
    );

  const isMutating =
    mutationCount >
    0;

  const clearError =
    useCallback(
      () => {
        setError(
          null,
        );
      },
      [],
    );

  const clearPendingApproval =
    useCallback(
      () => {
        setPendingApproval(
          null,
        );
      },
      [],
    );

  const refreshBudget =
    useCallback(
      async () => {
        const requestedWorkspaceId =
          activeWorkspaceIdRef.current;

        const sequence =
          ++loadSequenceRef.current;

        setIsLoading(
          true,
        );

        try {
          const result =
            await getBudget();

          if (
            !mountedRef.current ||
            sequence !==
              loadSequenceRef.current
          ) {
            return false;
          }

          if (
            activeWorkspaceIdRef.current !==
            requestedWorkspaceId
          ) {
            return false;
          }

          if (
            !result.success
          ) {
            setError(
              result.error.message,
            );

            return false;
          }

          setBudgetMonths(
            cloneBudgetMonths(
              result.budgetMonths,
            ),
          );

          setError(
            null,
          );

          return true;
        } catch (
          loadError
        ) {
          if (
            mountedRef.current &&
            sequence ===
              loadSequenceRef.current &&
            activeWorkspaceIdRef.current ===
              requestedWorkspaceId
          ) {
            setError(
              normalizeError(
                loadError,
                "CASE Budget could not load your budget.",
              ),
            );
          }

          return false;
        } finally {
          if (
            mountedRef.current &&
            sequence ===
              loadSequenceRef.current &&
            activeWorkspaceIdRef.current ===
              requestedWorkspaceId
          ) {
            setIsLoading(
              false,
            );
          }
        }
      },
      [],
    );

  useEffect(
    () => {
      mountedRef.current =
        true;

      /*
       * Invalidate every request started for the previous workspace before
       * clearing its in-memory budget. A late Supabase response can therefore
       * never populate the newly selected workspace with stale data.
       */
      ++loadSequenceRef.current;

      activeWorkspaceIdRef.current =
        activeWorkspaceId;

      setBudgetMonths(
        {},
      );

      setError(
        null,
      );

      setPendingApproval(
        null,
      );

      /*
       * AppProvider wiring is intentionally introduced in the next file.
       * Until activeWorkspaceId is supplied, undefined means "use the
       * server-authenticated active workspace" and preserves current startup
       * behavior.
       *
       * null/empty means there is currently no active workspace to load.
       */
      if (
        activeWorkspaceId ===
          null ||
        activeWorkspaceId ===
          ""
      ) {
        setIsLoading(
          false,
        );

        return () => {
          mountedRef.current =
            false;
        };
      }

      void refreshBudget();

      return () => {
        mountedRef.current =
          false;

        ++loadSequenceRef.current;
      };
    },
    [
      activeWorkspaceId,
      refreshBudget,
    ],
  );

  const runMutation =
    useCallback(
      async <T,>(
        operation:
          () => Promise<
            BudgetMutationResult<T>
          >,
      ) => {
        setMutationCount(
          (
            current,
          ) =>
            current +
            1,
        );

        setError(
          null,
        );

        setPendingApproval(
          null,
        );

        try {
          return await operation();
        } catch (
          mutationError
        ) {
          const message =
            normalizeError(
              mutationError,
              "CASE Budget could not complete the requested change.",
            );

          if (
            mountedRef.current
          ) {
            setError(
              message,
            );

            /*
             * Server actions may perform protected secondary synchronization
             * or recovery work before surfacing an error. Reload canonical
             * budget state rather than assuming the pre-mutation client
             * snapshot is still authoritative.
             */
            await refreshBudget();

            setError(
              message,
            );
          }

          return createFailure<T>(
            message,
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setMutationCount(
              (
                current,
              ) =>
                Math.max(
                  0,
                  current -
                    1,
                ),
            );
          }
        }
      },
      [
        refreshBudget,
      ],
    );

  const handleApproval =
    useCallback(
      <T,>(
        approval:
          HouseholdApprovalRequest,
      ) => {
        setPendingApproval(
          approval,
        );

        return createApprovalRequired<T>(
          approval,
        );
      },
      [],
    );

  const handleActionError =
    useCallback(
      <T,>(
        message:
          string,
      ) => {
        setError(
          message,
        );

        return createFailure<T>(
          message,
        );
      },
      [],
    );

  const navigateToMonth =
    useCallback(
      (
        month:
          Date,
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
      async () =>
        runMutation<
          BudgetMonthData
        >(
          async () => {
            if (
              budgetMonths[
                selectedMonthKey
              ]
            ) {
              return createSuccess(
                budgetMonths[
                  selectedMonthKey
                ],
              );
            }

            const result =
              await createBudgetMonth({
                monthKey:
                  selectedMonthKey,
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const budget =
              result.month.budget;

            setBudgetMonths(
              (
                current,
              ) => ({
                ...current,

                [
                  selectedMonthKey
                ]:
                  budget,
              }),
            );

            await refreshBudget();

            return createSuccess(
              budget,
            );
          },
        ),
      [
        budgetMonths,
        handleActionError,
        handleApproval,
        refreshBudget,
        runMutation,
        selectedMonthKey,
      ],
    );

  const copyPreviousMonth =
    useCallback(
      async () =>
        runMutation<
          BudgetMonthData
        >(
          async () => {
            if (
              !canCopyPreviousMonth
            ) {
              return handleActionError(
                "There is no previous budget month available to copy.",
              );
            }

            const result =
              await copyBudgetMonth({
                sourceMonthKey:
                  previousMonthKey,

                targetMonthKey:
                  selectedMonthKey,
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const budget =
              result.month.budget;

            setBudgetMonths(
              (
                current,
              ) => ({
                ...current,

                [
                  selectedMonthKey
                ]:
                  budget,
              }),
            );

            await refreshBudget();

            return createSuccess(
              budget,
            );
          },
        ),
      [
        canCopyPreviousMonth,
        handleActionError,
        handleApproval,
        previousMonthKey,
        refreshBudget,
        runMutation,
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
      async (
        income:
          CreateIncomeData,
      ) =>
        runMutation<
          BudgetIncomeSource
        >(
          async () => {
            if (
              !hasSelectedBudget
            ) {
              return handleActionError(
                "Create this budget month before adding income.",
              );
            }

            const result =
              await createIncomeSource({
                monthKey:
                  selectedMonthKey,

                name:
                  income.name,

                plannedAmount:
                  income.amount,

                receivedAmount:
                  income.receivedAmount,
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const created =
              result.incomeSource.incomeSource;

            await refreshBudget();

            return createSuccess(
              created,
            );
          },
        ),
      [
        handleActionError,
        handleApproval,
        hasSelectedBudget,
        refreshBudget,
        runMutation,
        selectedMonthKey,
      ],
    );

  const updateIncome =
    useCallback(
      async (
        income:
          UpdateIncomeData,
      ) =>
        runMutation<
          BudgetIncomeSource
        >(
          async () => {
            const result =
              await updateIncomeSource({
                incomeSourceId:
                  income.id,

                name:
                  income.name,

                plannedAmount:
                  income.amount,

                receivedAmount:
                  income.receivedAmount,
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const updated =
              result.incomeSource.incomeSource;

            await refreshBudget();

            return createSuccess(
              updated,
            );
          },
        ),
      [
        handleActionError,
        handleApproval,
        refreshBudget,
        runMutation,
      ],
    );

  const deleteIncome =
    useCallback(
      async (
        incomeSourceId:
          string,
      ) =>
        runMutation<
          BudgetIncomeSource
        >(
          async () => {
            const result =
              await archiveIncomeSource({
                incomeSourceId,

                archived:
                  true,
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const archived =
              result.incomeSource.incomeSource;

            await refreshBudget();

            return createSuccess(
              archived,
            );
          },
        ),
      [
        handleActionError,
        handleApproval,
        refreshBudget,
        runMutation,
      ],
    );

  const addBudgetGroup =
    useCallback(
      async (
        group:
          CreateBudgetGroupData,
      ) =>
        runMutation<
          BudgetCategoryGroupData
        >(
          async () => {
            if (
              !hasSelectedBudget
            ) {
              return handleActionError(
                "Create this budget month before adding a group.",
              );
            }

            const result =
              await createBudgetGroup({
                monthKey:
                  selectedMonthKey,

                name:
                  group.name,

                description:
                  group.description,
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const created =
              result.group.group;

            await refreshBudget();

            return createSuccess(
              created,
            );
          },
        ),
      [
        handleActionError,
        handleApproval,
        hasSelectedBudget,
        refreshBudget,
        runMutation,
        selectedMonthKey,
      ],
    );

  const updateBudgetGroup =
    useCallback(
      async (
        group:
          BudgetCategoryGroupData,
      ) =>
        runMutation<
          BudgetCategoryGroupData
        >(
          async () => {
            const result =
              await updateBudgetGroupAction({
                groupId:
                  group.id,

                name:
                  group.name,

                description:
                  group.description ??
                  null,
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const updated =
              result.group.group;

            await refreshBudget();

            return createSuccess(
              updated,
            );
          },
        ),
      [
        handleActionError,
        handleApproval,
        refreshBudget,
        runMutation,
      ],
    );

  const deleteBudgetGroup =
    useCallback(
      async (
        groupId:
          string,
      ) =>
        runMutation<
          BudgetCategoryGroupData
        >(
          async () => {
            const result =
              await archiveBudgetGroup({
                groupId,

                archived:
                  true,
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const archived =
              result.group.group;

            await refreshBudget();

            return createSuccess(
              archived,
            );
          },
        ),
      [
        handleActionError,
        handleApproval,
        refreshBudget,
        runMutation,
      ],
    );

  const addBudgetItem =
    useCallback(
      async (
        groupId:
          string,
        item:
          CreateBudgetItemData,
      ) =>
        runMutation<
          BudgetCategoryData
        >(
          async () => {
            if (
              !hasSelectedBudget
            ) {
              return handleActionError(
                "Create this budget month before adding an item.",
              );
            }

            const result =
              await createBudgetItem({
                groupId,

                name:
                  item.name,

                plannedAmount:
                  item.assignedAmount,

                amountType:
                  item.amountType,
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const created =
              result.item.item;

            await refreshBudget();

            return createSuccess(
              created,
            );
          },
        ),
      [
        handleActionError,
        handleApproval,
        hasSelectedBudget,
        refreshBudget,
        runMutation,
      ],
    );

  const updateBudgetItem =
    useCallback(
      async (
        groupId:
          string,
        item:
          BudgetCategoryData,
      ) =>
        runMutation<
          BudgetCategoryData
        >(
          async () => {
            /*
             * spentAmount is deliberately ignored here.
             *
             * Transaction activity belongs to the transaction persistence
             * flow and is recalculated from canonical Supabase data.
             */
            const result =
              await updateBudgetItemAction({
                itemId:
                  item.id,

                groupId,

                name:
                  item.name,

                plannedAmount:
                  item.assignedAmount,

                amountType:
                  item.amountType,
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const updated =
              result.item.item;

            await refreshBudget();

            return createSuccess(
              updated,
            );
          },
        ),
      [
        handleActionError,
        handleApproval,
        refreshBudget,
        runMutation,
      ],
    );

  const updateBudgetItemById =
    useCallback(
      async (
        itemId:
          string,
        updates:
          Partial<
            Pick<
              BudgetCategoryData,
              | "name"
              | "assignedAmount"
              | "amountType"
            >
          >,
      ) =>
        runMutation<
          BudgetCategoryData
        >(
          async () => {
            const result =
              await updateBudgetItemAction({
                itemId,

                ...(updates.name !==
                undefined
                  ? {
                      name:
                        updates.name,
                    }
                  : {}),

                ...(updates.assignedAmount !==
                undefined
                  ? {
                      plannedAmount:
                        updates.assignedAmount,
                    }
                  : {}),

                ...(updates.amountType !==
                undefined
                  ? {
                      amountType:
                        updates.amountType,
                    }
                  : {}),
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const updated =
              result.item.item;

            await refreshBudget();

            return createSuccess(
              updated,
            );
          },
        ),
      [
        handleActionError,
        handleApproval,
        refreshBudget,
        runMutation,
      ],
    );



  const deleteBudgetItem =
    useCallback(
      async (
        groupId:
          string,
        itemId:
          string,
      ) =>
        runMutation<
          BudgetCategoryData
        >(
          async () => {
            const currentLocation =
              findBudgetItemById(
                budgetGroups,
                itemId,
              );

            if (
              currentLocation &&
              currentLocation.group.id !==
                groupId
            ) {
              return handleActionError(
                "The selected budget item no longer belongs to that group. Refresh the budget and try again.",
              );
            }

            const result =
              await archiveBudgetItem({
                itemId,

                archived:
                  true,
              });

            if (
              !result.success
            ) {
              return handleActionError(
                result.error.message,
              );
            }

            if (
              result.approvalRequired
            ) {
              return handleApproval(
                result.approval,
              );
            }

            const archived =
              result.item.item;

            await refreshBudget();

            return createSuccess(
              archived,
            );
          },
        ),
      [
        budgetGroups,
        handleActionError,
        handleApproval,
        refreshBudget,
        runMutation,
      ],
    );

  const getBudgetItemById =
    useCallback(
      (
        itemId:
          string,
      ) =>
        findBudgetItemById(
          budgetGroups,
          itemId,
        ),
      [
        budgetGroups,
      ],
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

        isLoading,

        isMutating,

        error,

        pendingApproval,

        clearError,

        clearPendingApproval,

        refreshBudget,

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

        deleteBudgetItem,

        getBudgetItemById,
      }),
      [
        addBudgetGroup,
        addBudgetItem,
        addIncome,
        budgetGroups,
        budgetMonths,
        canCopyPreviousMonth,
        clearError,
        clearPendingApproval,
        copyPreviousMonth,
        createBlankBudget,
        deleteBudgetGroup,
        deleteBudgetItem,
        deleteIncome,
        error,
        getBudgetItemById,
        goToNextMonth,
        goToPreviousMonth,
        hasSelectedBudget,
        incomeSources,
        isLoading,
        isMutating,
        monthNavigation,
        navigateToMonth,
        pendingApproval,
        previousMonth,
        previousMonthKey,
        refreshBudget,
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
      value={
        value
      }
    >
      {
        children
      }
    </BudgetContext.Provider>
  );
}

function findBudgetItemById(
  budgetGroups:
    BudgetCategoryGroupData[],
  itemId:
    string,
): BudgetItemLocation | null {
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

    if (
      item
    ) {
      return {
        group,

        item,
      };
    }
  }

  return null;
}

export function useBudget() {
  const context =
    useContext(
      BudgetContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useBudget must be used within a BudgetProvider.",
    );
  }

  return context;
}
