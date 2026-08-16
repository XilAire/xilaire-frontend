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
  archiveGoal,
} from "@/actions/goals/archive-goal";

import {
  contributeToGoal as contributeToGoalAction,
} from "@/actions/goals/contribute-to-goal";

import {
  createGoal,
} from "@/actions/goals/create-goal";

import {
  getGoals,
} from "@/actions/goals/get-goals";

import {
  updateGoal as updateGoalAction,
} from "@/actions/goals/update-goal";

import {
  useApp,
} from "@/components/providers/AppProvider";

import type {
  ArchiveGoalResult,
  ContributeToGoalResult,
  CreateGoalData,
  CreateGoalResult,
  GetGoalsResult,
  GoalData,
  UpdateGoalData,
  UpdateGoalResult,
} from "@/types/goal";

export type {
  CreateGoalData,
  GoalData,
  GoalStatus,
  UpdateGoalData,
} from "@/types/goal";

type GoalsContextValue = {
  goals:
    GoalData[];

  activeGoals:
    GoalData[];

  completedGoals:
    GoalData[];

  totalSaved:
    number;

  totalTarget:
    number;

  isLoading:
    boolean;

  error:
    string | null;

  refreshGoals:
    () => Promise<void>;

  addGoal:
    (
      goal:
        CreateGoalData,
    ) => Promise<CreateGoalResult>;

  updateGoal:
    (
      goalId:
        string,
      updates:
        UpdateGoalData,
    ) => Promise<UpdateGoalResult>;

  deleteGoal:
    (
      goalId:
        string,
    ) => Promise<ArchiveGoalResult>;

  contributeToGoal:
    (
      goalId:
        string,
      amount:
        number,
    ) => Promise<ContributeToGoalResult>;

  getGoalById:
    (
      goalId:
        string,
    ) => GoalData | null;
};

export type GoalsProviderProps = {
  children:
    ReactNode;

  initialGoals?:
    GoalData[];
};

const defaultGoals:
  GoalData[] =
  [];

const GoalsContext =
  createContext<
    GoalsContextValue | undefined
  >(
    undefined,
  );

function normalizeCurrency(
  value:
    number,
): number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}

function cloneGoals(
  goals:
    GoalData[],
): GoalData[] {
  return goals.map(
    (
      goal,
    ) => ({
      ...goal,
    }),
  );
}

function getResultError(
  result:
    | GetGoalsResult
    | CreateGoalResult
    | UpdateGoalResult
    | ArchiveGoalResult
    | ContributeToGoalResult,
): string | null {
  return result.success
    ? null
    : result.error;
}

/**
 * Production Goals provider.
 *
 * Supabase is the canonical persistence layer.
 *
 * This provider intentionally does not:
 *
 * - generate goal IDs in the browser,
 * - hydrate financial data from localStorage,
 * - persist financial data to localStorage,
 * - accept workspace IDs from client components.
 *
 * The server actions resolve the authenticated user and active workspace.
 */
