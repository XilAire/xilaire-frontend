"use server";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  BudgetAmountType,
  BudgetCategoryData,
  BudgetCategoryGroupData,
  BudgetIncomeSource,
  BudgetIncomeStatus,
  BudgetMonthData,
  BudgetMonthsByKey,
} from "@/types/budget";

import type {
  CaseBudgetBudgetGroupDatabaseRow,
  CaseBudgetBudgetIncomeSourceDatabaseRow,
  CaseBudgetBudgetItemDatabaseRow,
  CaseBudgetBudgetMonthDatabaseRow,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

type WorkspaceRow = {
  id:
    string;

  owner_user_id:
    string;

  is_active:
    boolean;
};

type MembershipRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  role:
    WorkspaceRoleDatabaseEnum;

  status:
    WorkspaceMembershipStatusDatabaseEnum;
};

type BudgetItemRowWithAmountType =
  CaseBudgetBudgetItemDatabaseRow & {
    amount_type:
      unknown;
  };

export type CaseBudgetBudgetMonthRecord = {
  id:
    string;

  workspaceId:
    string;

  monthKey:
    string;

  budgetMonth:
    string;

  name:
    string | null;

  plannedIncome:
    number;

  actualIncome:
    number;

  startingBalance:
    number;

  isClosed:
    boolean;

  closedAt:
    string | null;

  closedByUserId:
    string | null;

  note:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;

  incomeSources:
    BudgetIncomeSource[];

  budgetGroups:
    BudgetCategoryGroupData[];
};

export type GetCaseBudgetResult =
  | {
      success:
        true;

      budgetMonths:
        BudgetMonthsByKey;

      months:
        CaseBudgetBudgetMonthRecord[];

      selectedMonthKey:
        string | null;

      error:
        null;
    }
  | {
      success:
        false;

      budgetMonths:
        {};

      months:
        [];

      selectedMonthKey:
        null;

      error: {
        code:
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "budget-load-failed"
          | "unexpected-error";

        message:
          string;
      };
    };

const MONTH_SELECT =
  [
    "id",
    "workspace_id",
    "created_by_user_id",
    "updated_by_user_id",
    "budget_month",
    "name",
    "planned_income",
    "actual_income",
    "starting_balance",
    "is_closed",
    "closed_at",
    "closed_by_user_id",
    "note",
    "created_at",
    "updated_at",
  ].join(
    ",",
  );

const INCOME_SOURCE_SELECT =
  [
    "id",
    "workspace_id",
    "budget_month_id",
    "created_by_user_id",
    "updated_by_user_id",
    "name",
    "planned_amount",
    "received_amount",
    "sort_order",
    "is_archived",
    "archived_at",
    "archived_by_user_id",
    "created_at",
    "updated_at",
  ].join(
    ",",
  );

const GROUP_SELECT =
  [
    "id",
    "workspace_id",
    "budget_month_id",
    "created_by_user_id",
    "updated_by_user_id",
    "name",
    "description",
    "sort_order",
    "is_collapsed",
    "is_archived",
    "archived_at",
    "archived_by_user_id",
    "created_at",
    "updated_at",
  ].join(
    ",",
  );

const ITEM_SELECT =
  [
    "id",
    "workspace_id",
    "budget_month_id",
    "budget_group_id",
    "created_by_user_id",
    "updated_by_user_id",
    "name",
    "description",
    "amount_type",
    "planned_amount",
    "activity_amount",
    "available_amount",
    "rollover_amount",
    "rollover_enabled",
    "target_amount",
    "target_date",
    "is_recurring",
    "sort_order",
    "is_archived",
    "archived_at",
    "archived_by_user_id",
    "created_at",
    "updated_at",
  ].join(
    ",",
  );

/**
 * Loads the complete canonical CASE Budget budget hierarchy for the
 * currently active workspace.
 *
 * Production rules:
 *
 * - workspace_id is never accepted from the browser.
 * - The active workspace is resolved from trusted server-side auth state.
 * - The caller must have an active workspace membership.
 * - Viewer may read budget data.
 * - Archived income sources, groups, and items are excluded from the active
 *   budget model.
 * - Supabase is the only persistence source.
 * - The result maps back to the existing BudgetMonthsByKey UI contract.
 * - No localStorage is read or written.
 *
 * Database hierarchy:
 *
 * case_budget_budget_months
 *   ├── case_budget_budget_income_sources
 *   └── case_budget_budget_groups
 *         └── case_budget_budget_items
 */
