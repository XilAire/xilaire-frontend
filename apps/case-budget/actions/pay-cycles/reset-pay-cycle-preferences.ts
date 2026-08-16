"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireWorkspaceEditor,
} from "@/lib/auth/require-auth";
import {
  resolvePlanningPreferences,
} from "@/lib/pay-cycles/pay-period-bill-planner";
import {
  createClient,
} from "@/lib/supabase/server";

import {
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

import type {
  PayCyclePlanningPreferences,
} from "@/types/pay-cycle";

const PAY_CYCLE_PREFERENCES_TABLE =
  "case_budget_pay_cycle_preferences";

const PAY_CYCLES_PATH =
  "/dashboard/pay-cycles";

export type ResetPayCyclePreferencesInput = {
  workspaceId:
    string;
};

export type ResetPayCyclePreferencesResult =
  | {
      success:
        true;

      workspaceId:
        string;

      preferences:
        PayCyclePlanningPreferences;
    }
  | {
      success:
        false;

      workspaceId:
        string | null;

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
 * Resets the one planning-preferences record for a workspace to CASE Budget's
 * canonical defaults.
 *
 * Security / tenancy boundary:
 *
 * - The caller must be an owner, admin, or member of the requested workspace.
 * - workspace_id always comes from the verified workspace context.
 * - created_by_user_id / updated_by_user_id always come from auth.
 * - Existing preferences are selected and updated only by workspace_id.
 * - If the workspace does not yet have a preference row, one is created.
 * - Supabase RLS remains enabled as an additional database boundary.
 *
 * This action never reads or writes localStorage.
 */
export async function resetPayCyclePreferences(
  input:
    ResetPayCyclePreferencesInput,
): Promise<ResetPayCyclePreferencesResult> {
  const workspaceId =
    normalizeRequiredText(
      input.workspaceId,
    );

  const defaultPreferences =
    resolvePlanningPreferences();

  if (
    !workspaceId
  ) {
    return {
      success:
        false,

      workspaceId:
        null,

      preferences:
        defaultPreferences,

      error:
        "A workspace is required to reset pay cycle preferences.",
    };
  }

  try {
    const context =
      await requireWorkspaceEditor(
        workspaceId,
      );

    const workspace =
      context.workspace;

    if (
      !workspace ||
      workspace.id !==
        workspaceId
    ) {
      return {
        success:
          false,

        workspaceId,

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

    const userId =
      normalizeRequiredText(
        context.user.id,
      );

    if (
      !userId
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        preferences:
          defaultPreferences,

        error:
          "CASE Budget could not verify the authenticated user.",
      };
    }

    const supabase =
      await createClient();

    const {
      data:
        existingRow,
      error:
        existingError,
    } =
      await supabase
        .from(
          PAY_CYCLE_PREFERENCES_TABLE,
        )
        .select(
          "id, workspace_id",
        )
        .eq(
          "workspace_id",
          workspace.id,
        )
        .maybeSingle();

    if (
      existingError
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        preferences:
          defaultPreferences,

        error:
          getDatabaseErrorMessage(
            existingError,
            "Unable to load pay cycle preferences.",
          ),
      };
    }

    if (
      existingRow &&
      normalizeRequiredText(
        existingRow.workspace_id,
      ) !==
        workspace.id
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        preferences:
          defaultPreferences,

        error:
          "The planning preferences do not belong to this workspace.",
      };
    }

    const now =
      new Date().toISOString();

    const databaseValues = {
      strategy:
        defaultPreferences.extraCashStrategy,

      minimum_cash_reserve:
        defaultPreferences.minimumCashReserve,

      extra_debt_payment:
        0,

      allow_partial_bill_funding:
        defaultPreferences.allowPartialBillFunding,

      prioritize_past_due_bills:
        defaultPreferences.prioritizePastDueBills,

      prioritize_autopay_bills:
        defaultPreferences.prioritizeAutopayBills,

      prioritize_minimum_debt_payments:
        defaultPreferences.prioritizeMinimumDebtPayments,

      prioritize_critical_services:
        defaultPreferences.prioritizeCriticalServices,

      critical_bills_override_priority:
        defaultPreferences.criticalBillsOverridePriority,

      use_current_account_balance:
        defaultPreferences.useCurrentAccountBalance,

      include_pending_income:
        defaultPreferences.includePendingIncome,

      look_ahead_pay_periods:
        defaultPreferences.lookAheadPayPeriods,

      planning_window_days:
        defaultPreferences.planningWindowDays,

      extra_cash_debt_percentage:
        defaultPreferences.extraCashDebtPercentage,

      extra_cash_savings_percentage:
        defaultPreferences.extraCashSavingsPercentage,

      critical_bill_ids:
        defaultPreferences.criticalBillIds,

      low_priority_bill_ids:
        defaultPreferences.lowPriorityBillIds,

      updated_by_user_id:
        userId,

      updated_at:
        now,
    };

    let savedRow:
      unknown = null;

    if (
      existingRow
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            PAY_CYCLE_PREFERENCES_TABLE,
          )
          .update(
            databaseValues,
          )
          .eq(
            "workspace_id",
            workspace.id,
          )
          .select(
            "*",
          )
          .maybeSingle();

      if (
        error
      ) {
        return {
          success:
            false,

          workspaceId:
            workspace.id,

          preferences:
            defaultPreferences,

          error:
            getDatabaseErrorMessage(
              error,
              "Unable to reset pay cycle preferences.",
            ),
        };
      }

      savedRow =
        data;
    } else {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            PAY_CYCLE_PREFERENCES_TABLE,
          )
          .insert({
            workspace_id:
              workspace.id,

            created_by_user_id:
              userId,

            created_at:
              now,

            ...databaseValues,
          })
          .select(
            "*",
          )
          .single();

      if (
        error
      ) {
        return {
          success:
            false,

          workspaceId:
            workspace.id,

          preferences:
            defaultPreferences,

          error:
            getDatabaseErrorMessage(
              error,
              "Unable to create default pay cycle preferences.",
            ),
        };
      }

      savedRow =
        data;
    }

    const savedPreferences =
      mapPreferenceRow(
        savedRow,
        workspace.id,
      );

    if (
      !savedPreferences
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        preferences:
          defaultPreferences,

        error:
          "The preferences were reset, but CASE Budget could not read the saved record.",
      };
    }

    revalidatePath(
      PAY_CYCLES_PATH,
    );

    revalidatePath(
      "/dashboard",
    );

    return {
      success:
        true,

      workspaceId:
        workspace.id,

      preferences:
        savedPreferences,
    };
  } catch (
    error
  ) {
    return {
      success:
        false,

      workspaceId,

      preferences:
        defaultPreferences,

      error:
        getUnknownErrorMessage(
          error,
          "Unable to reset pay cycle preferences.",
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

function mapPreferenceRow(
  value:
    unknown,
  workspaceId:
    string,
): PayCyclePlanningPreferences | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  if (
    normalizeRequiredText(
      value.workspace_id,
    ) !==
    workspaceId
  ) {
    return null;
  }

  const defaults =
    resolvePlanningPreferences();

  const minimumCashReserve =
    normalizeNonNegativeMoney(
      value.minimum_cash_reserve,
    );

  const lookAheadPayPeriods =
    normalizePositiveWholeNumber(
      value.look_ahead_pay_periods,
    );

  const planningWindowDays =
    normalizeWholeNumber(
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

  const strategy =
    normalizeExtraCashStrategy(
      value.strategy,
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
      strategy ??
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

function normalizeRequiredText(
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

function normalizeFiniteNumber(
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

function normalizeNonNegativeMoney(
  value:
    unknown,
) {
  const number =
    normalizeFiniteNumber(
      value,
    );

  if (
    number ===
      null ||
    number <
      0
  ) {
    return null;
  }

  return roundMoney(
    number,
  );
}

function normalizeWholeNumber(
  value:
    unknown,
) {
  const number =
    normalizeFiniteNumber(
      value,
    );

  if (
    number ===
      null ||
    !Number.isInteger(
      number,
    )
  ) {
    return null;
  }

  return number;
}

function normalizePositiveWholeNumber(
  value:
    unknown,
) {
  const number =
    normalizeWholeNumber(
      value,
    );

  if (
    number ===
      null ||
    number <
      1
  ) {
    return null;
  }

  return number;
}

function normalizePercentage(
  value:
    unknown,
) {
  const number =
    normalizeWholeNumber(
      value,
    );

  if (
    number ===
      null ||
    number <
      0 ||
    number >
      100
  ) {
    return null;
  }

  return number;
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
          (
            item,
          ) =>
            normalizeRequiredText(
              item,
            ),
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

function isExtraCashStrategy(
  value:
    unknown,
): value is PayCyclePlanningPreferences[
  "extraCashStrategy"
] {
  switch (
    value
  ) {
    case "keep-available":
    case "debt":
    case "savings":
    case "split":
      return true;

    default:
      return false;
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
  return isExtraCashStrategy(
    value,
  )
    ? value
    : null;
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
  return (
    normalizeRequiredText(
      error.message,
    ) ??
    fallback
  );
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
