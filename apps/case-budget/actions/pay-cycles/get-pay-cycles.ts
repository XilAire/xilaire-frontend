"use server";

import {
  requireWorkspace,
} from "@/lib/auth/require-auth";
import {
  resolvePlanningPreferences,
} from "@/lib/pay-cycles/pay-period-bill-planner";
import {
  normalizePayCycle,
  validatePayCycleDates,
} from "@/lib/pay-cycles/pay-cycle-utils";
import {
  createClient,
} from "@/lib/supabase/server";

import {
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

import type {
  PayCycleAmountType,
  PayCycleCustomRule,
  PayCycleData,
  PayCycleDayAdjustment,
  PayCycleFrequency,
  PayCycleIncomeType,
  PayCyclePlanningPreferences,
  PayCycleSemimonthlyRule,
  PayCycleStatus,
} from "@/types/pay-cycle";

const PAY_CYCLES_TABLE =
  "case_budget_pay_cycles";

const PAY_CYCLE_PREFERENCES_TABLE =
  "case_budget_pay_cycle_preferences";

export type GetPayCyclesInput = {
  workspaceId:
    string;
};

export type GetPayCyclesResult =
  | {
      success:
        true;

      workspaceId:
        string;

      payCycles:
        PayCycleData[];

      preferences:
        PayCyclePlanningPreferences;
    }
  | {
      success:
        false;

      workspaceId:
        string | null;

      payCycles:
        [];

      preferences:
        PayCyclePlanningPreferences;

      error:
        string;
    };

type UnknownRecord =
  Record<
    string,
    unknown
  >;

/**
 * Reads the canonical Pay Cycle state for one workspace.
 *
 * Security / tenancy boundary:
 *
 * - The requested workspace must belong to the authenticated user.
 * - Supabase RLS remains enabled.
 * - Both queries are explicitly filtered by workspace_id.
 * - No Pay Cycle data from another workspace is merged into the result.
 *
 * This action intentionally does not read localStorage. Supabase is the
 * canonical persistence boundary for the workspace-scoped Pay Cycle feature.
 */
export async function getPayCycles(
  input:
    GetPayCyclesInput,
): Promise<GetPayCyclesResult> {
  const normalizedWorkspaceId =
    normalizeRequiredString(
      input.workspaceId,
    );

  const defaultPreferences =
    resolvePlanningPreferences();

  if (
    !normalizedWorkspaceId
  ) {
    return {
      success:
        false,

      workspaceId:
        null,

      payCycles:
        [],

      preferences:
        defaultPreferences,

      error:
        "A workspace is required to load pay cycles.",
    };
  }

  try {
    const workspace =
      await requireWorkspace(
        normalizedWorkspaceId,
      );

    if (
      workspace.id !==
      normalizedWorkspaceId
    ) {
      return {
        success:
          false,

        workspaceId:
          normalizedWorkspaceId,

        payCycles:
          [],

        preferences:
          defaultPreferences,

        error:
          "The requested workspace is not available.",
      };
    }

    const featureAccess =
      await resolveAuthenticatedFeatureAccess({
        feature:
          "pay-cycles",

        workspaceId:
          workspace.id,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycles:
          [],

        preferences:
          defaultPreferences,

        error:
          getPayCyclesFeatureAccessMessage({
            reason:
              featureAccess.access.reason,

            requiredPlan:
              featureAccess.access.requiredPlan,
          }),
      };
    }

    const supabase =
      await createClient();

    const [
      payCyclesResult,
      preferencesResult,
    ] =
      await Promise.all([
        supabase
          .from(
            PAY_CYCLES_TABLE,
          )
          .select(
            "*",
          )
          .eq(
            "workspace_id",
            workspace.id,
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            },
          ),

        supabase
          .from(
            PAY_CYCLE_PREFERENCES_TABLE,
          )
          .select(
            "*",
          )
          .eq(
            "workspace_id",
            workspace.id,
          )
          .maybeSingle(),
      ]);

    if (
      payCyclesResult.error
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycles:
          [],

        preferences:
          defaultPreferences,

        error:
          getDatabaseErrorMessage(
            payCyclesResult.error,
            "Unable to load pay cycles.",
          ),
      };
    }

    if (
      preferencesResult.error
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycles:
          [],

        preferences:
          defaultPreferences,

        error:
          getDatabaseErrorMessage(
            preferencesResult.error,
            "Unable to load pay cycle preferences.",
          ),
      };
    }

    const payCycles =
      normalizePayCycleRows(
        payCyclesResult.data,
        workspace.id,
      );

    const preferences =
      mapPreferenceRow(
        preferencesResult.data,
        workspace.id,
      );

    return {
      success:
        true,

      workspaceId:
        workspace.id,

      payCycles,

      preferences,
    };
  } catch (
    error
  ) {
    return {
      success:
        false,

      workspaceId:
        normalizedWorkspaceId,

      payCycles:
        [],

      preferences:
        defaultPreferences,

      error:
        getUnknownErrorMessage(
          error,
          "Unable to load pay cycles.",
        ),
    };
  }
}

