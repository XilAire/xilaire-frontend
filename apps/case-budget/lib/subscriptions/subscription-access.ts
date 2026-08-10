import "server-only";

import {
  createClient,
} from "@/lib/supabase/server";

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
  const identity =
    await requireAuthenticatedSubscriptionIdentity();

  const normalizedWorkspaceId =
    normalizeOptionalId(
      workspaceId,
    );

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
   * A missing subscription row always resolves to Free.
   *
   * We intentionally do not automatically insert a Free row here.
   * Access resolution should remain safe and read-only.
   *
   * Stripe checkout/webhooks or explicit account initialization can
   * persist the real subscription record separately.
   */
  const subscription =
    persistedSubscription ??
    getDefaultFreeSubscription({
      id:
        createTemporaryFreeSubscriptionId(
          identity.userId,
        ),

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

  const aiUsagePeriod =
    await findCurrentAiUsagePeriod({
      userId:
        identity.userId,

      workspaceId:
        normalizedWorkspaceId,

      subscription:
        persistedSubscription,

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

export async function requireAuthenticatedSubscriptionIdentity(): Promise<AuthenticatedSubscriptionIdentity> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .auth
      .getUser();

  if (
    error
  ) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.error(
        "[CASE Budget Subscription Access] Supabase getUser() failed.",
        {
          name:
            error.name,

          message:
            error.message,

          status:
            error.status,
        },
      );
    }

    throw new SubscriptionAccessError({
      code:
        "UNAUTHENTICATED",

      message:
        "You must be signed in to access this feature.",

      status:
        401,
    });
  }

  const user =
    data.user;

  if (
    !user
  ) {
    throw new SubscriptionAccessError({
      code:
        "UNAUTHENTICATED",

      message:
        "You must be signed in to access this feature.",

      status:
        401,
    });
  }

  const userId =
    normalizeRequiredId(
      user.id,
    );

  return {
    userId,

    email:
      normalizeOptionalText(
        user.email,
      ),
  };
}

async function findCurrentAiUsagePeriod({
  userId,
  workspaceId,
  subscription,
  now,
}: {
  userId:
    string;

  workspaceId:
    string | null;

  subscription:
    CaseBudgetSubscription | null;

  now:
    Date;
}) {
  /*
   * Free users and users without a persisted subscription cannot have
   * legitimate billable AI usage yet.
   */
  if (
    !subscription ||
    subscription.plan !==
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

  const repository =
    getSupabaseSubscriptionRepository();

  try {
    return await repository.findAiUsagePeriod({
      userId,

      workspaceId,

      subscriptionId:
        subscription.id,

      periodStart:
        start,

      periodEnd:
        end,
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

        periodStart:
          start,

        periodEnd:
          end,

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

function createTemporaryFreeSubscriptionId(
  userId:
    string,
) {
  return `free:${userId}`;
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