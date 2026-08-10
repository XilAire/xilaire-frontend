import "server-only";

import {
  getAiCoachMonthlyQuestionLimit,
  getAiCoachQuestionsRemaining,
  getAiCoachUsagePercentage,
  hasAiCoachAccess,
  type CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

import {
  getAiUsagePeriodBounds,
  shouldCountAiRequestAgainstAllowance,
} from "@/lib/subscriptions/subscription-service";

import type {
  CaseBudgetAiRequest,
  CaseBudgetAiRequestStatus,
  CaseBudgetAiUsagePeriod,
  CaseBudgetAiUsageSummary,
  CaseBudgetSubscription,
} from "@/types/subscription";

export type AiProviderUsage = {
  inputTokens:
    number;

  cachedInputTokens:
    number;

  outputTokens:
    number;

  totalTokens:
    number;
};

export type AiModelPricing = {
  inputPerMillion:
    number;

  cachedInputPerMillion:
    number;

  outputPerMillion:
    number;
};

export type CreateAiUsagePeriodInput = {
  id:
    string;

  userId:
    string;

  workspaceId?:
    string | null;

  subscriptionId?:
    string | null;

  plan:
    CaseBudgetPlan;

  date?:
    Date;
};

export type CreateAiRequestInput = {
  id:
    string;

  userId:
    string;

  workspaceId?:
    string | null;

  subscriptionId?:
    string | null;

  usagePeriodId?:
    string | null;

  model:
    string;

  promptCharacters:
    number;

  conversationMessageCount:
    number;

  startedAt?:
    string;
};

export type CompleteAiRequestInput = {
  request:
    CaseBudgetAiRequest;

  usage:
    AiProviderUsage;

  responseMessage:
    string | null;

  providerRequestId?:
    string | null;

  completedAt?:
    string;

  pricing?:
    AiModelPricing | null;
};

export type FailAiRequestInput = {
  request:
    CaseBudgetAiRequest;

  status?:
    Extract<
      CaseBudgetAiRequestStatus,
      | "failed"
      | "canceled"
      | "blocked"
    >;

  errorCode?:
    string | null;

  errorMessage?:
    string | null;

  completedAt?:
    string;
};

export type ApplyAiRequestToUsagePeriodInput = {
  usagePeriod:
    CaseBudgetAiUsagePeriod;

  request:
    CaseBudgetAiRequest;
};

export type AiUsageAllowanceResult = {
  allowed:
    boolean;

  reason:
    | "allowed"
    | "ai-disabled"
    | "monthly-limit-reached";

  plan:
    CaseBudgetPlan;

  monthlyQuestionLimit:
    number;

  successfulQuestionsUsed:
    number;

  successfulQuestionsRemaining:
    number;

  usagePercentage:
    number;
};

const DEFAULT_AI_MODEL_PRICING: Record<
  string,
  AiModelPricing
> = {
  "gpt-5.6-luna": {
    inputPerMillion:
      1,

    cachedInputPerMillion:
      0.1,

    outputPerMillion:
      6,
  },

  "gpt-5.6-terra": {
    inputPerMillion:
      2.5,

    cachedInputPerMillion:
      0.25,

    outputPerMillion:
      15,
  },

  "gpt-5.6-sol": {
    inputPerMillion:
      5,

    cachedInputPerMillion:
      0.5,

    outputPerMillion:
      30,
  },
};

export function createAiUsagePeriod({
  id,
  userId,
  workspaceId,
  subscriptionId,
  plan,
  date =
    new Date(),
}: CreateAiUsagePeriodInput): CaseBudgetAiUsagePeriod {
  const period =
    getAiUsagePeriodBounds({
      date,
    });

  const monthlyQuestionLimit =
    hasAiCoachAccess(
      plan,
    )
      ? getAiCoachMonthlyQuestionLimit(
          plan,
        )
      : 0;

  const timestamp =
    new Date().toISOString();

  return {
    id,

    userId,

    workspaceId:
      workspaceId ??
      null,

    subscriptionId:
      subscriptionId ??
      null,

    plan,

    periodStart:
      period.start,

    periodEnd:
      period.end,

    monthlyQuestionLimit,

    successfulQuestionsUsed:
      0,

    successfulQuestionsRemaining:
      monthlyQuestionLimit,

    inputTokens:
      0,

    cachedInputTokens:
      0,

    outputTokens:
      0,

    totalTokens:
      0,

    estimatedCostUsd:
      0,

    createdAt:
      timestamp,

    updatedAt:
      timestamp,
  };
}

export function createPendingAiRequest({
  id,
  userId,
  workspaceId,
  subscriptionId,
  usagePeriodId,
  model,
  promptCharacters,
  conversationMessageCount,
  startedAt,
}: CreateAiRequestInput): CaseBudgetAiRequest {
  const timestamp =
    startedAt ??
    new Date().toISOString();

  return {
    id,

    userId,

    workspaceId:
      workspaceId ??
      null,

    subscriptionId:
      subscriptionId ??
      null,

    usagePeriodId:
      usagePeriodId ??
      null,

    status:
      "pending",

    model:
      model.trim(),

    requestType:
      "ai-coach",

    promptCharacters:
      normalizeNonNegativeInteger(
        promptCharacters,
      ),

    conversationMessageCount:
      normalizeNonNegativeInteger(
        conversationMessageCount,
      ),

    inputTokens:
      0,

    cachedInputTokens:
      0,

    outputTokens:
      0,

    totalTokens:
      0,

    estimatedCostUsd:
      0,

    countedAgainstAllowance:
      false,

    providerRequestId:
      null,

    errorCode:
      null,

    errorMessage:
      null,

    startedAt:
      timestamp,

    completedAt:
      null,

    createdAt:
      timestamp,
  };
}

export function completeAiRequest({
  request,
  usage,
  responseMessage,
  providerRequestId,
  completedAt,
  pricing,
}: CompleteAiRequestInput): CaseBudgetAiRequest {
  const normalizedUsage =
    normalizeProviderUsage(
      usage,
    );

  const resolvedPricing =
    pricing ??
    getAiModelPricing(
      request.model,
    );

  const estimatedCostUsd =
    resolvedPricing
      ? calculateAiRequestCost({
          usage:
            normalizedUsage,

          pricing:
            resolvedPricing,
        })
      : 0;

  const countedAgainstAllowance =
    shouldCountAiRequestAgainstAllowance({
      status:
        "completed",

      responseMessage,
    });

  return {
    ...request,

    status:
      "completed",

    inputTokens:
      normalizedUsage
        .inputTokens,

    cachedInputTokens:
      normalizedUsage
        .cachedInputTokens,

    outputTokens:
      normalizedUsage
        .outputTokens,

    totalTokens:
      normalizedUsage
        .totalTokens,

    estimatedCostUsd,

    countedAgainstAllowance,

    providerRequestId:
      providerRequestId ??
      request.providerRequestId,

    errorCode:
      null,

    errorMessage:
      null,

    completedAt:
      completedAt ??
      new Date().toISOString(),
  };
}

export function failAiRequest({
  request,
  status =
    "failed",
  errorCode,
  errorMessage,
  completedAt,
}: FailAiRequestInput): CaseBudgetAiRequest {
  return {
    ...request,

    status,

    countedAgainstAllowance:
      false,

    errorCode:
      normalizeOptionalText(
        errorCode,
      ),

    errorMessage:
      normalizeOptionalText(
        errorMessage,
      ),

    completedAt:
      completedAt ??
      new Date().toISOString(),
  };
}

export function applyAiRequestToUsagePeriod({
  usagePeriod,
  request,
}: ApplyAiRequestToUsagePeriodInput): CaseBudgetAiUsagePeriod {
  if (
    request.status !==
    "completed"
  ) {
    return usagePeriod;
  }

  const shouldIncrementQuestion =
    request.countedAgainstAllowance;

  const successfulQuestionsUsed =
    normalizeNonNegativeInteger(
      usagePeriod
        .successfulQuestionsUsed +
        (
          shouldIncrementQuestion
            ? 1
            : 0
        ),
    );

  const monthlyQuestionLimit =
    normalizeNonNegativeInteger(
      usagePeriod
        .monthlyQuestionLimit,
    );

  return {
    ...usagePeriod,

    successfulQuestionsUsed,

    successfulQuestionsRemaining:
      Math.max(
        0,
        monthlyQuestionLimit -
          successfulQuestionsUsed,
      ),

    inputTokens:
      normalizeNonNegativeInteger(
        usagePeriod
          .inputTokens +
          request.inputTokens,
      ),

    cachedInputTokens:
      normalizeNonNegativeInteger(
        usagePeriod
          .cachedInputTokens +
          request.cachedInputTokens,
      ),

    outputTokens:
      normalizeNonNegativeInteger(
        usagePeriod
          .outputTokens +
          request.outputTokens,
      ),

    totalTokens:
      normalizeNonNegativeInteger(
        usagePeriod
          .totalTokens +
          request.totalTokens,
      ),

    estimatedCostUsd:
      roundUsd(
        usagePeriod
          .estimatedCostUsd +
          request.estimatedCostUsd,
      ),

    updatedAt:
      new Date().toISOString(),
  };
}

export function getAiUsageAllowance({
  plan,
  usagePeriod,
}: {
  plan:
    CaseBudgetPlan;

  usagePeriod?:
    CaseBudgetAiUsagePeriod | null;
}): AiUsageAllowanceResult {
  if (
    !hasAiCoachAccess(
      plan,
    )
  ) {
    return {
      allowed:
        false,

      reason:
        "ai-disabled",

      plan,

      monthlyQuestionLimit:
        0,

      successfulQuestionsUsed:
        0,

      successfulQuestionsRemaining:
        0,

      usagePercentage:
        0,
    };
  }

  const monthlyQuestionLimit =
    getAiCoachMonthlyQuestionLimit(
      plan,
    );

  const successfulQuestionsUsed =
    normalizeNonNegativeInteger(
      usagePeriod
        ?.successfulQuestionsUsed ??
      0,
    );

  const successfulQuestionsRemaining =
    getAiCoachQuestionsRemaining({
      plan,

      used:
        successfulQuestionsUsed,
    });

  const usagePercentage =
    getAiCoachUsagePercentage({
      plan,

      used:
        successfulQuestionsUsed,
    });

  if (
    successfulQuestionsRemaining <=
    0
  ) {
    return {
      allowed:
        false,

      reason:
        "monthly-limit-reached",

      plan,

      monthlyQuestionLimit,

      successfulQuestionsUsed,

      successfulQuestionsRemaining:
        0,

      usagePercentage:
        100,
    };
  }

  return {
    allowed:
      true,

    reason:
      "allowed",

    plan,

    monthlyQuestionLimit,

    successfulQuestionsUsed,

    successfulQuestionsRemaining,

    usagePercentage,
  };
}

export function buildAiUsageSummary({
  plan,
  usagePeriod,
}: {
  plan:
    CaseBudgetPlan;

  usagePeriod?:
    CaseBudgetAiUsagePeriod | null;
}): CaseBudgetAiUsageSummary {
  const allowance =
    getAiUsageAllowance({
      plan,

      usagePeriod:
        usagePeriod ??
        null,
    });

  return {
    enabled:
      hasAiCoachAccess(
        plan,
      ),

    monthlyQuestionLimit:
      allowance
        .monthlyQuestionLimit,

    successfulQuestionsUsed:
      allowance
        .successfulQuestionsUsed,

    successfulQuestionsRemaining:
      allowance
        .successfulQuestionsRemaining,

    usagePercentage:
      allowance
        .usagePercentage,

    periodStart:
      usagePeriod
        ?.periodStart ??
      null,

    periodEnd:
      usagePeriod
        ?.periodEnd ??
      null,

    estimatedCostUsd:
      roundUsd(
        usagePeriod
          ?.estimatedCostUsd ??
        0,
      ),
  };
}

export function canSubscriptionConsumeAiQuestion({
  subscription,
  usagePeriod,
}: {
  subscription:
    CaseBudgetSubscription;

  usagePeriod?:
    CaseBudgetAiUsagePeriod | null;
}) {
  const plan =
    subscription.plan;

  return getAiUsageAllowance({
    plan,

    usagePeriod:
      usagePeriod ??
      null,
  });
}

export function calculateAiRequestCost({
  usage,
  pricing,
}: {
  usage:
    AiProviderUsage;

  pricing:
    AiModelPricing;
}) {
  const normalizedUsage =
    normalizeProviderUsage(
      usage,
    );

  const uncachedInputTokens =
    Math.max(
      0,
      normalizedUsage
        .inputTokens -
        normalizedUsage
          .cachedInputTokens,
    );

  const uncachedInputCost =
    (
      uncachedInputTokens /
      1_000_000
    ) *
    normalizeNonNegativeNumber(
      pricing
        .inputPerMillion,
    );

  const cachedInputCost =
    (
      normalizedUsage
        .cachedInputTokens /
      1_000_000
    ) *
    normalizeNonNegativeNumber(
      pricing
        .cachedInputPerMillion,
    );

  const outputCost =
    (
      normalizedUsage
        .outputTokens /
      1_000_000
    ) *
    normalizeNonNegativeNumber(
      pricing
        .outputPerMillion,
    );

  return roundUsd(
    uncachedInputCost +
      cachedInputCost +
      outputCost,
  );
}

export function getAiModelPricing(
  model:
    string,
): AiModelPricing | null {
  const normalizedModel =
    model
      .trim()
      .toLowerCase();

  if (
    !normalizedModel
  ) {
    return null;
  }

  const exactPricing =
    DEFAULT_AI_MODEL_PRICING[
      normalizedModel
    ];

  if (
    exactPricing
  ) {
    return exactPricing;
  }

  const matchedModel =
    Object.keys(
      DEFAULT_AI_MODEL_PRICING,
    ).find(
      (
        knownModel,
      ) =>
        normalizedModel.startsWith(
          knownModel,
        ),
    );

  if (
    !matchedModel
  ) {
    return null;
  }

  return DEFAULT_AI_MODEL_PRICING[
    matchedModel
  ];
}

export function normalizeOpenAiUsage(
  value:
    unknown,
): AiProviderUsage {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return {
      inputTokens:
        0,

      cachedInputTokens:
        0,

      outputTokens:
        0,

      totalTokens:
        0,
    };
  }

  const inputTokens =
    getFirstInteger(
      record.input_tokens,
      record.inputTokens,
    );

  const outputTokens =
    getFirstInteger(
      record.output_tokens,
      record.outputTokens,
    );

  const totalTokens =
    getFirstInteger(
      record.total_tokens,
      record.totalTokens,
    );

  const inputDetails =
    asRecord(
      record.input_tokens_details,
    ) ??
    asRecord(
      record.inputTokensDetails,
    );

  const cachedInputTokens =
    getFirstInteger(
      inputDetails
        ?.cached_tokens,
      inputDetails
        ?.cachedTokens,
    );

  const normalizedInputTokens =
    inputTokens ??
    0;

  const normalizedOutputTokens =
    outputTokens ??
    0;

  return normalizeProviderUsage({
    inputTokens:
      normalizedInputTokens,

    cachedInputTokens:
      cachedInputTokens ??
      0,

    outputTokens:
      normalizedOutputTokens,

    totalTokens:
      totalTokens ??
      (
        normalizedInputTokens +
        normalizedOutputTokens
      ),
  });
}