export async function getBudget(): Promise<GetCaseBudgetResult> {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const workspaceResult =
      await loadWorkspace({
        workspaceId,
      });

    if (
      !workspaceResult.success
    ) {
      return failure({
        code:
          workspaceResult.code,

        message:
          workspaceResult.message,
      });
    }

    const membershipResult =
      await loadMembership({
        workspaceId,
        userId,
      });

    if (
      !membershipResult.success
    ) {
      return failure({
        code:
          "permission-denied",

        message:
          membershipResult.message,
      });
    }

    const admin =
      createWorkspaceAdminClient();

    /*
     * Load months first so we can return quickly when a workspace has no
     * budget history and avoid unnecessary child-table queries.
     */
    const {
      data:
        monthData,
      error:
        monthError,
    } =
      await admin
        .from(
          "case_budget_budget_months",
        )
        .select(
          MONTH_SELECT,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .order(
          "budget_month",
          {
            ascending:
              true,
          },
        );

    if (
      monthError
    ) {
      console.error(
        "[CASE Budget Budget] Failed to load budget months.",
        {
          workspaceId,
          userId,
          error:
            monthError,
        },
      );

      return failure({
        code:
          "budget-load-failed",

        message:
          "CASE Budget could not load the budget months for this workspace.",
      });
    }

    const monthRows =
      (
        monthData ??
        []
      ) as unknown as
        CaseBudgetBudgetMonthDatabaseRow[];

    if (
      monthRows.length ===
      0
    ) {
      return {
        success:
          true,

        budgetMonths:
          {},

        months:
          [],

        selectedMonthKey:
          null,

        error:
          null,
      };
    }

    /*
     * Child queries are independent once the workspace is known, so they can
     * be loaded concurrently.
     */
    const [
      incomeResult,
      groupResult,
      itemResult,
    ] =
      await Promise.all([
        admin
          .from(
            "case_budget_budget_income_sources",
          )
          .select(
            INCOME_SOURCE_SELECT,
          )
          .eq(
            "workspace_id",
            workspaceId,
          )
          .eq(
            "is_archived",
            false,
          )
          .order(
            "sort_order",
            {
              ascending:
                true,
            },
          )
          .order(
            "name",
            {
              ascending:
                true,
            },
          ),

        admin
          .from(
            "case_budget_budget_groups",
          )
          .select(
            GROUP_SELECT,
          )
          .eq(
            "workspace_id",
            workspaceId,
          )
          .eq(
            "is_archived",
            false,
          )
          .order(
            "sort_order",
            {
              ascending:
                true,
            },
          )
          .order(
            "name",
            {
              ascending:
                true,
            },
          ),

        admin
          .from(
            "case_budget_budget_items",
          )
          .select(
            ITEM_SELECT,
          )
          .eq(
            "workspace_id",
            workspaceId,
          )
          .eq(
            "is_archived",
            false,
          )
          .order(
            "sort_order",
            {
              ascending:
                true,
            },
          )
          .order(
            "name",
            {
              ascending:
                true,
            },
          ),
      ]);

    if (
      incomeResult.error ||
      groupResult.error ||
      itemResult.error
    ) {
      console.error(
        "[CASE Budget Budget] Failed to load budget hierarchy.",
        {
          workspaceId,
          userId,

          incomeError:
            incomeResult.error,

          groupError:
            groupResult.error,

          itemError:
            itemResult.error,
        },
      );

      return failure({
        code:
          "budget-load-failed",

        message:
          "CASE Budget could not load the complete budget for this workspace.",
      });
    }

    const incomeRows =
      (
        incomeResult.data ??
        []
      ) as unknown as
        CaseBudgetBudgetIncomeSourceDatabaseRow[];

    const groupRows =
      (
        groupResult.data ??
        []
      ) as unknown as
        CaseBudgetBudgetGroupDatabaseRow[];

    const itemRows =
      (
        itemResult.data ??
        []
      ) as unknown as
        BudgetItemRowWithAmountType[];

    const incomeByMonthId =
      buildIncomeByMonthId(
        incomeRows,
      );

    const itemsByGroupId =
      buildItemsByGroupId(
        itemRows,
      );

    const groupsByMonthId =
      buildGroupsByMonthId({
        groups:
          groupRows,

        itemsByGroupId,
      });

    const months =
      monthRows
        .map(
          (
            month,
          ) =>
            mapMonthRow({
              month,

              incomeSources:
                incomeByMonthId.get(
                  month.id,
                ) ??
                [],

              budgetGroups:
                groupsByMonthId.get(
                  month.id,
                ) ??
                [],
            }),
        )
        .filter(
          (
            month,
          ): month is CaseBudgetBudgetMonthRecord =>
            month !==
            null,
        );

    const budgetMonths =
      months.reduce<
        BudgetMonthsByKey
      >(
        (
          result,
          month,
        ) => {
          result[
            month.monthKey
          ] = {
            monthKey:
              month.monthKey,

            incomeSources:
              cloneIncomeSources(
                month.incomeSources,
              ),

            budgetGroups:
              cloneBudgetGroups(
                month.budgetGroups,
              ),
          };

          return result;
        },
        {},
      );

    return {
      success:
        true,

      budgetMonths,

      months,

      selectedMonthKey:
        resolveDefaultSelectedMonthKey(
          months,
        ),

      error:
        null,
    };
  } catch (
    error
  ) {
    if (
      error instanceof
      CaseBudgetServerAuthError
    ) {
      return failure({
        code:
          error.code ===
          "workspace-required"
            ? "workspace-not-found"
            : "permission-denied",

        message:
          error.message,
      });
    }

    console.error(
      "[CASE Budget Budget] Unexpected budget-loading error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not load the budget. Please try again.",
    });
  }
}