export default function GoalsProvider({
  children,
  initialGoals = defaultGoals,
}: GoalsProviderProps) {
  const {
    activeWorkspaceId,
  } =
    useApp();

  const workspaceId =
    activeWorkspaceId ||
    null;

  const [
    goals,
    setGoals,
  ] =
    useState<
      GoalData[]
    >(
      () =>
        cloneGoals(
          initialGoals,
        ),
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
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

  /**
   * Prevent a slower request for a previous workspace from replacing state
   * after the user switches workspaces.
   */
  const requestVersionRef =
    useRef(
      0,
    );

  const refreshGoals =
    useCallback(
      async () => {
        const requestVersion =
          ++requestVersionRef.current;

        setIsLoading(
          true,
        );

        setError(
          null,
        );

        try {
          const result =
            await getGoals();

          if (
            requestVersion !==
            requestVersionRef.current
          ) {
            return;
          }

          if (
            !result.success
          ) {
            setGoals(
              [],
            );

            setError(
              result.error,
            );

            return;
          }

          setGoals(
            cloneGoals(
              result.goals,
            ),
          );
        } catch (
          refreshError
        ) {
          if (
            requestVersion !==
            requestVersionRef.current
          ) {
            return;
          }

          console.error(
            "[CASE Budget Goals] Failed to refresh goals.",
            refreshError,
          );

          setGoals(
            [],
          );

          setError(
            "CASE Budget could not load goals. Please try again.",
          );
        } finally {
          if (
            requestVersion ===
            requestVersionRef.current
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
      /**
       * Any workspace change invalidates the prior request immediately.
       */
      requestVersionRef.current +=
        1;

      if (
        !workspaceId
      ) {
        setGoals(
          [],
        );

        setError(
          null,
        );

        setIsLoading(
          false,
        );

        return;
      }

      void refreshGoals();
    },
    [
      refreshGoals,
      workspaceId,
    ],
  );

  const activeGoals =
    useMemo(
      () =>
        goals.filter(
          (
            goal,
          ) =>
            goal.status ===
            "active",
        ),
      [
        goals,
      ],
    );

  const completedGoals =
    useMemo(
      () =>
        goals.filter(
          (
            goal,
          ) =>
            goal.status ===
            "completed",
        ),
      [
        goals,
      ],
    );

  const totalSaved =
    useMemo(
      () =>
        normalizeCurrency(
          goals.reduce(
            (
              total,
              goal,
            ) =>
              total +
              goal.currentAmount,
            0,
          ),
        ),
      [
        goals,
      ],
    );

  const totalTarget =
    useMemo(
      () =>
        normalizeCurrency(
          goals.reduce(
            (
              total,
              goal,
            ) =>
              total +
              goal.targetAmount,
            0,
          ),
        ),
      [
        goals,
      ],
    );

  const addGoal =
    useCallback(
      async (
        goal:
          CreateGoalData,
      ): Promise<CreateGoalResult> => {
        setError(
          null,
        );

        try {
          const result =
            await createGoal(
              goal,
            );

          const resultError =
            getResultError(
              result,
            );

          if (
            resultError
          ) {
            setError(
              resultError,
            );

            return result;
          }

          if (
            !result.success
          ) {
            return result;
          }

          setGoals(
            (
              currentGoals,
            ) => [
              {
                ...result.goal,
              },
              ...currentGoals.filter(
                (
                  currentGoal,
                ) =>
                  currentGoal.id !==
                  result.goal.id,
              ),
            ],
          );

          return result;
        } catch (
          mutationError
        ) {
          console.error(
            "[CASE Budget Goals] Failed to create goal.",
            mutationError,
          );

          const message =
            "CASE Budget could not create the goal. Please try again.";

          setError(
            message,
          );

          return {
            success:
              false,

            error:
              message,
          };
        }
      },
      [],
    );

  const updateGoal =
    useCallback(
      async (
        goalId:
          string,
        updates:
          UpdateGoalData,
      ): Promise<UpdateGoalResult> => {
        setError(
          null,
        );

        try {
          const result =
            await updateGoalAction(
              {
                goalId,
                updates,
              },
            );

          const resultError =
            getResultError(
              result,
            );

          if (
            resultError
          ) {
            setError(
              resultError,
            );

            return result;
          }

          if (
            !result.success
          ) {
            return result;
          }

          setGoals(
            (
              currentGoals,
            ) =>
              currentGoals.map(
                (
                  currentGoal,
                ) =>
                  currentGoal.id ===
                  result.goal.id
                    ? {
                        ...result.goal,
                      }
                    : currentGoal,
              ),
          );

          return result;
        } catch (
          mutationError
        ) {
          console.error(
            "[CASE Budget Goals] Failed to update goal.",
            mutationError,
          );

          const message =
            "CASE Budget could not update the goal. Please try again.";

          setError(
            message,
          );

          return {
            success:
              false,

            error:
              message,
          };
        }
      },
      [],
    );

  const deleteGoal =
    useCallback(
      async (
        goalId:
          string,
      ): Promise<ArchiveGoalResult> => {
        setError(
          null,
        );

        try {
          const result =
            await archiveGoal(
              {
                goalId,
                archived:
                  true,
              },
            );

          const resultError =
            getResultError(
              result,
            );

          if (
            resultError
          ) {
            setError(
              resultError,
            );

            return result;
          }

          if (
            !result.success
          ) {
            return result;
          }

          if (
            result.archived
          ) {
            setGoals(
              (
                currentGoals,
              ) =>
                currentGoals.filter(
                  (
                    currentGoal,
                  ) =>
                    currentGoal.id !==
                    result.goal.id,
                ),
            );
          } else {
            setGoals(
              (
                currentGoals,
              ) => [
                {
                  ...result.goal,
                },
                ...currentGoals.filter(
                  (
                    currentGoal,
                  ) =>
                    currentGoal.id !==
                    result.goal.id,
                ),
              ],
            );
          }

          return result;
        } catch (
          mutationError
        ) {
          console.error(
            "[CASE Budget Goals] Failed to archive goal.",
            mutationError,
          );

          const message =
            "CASE Budget could not remove the goal. Please try again.";

          setError(
            message,
          );

          return {
            success:
              false,

            error:
              message,
          };
        }
      },
      [],
    );

  const contributeToGoal =
    useCallback(
      async (
        goalId:
          string,
        amount:
          number,
      ): Promise<ContributeToGoalResult> => {
        setError(
          null,
        );

        try {
          const result =
            await contributeToGoalAction(
              {
                goalId,
                amount,
              },
            );

          const resultError =
            getResultError(
              result,
            );

          if (
            resultError
          ) {
            setError(
              resultError,
            );

            return result;
          }

          if (
            !result.success
          ) {
            return result;
          }

          setGoals(
            (
              currentGoals,
            ) =>
              currentGoals.map(
                (
                  currentGoal,
                ) =>
                  currentGoal.id ===
                  result.goal.id
                    ? {
                        ...result.goal,
                      }
                    : currentGoal,
              ),
          );

          return result;
        } catch (
          mutationError
        ) {
          console.error(
            "[CASE Budget Goals] Failed to contribute to goal.",
            mutationError,
          );

          const message =
            "CASE Budget could not update the goal balance. Please try again.";

          setError(
            message,
          );

          return {
            success:
              false,

            error:
              message,
          };
        }
      },
      [],
    );

  const getGoalById =
    useCallback(
      (
        goalId:
          string,
      ): GoalData | null => {
        return (
          goals.find(
            (
              goal,
            ) =>
              goal.id ===
              goalId,
          ) ??
          null
        );
      },
      [
        goals,
      ],
    );

  const value =
    useMemo<GoalsContextValue>(
      () => ({
        goals,
        activeGoals,
        completedGoals,
        totalSaved,
        totalTarget,
        isLoading,
        error,
        refreshGoals,
        addGoal,
        updateGoal,
        deleteGoal,
        contributeToGoal,
        getGoalById,
      }),
      [
        activeGoals,
        addGoal,
        completedGoals,
        contributeToGoal,
        deleteGoal,
        error,
        getGoalById,
        goals,
        isLoading,
        refreshGoals,
        totalSaved,
        totalTarget,
        updateGoal,
      ],
    );

  return (
    <GoalsContext.Provider
      value={
        value
      }
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context =
    useContext(
      GoalsContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useGoals must be used within a GoalsProvider.",
    );
  }

  return context;
}
