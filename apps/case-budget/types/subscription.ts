import type {
  CaseBudgetBillingInterval,
  CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

export type CaseBudgetBillingProvider =
  | "stripe"
  | "apple"
  | "google"
  | "manual"
  | "none";

export type CaseBudgetSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "none";

export type CaseBudgetSubscriptionSource =
  | "web"
  | "ios"
  | "android"
  | "admin"
  | "system";

export type CaseBudgetSubscription = {
  id:
    string;

  userId:
    string;

  workspaceId:
    string | null;

  plan:
    CaseBudgetPlan;

  billingProvider:
    CaseBudgetBillingProvider;

  billingInterval:
    CaseBudgetBillingInterval | null;

  status:
    CaseBudgetSubscriptionStatus;

  source:
    CaseBudgetSubscriptionSource;

  providerCustomerId:
    string | null;

  providerSubscriptionId:
    string | null;

  providerPriceId:
    string | null;

  providerProductId:
    string | null;

  currentPeriodStart:
    string | null;

  currentPeriodEnd:
    string | null;

  cancelAtPeriodEnd:
    boolean;

  canceledAt:
    string | null;

  trialStart:
    string | null;

  trialEnd:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;
};

export type CaseBudgetSubscriptionSummary = {
  plan:
    CaseBudgetPlan;

  status:
    CaseBudgetSubscriptionStatus;

  billingProvider:
    CaseBudgetBillingProvider;

  billingInterval:
    CaseBudgetBillingInterval | null;

  currentPeriodStart:
    string | null;

  currentPeriodEnd:
    string | null;

  cancelAtPeriodEnd:
    boolean;
};

export type CaseBudgetAiUsagePeriod = {
  id:
    string;

  userId:
    string;

  workspaceId:
    string | null;

  subscriptionId:
    string | null;

  plan:
    CaseBudgetPlan;

  periodStart:
    string;

  periodEnd:
    string;

  monthlyQuestionLimit:
    number;

  successfulQuestionsUsed:
    number;

  successfulQuestionsRemaining:
    number;

  inputTokens:
    number;

  cachedInputTokens:
    number;

  outputTokens:
    number;

  totalTokens:
    number;

  estimatedCostUsd:
    number;

  createdAt:
    string;

  updatedAt:
    string;
};

export type CaseBudgetAiRequestStatus =
  | "pending"
  | "completed"
  | "failed"
  | "canceled"
  | "blocked";

export type CaseBudgetAiRequest = {
  id:
    string;

  userId:
    string;

  workspaceId:
    string | null;

  subscriptionId:
    string | null;

  usagePeriodId:
    string | null;

  status:
    CaseBudgetAiRequestStatus;

  model:
    string;

  requestType:
    "ai-coach";

  promptCharacters:
    number;

  conversationMessageCount:
    number;

  inputTokens:
    number;

  cachedInputTokens:
    number;

  outputTokens:
    number;

  totalTokens:
    number;

  estimatedCostUsd:
    number;

  countedAgainstAllowance:
    boolean;

  providerRequestId:
    string | null;

  errorCode:
    string | null;

  errorMessage:
    string | null;

  startedAt:
    string;

  completedAt:
    string | null;

  createdAt:
    string;
};

export type CaseBudgetAiUsageSummary = {
  enabled:
    boolean;

  monthlyQuestionLimit:
    number;

  successfulQuestionsUsed:
    number;

  successfulQuestionsRemaining:
    number;

  usagePercentage:
    number;

  periodStart:
    string | null;

  periodEnd:
    string | null;

  estimatedCostUsd:
    number;
};

export type CaseBudgetSubscriptionEntitlementState = {
  subscription:
    CaseBudgetSubscriptionSummary;

  ai:
    CaseBudgetAiUsageSummary;
};

export type CaseBudgetSubscriptionCheckoutSelection = {
  plan:
    Exclude<
      CaseBudgetPlan,
      "free"
    >;

  interval:
    CaseBudgetBillingInterval;
};

export type CaseBudgetSubscriptionChangeType =
  | "upgrade"
  | "downgrade"
  | "interval-change"
  | "cancel"
  | "reactivate";

export type CaseBudgetSubscriptionChange = {
  type:
    CaseBudgetSubscriptionChangeType;

  fromPlan:
    CaseBudgetPlan;

  toPlan:
    CaseBudgetPlan;

  fromInterval:
    CaseBudgetBillingInterval | null;

  toInterval:
    CaseBudgetBillingInterval | null;

  effectiveAt:
    "immediately"
    | "period-end";
};

export function isCaseBudgetSubscriptionActive(
  status:
    CaseBudgetSubscriptionStatus,
) {
  return (
    status ===
      "active" ||
    status ===
      "trialing"
  );
}

export function hasPaidCaseBudgetSubscription(
  subscription:
    Pick<
      CaseBudgetSubscription,
      | "plan"
      | "status"
    >,
) {
  return (
    subscription.plan !==
      "free" &&
    isCaseBudgetSubscriptionActive(
      subscription.status,
    )
  );
}

export function isCaseBudgetSubscriptionCanceled(
  subscription:
    Pick<
      CaseBudgetSubscription,
      | "status"
      | "cancelAtPeriodEnd"
    >,
) {
  return (
    subscription.status ===
      "canceled" ||
    subscription.cancelAtPeriodEnd
  );
}

export function getCaseBudgetSubscriptionAccessPlan(
  subscription:
    Pick<
      CaseBudgetSubscription,
      | "plan"
      | "status"
    >,
): CaseBudgetPlan {
  if (
    subscription.plan ===
    "free"
  ) {
    return "free";
  }

  if (
    isCaseBudgetSubscriptionActive(
      subscription.status,
    )
  ) {
    return subscription.plan;
  }

  return "free";
}

export function getDefaultFreeSubscription({
  id,
  userId,
  workspaceId,
  createdAt,
}: {
  id:
    string;

  userId:
    string;

  workspaceId?:
    string | null;

  createdAt?:
    string;
}): CaseBudgetSubscription {
  const timestamp =
    createdAt ??
    new Date().toISOString();

  return {
    id,

    userId,

    workspaceId:
      workspaceId ??
      null,

    plan:
      "free",

    billingProvider:
      "none",

    billingInterval:
      null,

    status:
      "none",

    source:
      "system",

    providerCustomerId:
      null,

    providerSubscriptionId:
      null,

    providerPriceId:
      null,

    providerProductId:
      null,

    currentPeriodStart:
      null,

    currentPeriodEnd:
      null,

    cancelAtPeriodEnd:
      false,

    canceledAt:
      null,

    trialStart:
      null,

    trialEnd:
      null,

    createdAt:
      timestamp,

    updatedAt:
      timestamp,
  };
}