import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  FindAiUsagePeriodInput,
  FindSubscriptionInput,
  FindWorkspaceAiUsageAggregateInput,
  SaveAiRequestInput,
  SaveAiUsagePeriodInput,
  SaveSubscriptionInput,
  SubscriptionRepository,
  WorkspaceAiUsageAggregate,
} from "@/lib/subscriptions/subscription-repository";

import type {
  CaseBudgetAiRequest,
  CaseBudgetAiUsagePeriod,
  CaseBudgetSubscription,
} from "@/types/subscription";

type UnknownRecord =
  Record<
    string,
    unknown
  >;

type WorkspaceAiUsagePeriodRow = {
  workspace_id:
    string | null;

  subscription_id:
    string | null;

  period_start:
    string;

  period_end:
    string;

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
};

const SUBSCRIPTIONS_TABLE =
  "case_budget_subscriptions";

const AI_USAGE_PERIODS_TABLE =
  "case_budget_ai_usage_periods";

const AI_REQUESTS_TABLE =
  "case_budget_ai_requests";

let repositoryInstance:
  SubscriptionRepository | null =
  null;

export function createSupabaseSubscriptionRepository():
  SubscriptionRepository {
  return {
    findSubscription,

    findAiUsagePeriod,

    findWorkspaceAiUsageAggregate,

    saveSubscription,

    saveAiUsagePeriod,

    saveAiRequest,
  };
}

export function getSupabaseSubscriptionRepository():
  SubscriptionRepository {
  if (
    !repositoryInstance
  ) {
    repositoryInstance =
      createSupabaseSubscriptionRepository();
  }

  return repositoryInstance;
}

async function findSubscription(
  input:
    FindSubscriptionInput,
): Promise<
  CaseBudgetSubscription | null
> {
  const userId =
    normalizeRequiredString(
      input.userId,
      "userId",
    );

  const workspaceId =
    normalizeOptionalString(
      input.workspaceId,
    );

  /*
   * Workspace subscription entitlement model
   * ----------------------------------------
   *
   * If a workspace ID is supplied, entitlement resolution is based first on
   * the subscription assigned to that workspace.
   *
   * The subscription row's user_id identifies the billing owner, but active
   * members of the workspace inherit the workspace subscription.
   *
   * Workspace membership authorization is performed by subscription-access.ts
   * before this repository is called.
   *
   * If no workspace subscription exists, fall back to a personal subscription
   * belonging directly to the authenticated user.
   */
  if (
    workspaceId
  ) {
    const workspaceRow =
      await findLatestWorkspaceSubscriptionRow({
        workspaceId,
      });

    if (
      workspaceRow
    ) {
      return mapRow<
        CaseBudgetSubscription
      >(
        workspaceRow,
      );
    }

    const personalRow =
      await findLatestPersonalSubscriptionRow({
        userId,
      });

    return personalRow
      ? mapRow<
          CaseBudgetSubscription
        >(
          personalRow,
        )
      : null;
  }

  /*
   * No workspace context means the lookup stays user-scoped.
   *
   * Prefer the user's personal subscription where workspace_id IS NULL.
   */
  const personalRow =
    await findLatestPersonalSubscriptionRow({
      userId,
    });

  if (
    personalRow
  ) {
    return mapRow<
      CaseBudgetSubscription
    >(
      personalRow,
    );
  }

  /*
   * Preserve compatibility for callers that do not provide a workspace but
   * where the authenticated user may still own a workspace subscription.
   */
  const userOwnedRow =
    await findLatestUserOwnedSubscriptionRow({
      userId,
    });

  return userOwnedRow
    ? mapRow<
        CaseBudgetSubscription
      >(
        userOwnedRow,
      )
    : null;
}

async function findLatestWorkspaceSubscriptionRow({
  workspaceId,
}: {
  workspaceId:
    string;
}): Promise<
  UnknownRecord | null
> {
  const normalizedWorkspaceId =
    normalizeRequiredString(
      workspaceId,
      "workspaceId",
    );

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        SUBSCRIPTIONS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "workspace_id",
        normalizedWorkspaceId,
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
    throwRepositoryError(
      "find workspace subscription",
      error,
    );
  }

  return data
    ? asRecord(
        data,
      )
    : null;
}

async function findLatestPersonalSubscriptionRow({
  userId,
}: {
  userId:
    string;
}): Promise<
  UnknownRecord | null
