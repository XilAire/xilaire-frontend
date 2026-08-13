import "server-only";

import {
  CASE_BUDGET_DEFAULT_PLAN,
  canPurchaseAdditionalCaseBudgetWorkspaces,
  getAiCoachMonthlyQuestionLimit,
  getAiCoachQuestionsRemaining,
  getAiCoachUsagePercentage,
  getCaseBudgetEffectiveWorkspaceLimit,
  getCaseBudgetIncludedWorkspaceLimit,
  getCaseBudgetPlanEntitlements,
  hasAiCoachAccess,
  hasCaseBudgetFeature,
  type CaseBudgetFeature,
  type CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

import {
  getCaseBudgetSubscriptionAccessPlan,
  getDefaultFreeSubscription,
  isCaseBudgetSubscriptionActive,
  type CaseBudgetAiUsagePeriod,
  type CaseBudgetAiUsageSummary,
  type CaseBudgetSubscription,
  type CaseBudgetSubscriptionEntitlementState,
  type CaseBudgetSubscriptionSummary,
} from "@/types/subscription";

export type ResolveSubscriptionAccessInput = {
  subscription:
    CaseBudgetSubscription | null | undefined;

  aiUsagePeriod?:
    CaseBudgetAiUsagePeriod | null;

  now?:
    Date;
};

export type SubscriptionFeatureAccessResult = {
  allowed:
    boolean;

  feature:
    CaseBudgetFeature;

  effectivePlan:
    CaseBudgetPlan;

  requiredPlan:
    CaseBudgetPlan | null;

  reason:
    | "allowed"
    | "requires-plus"
    | "requires-pro"
    | "inactive-subscription";
};

export type AiCoachAccessResult = {
  allowed:
    boolean;

  plan:
    CaseBudgetPlan;

  reason:
    | "allowed"
    | "requires-pro"
    | "inactive-subscription"
    | "monthly-limit-reached";

  monthlyQuestionLimit:
    number;

  successfulQuestionsUsed:
    number;

  successfulQuestionsRemaining:
    number;
};

export function resolveCaseBudgetSubscriptionAccess({
  subscription,
  aiUsagePeriod,
}: ResolveSubscriptionAccessInput): CaseBudgetSubscriptionEntitlementState {
  const resolvedSubscription =
    subscription ??
    getDefaultFreeSubscription({
      id:
        "free-default",

      userId:
        "anonymous",

      workspaceId:
        null,
    });

  const effectivePlan =
    getCaseBudgetSubscriptionAccessPlan(
      resolvedSubscription,
    );

  const subscriptionSummary =
    buildSubscriptionSummary({
      subscription:
        resolvedSubscription,

      effectivePlan,
    });

  const aiSummary =
    buildAiUsageSummary({
      plan:
        effectivePlan,

      usagePeriod:
        aiUsagePeriod ??
        null,
    });

  const includedWorkspaceLimit =
    getCaseBudgetIncludedWorkspaceLimit(
      effectivePlan,
    );

  /*
   * Purchased workspace capacity is intentionally zero until the
   * workspace add-on billing/persistence layer is implemented.
   *
   * Keeping this value separate from the static plan entitlement lets
   * Stripe increase Pro workspace capacity later without changing the
   * five workspaces included with the base Pro plan.
   */
  const additionalWorkspaceLimit =
    0;

  const workspaceLimit =
    getCaseBudgetEffectiveWorkspaceLimit({
      plan:
        effectivePlan,

      additionalWorkspaceCount:
        additionalWorkspaceLimit,
    });

  const allowsAdditionalWorkspacePurchases =
    canPurchaseAdditionalCaseBudgetWorkspaces(
      effectivePlan,
    );

  return {
    subscription:
      subscriptionSummary,

    ai:
      aiSummary,

    workspaces: {
      includedWorkspaceLimit,

      additionalWorkspaceLimit,

      workspaceLimit,

      allowsAdditionalWorkspacePurchases,
    },
  };
}

export function canAccessCaseBudgetFeature({
  subscription,
  feature,
}: {
  subscription:
    CaseBudgetSubscription | null | undefined;

  feature:
    CaseBudgetFeature;
}): SubscriptionFeatureAccessResult {
  const effectivePlan =
    getEffectivePlan(
      subscription,
    );

  if (
    hasCaseBudgetFeature(
      effectivePlan,
      feature,
    )
  ) {
    return {
      allowed:
        true,

      feature,

      effectivePlan,

      requiredPlan:
        effectivePlan,

      reason:
        "allowed",
    };
  }

  const requiredPlan =
    getRequiredPlanForFeature(
      feature,
    );

  if (
    subscription &&
    subscription.plan !==
      "free" &&
    !isCaseBudgetSubscriptionActive(
      subscription.status,
    )
  ) {
    return {
      allowed:
        false,

      feature,

      effectivePlan,

      requiredPlan,

      reason:
        "inactive-subscription",
    };
  }

  return {
    allowed:
      false,

    feature,

    effectivePlan,

    requiredPlan,

    reason:
      requiredPlan ===
      "pro"
        ? "requires-pro"
        : "requires-plus",
  };
}

export function canUseAiCoach({
  subscription,
  aiUsagePeriod,
}: {
  subscription:
    CaseBudgetSubscription | null | undefined;

  aiUsagePeriod?:
    CaseBudgetAiUsagePeriod | null;
}): AiCoachAccessResult {
  const effectivePlan =
    getEffectivePlan(
      subscription,
    );

  if (
    subscription &&
    subscription.plan !==
      "free" &&
    !isCaseBudgetSubscriptionActive(
      subscription.status,
    )
  ) {
    return {
      allowed:
        false,

      plan:
        effectivePlan,

      reason:
        "inactive-subscription",

      monthlyQuestionLimit:
        0,

      successfulQuestionsUsed:
        0,

      successfulQuestionsRemaining:
        0,
    };
  }

  if (
    !hasAiCoachAccess(
      effectivePlan,
    )
  ) {
    return {
      allowed:
        false,

      plan:
        effectivePlan,

      reason:
        "requires-pro",

      monthlyQuestionLimit:
        0,

      successfulQuestionsUsed:
        0,

      successfulQuestionsRemaining:
        0,
    };
  }

  const monthlyQuestionLimit =
    getAiCoachMonthlyQuestionLimit(
      effectivePlan,
    );

  const successfulQuestionsUsed =
    normalizeUsageCount(
      aiUsagePeriod
        ?.successfulQuestionsUsed ??
      0,
    );

  const successfulQuestionsRemaining =
    getAiCoachQuestionsRemaining({
      plan:
        effectivePlan,

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

      plan:
        effectivePlan,

      reason:
        "monthly-limit-reached",

      monthlyQuestionLimit,

      successfulQuestionsUsed,

      successfulQuestionsRemaining:
        0,
    };
  }

  return {
    allowed:
      true,

    plan:
      effectivePlan,

    reason:
      "allowed",

    monthlyQuestionLimit,

    successfulQuestionsUsed,

    successfulQuestionsRemaining,
  };
}

export function getEffectivePlan(
  subscription:
    CaseBudgetSubscription | null | undefined,
): CaseBudgetPlan {
  if (
    !subscription
  ) {
    return CASE_BUDGET_DEFAULT_PLAN;
  }

  return getCaseBudgetSubscriptionAccessPlan(
    subscription,
  );
}

export function isCaseBudgetPaidAccessActive(
  subscription:
    CaseBudgetSubscription | null | undefined,
) {
  if (
    !subscription
  ) {
    return false;
  }

  return (
    subscription.plan !==
      "free" &&
    isCaseBudgetSubscriptionActive(
      subscription.status,
    )
  );
}

export function getCaseBudgetEntitlementsForSubscription(
  subscription:
    CaseBudgetSubscription | null | undefined,
) {
  return getCaseBudgetPlanEntitlements(
    getEffectivePlan(
      subscription,
    ),
  );
}

export function buildAiUsageSummary({
  plan,
  usagePeriod,
}: {
  plan:
    CaseBudgetPlan;

  usagePeriod:
    CaseBudgetAiUsagePeriod | null;
}): CaseBudgetAiUsageSummary {
  const enabled =
    hasAiCoachAccess(
      plan,
    );

  const monthlyQuestionLimit =
    enabled
      ? getAiCoachMonthlyQuestionLimit(
          plan,
        )
      : 0;

  const successfulQuestionsUsed =
    normalizeUsageCount(
      usagePeriod
        ?.successfulQuestionsUsed ??
      0,
    );

  const successfulQuestionsRemaining =
    enabled
      ? getAiCoachQuestionsRemaining({
          plan,

          used:
            successfulQuestionsUsed,
        })
      : 0;

  const usagePercentage =
    enabled
      ? getAiCoachUsagePercentage({
          plan,

          used:
            successfulQuestionsUsed,
        })
      : 0;

  return {
    enabled,

    monthlyQuestionLimit,

    successfulQuestionsUsed,

    successfulQuestionsRemaining,

    usagePercentage,

    periodStart:
      usagePeriod
        ?.periodStart ??
      null,

    periodEnd:
      usagePeriod
        ?.periodEnd ??
      null,

    estimatedCostUsd:
      normalizeMoney(
        usagePeriod
          ?.estimatedCostUsd ??
        0,
      ),
  };
}

export function buildSubscriptionSummary({
  subscription,
  effectivePlan,
}: {
  subscription:
    CaseBudgetSubscription;

  effectivePlan?:
    CaseBudgetPlan;
}): CaseBudgetSubscriptionSummary {
  return {
    plan:
      effectivePlan ??
      getCaseBudgetSubscriptionAccessPlan(
        subscription,
      ),

    status:
      subscription.status,

    billingProvider:
      subscription.billingProvider,

    billingInterval:
      subscription.billingInterval,

    currentPeriodStart:
      subscription.currentPeriodStart,

    currentPeriodEnd:
      subscription.currentPeriodEnd,

    cancelAtPeriodEnd:
      subscription.cancelAtPeriodEnd,
  };
}

export function getAiUsagePeriodBounds({
  date =
    new Date(),
}: {
  date?:
    Date;
} = {}) {
  const start =
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        1,
        0,
        0,
        0,
        0,
      ),
    );

  const end =
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() +
          1,
        1,
        0,
        0,
        0,
        0,
      ),
    );

  return {
    start:
      start.toISOString(),

    end:
      end.toISOString(),
  };
}