function getPayCyclesFeatureAccessMessage({
  reason,
  requiredPlan,
}: {
  reason:
    | "allowed"
    | "requires-plus"
    | "requires-pro"
    | "inactive-subscription";

  requiredPlan:
    | "free"
    | "plus"
    | "pro"
    | null;
}) {
  switch (
    reason
  ) {
    case "inactive-subscription":
      return "Pay Cycles are unavailable because this workspace subscription is inactive. Please reactivate the subscription to continue.";

    case "requires-pro":
      return "Pay Cycles require the CASE Budget Pro plan for this workspace.";

    case "requires-plus":
      return "Pay Cycles require the CASE Budget Plus plan or higher for this workspace.";

    case "allowed":
    default: {
      if (
        requiredPlan ===
        "pro"
      ) {
        return "Pay Cycles require the CASE Budget Pro plan for this workspace.";
      }

      if (
        requiredPlan ===
        "plus"
      ) {
        return "Pay Cycles require the CASE Budget Plus plan or higher for this workspace.";
      }

      return "Pay Cycles are not available for the current workspace subscription.";
    }
  }
}

function normalizePayCycleRows(
  value:
    unknown,
  workspaceId:
    string,
): PayCycleData[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        row,
      ) =>
        mapPayCycleRow(
          row,
          workspaceId,
        ),
    )
    .filter(
      (
        payCycle,
      ): payCycle is PayCycleData =>
        payCycle !==
        null,
    )
    .sort(
      comparePayCycles,
    );
}

