/**
 * CASE Budget goal domain types.
 *
 * File:
 * apps/case-budget/types/goal.ts
 *
 * Shared application-level contracts for workspace-scoped savings goals.
 *
 * Database row types remain in:
 *
 * apps/case-budget/types/database.ts
 *
 * This file represents the normalized shapes consumed by React providers,
 * server actions, dashboard components, reporting, and goal-planning features.
 */

export type GoalStatus =
  | "active"
  | "paused"
  | "completed";

/**
 * Canonical application goal record.
 *
 * Workspace and user ownership remain server-side concerns and are
 * intentionally not exposed through this UI-facing domain model.
 */
export type GoalData = {
  id:
    string;

  name:
    string;

  currentAmount:
    number;

  targetAmount:
    number;

  targetDate?:
    string;

  status:
    GoalStatus;

  notes?:
    string;

  createdAt:
    string;

  updatedAt:
    string;
};

/**
 * Input accepted when creating a goal.
 *
 * currentAmount defaults to zero.
 * status defaults to active unless the current amount already satisfies the
 * target amount, in which case the server derives completed.
 */
export type CreateGoalData = {
  name:
    string;

  currentAmount?:
    number;

  targetAmount:
    number;

  targetDate?:
    string;

  status?:
    GoalStatus;

  notes?:
    string;
};

/**
 * Fields that may be changed on an existing goal.
 *
 * id and createdAt remain immutable.
 * updatedAt is controlled by the server/database.
 */
export type UpdateGoalData = Partial<
  Omit<
    GoalData,
    | "id"
    | "createdAt"
    | "updatedAt"
  >
>;

/**
 * Input used when adding or removing money from a goal.
 *
 * Positive amounts add money.
 * Negative amounts remove money.
 *
 * The server clamps the resulting current amount to zero so a goal can never
 * persist a negative saved balance.
 */
export type ContributeToGoalData = {
  goalId:
    string;

  amount:
    number;
};

/**
 * Read model returned by the production goals loader.
 */
export type GoalWorkspaceData = {
  goals:
    GoalData[];
};

/**
 * Result contracts shared by server actions.
 */
export type GetGoalsResult =
  | {
      success:
        true;

      goals:
        GoalData[];
    }
  | {
      success:
        false;

      error:
        string;
    };

export type CreateGoalResult =
  | {
      success:
        true;

      goal:
        GoalData;
    }
  | {
      success:
        false;

      error:
        string;

      fieldErrors?:
        Partial<
          Record<
            keyof CreateGoalData,
            string
          >
        >;
    };

export type UpdateGoalResult =
  | {
      success:
        true;

      goal:
        GoalData;
    }
  | {
      success:
        false;

      error:
        string;

      fieldErrors?:
        Partial<
          Record<
            keyof UpdateGoalData,
            string
          >
        >;
    };

/**
 * Goal deletion in the production application is implemented as a soft
 * archive so the historical record remains available in Supabase.
 */
export type ArchiveGoalResult =
  | {
      success:
        true;

      goal:
        GoalData;

      archived:
        boolean;
    }
  | {
      success:
        false;

      error:
        string;
    };

export type ContributeToGoalResult =
  | {
      success:
        true;

      goal:
        GoalData;
    }
  | {
      success:
        false;

      error:
        string;

      fieldErrors?:
        Partial<
          Record<
            keyof ContributeToGoalData,
            string
          >
        >;
    };

/**
 * Narrow runtime helpers used by actions/providers when normalizing database
 * or external values.
 */
export function isGoalStatus(
  value:
    unknown,
): value is GoalStatus {
  return (
    value ===
      "active" ||
    value ===
      "paused" ||
    value ===
      "completed"
  );
}