export function isWithinAiUsagePeriod({
  timestamp,
  periodStart,
  periodEnd,
}: {
  timestamp:
    string | Date;

  periodStart:
    string;

  periodEnd:
    string;
}) {
  const timestampValue =
    toTimeValue(
      timestamp,
    );

  const startValue =
    toTimeValue(
      periodStart,
    );

  const endValue =
    toTimeValue(
      periodEnd,
    );

  if (
    timestampValue ===
      null ||
    startValue ===
      null ||
    endValue ===
      null
  ) {
    return false;
  }

  return (
    timestampValue >=
      startValue &&
    timestampValue <
      endValue
  );
}

export function shouldCountAiRequestAgainstAllowance({
  status,
  responseMessage,
}: {
  status:
    "pending"
    | "completed"
    | "failed"
    | "canceled"
    | "blocked";

  responseMessage?:
    string | null;
}) {
  if (
    status !==
    "completed"
  ) {
    return false;
  }

  return Boolean(
    responseMessage
      ?.trim(),
  );
}

function getRequiredPlanForFeature(
  feature:
    CaseBudgetFeature,
): CaseBudgetPlan | null {
  if (
    hasCaseBudgetFeature(
      "free",
      feature,
    )
  ) {
    return "free";
  }

  if (
    hasCaseBudgetFeature(
      "plus",
      feature,
    )
  ) {
    return "plus";
  }

  if (
    hasCaseBudgetFeature(
      "pro",
      feature,
    )
  ) {
    return "pro";
  }

  return null;
}

function normalizeUsageCount(
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

function toTimeValue(
  value:
    string | Date,
) {
  const date =
    value instanceof
      Date
      ? value
      : new Date(
          value,
        );

  const time =
    date.getTime();

  if (
    Number.isNaN(
      time,
    )
  ) {
    return null;
  }

  return time;
}