> {
  const normalizedUserId =
    normalizeRequiredString(
      userId,
      "userId",
    );

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        SUBSCRIPTIONS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        normalizedUserId,
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
    throwRepositoryError(
      "find personal subscription",
      error,
    );
  }

  return data
    ? asRecord(
        data,
      )
    : null;
}

async function findLatestUserOwnedSubscriptionRow({
  userId,
}: {
  userId:
    string;
}): Promise<
  UnknownRecord | null
> {
  const normalizedUserId =
    normalizeRequiredString(
      userId,
      "userId",
    );

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        SUBSCRIPTIONS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        normalizedUserId,
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
    throwRepositoryError(
      "find user subscription",
      error,
    );
  }

  return data
    ? asRecord(
        data,
      )
    : null;
}

async function findAiUsagePeriod(
  input:
    FindAiUsagePeriodInput,
): Promise<
  CaseBudgetAiUsagePeriod | null
> {
  const userId =
    normalizeRequiredString(
      input.userId,
      "userId",
    );

  const workspaceId =
    normalizeOptionalString(
      input.workspaceId,
    );

  const subscriptionId =
    normalizeOptionalString(
      input.subscriptionId,
    );

  const periodStart =
    normalizeRequiredTimestamp(
      input.periodStart,
      "periodStart",
    );

  const periodEnd =
    normalizeRequiredTimestamp(
      input.periodEnd,
      "periodEnd",
    );

  const supabase =
    createAdminClient();

  let query =
    supabase
      .from(
        AI_USAGE_PERIODS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "period_start",
        periodStart,
      )
      .eq(
        "period_end",
        periodEnd,
      );

  query =
    workspaceId
      ? query.eq(
          "workspace_id",
          workspaceId,
        )
      : query.is(
          "workspace_id",
          null,
        );

  if (
    subscriptionId
  ) {
    query =
      query.eq(
        "subscription_id",
        subscriptionId,
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
    throwRepositoryError(
      "find AI usage period",
      error,
    );
  }

  return data
    ? mapRow<
        CaseBudgetAiUsagePeriod
      >(
        asRecord(
          data,
        ),
      )
    : null;
}

/**
 * Returns the workspace-wide AI usage total for one subscription and one
 * usage period.
 *
 * Individual usage rows remain user-scoped so CASE Budget can audit who used
 * AI Coach, while this aggregate is used to enforce the shared Pro allowance.
 */
async function findWorkspaceAiUsageAggregate(
  input:
    FindWorkspaceAiUsageAggregateInput,
): Promise<
  WorkspaceAiUsageAggregate
> {
  const workspaceId =
    normalizeRequiredString(
      input.workspaceId,
      "workspaceId",
    );

  const subscriptionId =
    normalizeRequiredString(
      input.subscriptionId,
      "subscriptionId",
    );

  const periodStart =
    normalizeRequiredTimestamp(
      input.periodStart,
      "periodStart",
    );

  const periodEnd =
    normalizeRequiredTimestamp(
      input.periodEnd,
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
        AI_USAGE_PERIODS_TABLE,
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
        workspaceId,
      )
      .eq(
        "subscription_id",
        subscriptionId,
      )
      .eq(
        "period_start",
        periodStart,
      )
      .eq(
        "period_end",
        periodEnd,
      );

  if (
    error
  ) {
    throwRepositoryError(
      "find workspace AI usage aggregate",
      error,
    );
  }

  const rows =
    (
      data ??
      []
    ) as unknown as
      WorkspaceAiUsagePeriodRow[];

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
    workspaceId,

    subscriptionId,

    periodStart,

    periodEnd,

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

async function saveSubscription(
  input:
    SaveSubscriptionInput,
): Promise<
  CaseBudgetSubscription
> {
  return upsertModel<
    CaseBudgetSubscription
  >(
    SUBSCRIPTIONS_TABLE,
    input.subscription,
    "save subscription",
  );
}

async function saveAiUsagePeriod(
  input:
    SaveAiUsagePeriodInput,
): Promise<
  CaseBudgetAiUsagePeriod
> {
  return upsertModel<
    CaseBudgetAiUsagePeriod
  >(
    AI_USAGE_PERIODS_TABLE,
    input.usagePeriod,
    "save AI usage period",
  );
}

async function saveAiRequest(
  input:
    SaveAiRequestInput,
): Promise<
  CaseBudgetAiRequest
> {
  return upsertModel<
    CaseBudgetAiRequest
  >(
    AI_REQUESTS_TABLE,
    input.request,
    "save AI request",
  );
}

async function upsertModel<
  Model
>(
  table:
    string,

  model:
    unknown,

  operation:
    string,
): Promise<
  Model
> {
  const payload =
    mapModelToRow(
      model,
    );

  const id =
    normalizeOptionalString(
      asRecord(
        model,
      ).id,
    );

  if (
    !id
  ) {
    throw new Error(
      `CASE Budget ${operation} requires an id.`,
    );
  }

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        table,
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
    throwRepositoryError(
      operation,
      error,
    );
  }

  return mapRow<
    Model
  >(
    asRecord(
      data,
    ),
  );
}

/*
 * Database rows are snake_case while CASE Budget models are camelCase.
 * Mapping every top-level key here keeps the repository compatible with
 * the shared subscription types without duplicating those definitions.
 */
function mapRow<
  Model
>(
  row:
    UnknownRecord,
): Model {
  const result:
    UnknownRecord = {};

  for (
    const [
      key,
      value,
    ]
    of Object.entries(
      row,
    )
  ) {
    result[
      snakeToCamel(
        key,
      )
    ] =
      value;
  }

  return result as
    unknown as Model;
}

function mapModelToRow(
  model:
    unknown,
): UnknownRecord {
  const source =
    asRecord(
      model,
    );

  const result:
    UnknownRecord = {};

  for (
    const [
      key,
      value,
    ]
    of Object.entries(
      source,
    )
  ) {
    if (
      value ===
      undefined
    ) {
      continue;
    }

    result[
      camelToSnake(
        key,
      )
    ] =
      value;
  }

  return result;
}

function snakeToCamel(
  value:
    string,
) {
  return value.replace(
    /_([a-z0-9])/g,
    (
      _match,
      character:
        string,
    ) =>
      character.toUpperCase(),
  );
}

function camelToSnake(
  value:
    string,
) {
  return value
    .replace(
      /([a-z0-9])([A-Z])/g,
      "$1_$2",
    )
    .replace(
      /([A-Z])([A-Z][a-z])/g,
      "$1_$2",
    )
    .toLowerCase();
}

function asRecord(
  value:
    unknown,
): UnknownRecord {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    return {};
  }

  return value as
    UnknownRecord;
}

