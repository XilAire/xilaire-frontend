"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type GoalStatus =
  | "active"
  | "paused"
  | "completed";

export type GoalData = {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  targetDate?: string;
  status: GoalStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateGoalData = {
  name: string;
  currentAmount?: number;
  targetAmount: number;
  targetDate?: string;
  status?: GoalStatus;
  notes?: string;
};

export type UpdateGoalData = Partial<
  Omit<
    GoalData,
    "id" | "createdAt"
  >
>;

type GoalsContextValue = {
  goals: GoalData[];
  activeGoals: GoalData[];
  completedGoals: GoalData[];
  totalSaved: number;
  totalTarget: number;

  addGoal: (
    goal: CreateGoalData,
  ) => GoalData;

  updateGoal: (
    goalId: string,
    updates: UpdateGoalData,
  ) => void;

  deleteGoal: (
    goalId: string,
  ) => void;

  contributeToGoal: (
    goalId: string,
    amount: number,
  ) => void;

  getGoalById: (
    goalId: string,
  ) => GoalData | null;
};

export type GoalsProviderProps = {
  children: ReactNode;
  initialGoals?: GoalData[];
};

const GOALS_STORAGE_KEY =
  "case-budget:goals:v1";

const defaultGoals: GoalData[] =
  [];

const GoalsContext =
  createContext<
    GoalsContextValue | undefined
  >(undefined);

function createGoalId() {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return `goal-${crypto.randomUUID()}`;
  }

  return `goal-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
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

  return Math.round(
    value * 100,
  ) / 100;
}

function cloneGoals(
  goals: GoalData[],
) {
  return goals.map(
    (
      goal,
    ) => ({
      ...goal,
    }),
  );
}

function isGoalStatus(
  value: unknown,
): value is GoalStatus {
  return (
    value === "active" ||
    value === "paused" ||
    value === "completed"
  );
}

function isGoalData(
  value: unknown,
): value is GoalData {
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
    value as Partial<GoalData>;

  return (
    typeof candidate.id ===
      "string" &&
    typeof candidate.name ===
      "string" &&
    typeof candidate.currentAmount ===
      "number" &&
    Number.isFinite(
      candidate.currentAmount,
    ) &&
    typeof candidate.targetAmount ===
      "number" &&
    Number.isFinite(
      candidate.targetAmount,
    ) &&
    isGoalStatus(
      candidate.status,
    ) &&
    typeof candidate.createdAt ===
      "string" &&
    typeof candidate.updatedAt ===
      "string"
  );
}

function loadStoredGoals() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        GOALS_STORAGE_KEY,
      );

    if (!storedValue) {
      return null;
    }

    const parsedValue:
      unknown =
      JSON.parse(
        storedValue,
      );

    if (
      !Array.isArray(
        parsedValue,
      ) ||
      !parsedValue.every(
        isGoalData,
      )
    ) {
      window.localStorage.removeItem(
        GOALS_STORAGE_KEY,
      );

      return null;
    }

    return cloneGoals(
      parsedValue,
    );
  } catch {
    return null;
  }
}

export default function GoalsProvider({
  children,
  initialGoals = defaultGoals,
}: GoalsProviderProps) {
  const [
    goals,
    setGoals,
  ] = useState<GoalData[]>(
    () =>
      cloneGoals(
        initialGoals,
      ),
  );

  const [
    hasHydratedStorage,
    setHasHydratedStorage,
  ] = useState(
    false,
  );

  useEffect(
    () => {
      const storedGoals =
        loadStoredGoals();

      if (
        storedGoals
      ) {
        setGoals(
          storedGoals,
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

      try {
        window.localStorage.setItem(
          GOALS_STORAGE_KEY,
          JSON.stringify(
            goals,
          ),
        );
      } catch {
        // Local storage may be unavailable or full.
      }
    },
    [
      goals,
      hasHydratedStorage,
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
      (
        goal:
          CreateGoalData,
      ) => {
        const timestamp =
          new Date().toISOString();

        const currentAmount =
          normalizeCurrency(
            goal.currentAmount ??
            0,
          );

        const targetAmount =
          normalizeCurrency(
            goal.targetAmount,
          );

        const newGoal:
          GoalData = {
            id:
              createGoalId(),

            name:
              goal.name.trim(),

            currentAmount,

            targetAmount,

            targetDate:
              goal.targetDate,

            status:
              currentAmount >=
              targetAmount
                ? "completed"
                : goal.status ??
                  "active",

            notes:
              goal.notes?.trim() ||
              undefined,

            createdAt:
              timestamp,

            updatedAt:
              timestamp,
          };

        setGoals(
          (
            currentGoals,
          ) => [
            newGoal,
            ...currentGoals,
          ],
        );

        return newGoal;
      },
      [],
    );

  const updateGoal =
    useCallback(
      (
        goalId: string,
        updates:
          UpdateGoalData,
      ) => {
        setGoals(
          (
            currentGoals,
          ) =>
            currentGoals.map(
              (
                goal,
              ) => {
                if (
                  goal.id !==
                  goalId
                ) {
                  return goal;
                }

                const nextCurrentAmount =
                  updates.currentAmount ===
                  undefined
                    ? goal.currentAmount
                    : normalizeCurrency(
                        updates.currentAmount,
                      );

                const nextTargetAmount =
                  updates.targetAmount ===
                  undefined
                    ? goal.targetAmount
                    : normalizeCurrency(
                        updates.targetAmount,
                      );

                return {
                  ...goal,
                  ...updates,

                  id:
                    goal.id,

                  name:
                    updates.name?.trim() ||
                    goal.name,

                  currentAmount:
                    nextCurrentAmount,

                  targetAmount:
                    nextTargetAmount,

                  status:
                    nextCurrentAmount >=
                    nextTargetAmount
                      ? "completed"
                      : updates.status ??
                        goal.status,

                  notes:
                    updates.notes ===
                    undefined
                      ? goal.notes
                      : updates.notes.trim() ||
                        undefined,

                  createdAt:
                    goal.createdAt,

                  updatedAt:
                    new Date().toISOString(),
                };
              },
            ),
        );
      },
      [],
    );

  const deleteGoal =
    useCallback(
      (
        goalId: string,
      ) => {
        setGoals(
          (
            currentGoals,
          ) =>
            currentGoals.filter(
              (
                goal,
              ) =>
                goal.id !==
                goalId,
            ),
        );
      },
      [],
    );

  const contributeToGoal =
    useCallback(
      (
        goalId: string,
        amount: number,
      ) => {
        if (
          !Number.isFinite(
            amount,
          ) ||
          amount === 0
        ) {
          return;
        }

        setGoals(
          (
            currentGoals,
          ) =>
            currentGoals.map(
              (
                goal,
              ) => {
                if (
                  goal.id !==
                  goalId
                ) {
                  return goal;
                }

                const nextAmount =
                  normalizeCurrency(
                    Math.max(
                      0,
                      goal.currentAmount +
                      amount,
                    ),
                  );

                return {
                  ...goal,

                  currentAmount:
                    nextAmount,

                  status:
                    nextAmount >=
                    goal.targetAmount
                      ? "completed"
                      : goal.status ===
                        "completed"
                        ? "active"
                        : goal.status,

                  updatedAt:
                    new Date().toISOString(),
                };
              },
            ),
        );
      },
      [],
    );

  const getGoalById =
    useCallback(
      (
        goalId: string,
      ) => {
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
        getGoalById,
        goals,
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

  if (!context) {
    throw new Error(
      "useGoals must be used within a GoalsProvider.",
    );
  }

  return context;
}