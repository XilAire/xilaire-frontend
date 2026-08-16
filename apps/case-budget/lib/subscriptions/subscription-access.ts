import "server-only";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import {
  requireCaseBudgetUser,
} from "@/lib/auth/server-auth";

import {
  getAiCoachMonthlyQuestionLimit,
} from "@/lib/subscriptions/plan-entitlements";

import {
  getAiUsagePeriodBounds,
  getEffectivePlan,
  resolveCaseBudgetSubscriptionAccess,
} from "@/lib/subscriptions/subscription-service";

import {
  getSupabaseSubscriptionRepository,
} from "@/lib/subscriptions/subscription-storage";

import {
  getDefaultFreeSubscription,
  type CaseBudgetAiUsagePeriod,
  type CaseBudgetSubscription,
  type CaseBudgetSubscriptionEntitlementState,
} from "@/types/subscription";

import type {
  CaseBudgetFeature,
  CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

import {
  canAccessCaseBudgetFeature,
  canUseAiCoach,
  type AiCoachAccessResult,
  type SubscriptionFeatureAccessResult,
} from "@/lib/subscriptions/subscription-service";

export type SubscriptionAccessErrorCode =
  | "UNAUTHENTICATED"
  | "WORKSPACE_ACCESS_DENIED"
  | "SUBSCRIPTION_LOOKUP_FAILED"
  | "AI_USAGE_LOOKUP_FAILED";

export class SubscriptionAccessError
  extends Error {
  readonly code:
    SubscriptionAccessErrorCode;

  readonly status:
    number;

  constructor({
    code,
    message,
    status,
  }: {
    code:
      SubscriptionAccessErrorCode;

    message:
      string;

    status:
      number;
  }) {
    super(
      message,
    );

    this.name =
      "SubscriptionAccessError";

    this.code =
      code;

    this.status =
      status;
  }
}

export type AuthenticatedSubscriptionIdentity = {
  userId:
    string;

  email:
    string | null;
};

export type ResolvedSubscriptionAccess = {
  identity:
    AuthenticatedSubscriptionIdentity;

  workspaceId:
    string | null;

  subscription:
    CaseBudgetSubscription;

  persistedSubscription:
    CaseBudgetSubscription | null;

  effectivePlan:
    CaseBudgetPlan;

  aiUsagePeriod:
    CaseBudgetAiUsagePeriod | null;

  entitlements:
    CaseBudgetSubscriptionEntitlementState;
};

export type ResolveAuthenticatedSubscriptionAccessInput = {
  workspaceId?:
    string | null;

  now?:
    Date;
};

export type ResolveAuthenticatedFeatureAccessInput = {
  feature:
    CaseBudgetFeature;

  workspaceId?:
    string | null;
};

export type ResolveAuthenticatedAiCoachAccessInput = {
  workspaceId?:
    string | null;

  now?:
    Date;
};

export type AuthenticatedFeatureAccessResult = {
  identity:
    AuthenticatedSubscriptionIdentity;

  subscription:
    CaseBudgetSubscription;

  access:
    SubscriptionFeatureAccessResult;
};

export type AuthenticatedAiCoachAccessResult = {
  identity:
    AuthenticatedSubscriptionIdentity;

  subscription:
    CaseBudgetSubscription;

  usagePeriod:
    CaseBudgetAiUsagePeriod | null;

  access:
    AiCoachAccessResult;
};

export async function resolveAuthenticatedSubscriptionAccess({
  workspaceId,
  now =
    new Date(),
}: ResolveAuthenticatedSubscriptionAccessInput = {}): Promise<ResolvedSubscriptionAccess> {
  const {
    user,
    userId,
  } =
    await requireCaseBudgetUser();

  const identity:
    AuthenticatedSubscriptionIdentity = {
      userId,

      email:
        normalizeOptionalText(
          user.email,
        ),
    };

  const normalizedWorkspaceId =
    normalizeOptionalId(
      workspaceId,
    );

  if (
    normalizedWorkspaceId
  ) {
    await requireActiveWorkspaceMembership({
      userId:
        identity.userId,

      workspaceId:
        normalizedWorkspaceId,
    });
  }

  const repository =
    getSupabaseSubscriptionRepository();

  let persistedSubscription:
    CaseBudgetSubscription | null;

  try {
    persistedSubscription =
      await repository.findSubscription({
        userId:
          identity.userId,

        workspaceId:
          normalizedWorkspaceId,
      });
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Subscription Access] Subscription lookup failed.",
      {
        userId:
          identity.userId,

        workspaceId:
          normalizedWorkspaceId,

        error,
      },
    );

    throw new SubscriptionAccessError({
      code:
        "SUBSCRIPTION_LOOKUP_FAILED",

      message:
        "CASE Budget could not determine the current subscription.",

      status:
        500,
    });
  }

  /*
   * Subscription resolution order:
   *
   * 1. Active workspace subscription.
   * 2. Authenticated user's personal subscription.
   * 3. Temporary Free subscription.
   *
   * The repository handles the first two cases.
   */
  const subscription =
    persistedSubscription ??
    getDefaultFreeSubscription({
      id:
        createTemporaryFreeSubscriptionId({
          userId:
            identity.userId,

          workspaceId:
            normalizedWorkspaceId,
        }),

      userId:
        identity.userId,

      workspaceId:
        normalizedWorkspaceId,

      createdAt:
        now.toISOString(),
    });

  const effectivePlan =
    getEffectivePlan(
      subscription,
    );

  /*
   * AI usage enforcement is workspace-shared for workspace subscriptions.
   *
   * Per-user usage rows are still stored so CASE Budget can track who used
   * the AI Coach, but the allowance is enforced against the sum of all
   * active users in the workspace.
   */
  const aiUsagePeriod =
    await resolveAiUsagePeriodForAccess({
      userId:
        identity.userId,

      workspaceId:
        normalizedWorkspaceId,

      subscription:
        persistedSubscription,

      effectivePlan,

      now,
    });

  const entitlements =
    resolveCaseBudgetSubscriptionAccess({
      subscription,

      aiUsagePeriod,

      now,
    });

  return {
    identity,

    workspaceId:
      normalizedWorkspaceId,

    subscription,

    persistedSubscription,

    effectivePlan,

    aiUsagePeriod,

    entitlements,
  };
}