function mapPayCycleRow(
  value:
    unknown,
  workspaceId:
    string,
): PayCycleData | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const rowWorkspaceId =
    normalizeRequiredString(
      value.workspace_id,
    );

  if (
    rowWorkspaceId !==
    workspaceId
  ) {
    return null;
  }

  const id =
    normalizeRequiredString(
      value.id,
    );

  const name =
    normalizeRequiredString(
      value.name,
    );

  const frequency =
    normalizePayCycleFrequency(
      value.frequency,
    );

  const expectedNetAmount =
    normalizeNonNegativeMoney(
      value.expected_amount ??
        value.expected_net_amount,
    );

  const createdAt =
    normalizeRequiredString(
      value.created_at,
    );

  const updatedAt =
    normalizeRequiredString(
      value.updated_at,
    );

  /*
   * The original database schema used first_pay_date. The richer domain
   * schema uses start_date and next_pay_date. During the persistence
   * migration we accept either representation so the read layer remains
   * compatible while existing data is moved forward.
   */
  const firstPayDate =
    normalizeOptionalDate(
      value.first_pay_date,
    );

  const startDate =
    normalizeOptionalDate(
      value.start_date,
    ) ??
    firstPayDate;

  const nextPayDate =
    normalizeOptionalDate(
      value.next_pay_date,
    ) ??
    firstPayDate;

  if (
    !id ||
    !name ||
    !frequency ||
    expectedNetAmount ===
      null ||
    !startDate ||
    !nextPayDate ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  const minimumExpectedAmount =
    normalizeOptionalNonNegativeMoney(
      value.minimum_expected_amount,
    );

  const maximumExpectedAmount =
    normalizeOptionalNonNegativeMoney(
      value.maximum_expected_amount,
    );

  const accountId =
    normalizeOptionalString(
      value.account_id,
    );

  const employerName =
    normalizeOptionalString(
      value.employer_name,
    );

  const lastPayDate =
    normalizeOptionalDate(
      value.last_pay_date,
    );

  const endDate =
    normalizeOptionalDate(
      value.end_date,
    );

  const notes =
    normalizeOptionalString(
      value.notes,
    );

  const incomeType =
    normalizePayCycleIncomeType(
      value.income_type,
    ) ??
    "salary";

  const amountType =
    normalizePayCycleAmountType(
      value.amount_type,
    ) ??
    "fixed";

  const dayAdjustment =
    normalizePayCycleDayAdjustment(
      value.day_adjustment,
    ) ??
    "previous-business-day";

  const status =
    normalizePayCycleStatus(
      value.status,
    ) ??
    "active";

  const includeInBillPlanning =
    normalizeBoolean(
      value.include_in_bill_planning,
      true,
    );

  const includeInBudgetIncome =
    normalizeBoolean(
      value.include_in_budget_income,
      true,
    );

  const semimonthlyRule =
    mapSemimonthlyRule(
      value,
    );

  const customRule =
    mapCustomRule(
      value,
    );

  const payCycle:
    PayCycleData = {
      id,

      name,

      ...(employerName
        ? {
            employerName,
          }
        : {}),

      incomeType,

      frequency,

      amountType,

      expectedNetAmount,

      ...(minimumExpectedAmount !==
      null
        ? {
            minimumExpectedAmount,
          }
        : {}),

      ...(maximumExpectedAmount !==
      null
        ? {
            maximumExpectedAmount,
          }
        : {}),

      startDate,

      nextPayDate,

      ...(lastPayDate
        ? {
            lastPayDate,
          }
        : {}),

      ...(endDate
        ? {
            endDate,
          }
        : {}),

      ...(accountId
        ? {
            accountId,
          }
        : {}),

      ...(semimonthlyRule
        ? {
            semimonthlyRule,
          }
        : {}),

      ...(customRule
        ? {
            customRule,
          }
        : {}),

      dayAdjustment,

      includeInBillPlanning,

      includeInBudgetIncome,

      ...(notes
        ? {
            notes,
          }
        : {}),

      status,

      createdAt,

      updatedAt,
    };

  const normalizedPayCycle =
    normalizePayCycle(
      payCycle,
    );

  const validation =
    validatePayCycleDates(
      normalizedPayCycle,
    );

  if (
    !validation.isValid
  ) {
    return null;
  }

  return normalizedPayCycle;
}

function mapPreferenceRow(
  value:
    unknown,
  workspaceId:
    string,
): PayCyclePlanningPreferences {
  const defaults =
    resolvePlanningPreferences();

  if (
    !isRecord(
      value,
    )
  ) {
    return defaults;
  }

  const rowWorkspaceId =
    normalizeRequiredString(
      value.workspace_id,
    );

  if (
    rowWorkspaceId !==
    workspaceId
  ) {
    return defaults;
  }

  const minimumCashReserve =
    normalizeNonNegativeMoney(
      value.minimum_cash_reserve,
    );

  const lookAheadPayPeriods =
    normalizePositiveInteger(
      value.look_ahead_pay_periods,
    );

  const planningWindowDays =
    normalizeNonNegativeInteger(
      value.planning_window_days,
    );

  const extraCashDebtPercentage =
    normalizePercentage(
      value.extra_cash_debt_percentage,
    );

  const extraCashSavingsPercentage =
    normalizePercentage(
      value.extra_cash_savings_percentage,
    );

  return resolvePlanningPreferences({
    minimumCashReserve:
      minimumCashReserve ??
      defaults.minimumCashReserve,

    allowPartialBillFunding:
      normalizeBoolean(
        value.allow_partial_bill_funding,
        defaults.allowPartialBillFunding,
      ),

    prioritizePastDueBills:
      normalizeBoolean(
        value.prioritize_past_due_bills,
        defaults.prioritizePastDueBills,
      ),

    prioritizeAutopayBills:
      normalizeBoolean(
        value.prioritize_autopay_bills,
        defaults.prioritizeAutopayBills,
      ),

    prioritizeMinimumDebtPayments:
      normalizeBoolean(
        value.prioritize_minimum_debt_payments,
        defaults.prioritizeMinimumDebtPayments,
      ),

    prioritizeCriticalServices:
      normalizeBoolean(
        value.prioritize_critical_services,
        defaults.prioritizeCriticalServices,
      ),

    criticalBillsOverridePriority:
      normalizeBoolean(
        value.critical_bills_override_priority,
        defaults.criticalBillsOverridePriority,
      ),

    useCurrentAccountBalance:
      normalizeBoolean(
        value.use_current_account_balance,
        defaults.useCurrentAccountBalance,
      ),

    includePendingIncome:
      normalizeBoolean(
        value.include_pending_income,
        defaults.includePendingIncome,
      ),

    lookAheadPayPeriods:
      lookAheadPayPeriods ??
      defaults.lookAheadPayPeriods,

    planningWindowDays:
      planningWindowDays ??
      defaults.planningWindowDays,

    billPlanningWindowDays:
      planningWindowDays ??
      defaults.billPlanningWindowDays,

    extraCashStrategy:
      normalizeExtraCashStrategy(
        value.strategy,
      ) ??
      defaults.extraCashStrategy,

    extraCashDebtPercentage:
      extraCashDebtPercentage ??
      defaults.extraCashDebtPercentage,

    extraCashSavingsPercentage:
      extraCashSavingsPercentage ??
      defaults.extraCashSavingsPercentage,

    criticalBillIds:
      normalizeStringArray(
        value.critical_bill_ids,
      ),

    lowPriorityBillIds:
      normalizeStringArray(
        value.low_priority_bill_ids,
      ),
  });
}

