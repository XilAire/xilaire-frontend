import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  getAiCoachMonthlyQuestionLimit,
  type CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

import {
  getAiUsagePeriodBounds,
} from "@/lib/subscriptions/subscription-service";

import type {
  AiProviderUsage,
} from "@/lib/ai-coach/ai-usage-service";

export type ReserveAiQuestionInput = {
  userId:
    string;

  workspaceId?:
    string | null;

  subscriptionId:
    string;

  plan:
    CaseBudgetPlan;

  now?:
    Date;
};

export type AiQuestionReservation = {
  allowed:
    boolean;

  usagePeriodId:
    string | null;

  successfulQuestionsUsed:
    number;

  successfulQuestionsRemaining:
    number;

  monthlyQuestionLimit:
    number;

  reason:
    | "allowed"
    | "requires-pro"
    | "ai-disabled"
    | "monthly-limit-reached";
};

export type ReleaseAiQuestionInput = {
  usagePeriodId:
    string;

  userId:
    string;
};

export type AiQuestionReleaseResult = {
  released:
    boolean;

  usagePeriodId:
    string | null;

  successfulQuestionsUsed:
    number;

  successfulQuestionsRemaining:
    number;

  monthlyQuestionLimit:
    number;
};

export type ApplyAiUsageInput = {
  usagePeriodId:
    string;

  userId:
    string;

  usage:
    AiProviderUsage;

  estimatedCostUsd:
    number;
};

type UnknownRecord =
  Record<
    string,
    unknown
  >;

export async function reserveAiCoachQuestion({
  userId,
  workspaceId,
  subscriptionId,
  plan,
  now =
    new Date(),
}: ReserveAiQuestionInput): Promise<AiQuestionReservation> {
  const normalizedUserId =
    normalizeRequiredId(
      userId,
      "userId",
    );

  const normalizedSubscriptionId =
    normalizeRequiredId(
      subscriptionId,
      "subscriptionId",
    );

  const normalizedWorkspaceId =
    normalizeOptionalId(
      workspaceId,
    );

  const {
    start,
    end,
  } =
    getAiUsagePeriodBounds({
      date:
        now,
    });

  const monthlyQuestionLimit =
    getAiCoachMonthlyQuestionLimit(
      plan,
    );

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "case_budget_reserve_ai_question",
      {
        p_user_id:
          normalizedUserId,

        p_workspace_id:
          normalizedWorkspaceId,

        p_subscription_id:
          normalizedSubscriptionId,

        p_plan:
          plan,

        p_period_start:
          start,

        p_period_end:
          end,

        p_monthly_question_limit:
          monthlyQuestionLimit,
      },
    );

  if (
    error
  ) {
    throw createAiAllowanceError({
      operation:
        "reserve AI Coach question",

      error,
    });
  }

  const row =
    getFirstRpcRow(
      data,
    );

  if (
    !row
  ) {
    throw new Error(
      "CASE Budget AI allowance reservation returned no result.",
    );
  }

  return {
    allowed:
      getBoolean(
        row.allowed,
      ) ??
      false,

    usagePeriodId:
      getOptionalString(
        row.usage_period_id,
      ),

    successfulQuestionsUsed:
      getNonNegativeInteger(
        row.successful_questions_used,
      ),

    successfulQuestionsRemaining:
      getNonNegativeInteger(
        row.successful_questions_remaining,
      ),

    monthlyQuestionLimit:
      getNonNegativeInteger(
        row.monthly_question_limit,
      ),

    reason:
      parseReservationReason(
        row.reason,
      ),
  };
}

export async function releaseAiCoachQuestion({
  usagePeriodId,
  userId,
}: ReleaseAiQuestionInput): Promise<AiQuestionReleaseResult> {
  const normalizedUsagePeriodId =
    normalizeRequiredId(
      usagePeriodId,
      "usagePeriodId",
    );

  const normalizedUserId =
    normalizeRequiredId(
      userId,
      "userId",
    );

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "case_budget_release_ai_question",
      {
        p_usage_period_id:
          normalizedUsagePeriodId,

        p_user_id:
          normalizedUserId,
      },
    );

  if (
    error
  ) {
    throw createAiAllowanceError({
      operation:
        "release AI Coach question",

      error,
    });
  }

  const row =
    getFirstRpcRow(
      data,
    );

  if (
    !row
  ) {
    return {
      released:
        false,

      usagePeriodId:
        normalizedUsagePeriodId,

      successfulQuestionsUsed:
        0,

      successfulQuestionsRemaining:
        0,

      monthlyQuestionLimit:
        0,
    };
  }

  return {
    released:
      getBoolean(
        row.released,
      ) ??
      false,

    usagePeriodId:
      getOptionalString(
        row.usage_period_id,
      ),

    successfulQuestionsUsed:
      getNonNegativeInteger(
        row.successful_questions_used,
      ),

    successfulQuestionsRemaining:
      getNonNegativeInteger(
        row.successful_questions_remaining,
      ),

    monthlyQuestionLimit:
      getNonNegativeInteger(
        row.monthly_question_limit,
      ),
  };
}