export function normalizeProviderUsage(
  usage:
    AiProviderUsage,
): AiProviderUsage {
  const inputTokens =
    normalizeNonNegativeInteger(
      usage.inputTokens,
    );

  const cachedInputTokens =
    Math.min(
      inputTokens,
      normalizeNonNegativeInteger(
        usage.cachedInputTokens,
      ),
    );

  const outputTokens =
    normalizeNonNegativeInteger(
      usage.outputTokens,
    );

  const calculatedTotal =
    inputTokens +
    outputTokens;

  const totalTokens =
    Math.max(
      calculatedTotal,
      normalizeNonNegativeInteger(
        usage.totalTokens,
      ),
    );

  return {
    inputTokens,

    cachedInputTokens,

    outputTokens,

    totalTokens,
  };
}

export function isAiUsagePeriodExhausted(
  usagePeriod:
    CaseBudgetAiUsagePeriod,
) {
  return (
    usagePeriod
      .successfulQuestionsRemaining <=
    0
  );
}

export function shouldCreateNewAiUsagePeriod({
  usagePeriod,
  now =
    new Date(),
}: {
  usagePeriod?:
    CaseBudgetAiUsagePeriod | null;

  now?:
    Date;
}) {
  if (
    !usagePeriod
  ) {
    return true;
  }

  const nowValue =
    now.getTime();

  const periodStartValue =
    new Date(
      usagePeriod.periodStart,
    ).getTime();

  const periodEndValue =
    new Date(
      usagePeriod.periodEnd,
    ).getTime();

  if (
    Number.isNaN(
      periodStartValue,
    ) ||
    Number.isNaN(
      periodEndValue,
    )
  ) {
    return true;
  }

  return (
    nowValue <
      periodStartValue ||
    nowValue >=
      periodEndValue
  );
}

function normalizeOptionalText(
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

function normalizeNonNegativeNumber(
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
    value,
  );
}

function roundUsd(
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

function asRecord(
  value:
    unknown,
):
  | Record<
      string,
      unknown
    >
  | null {
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
    Record<
      string,
      unknown
    >;
}

function getInteger(
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
    const parsedValue =
      Number(
        value,
      );

    if (
      Number.isFinite(
        parsedValue,
      )
    ) {
      return Math.max(
        0,
        Math.floor(
          parsedValue,
        ),
      );
    }
  }

  return null;
}

function getFirstInteger(
  ...values:
    unknown[]
) {
  for (
    const value
    of values
  ) {
    const integerValue =
      getInteger(
        value,
      );

    if (
      integerValue !==
      null
    ) {
      return integerValue;
    }
  }

  return null;
}