function mapSemimonthlyRule(
  row:
    UnknownRecord,
): PayCycleSemimonthlyRule | undefined {
  const firstDayOfMonth =
    normalizePositiveInteger(
      row.semimonthly_first_day,
    );

  const secondDayOfMonth =
    normalizePositiveInteger(
      row.semimonthly_second_day,
    );

  if (
    firstDayOfMonth ===
      null ||
    secondDayOfMonth ===
      null ||
    firstDayOfMonth >
      31 ||
    secondDayOfMonth >
      31 ||
    firstDayOfMonth ===
      secondDayOfMonth
  ) {
    return undefined;
  }

  return {
    firstDayOfMonth,
    secondDayOfMonth,
  };
}

function mapCustomRule(
  row:
    UnknownRecord,
): PayCycleCustomRule | undefined {
  const intervalCount =
    normalizePositiveInteger(
      row.custom_interval_count,
    );

  const intervalUnit =
    normalizeCustomIntervalUnit(
      row.custom_interval_unit,
    );

  if (
    intervalCount ===
      null ||
    !intervalUnit
  ) {
    return undefined;
  }

  return {
    intervalCount,
    intervalUnit,
  };
}

function comparePayCycles(
  first:
    PayCycleData,
  second:
    PayCycleData,
) {
  const dateComparison =
    first.nextPayDate.localeCompare(
      second.nextPayDate,
    );

  if (
    dateComparison !==
    0
  ) {
    return dateComparison;
  }

  const nameComparison =
    first.name.localeCompare(
      second.name,
    );

  if (
    nameComparison !==
    0
  ) {
    return nameComparison;
  }

  return first.id.localeCompare(
    second.id,
  );
}

function normalizePayCycleFrequency(
  value:
    unknown,
): PayCycleFrequency | null {
  switch (
    value
  ) {
    case "weekly":
    case "biweekly":
    case "semimonthly":
    case "monthly":
    case "quarterly":
    case "irregular":
    case "custom":
      return value;

    default:
      return null;
  }
}

function normalizePayCycleIncomeType(
  value:
    unknown,
): PayCycleIncomeType | null {
  switch (
    value
  ) {
    case "salary":
    case "hourly":
    case "commission":
    case "benefit":
    case "pension":
    case "retirement":
    case "business":
    case "other":
      return value;

    default:
      return null;
  }
}

function normalizePayCycleAmountType(
  value:
    unknown,
): PayCycleAmountType | null {
  switch (
    value
  ) {
    case "fixed":
    case "estimated":
    case "variable":
      return value;

    default:
      return null;
  }
}