export async function resolveAuthenticatedFeatureAccess({
  feature,
  workspaceId,
}: ResolveAuthenticatedFeatureAccessInput): Promise<AuthenticatedFeatureAccessResult> {
  const resolved =
    await resolveAuthenticatedSubscriptionAccess({
      workspaceId,
    });

  const access =
    canAccessCaseBudgetFeature({
      subscription:
        resolved.subscription,

      feature,
    });

  return {
    identity:
      resolved.identity,

    subscription:
      resolved.subscription,

    access,
  };
}

export async function resolveAuthenticatedAiCoachAccess({
  workspaceId,
  now =
    new Date(),
}: ResolveAuthenticatedAiCoachAccessInput = {}): Promise<AuthenticatedAiCoachAccessResult> {
  const resolved =
    await resolveAuthenticatedSubscriptionAccess({
      workspaceId,

      now,
    });

  const access =
    canUseAiCoach({
      subscription:
        resolved.subscription,

      aiUsagePeriod:
        resolved.aiUsagePeriod,
    });

  return {
    identity:
      resolved.identity,

    subscription:
      resolved.subscription,

    usagePeriod:
      resolved.aiUsagePeriod,

    access,
  };
}

async function requireActiveWorkspaceMembership({
  userId,
  workspaceId,
}: {
  userId:
    string;

  workspaceId:
    string;
}) {
  const workspaceAdmin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await workspaceAdmin
      .from(
        "workspace_members",
      )
      .select(
        "id,status",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "status",
        "active",
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Subscription Access] Workspace membership verification failed.",
      {
        userId,
        workspaceId,
        error,
      },
    );

    throw new SubscriptionAccessError({
      code:
        "WORKSPACE_ACCESS_DENIED",

      message:
        "CASE Budget could not verify your access to this workspace.",

      status:
        403,
    });
  }

  if (
    !data
  ) {
    throw new SubscriptionAccessError({
      code:
        "WORKSPACE_ACCESS_DENIED",

      message:
        "You do not have access to this workspace.",

      status:
        403,
    });
  }
}

async function resolveAiUsagePeriodForAccess({
  userId,
  workspaceId,
  subscription,
  effectivePlan,
  now,
}: {
  userId:
    string;

  workspaceId:
    string | null;

  subscription:
    CaseBudgetSubscription | null;

  effectivePlan:
    CaseBudgetPlan;

  now:
    Date;
}): Promise<CaseBudgetAiUsagePeriod | null> {
  /*
   * Only persisted Pro subscriptions can have billable AI usage.
   */
  if (
    !subscription ||
    effectivePlan !==
      "pro"
  ) {
    return null;
  }

  const {
    start,
    end,
  } =
    getAiUsagePeriodBounds({
      date:
        now,
    });

  /*
   * Workspace-scoped Pro subscriptions share one 200-question allowance
   * across every active member of that workspace.
   */
  if (
    workspaceId &&
    subscription.workspaceId ===
      workspaceId
  ) {
    return findWorkspaceAiUsagePeriod({
      userId,

      workspaceId,

      subscription,

      periodStart:
        start,

      periodEnd:
        end,

      now,
    });
  }

  /*
   * Personal subscriptions continue to use the authenticated user's own
   * usage period.
   */
  return findCurrentUserAiUsagePeriod({
    userId,

    workspaceId,

    subscription,

    periodStart:
      start,

    periodEnd:
      end,
  });
}