export async function applyAiCoachUsage({
  usagePeriodId,
  userId,
  usage,
  estimatedCostUsd,
}: ApplyAiUsageInput) {
  const normalizedUsagePeriodId =
    normalizeRequiredId(
      usagePeriodId,
      "usagePeriodId",
    );

  const normalizedUserId =
    normalizeRequiredId(
      userId,
      "userId",
    );

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "case_budget_apply_ai_usage",
      {
        p_usage_period_id:
          normalizedUsagePeriodId,

        p_user_id:
          normalizedUserId,

        p_input_tokens:
          normalizeNonNegativeInteger(
            usage.inputTokens,
          ),

        p_cached_input_tokens:
          normalizeNonNegativeInteger(
            usage.cachedInputTokens,
          ),

        p_output_tokens:
          normalizeNonNegativeInteger(
            usage.outputTokens,
          ),

        p_total_tokens:
          normalizeNonNegativeInteger(
            usage.totalTokens,
          ),

        p_estimated_cost_usd:
          normalizeMoney(
            estimatedCostUsd,
          ),
      },
    );

  if (
    error
  ) {
    throw createAiAllowanceError({
      operation:
        "apply AI Coach token usage",

      error,
    });
  }

  return data ===
    true;
}

export async function safelyReleaseAiCoachQuestion({
  usagePeriodId,
  userId,
}: ReleaseAiQuestionInput) {
  try {
    return await releaseAiCoachQuestion({
      usagePeriodId,

      userId,
    });
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget AI Allowance] Failed to release reserved AI question.",
      {
        usagePeriodId,

        userId,

        error,
      },
    );

    return {
      released:
        false,

      usagePeriodId,

      successfulQuestionsUsed:
        0,

      successfulQuestionsRemaining:
        0,

      monthlyQuestionLimit:
        0,
    };
  }
}

export function getAiAllowanceHttpStatus(
  reservation:
    AiQuestionReservation,
) {
  if (
    reservation.allowed
  ) {
    return 200;
  }

  switch (
    reservation.reason
  ) {
    case "requires-pro":
    case "ai-disabled":
      return 403;

    case "monthly-limit-reached":
      return 429;

    case "allowed":
    default:
      return 500;
  }
}

export function getAiAllowanceUserMessage(
  reservation:
    AiQuestionReservation,
) {
  switch (
    reservation.reason
  ) {
    case "requires-pro":
      return "AI Coach is available with CASE Budget Pro.";

    case "ai-disabled":
      return "AI Coach is not available for your current plan.";

    case "monthly-limit-reached":
      return `You have used all ${reservation.monthlyQuestionLimit} AI Coach questions included for this month. Your allowance will reset at the start of your next usage period.`;

    case "allowed":
    default:
      return "AI Coach is available.";
  }
}

function getFirstRpcRow(
  value:
    unknown,
): UnknownRecord | null {
  if (
    Array.isArray(
      value,
    )
  ) {
    const first =
      value[0];

    return asRecord(
      first,
    );
  }

  return asRecord(
    value,
  );
}

function parseReservationReason(
  value:
    unknown,
): AiQuestionReservation["reason"] {
  const normalizedValue =
    getOptionalString(
      value,
    );

  if (
    normalizedValue ===
      "allowed" ||
    normalizedValue ===
      "requires-pro" ||
    normalizedValue ===
      "ai-disabled" ||
    normalizedValue ===
      "monthly-limit-reached"
  ) {
    return normalizedValue;
  }

  return "ai-disabled";
}

function normalizeRequiredId(
  value:
    string,
  fieldName:
    string,
) {
  const normalizedValue =
    value.trim();

  if (
    !normalizedValue
  ) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return normalizedValue;
}

function normalizeOptionalId(
  value:
    string | null | undefined,
) {
  const normalizedValue =
    value
      ?.trim();

  return (
    normalizedValue ||
    null
  );
}

function normalizeNonNegativeInteger(
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

  return Math.max(
    0,
    Math.floor(
      value,
    ),
  );
}

function normalizeMoney(
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

function getNonNegativeInteger(
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
    return Math.max(
      0,
      Math.floor(
        value,
      ),
    );
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Number(
        value,
      );

    if (
      Number.isFinite(
        parsed,
      )
    ) {
      return Math.max(
        0,
        Math.floor(
          parsed,
        ),
      );
    }
  }

  return 0;
}

function getBoolean(
  value:
    unknown,
) {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  return null;
}

function getOptionalString(
  value:
    unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return (
    normalizedValue ||
    null
  );
}

function asRecord(
  value:
    unknown,
): UnknownRecord | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    return null;
  }

  return value as
    UnknownRecord;
}

function createAiAllowanceError({
  operation,
  error,
}: {
  operation:
    string;

  error:
    unknown;
}) {
  const record =
    asRecord(
      error,
    );

  const message =
    getOptionalString(
      record?.message,
    ) ??
    "Unknown Supabase RPC error.";

  const code =
    getOptionalString(
      record?.code,
    );

  const details =
    getOptionalString(
      record?.details,
    );

  const hint =
    getOptionalString(
      record?.hint,
    );

  console.error(
    `[CASE Budget AI Allowance] Failed to ${operation}.`,
    {
      message,

      code,

      details,

      hint,
    },
  );

  return new Error(
    `Failed to ${operation}. ${message}`,
  );
}