function normalizePayCycleStatus(
  value:
    unknown,
): PayCycleStatus | null {
  switch (
    value
  ) {
    case "active":
    case "paused":
    case "archived":
      return value;

    /*
     * The first persistence draft used "inactive". Treat an existing inactive
     * row as paused during the transition so old development data can still be
     * read safely.
     */
    case "inactive":
      return "paused";

    default:
      return null;
  }
}

function normalizePayCycleDayAdjustment(
  value:
    unknown,
): PayCycleDayAdjustment | null {
  switch (
    value
  ) {
    case "none":
    case "previous-business-day":
    case "next-business-day":
      return value;

    default:
      return null;
  }
}

function normalizeExtraCashStrategy(
  value:
    unknown,
):
  | PayCyclePlanningPreferences[
      "extraCashStrategy"
    ]
  | null {
  switch (
    value
  ) {
    case "keep-available":
    case "debt":
    case "savings":
    case "split":
      return value;

    default:
      return null;
  }
}

function normalizeCustomIntervalUnit(
  value:
    unknown,
):
  | PayCycleCustomRule[
      "intervalUnit"
    ]
  | null {
  switch (
    value
  ) {
    case "day":
    case "week":
    case "month":
      return value;

    default:
      return null;
  }
}

function normalizeBoolean(
  value:
    unknown,
  fallback:
    boolean,
) {
  return typeof value ===
    "boolean"
    ? value
    : fallback;
}

function normalizeRequiredString(
  value:
    unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized ||
    null;
}

function normalizeOptionalString(
  value:
    unknown,
) {
  return (
    normalizeRequiredString(
      value,
    ) ??
    undefined
  );
}

function normalizeOptionalDate(
  value:
    unknown,
) {
  const normalized =
    normalizeRequiredString(
      value,
    );

  if (
    !normalized ||
    !isDateString(
      normalized,
    )
  ) {
    return undefined;
  }

  return normalized;
}

function isDateString(
  value:
    string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${value}T00:00:00.000Z`,
    );

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    date
      .toISOString()
      .slice(
        0,
        10,
      ) ===
      value
  );
}

function normalizeNonNegativeMoney(
  value:
    unknown,
) {
  const normalized =
    normalizeNumber(
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

  return roundMoney(
    normalized,
  );
}

function normalizeOptionalNonNegativeMoney(
  value:
    unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return null;
  }

  return normalizeNonNegativeMoney(
    value,
  );
}

function normalizeNumber(
  value:
    unknown,
) {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  ) {
    return value;
  }

  if (
    typeof value ===
      "string" &&
    value.trim()
  ) {
    const parsed =
      Number(
        value,
      );

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : null;
  }

  return null;
}

function normalizePositiveInteger(
  value:
    unknown,
) {
  const normalized =
    normalizeNumber(
      value,
    );

  if (
    normalized ===
      null ||
    !Number.isInteger(
      normalized,
    ) ||
    normalized <
      1
  ) {
    return null;
  }

  return normalized;
}

function normalizeNonNegativeInteger(
  value:
    unknown,
) {
  const normalized =
    normalizeNumber(
      value,
    );

  if (
    normalized ===
      null ||
    !Number.isInteger(
      normalized,
    ) ||
    normalized <
      0
  ) {
    return null;
  }

  return normalized;
}

function normalizePercentage(
  value:
    unknown,
) {
  const normalized =
    normalizeNonNegativeInteger(
      value,
    );

  if (
    normalized ===
      null ||
    normalized >
      100
  ) {
    return null;
  }

  return normalized;
}

function normalizeStringArray(
  value:
    unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(
          normalizeOptionalString,
        )
        .filter(
          (
            item,
          ): item is string =>
            Boolean(
              item,
            ),
        ),
    ),
  );
}

function roundMoney(
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

function isRecord(
  value:
    unknown,
): value is UnknownRecord {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value,
      ),
  );
}

function getDatabaseErrorMessage(
  error: {
    message?:
      string;
  },
  fallback:
    string,
) {
  const message =
    normalizeRequiredString(
      error.message,
    );

  return message ??
    fallback;
}

function getUnknownErrorMessage(
  error:
    unknown,
  fallback:
    string,
) {
  if (
    error instanceof
    Error
  ) {
    const message =
      error.message.trim();

    if (
      message
    ) {
      return message;
    }
  }

  return fallback;
}