async function findWorkspaceAiUsagePeriod({
  userId,
  workspaceId,
  subscription,
  periodStart,
  periodEnd,
  now,
}: {
  userId:
    string;

  workspaceId:
    string;

  subscription:
    CaseBudgetSubscription;

  periodStart:
    string;

  periodEnd:
    string;

  now:
    Date;
}): Promise<CaseBudgetAiUsagePeriod> {
  const repository =
    getSupabaseSubscriptionRepository();

  try {
    const aggregate =
      await repository
        .findWorkspaceAiUsageAggregate({
          workspaceId,

          subscriptionId:
            subscription.id,

          periodStart,

          periodEnd,
        });

    const monthlyQuestionLimit =
      getAiCoachMonthlyQuestionLimit(
        "pro",
      );

    const successfulQuestionsUsed =
      normalizeUsageCount(
        aggregate.successfulQuestionsUsed,
      );

    return {
      /*
       * This is a synthetic aggregate access model.
       *
       * It is not persisted back into case_budget_ai_usage_periods.
       * Individual member usage rows remain the source of truth.
       */
      id:
        createWorkspaceAggregateUsagePeriodId({
          workspaceId,

          subscriptionId:
            subscription.id,

          periodStart,
        }),

      /*
       * CaseBudgetAiUsagePeriod currently requires userId.
       *
       * We retain the requesting user's ID here only because the shared
       * type requires it. Usage totals themselves come from every user in
       * the workspace.
       */
      userId,

      workspaceId,

      subscriptionId:
        subscription.id,

      plan:
        "pro",

      periodStart,

      periodEnd,

      monthlyQuestionLimit,

      successfulQuestionsUsed,

      successfulQuestionsRemaining:
        Math.max(
          0,
          monthlyQuestionLimit -
            successfulQuestionsUsed,
        ),

      inputTokens:
        normalizeUsageCount(
          aggregate.inputTokens,
        ),

      cachedInputTokens:
        normalizeUsageCount(
          aggregate.cachedInputTokens,
        ),

      outputTokens:
        normalizeUsageCount(
          aggregate.outputTokens,
        ),

      totalTokens:
        normalizeUsageCount(
          aggregate.totalTokens,
        ),

      estimatedCostUsd:
        normalizeMoney(
          aggregate.estimatedCostUsd,
        ),

      createdAt:
        periodStart,

      updatedAt:
        now.toISOString(),
    };
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Subscription Access] Workspace AI usage lookup failed.",
      {
        userId,

        workspaceId,

        subscriptionId:
          subscription.id,

        periodStart,

        periodEnd,

        error,
      },
    );

    throw new SubscriptionAccessError({
      code:
        "AI_USAGE_LOOKUP_FAILED",

      message:
        "CASE Budget could not determine the workspace AI Coach usage.",

      status:
        500,
    });
  }
}

async function findCurrentUserAiUsagePeriod({
  userId,
  workspaceId,
  subscription,
  periodStart,
  periodEnd,
}: {
  userId:
    string;

  workspaceId:
    string | null;

  subscription:
    CaseBudgetSubscription;

  periodStart:
    string;

  periodEnd:
    string;
}) {
  const repository =
    getSupabaseSubscriptionRepository();

  try {
    return await repository.findAiUsagePeriod({
      userId,

      workspaceId,

      subscriptionId:
        subscription.id,

      periodStart,

      periodEnd,
    });
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Subscription Access] AI usage lookup failed.",
      {
        userId,

        workspaceId,

        subscriptionId:
          subscription.id,

        periodStart,

        periodEnd,

        error,
      },
    );

    throw new SubscriptionAccessError({
      code:
        "AI_USAGE_LOOKUP_FAILED",

      message:
        "CASE Budget could not determine the current AI Coach usage.",

      status:
        500,
    });
  }
}

export function isSubscriptionAccessError(
  error:
    unknown,
): error is SubscriptionAccessError {
  return error instanceof
    SubscriptionAccessError;
}

export function getSubscriptionAccessErrorStatus(
  error:
    unknown,
) {
  if (
    isSubscriptionAccessError(
      error,
    )
  ) {
    return error.status;
  }

  return 500;
}

export function getSubscriptionAccessErrorMessage(
  error:
    unknown,
) {
  if (
    isSubscriptionAccessError(
      error,
    )
  ) {
    return error.message;
  }

  return "CASE Budget could not determine subscription access.";
}

function createTemporaryFreeSubscriptionId({
  userId,
  workspaceId,
}: {
  userId:
    string;

  workspaceId:
    string | null;
}) {
  if (
    workspaceId
  ) {
    return `free:${userId}:${workspaceId}`;
  }

  return `free:${userId}`;
}

function createWorkspaceAggregateUsagePeriodId({
  workspaceId,
  subscriptionId,
  periodStart,
}: {
  workspaceId:
    string;

  subscriptionId:
    string;

  periodStart:
    string;
}) {
  return [
    "workspace-ai",
    workspaceId,
    subscriptionId,
    periodStart,
  ].join(
    ":",
  );
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

  return (
    Math.round(
      Math.max(
        0,
        value,
      ) *
        1_000_000,
    ) /
    1_000_000
  );
}

function normalizeRequiredId(
  value:
    string,
) {
  const normalizedValue =
    value.trim();

  if (
    !normalizedValue
  ) {
    throw new SubscriptionAccessError({
      code:
        "UNAUTHENTICATED",

      message:
        "The authenticated user identifier is missing.",

      status:
        401,
    });
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