function normalizeRequiredString(
  value:
    unknown,

  fieldName:
    string,
) {
  const normalized =
    normalizeOptionalString(
      value,
    );

  if (
    !normalized
  ) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return normalized;
}

function normalizeOptionalString(
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

  return (
    normalized ||
    null
  );
}

function normalizeRequiredTimestamp(
  value:
    unknown,

  fieldName:
    string,
) {
  const normalized =
    normalizeRequiredString(
      value,
      fieldName,
    );

  const date =
    new Date(
      normalized,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      `${fieldName} must contain a valid timestamp.`,
    );
  }

  return date.toISOString();
}

function normalizeNonNegativeInteger(
  value:
    unknown,
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

  return Math.max(
    0,
    Math.floor(
      normalizedValue,
    ),
  );
}

function normalizeMoney(
  value:
    unknown,
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

  return (
    Math.round(
      Math.max(
        0,
        normalizedValue,
      ) *
        1_000_000,
    ) /
    1_000_000
  );
}

function throwRepositoryError(
  operation:
    string,

  error:
    unknown,
): never {
  const details =
    getErrorDetails(
      error,
    );

  console.error(
    `[CASE Budget Subscription Repository] Failed to ${operation}.`,
    details,
  );

  throw new Error(
    `CASE Budget could not ${operation}.`,
  );
}

function getErrorDetails(
  error:
    unknown,
) {
  if (
    typeof error !==
      "object" ||
    error ===
      null
  ) {
    return {
      code:
        null,

      message:
        String(
          error,
        ),
    };
  }

  const value =
    error as {
      code?:
        unknown;

      message?:
        unknown;

      details?:
        unknown;

      hint?:
        unknown;
    };

  return {
    code:
      typeof value.code ===
        "string"
        ? value.code
        : null,

    message:
      typeof value.message ===
        "string"
        ? value.message
        : "Unknown Supabase error.",

    details:
      typeof value.details ===
        "string"
        ? value.details
        : null,

    hint:
      typeof value.hint ===
        "string"
        ? value.hint
        : null,
  };
}