async function loadWorkspace({
  workspaceId,
}: {
  workspaceId:
    string;
}):
  Promise<
    | {
        success:
          true;

        workspace:
          WorkspaceRow;
      }
    | {
        success:
          false;

        code:
          "workspace-not-found" |
          "workspace-inactive";

        message:
          string;
      }
  > {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "workspaces",
      )
      .select(
        "id,owner_user_id,is_active",
      )
      .eq(
        "id",
        workspaceId,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Budget] Failed to load active workspace.",
      {
        workspaceId,
        error,
      },
    );

    return {
      success:
        false,

      code:
        "workspace-not-found",

      message:
        "CASE Budget could not load the active workspace.",
    };
  }

  const workspace =
    data as unknown as
      | WorkspaceRow
      | null;

  if (
    !workspace
  ) {
    return {
      success:
        false,

      code:
        "workspace-not-found",

      message:
        "The active CASE Budget workspace could not be found.",
    };
  }

  if (
    !workspace.is_active
  ) {
    return {
      success:
        false,

      code:
        "workspace-inactive",

      message:
        "Budget data is unavailable while this workspace is inactive.",
    };
  }

  return {
    success:
      true,

    workspace,
  };
}

async function loadMembership({
  workspaceId,
  userId,
}: {
  workspaceId:
    string;

  userId:
    string;
}):
  Promise<
    | {
        success:
          true;

        membership:
          MembershipRow;
      }
    | {
        success:
          false;

        message:
          string;
      }
  > {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "workspace_members",
      )
      .select(
        "id,workspace_id,user_id,role,status",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Budget] Failed to verify workspace membership.",
      {
        workspaceId,
        userId,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not verify your workspace access.",
    };
  }

  const membership =
    data as unknown as
      | MembershipRow
      | null;

  if (
    !membership ||
    membership.status !==
      "active"
  ) {
    return {
      success:
        false,

      message:
        "You do not have active access to this workspace's budget.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

function buildIncomeByMonthId(
  rows:
    CaseBudgetBudgetIncomeSourceDatabaseRow[],
) {
  const result =
    new Map<
      string,
      BudgetIncomeSource[]
    >();

  for (
    const row of
      rows
  ) {
    if (
      row.is_archived
    ) {
      continue;
    }

    const income =
      mapIncomeSourceRow(
        row,
      );

    if (
      !income
    ) {
      continue;
    }

    const current =
      result.get(
        row.budget_month_id,
      ) ??
      [];

    current.push(
      income,
    );

    result.set(
      row.budget_month_id,
      current,
    );
  }

  return result;
}

function buildItemsByGroupId(
  rows:
    BudgetItemRowWithAmountType[],
) {
  const result =
    new Map<
      string,
      BudgetCategoryData[]
    >();

  for (
    const row of
      rows
  ) {
    if (
      row.is_archived
    ) {
      continue;
    }

    const item =
      mapBudgetItemRow(
        row,
      );

    if (
      !item
    ) {
      continue;
    }

    const current =
      result.get(
        row.budget_group_id,
      ) ??
      [];

    current.push(
      item,
    );

    result.set(
      row.budget_group_id,
      current,
    );
  }

  return result;
}

function buildGroupsByMonthId({
  groups,
  itemsByGroupId,
}: {
  groups:
    CaseBudgetBudgetGroupDatabaseRow[];

  itemsByGroupId:
    Map<
      string,
      BudgetCategoryData[]
    >;
}) {
  const result =
    new Map<
      string,
      BudgetCategoryGroupData[]
    >();

  for (
    const row of
      groups
  ) {
    if (
      row.is_archived
    ) {
      continue;
    }

    const group =
      mapBudgetGroupRow({
        row,

        categories:
          itemsByGroupId.get(
            row.id,
          ) ??
          [],
      });

    if (
      !group
    ) {
      continue;
    }

    const current =
      result.get(
        row.budget_month_id,
      ) ??
      [];

    current.push(
      group,
    );

    result.set(
      row.budget_month_id,
      current,
    );
  }

  return result;
}

function mapMonthRow({
  month,
  incomeSources,
  budgetGroups,
}: {
  month:
    CaseBudgetBudgetMonthDatabaseRow;

  incomeSources:
    BudgetIncomeSource[];

  budgetGroups:
    BudgetCategoryGroupData[];
}): CaseBudgetBudgetMonthRecord | null {
  const monthId =
    normalizeOptionalText(
      month.id,
    );

  const workspaceId =
    normalizeOptionalText(
      month.workspace_id,
    );

  const budgetMonth =
    normalizeDatabaseDate(
      month.budget_month,
    );

  const createdAt =
    normalizeIsoTimestamp(
      month.created_at,
    );

  const updatedAt =
    normalizeIsoTimestamp(
      month.updated_at,
    );

  if (
    !monthId ||
    !workspaceId ||
    !budgetMonth ||
    !createdAt ||
    !updatedAt
  ) {
    console.error(
      "[CASE Budget Budget] Ignoring malformed budget month row.",
      {
        monthId:
          month.id,
        workspaceId:
          month.workspace_id,
        budgetMonth:
          month.budget_month,
      },
    );

    return null;
  }

  const plannedIncome =
    normalizeDatabaseMoney(
      month.planned_income,
    );

  const actualIncome =
    normalizeDatabaseMoney(
      month.actual_income,
    );

  const startingBalance =
    normalizeDatabaseMoney(
      month.starting_balance,
    );

  if (
    plannedIncome ===
      null ||
    actualIncome ===
      null ||
    startingBalance ===
      null
  ) {
    return null;
  }

  return {
    id:
      monthId,

    workspaceId,

    monthKey:
      budgetMonth.slice(
        0,
        7,
      ),

    budgetMonth,

    name:
      normalizeOptionalText(
        month.name,
      ),

    plannedIncome,

    actualIncome,

    startingBalance,

    isClosed:
      Boolean(
        month.is_closed,
      ),

    closedAt:
      normalizeNullableIsoTimestamp(
        month.closed_at,
      ),

    closedByUserId:
      normalizeOptionalText(
        month.closed_by_user_id,
      ),

    note:
      normalizeOptionalText(
        month.note,
      ),

    createdAt,

    updatedAt,

    incomeSources:
      cloneIncomeSources(
        incomeSources,
      ),

    budgetGroups:
      cloneBudgetGroups(
        budgetGroups,
      ),
  };
}

function mapIncomeSourceRow(
  row:
    CaseBudgetBudgetIncomeSourceDatabaseRow,
): BudgetIncomeSource | null {
  const id =
    normalizeOptionalText(
      row.id,
    );

  const name =
    normalizeOptionalText(
      row.name,
    );

  const plannedAmount =
    normalizeNonNegativeDatabaseMoney(
      row.planned_amount,
    );

  const receivedAmount =
    normalizeNonNegativeDatabaseMoney(
      row.received_amount,
    );

  if (
    !id ||
    !name ||
    plannedAmount ===
      null ||
    receivedAmount ===
      null
  ) {
    console.error(
      "[CASE Budget Budget] Ignoring malformed income-source row.",
      {
        incomeSourceId:
          row.id,
        budgetMonthId:
          row.budget_month_id,
      },
    );

    return null;
  }

  return {
    id,

    name,

    amount:
      plannedAmount,

    receivedAmount,

    status:
      getIncomeStatus(
        plannedAmount,
        receivedAmount,
      ),
  };
}

function mapBudgetGroupRow({
  row,
  categories,
}: {
  row:
    CaseBudgetBudgetGroupDatabaseRow;

  categories:
    BudgetCategoryData[];
}): BudgetCategoryGroupData | null {
  const id =
    normalizeOptionalText(
      row.id,
    );

  const name =
    normalizeOptionalText(
      row.name,
    );

  if (
    !id ||
    !name
  ) {
    console.error(
      "[CASE Budget Budget] Ignoring malformed budget-group row.",
      {
        groupId:
          row.id,
        budgetMonthId:
          row.budget_month_id,
      },
    );

    return null;
  }

  const description =
    normalizeOptionalText(
      row.description,
    );

  return {
    id,

    name,

    ...(description
      ? {
          description,
        }
      : {}),

    categories:
      categories.map(
        (
          category,
        ) => ({
          ...category,
        }),
      ),
  };
}

function mapBudgetItemRow(
  row:
    BudgetItemRowWithAmountType,
): BudgetCategoryData | null {
  const id =
    normalizeOptionalText(
      row.id,
    );

  const name =
    normalizeOptionalText(
      row.name,
    );

  const amountType =
    normalizeBudgetAmountType(
      row.amount_type,
    );

  const assignedAmount =
    normalizeNonNegativeDatabaseMoney(
      row.planned_amount,
    );

  const activityAmount =
    normalizeNonNegativeDatabaseMoney(
      row.activity_amount,
    );

  const availableAmount =
    normalizeDatabaseMoney(
      row.available_amount,
    );

  const rolloverAmount =
    normalizeDatabaseMoney(
      row.rollover_amount,
    );

  if (
    !id ||
    !name ||
    !amountType ||
    assignedAmount ===
      null ||
    activityAmount ===
      null ||
    availableAmount ===
      null ||
    rolloverAmount ===
      null
  ) {
    console.error(
      "[CASE Budget Budget] Ignoring malformed budget-item row.",
      {
        itemId:
          row.id,
        groupId:
          row.budget_group_id,
        budgetMonthId:
          row.budget_month_id,
      },
    );

    return null;
  }

  /*
   * BudgetCategoryData exposes the canonical persisted financial state used by
   * the budget UI.
   *
   * Database -> UI mapping:
   *
   * planned_amount   -> assignedAmount
   * activity_amount  -> spentAmount
   * rollover_amount  -> rolloverAmount
   * available_amount -> availableAmount
   *
   * activity_amount is maintained server-side from the canonical non-deleted
   * expense transaction ledger. available_amount is maintained server-side as:
   *
   *   planned_amount + rollover_amount - activity_amount
   *
   * Do not recompute either value here. The read path validates and surfaces
   * the persisted Supabase values exactly as the UI contract expects.
   */
  const spentAmount =
    activityAmount;

  return {
    id,

    name,

    amountType,

    assignedAmount,

    spentAmount,

    rolloverAmount,

    availableAmount,
  };
}

function resolveDefaultSelectedMonthKey(
  months:
    CaseBudgetBudgetMonthRecord[],
) {
  if (
    months.length ===
    0
  ) {
    return null;
  }

  const currentMonthKey =
    createCurrentMonthKey();

  if (
    months.some(
      (
        month,
      ) =>
        month.monthKey ===
        currentMonthKey,
    )
  ) {
    return currentMonthKey;
  }

  const sortedMonthKeys =
    months
      .map(
        (
          month,
        ) =>
          month.monthKey,
      )
      .sort();

  const earlierOrCurrent =
    sortedMonthKeys.filter(
      (
        monthKey,
      ) =>
        monthKey <=
        currentMonthKey,
    );

  if (
    earlierOrCurrent.length >
    0
  ) {
    return earlierOrCurrent[
      earlierOrCurrent.length -
        1
    ];
  }

  return sortedMonthKeys[0] ??
    null;
}

function createCurrentMonthKey() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() +
        1,
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}`;
}

function getIncomeStatus(
  plannedAmount:
    number,
  receivedAmount:
    number,
): BudgetIncomeStatus {
  if (
    plannedAmount >
      0 &&
    receivedAmount >=
      plannedAmount
  ) {
    return "received";
  }

  if (
    receivedAmount >
    0
  ) {
    return "partial";
  }

  return "planned";
}

function cloneIncomeSources(
  incomeSources:
    BudgetIncomeSource[],
) {
  return incomeSources.map(
    (
      incomeSource,
    ) => ({
      ...incomeSource,
    }),
  );
}

function cloneBudgetGroups(
  groups:
    BudgetCategoryGroupData[],
) {
  return groups.map(
    (
      group,
    ) => ({
      ...group,

      categories:
        group.categories.map(
          (
            category,
          ) => ({
            ...category,
          }),
        ),
    }),
  );
}

function normalizeBudgetAmountType(
  value:
    unknown,
): BudgetAmountType | null {
  if (
    value === "fixed" ||
    value === "variable" ||
    value === "spending"
  ) {
    return value;
  }

  return null;
}

function normalizeDatabaseMoney(
  value:
    unknown,
): number | null {
  if (
    typeof value ===
      "number"
  ) {
    return Number.isFinite(
      value,
    )
      ? roundCurrency(
          value,
        )
      : null;
  }

  if (
    typeof value ===
      "string"
  ) {
    const normalized =
      value.trim();

    if (
      !normalized
    ) {
      return null;
    }

    const parsed =
      Number(
        normalized,
      );

    return Number.isFinite(
      parsed,
    )
      ? roundCurrency(
          parsed,
        )
      : null;
  }

  return null;
}

function normalizeNonNegativeDatabaseMoney(
  value:
    unknown,
): number | null {
  const normalized =
    normalizeDatabaseMoney(
      value,
    );

  if (
    normalized ===
      null ||
    normalized <
      0
  ) {
    return null;
  }

  return normalized;
}

function normalizeDatabaseDate(
  value:
    unknown,
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized,
    )
  ) {
    return null;
  }

  const [
    yearText,
    monthText,
    dayText,
  ] =
    normalized.split(
      "-",
    );

  const year =
    Number(
      yearText,
    );

  const month =
    Number(
      monthText,
    );

  const day =
    Number(
      dayText,
    );

  const date =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day,
      ),
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month -
        1 ||
    date.getUTCDate() !==
      day
  ) {
    return null;
  }

  return normalized;
}

function normalizeIsoTimestamp(
  value:
    unknown,
): string | null {
  const normalized =
    normalizeOptionalText(
      value,
    );

  if (
    !normalized
  ) {
    return null;
  }

  const timestamp =
    Date.parse(
      normalized,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return null;
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function normalizeNullableIsoTimestamp(
  value:
    unknown,
): string | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return normalizeIsoTimestamp(
    value,
  );
}

function normalizeOptionalText(
  value:
    unknown,
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized
    ? normalized
    : null;
}

function roundCurrency(
  value:
    number,
) {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}

function failure({
  code,
  message,
}: {
  code:
    Extract<
      GetCaseBudgetResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;
}): GetCaseBudgetResult {
  return {
    success:
      false,

    budgetMonths:
      {},

    months:
      [],

    selectedMonthKey:
      null,

    error: {
      code,

      message,
    },
  };
}
