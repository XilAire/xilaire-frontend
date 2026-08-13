import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  configureSubscriptionRepository,
  type FindAiUsagePeriodInput,
  type FindSubscriptionInput,
  type FindWorkspaceAiUsageAggregateInput,
  type SaveAiRequestInput,
  type SaveAiUsagePeriodInput,
  type SaveSubscriptionInput,
  type SubscriptionRepository,
  type WorkspaceAiUsageAggregate,
} from "@/lib/subscriptions/subscription-repository";

import type {
  CaseBudgetAiRequest,
  CaseBudgetAiRequestStatus,
  CaseBudgetAiUsagePeriod,
  CaseBudgetBillingProvider,
  CaseBudgetSubscription,
  CaseBudgetSubscriptionSource,
  CaseBudgetSubscriptionStatus,
} from "@/types/subscription";

import type {
  CaseBudgetBillingInterval,
  CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

type UnknownRecord =
  Record<
    string,
    unknown
  >;

type SubscriptionRow = {
  id:
    string;

  user_id:
    string;

  workspace_id:
    string | null;

  plan:
    string;

  billing_provider:
    string;

  billing_interval:
    string | null;

  status:
    string;

  source:
    string;

  provider_customer_id:
    string | null;

  provider_subscription_id:
    string | null;

  provider_price_id:
    string | null;

  provider_product_id:
    string | null;

  current_period_start:
    string | null;

  current_period_end:
    string | null;

  cancel_at_period_end:
    boolean;

  canceled_at:
    string | null;

  trial_start:
    string | null;

  trial_end:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

type AiUsagePeriodRow = {
  id:
    string;

  user_id:
    string;

  workspace_id:
    string | null;

  subscription_id:
    string | null;

  plan:
    string;

  period_start:
    string;

  period_end:
    string;

  monthly_question_limit:
    number;

  successful_questions_used:
    number;

  input_tokens:
    number;

  cached_input_tokens:
    number;

  output_tokens:
    number;

  total_tokens:
    number;

  estimated_cost_usd:
    number | string;

  created_at:
    string;

  updated_at:
    string;
};

type AiRequestRow = {
  id:
    string;

  user_id:
    string;

  workspace_id:
    string | null;

  subscription_id:
    string | null;

  usage_period_id:
    string | null;

  request_type:
    string;

  status:
    string;

  model:
    string;

  prompt_characters:
    number;

  conversation_message_count:
    number;

  input_tokens:
    number;

  cached_input_tokens:
    number;

  output_tokens:
    number;

  total_tokens:
    number;

  estimated_cost_usd:
    number | string;

  counted_against_allowance:
    boolean;

  provider_request_id:
    string | null;

  error_code:
    string | null;

  error_message:
    string | null;

  started_at:
    string;

  completed_at:
    string | null;

  created_at:
    string;
};

const subscriptionRepository:
  SubscriptionRepository = {
  async findSubscription(
    input:
      FindSubscriptionInput,
  ) {
    return findSubscription(
      input,
    );
  },

  async findAiUsagePeriod(
    input:
      FindAiUsagePeriodInput,
  ) {
    return findAiUsagePeriod(
      input,
    );
  },

  async findWorkspaceAiUsageAggregate(
    input:
      FindWorkspaceAiUsageAggregateInput,
  ) {
    return findWorkspaceAiUsageAggregate(
      input,
    );
  },

  async saveSubscription(
    input:
      SaveSubscriptionInput,
  ) {
    return saveSubscription(
      input,
    );
  },

  async saveAiUsagePeriod(
    input:
      SaveAiUsagePeriodInput,
  ) {
    return saveAiUsagePeriod(
      input,
    );
  },

  async saveAiRequest(
    input:
      SaveAiRequestInput,
  ) {
    return saveAiRequest(
      input,
    );
  },
};

let configured =
  false;

export function configureSupabaseSubscriptionStorage() {
  if (
    configured
  ) {
    return;
  }

  configureSubscriptionRepository(
    subscriptionRepository,
  );

  configured =
    true;
}

export function getSupabaseSubscriptionRepository():
  SubscriptionRepository {
  return subscriptionRepository;
}

async function findSubscription({
  userId,
  workspaceId,
}: FindSubscriptionInput) {
  const normalizedUserId =
    normalizeRequiredId(
      userId,
      "userId",
    );

  const normalizedWorkspaceId =
    normalizeOptionalId(
      workspaceId,
    );

  if (
    normalizedWorkspaceId
  ) {
    const workspaceSubscription =
      await findLatestWorkspaceSubscription({
        workspaceId:
          normalizedWorkspaceId,
      });

    if (
      workspaceSubscription
    ) {
      return workspaceSubscription;
    }

    return findLatestPersonalSubscription({
      userId:
        normalizedUserId,
    });
  }

  return findLatestPersonalSubscription({
    userId:
      normalizedUserId,
  });
}

async function findLatestWorkspaceSubscription({
  workspaceId,
}: {
  workspaceId:
    string;
}): Promise<
  CaseBudgetSubscription | null
> {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "case_budget_subscriptions",
      )
      .select(
        "*",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .order(
        "updated_at",
        {
          ascending:
            false,
        },
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    error
  ) {
    throw createStorageError({
      operation:
        "find workspace subscription",

      error,
    });
  }

  if (
    !data
  ) {
    return null;
  }

  return mapSubscriptionRow(
    data as
      SubscriptionRow,
  );
}

async function findLatestPersonalSubscription({
  userId,
}: {
  userId:
    string;
}): Promise<
  CaseBudgetSubscription | null
> {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "case_budget_subscriptions",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .is(
        "workspace_id",
        null,
      )
      .order(
        "updated_at",
        {
          ascending:
            false,
        },
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    error
  ) {
    throw createStorageError({
      operation:
        "find personal subscription",

      error,
    });
  }

  if (
    !data
  ) {
    return null;
  }

  return mapSubscriptionRow(
    data as
      SubscriptionRow,
  );
}

async function findAiUsagePeriod({
  userId,
  workspaceId,
  subscriptionId,
  periodStart,
  periodEnd,
}: FindAiUsagePeriodInput) {
  const supabase =
    createAdminClient();

  const normalizedUserId =
    normalizeRequiredId(
      userId,
      "userId",
    );

  const normalizedWorkspaceId =
    normalizeOptionalId(
      workspaceId,
    );

  const normalizedSubscriptionId =
    normalizeOptionalId(
      subscriptionId,
    );

  const normalizedPeriodStart =
    normalizeRequiredTimestamp(
      periodStart,
      "periodStart",
    );

  const normalizedPeriodEnd =
    normalizeRequiredTimestamp(
      periodEnd,
      "periodEnd",
    );

  let query =
    supabase
      .from(
        "case_budget_ai_usage_periods",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        normalizedUserId,
      )
      .eq(
        "period_start",
        normalizedPeriodStart,
      )
      .eq(
        "period_end",
        normalizedPeriodEnd,
      );

  if (
    normalizedWorkspaceId
  ) {
    query =
      query.eq(
        "workspace_id",
        normalizedWorkspaceId,
      );
  } else {
    query =
      query.is(
        "workspace_id",
        null,
      );
  }

  if (
    normalizedSubscriptionId
  ) {
    query =
      query.eq(
        "subscription_id",
        normalizedSubscriptionId,
      );
  } else {
    query =
      query.is(
        "subscription_id",
        null,
      );
  }

  const {
    data,
    error,
  } =
    await query
      .order(
        "updated_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    error
  ) {
    throw createStorageError({
      operation:
        "find AI usage period",

      error,
    });
  }

  if (
    !data
  ) {
    return null;
  }

  return mapAiUsagePeriodRow(
    data as
      AiUsagePeriodRow,
  );
}

async function findWorkspaceAiUsageAggregate({
  workspaceId,
  subscriptionId,
  periodStart,
  periodEnd,
}: FindWorkspaceAiUsageAggregateInput): Promise<WorkspaceAiUsageAggregate> {
  const normalizedWorkspaceId =
    normalizeRequiredId(
      workspaceId,
      "workspaceId",
    );

  const normalizedSubscriptionId =
    normalizeRequiredId(
      subscriptionId,
      "subscriptionId",
    );

  const normalizedPeriodStart =
    normalizeRequiredTimestamp(
      periodStart,
      "periodStart",
    );

  const normalizedPeriodEnd =
    normalizeRequiredTimestamp(
      periodEnd,
      "periodEnd",
    );

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "case_budget_ai_usage_periods",
      )
      .select(
        [
          "workspace_id",
          "subscription_id",
          "period_start",
          "period_end",
          "successful_questions_used",
          "input_tokens",
          "cached_input_tokens",
          "output_tokens",
          "total_tokens",
          "estimated_cost_usd",
        ].join(
          ",",
        ),
      )
      .eq(
        "workspace_id",
        normalizedWorkspaceId,
      )
      .eq(
        "subscription_id",
        normalizedSubscriptionId,
      )
      .eq(
        "period_start",
        normalizedPeriodStart,
      )
      .eq(
        "period_end",
        normalizedPeriodEnd,
      );

  if (
    error
  ) {
    throw createStorageError({
      operation:
        "find workspace AI usage aggregate",

      error,
    });
  }

  const rows =
    (
      data ??
      []
    ) as unknown as
      AiUsagePeriodRow[];

  let successfulQuestionsUsed =
    0;

  let inputTokens =
    0;

  let cachedInputTokens =
    0;

  let outputTokens =
    0;

  let totalTokens =
    0;

  let estimatedCostUsd =
    0;

  for (
    const row
    of rows
  ) {
    successfulQuestionsUsed +=
      normalizeNonNegativeInteger(
        row.successful_questions_used,
      );

    inputTokens +=
      normalizeNonNegativeInteger(
        row.input_tokens,
      );

    cachedInputTokens +=
      normalizeNonNegativeInteger(
        row.cached_input_tokens,
      );

    outputTokens +=
      normalizeNonNegativeInteger(
        row.output_tokens,
      );

    totalTokens +=
      normalizeNonNegativeInteger(
        row.total_tokens,
      );

    estimatedCostUsd +=
      normalizeMoney(
        row.estimated_cost_usd,
      );
  }

  return {
    workspaceId:
      normalizedWorkspaceId,

    subscriptionId:
      normalizedSubscriptionId,

    periodStart:
      normalizedPeriodStart,

    periodEnd:
      normalizedPeriodEnd,

    successfulQuestionsUsed:
      normalizeNonNegativeInteger(
        successfulQuestionsUsed,
      ),

    inputTokens:
      normalizeNonNegativeInteger(
        inputTokens,
      ),

    cachedInputTokens:
      normalizeNonNegativeInteger(
        cachedInputTokens,
      ),

    outputTokens:
      normalizeNonNegativeInteger(
        outputTokens,
      ),

    totalTokens:
      normalizeNonNegativeInteger(
        totalTokens,
      ),

    estimatedCostUsd:
      normalizeMoney(
        estimatedCostUsd,
      ),
  };
}

async function saveSubscription({
  subscription,
}: SaveSubscriptionInput) {
  const supabase =
    createAdminClient();

  const payload =
    mapSubscriptionToRow(
      subscription,
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "case_budget_subscriptions",
      )
      .upsert(
        payload,
        {
          onConflict:
            "id",
        },
      )
      .select(
        "*",
      )
      .single();

  if (
    error
  ) {
    throw createStorageError({
      operation:
        "save subscription",

      error,
    });
  }

  return mapSubscriptionRow(
    data as
      SubscriptionRow,
  );
}

async function saveAiUsagePeriod({
  usagePeriod,
}: SaveAiUsagePeriodInput) {
  const supabase =
    createAdminClient();

  const payload =
    mapAiUsagePeriodToRow(
      usagePeriod,
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "case_budget_ai_usage_periods",
      )
      .upsert(
        payload,
        {
          onConflict:
            "id",
        },
      )
      .select(
        "*",
      )
      .single();

  if (
    error
  ) {
    throw createStorageError({
      operation:
        "save AI usage period",

      error,
    });
  }

  return mapAiUsagePeriodRow(
    data as
      AiUsagePeriodRow,
  );
}

async function saveAiRequest({
  request,
}: SaveAiRequestInput) {
  const supabase =
    createAdminClient();

  const payload =
    mapAiRequestToRow(
      request,
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "case_budget_ai_requests",
      )
      .upsert(
        payload,
        {
          onConflict:
            "id",
        },
      )
      .select(
        "*",
      )
      .single();

  if (
    error
  ) {
    throw createStorageError({
      operation:
        "save AI request",

      error,
    });
  }

  return mapAiRequestRow(
    data as
      AiRequestRow,
  );
}

function mapSubscriptionToRow(
  subscription:
    CaseBudgetSubscription,
) {
  return {
    id:
      normalizeRequiredId(
        subscription.id,
        "subscription.id",
      ),

    user_id:
      normalizeRequiredId(
        subscription.userId,
        "subscription.userId",
      ),

    workspace_id:
      normalizeOptionalId(
        subscription.workspaceId,
      ),

    plan:
      subscription.plan,

    billing_provider:
      subscription.billingProvider,

    billing_interval:
      subscription.billingInterval,

    status:
      subscription.status,

    source:
      subscription.source,

    provider_customer_id:
      normalizeOptionalText(
        subscription.providerCustomerId,
      ),

    provider_subscription_id:
      normalizeOptionalText(
        subscription.providerSubscriptionId,
      ),

    provider_price_id:
      normalizeOptionalText(
        subscription.providerPriceId,
      ),

    provider_product_id:
      normalizeOptionalText(
        subscription.providerProductId,
      ),

    current_period_start:
      normalizeOptionalTimestamp(
        subscription.currentPeriodStart,
      ),

    current_period_end:
      normalizeOptionalTimestamp(
        subscription.currentPeriodEnd,
      ),

    cancel_at_period_end:
      Boolean(
        subscription.cancelAtPeriodEnd,
      ),

    canceled_at:
      normalizeOptionalTimestamp(
        subscription.canceledAt,
      ),

    trial_start:
      normalizeOptionalTimestamp(
        subscription.trialStart,
      ),

    trial_end:
      normalizeOptionalTimestamp(
        subscription.trialEnd,
      ),

    created_at:
      normalizeRequiredTimestamp(
        subscription.createdAt,
        "subscription.createdAt",
      ),

    updated_at:
      normalizeRequiredTimestamp(
        subscription.updatedAt,
        "subscription.updatedAt",
      ),
  };
}

function mapSubscriptionRow(
  row:
    SubscriptionRow,
): CaseBudgetSubscription {
  const plan =
    parsePlan(
      row.plan,
    );

  const billingProvider =
    parseBillingProvider(
      row.billing_provider,
    );

  const billingInterval =
    parseBillingInterval(
      row.billing_interval,
    );

  const status =
    parseSubscriptionStatus(
      row.status,
    );

  const source =
    parseSubscriptionSource(
      row.source,
    );

  return {
    id:
      row.id,

    userId:
      row.user_id,

    workspaceId:
      row.workspace_id,

    plan,

    billingProvider,

    billingInterval,

    status,

    source,

    providerCustomerId:
      row.provider_customer_id,

    providerSubscriptionId:
      row.provider_subscription_id,

    providerPriceId:
      row.provider_price_id,

    providerProductId:
      row.provider_product_id,

    currentPeriodStart:
      row.current_period_start,

    currentPeriodEnd:
      row.current_period_end,

    cancelAtPeriodEnd:
      row.cancel_at_period_end,

    canceledAt:
      row.canceled_at,

    trialStart:
      row.trial_start,

    trialEnd:
      row.trial_end,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

function mapAiUsagePeriodToRow(
  usagePeriod:
    CaseBudgetAiUsagePeriod,
) {
  return {
    id:
      normalizeRequiredId(
        usagePeriod.id,
        "usagePeriod.id",
      ),

    user_id:
      normalizeRequiredId(
        usagePeriod.userId,
        "usagePeriod.userId",
      ),

    workspace_id:
      normalizeOptionalId(
        usagePeriod.workspaceId,
      ),

    subscription_id:
      normalizeOptionalId(
        usagePeriod.subscriptionId,
      ),

    plan:
      usagePeriod.plan,

    period_start:
      normalizeRequiredTimestamp(
        usagePeriod.periodStart,
        "usagePeriod.periodStart",
      ),

    period_end:
      normalizeRequiredTimestamp(
        usagePeriod.periodEnd,
        "usagePeriod.periodEnd",
      ),

    monthly_question_limit:
      normalizeNonNegativeInteger(
        usagePeriod.monthlyQuestionLimit,
      ),

    successful_questions_used:
      normalizeNonNegativeInteger(
        usagePeriod.successfulQuestionsUsed,
      ),

    input_tokens:
      normalizeNonNegativeInteger(
        usagePeriod.inputTokens,
      ),

    cached_input_tokens:
      normalizeNonNegativeInteger(
        usagePeriod.cachedInputTokens,
      ),

    output_tokens:
      normalizeNonNegativeInteger(
        usagePeriod.outputTokens,
      ),

    total_tokens:
      normalizeNonNegativeInteger(
        usagePeriod.totalTokens,
      ),

    estimated_cost_usd:
      normalizeMoney(
        usagePeriod.estimatedCostUsd,
      ),

    created_at:
      normalizeRequiredTimestamp(
        usagePeriod.createdAt,
        "usagePeriod.createdAt",
      ),

    updated_at:
      normalizeRequiredTimestamp(
        usagePeriod.updatedAt,
        "usagePeriod.updatedAt",
      ),
  };
}

function mapAiUsagePeriodRow(
  row:
    AiUsagePeriodRow,
): CaseBudgetAiUsagePeriod {
  const monthlyQuestionLimit =
    normalizeNonNegativeInteger(
      row.monthly_question_limit,
    );

  const successfulQuestionsUsed =
    normalizeNonNegativeInteger(
      row.successful_questions_used,
    );

  return {
    id:
      row.id,

    userId:
      row.user_id,

    workspaceId:
      row.workspace_id,

    subscriptionId:
      row.subscription_id,

    plan:
      parsePlan(
        row.plan,
      ),

    periodStart:
      row.period_start,

    periodEnd:
      row.period_end,

    monthlyQuestionLimit,

    successfulQuestionsUsed,

    successfulQuestionsRemaining:
      Math.max(
        0,
        monthlyQuestionLimit -
          successfulQuestionsUsed,
      ),

    inputTokens:
      normalizeNonNegativeInteger(
        row.input_tokens,
      ),

    cachedInputTokens:
      normalizeNonNegativeInteger(
        row.cached_input_tokens,
      ),

    outputTokens:
      normalizeNonNegativeInteger(
        row.output_tokens,
      ),

    totalTokens:
      normalizeNonNegativeInteger(
        row.total_tokens,
      ),

    estimatedCostUsd:
      normalizeMoney(
        row.estimated_cost_usd,
      ),

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

function mapAiRequestToRow(
  request:
    CaseBudgetAiRequest,
) {
  return {
    id:
      normalizeRequiredId(
        request.id,
        "request.id",
      ),

    user_id:
      normalizeRequiredId(
        request.userId,
        "request.userId",
      ),

    workspace_id:
      normalizeOptionalId(
        request.workspaceId,
      ),

    subscription_id:
      normalizeOptionalId(
        request.subscriptionId,
      ),

    usage_period_id:
      normalizeOptionalId(
        request.usagePeriodId,
      ),

    request_type:
      request.requestType,

    status:
      request.status,

    model:
      normalizeRequiredText(
        request.model,
        "request.model",
      ),

    prompt_characters:
      normalizeNonNegativeInteger(
        request.promptCharacters,
      ),

    conversation_message_count:
      normalizeNonNegativeInteger(
        request.conversationMessageCount,
      ),

    input_tokens:
      normalizeNonNegativeInteger(
        request.inputTokens,
      ),

    cached_input_tokens:
      normalizeNonNegativeInteger(
        request.cachedInputTokens,
      ),

    output_tokens:
      normalizeNonNegativeInteger(
        request.outputTokens,
      ),

    total_tokens:
      normalizeNonNegativeInteger(
        request.totalTokens,
      ),

    estimated_cost_usd:
      normalizeMoney(
        request.estimatedCostUsd,
      ),

    counted_against_allowance:
      Boolean(
        request.countedAgainstAllowance,
      ),

    provider_request_id:
      normalizeOptionalText(
        request.providerRequestId,
      ),

    error_code:
      normalizeOptionalText(
        request.errorCode,
      ),

    error_message:
      normalizeOptionalText(
        request.errorMessage,
      ),

    started_at:
      normalizeRequiredTimestamp(
        request.startedAt,
        "request.startedAt",
      ),

    completed_at:
      normalizeOptionalTimestamp(
        request.completedAt,
      ),

    created_at:
      normalizeRequiredTimestamp(
        request.createdAt,
        "request.createdAt",
      ),
  };
}

function mapAiRequestRow(
  row:
    AiRequestRow,
): CaseBudgetAiRequest {
  return {
    id:
      row.id,

    userId:
      row.user_id,

    workspaceId:
      row.workspace_id,

    subscriptionId:
      row.subscription_id,

    usagePeriodId:
      row.usage_period_id,

    status:
      parseAiRequestStatus(
        row.status,
      ),

    model:
      row.model,

    requestType:
      "ai-coach",

    promptCharacters:
      normalizeNonNegativeInteger(
        row.prompt_characters,
      ),

    conversationMessageCount:
      normalizeNonNegativeInteger(
        row.conversation_message_count,
      ),

    inputTokens:
      normalizeNonNegativeInteger(
        row.input_tokens,
      ),

    cachedInputTokens:
      normalizeNonNegativeInteger(
        row.cached_input_tokens,
      ),

    outputTokens:
      normalizeNonNegativeInteger(
        row.output_tokens,
      ),

    totalTokens:
      normalizeNonNegativeInteger(
        row.total_tokens,
      ),

    estimatedCostUsd:
      normalizeMoney(
        row.estimated_cost_usd,
      ),

    countedAgainstAllowance:
      row.counted_against_allowance,

    providerRequestId:
      row.provider_request_id,

    errorCode:
      row.error_code,

    errorMessage:
      row.error_message,

    startedAt:
      row.started_at,

    completedAt:
      row.completed_at,

    createdAt:
      row.created_at,
  };
}

function parsePlan(
  value:
    string,
): CaseBudgetPlan {
  if (
    value ===
      "free" ||
    value ===
      "plus" ||
    value ===
      "pro"
  ) {
    return value;
  }

  throw new Error(
    `Unknown CASE Budget subscription plan "${value}".`,
  );
}

function parseBillingProvider(
  value:
    string,
): CaseBudgetBillingProvider {
  if (
    value ===
      "stripe" ||
    value ===
      "apple" ||
    value ===
      "google" ||
    value ===
      "manual" ||
    value ===
      "none"
  ) {
    return value;
  }

  throw new Error(
    `Unknown CASE Budget billing provider "${value}".`,
  );
}

function parseBillingInterval(
  value:
    string | null,
): CaseBudgetBillingInterval | null {
  if (
    value ===
    null
  ) {
    return null;
  }

  if (
    value ===
      "monthly" ||
    value ===
      "annual"
  ) {
    return value;
  }

  throw new Error(
    `Unknown CASE Budget billing interval "${value}".`,
  );
}

function parseSubscriptionStatus(
  value:
    string,
): CaseBudgetSubscriptionStatus {
  if (
    value ===
      "active" ||
    value ===
      "trialing" ||
    value ===
      "past_due" ||
    value ===
      "unpaid" ||
    value ===
      "canceled" ||
    value ===
      "incomplete" ||
    value ===
      "incomplete_expired" ||
    value ===
      "paused" ||
    value ===
      "none"
  ) {
    return value;
  }

  throw new Error(
    `Unknown CASE Budget subscription status "${value}".`,
  );
}

function parseSubscriptionSource(
  value:
    string,
): CaseBudgetSubscriptionSource {
  if (
    value ===
      "web" ||
    value ===
      "ios" ||
    value ===
      "android" ||
    value ===
      "admin" ||
    value ===
      "system"
  ) {
    return value;
  }

  throw new Error(
    `Unknown CASE Budget subscription source "${value}".`,
  );
}

function parseAiRequestStatus(
  value:
    string,
): CaseBudgetAiRequestStatus {
  if (
    value ===
      "pending" ||
    value ===
      "completed" ||
    value ===
      "failed" ||
    value ===
      "canceled" ||
    value ===
      "blocked"
  ) {
    return value;
  }

  throw new Error(
    `Unknown CASE Budget AI request status "${value}".`,
  );
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

function normalizeRequiredText(
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

function normalizeRequiredTimestamp(
  value:
    string,
  fieldName:
    string,
) {
  const parsedDate =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    throw new Error(
      `${fieldName} must contain a valid timestamp.`,
    );
  }

  return parsedDate
    .toISOString();
}

function normalizeOptionalTimestamp(
  value:
    string | null | undefined,
) {
  if (
    !value
  ) {
    return null;
  }

  const parsedDate =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return null;
  }

  return parsedDate
    .toISOString();
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
    number | string,
) {
  const normalizedValue =
    typeof value ===
      "number"
      ? value
      : Number(
          value,
        );

  if (
    !Number.isFinite(
      normalizedValue,
    )
  ) {
    return 0;
  }

  return Math.round(
    Math.max(
      0,
      normalizedValue,
    ) *
      1_000_000,
  ) /
    1_000_000;
}

function createStorageError({
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
    "Unknown Supabase error.";

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
    `[CASE Budget Subscription Storage] Failed to ${operation}.`,
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