import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  FindAiUsagePeriodInput,
  FindSubscriptionInput,
  SaveAiRequestInput,
  SaveAiUsagePeriodInput,
  SaveSubscriptionInput,
  SubscriptionRepository,
} from "@/lib/subscriptions/subscription-repository";

import type {
  CaseBudgetAiRequest,
  CaseBudgetAiUsagePeriod,
  CaseBudgetSubscription,
} from "@/types/subscription";

type UnknownRecord = Record<string, unknown>;

const SUBSCRIPTIONS_TABLE =
  "case_budget_subscriptions";

const AI_USAGE_PERIODS_TABLE =
  "case_budget_ai_usage_periods";

const AI_REQUESTS_TABLE =
  "case_budget_ai_requests";

let repositoryInstance:
  SubscriptionRepository | null =
  null;

export function createSupabaseSubscriptionRepository(): SubscriptionRepository {
  return {
    findSubscription,
    findAiUsagePeriod,
    saveSubscription,
    saveAiUsagePeriod,
    saveAiRequest,
  };
}

export function getSupabaseSubscriptionRepository(): SubscriptionRepository {
  if (!repositoryInstance) {
    repositoryInstance =
      createSupabaseSubscriptionRepository();
  }

  return repositoryInstance;
}

async function findSubscription(
  input: FindSubscriptionInput,
): Promise<CaseBudgetSubscription | null> {
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
   * Prefer a workspace-specific subscription when one exists.
   * If none exists, fall back to the member-level subscription where
   * workspace_id IS NULL. This is important because CASE Budget paid
   * subscriptions can legitimately belong directly to a member.
   */
  if (workspaceId) {
    const workspaceRow =
      await findLatestSubscriptionRow({
        userId,
        workspaceId,
      });

    if (workspaceRow) {
      return mapRow<CaseBudgetSubscription>(
        workspaceRow,
      );
    }

    const memberRow =
      await findLatestSubscriptionRow({
        userId,
        workspaceId:
          null,
      });

    return memberRow
      ? mapRow<CaseBudgetSubscription>(
          memberRow,
        )
      : null;
  }

  const latestRow =
    await findLatestSubscriptionRow({
      userId,
      workspaceId:
        undefined,
    });

  return latestRow
    ? mapRow<CaseBudgetSubscription>(
        latestRow,
      )
    : null;
}

async function findLatestSubscriptionRow({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId:
    string | null | undefined;
}): Promise<UnknownRecord | null> {
  const supabase =
    createAdminClient();

  let query =
    supabase
      .from(
        SUBSCRIPTIONS_TABLE,
      )
      .select("*")
      .eq(
        "user_id",
        userId,
      );

  if (workspaceId === null) {
    query =
      query.is(
        "workspace_id",
        null,
      );
  } else if (workspaceId) {
    query =
      query.eq(
        "workspace_id",
        workspaceId,
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
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throwRepositoryError(
      "find subscription",
      error,
    );
  }

  return data
    ? asRecord(data)
    : null;
}

async function findAiUsagePeriod(
  input: FindAiUsagePeriodInput,
): Promise<CaseBudgetAiUsagePeriod | null> {
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
    normalizeRequiredString(
      input.periodStart,
      "periodStart",
    );

  const periodEnd =
    normalizeRequiredString(
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
      .select("*")
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

  if (subscriptionId) {
    query =
      query.eq(
        "subscription_id",
        subscriptionId,
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
      .limit(1)
      .maybeSingle();

  if (error) {
    throwRepositoryError(
      "find AI usage period",
      error,
    );
  }

  return data
    ? mapRow<CaseBudgetAiUsagePeriod>(
        asRecord(data),
      )
    : null;
}

async function saveSubscription(
  input: SaveSubscriptionInput,
): Promise<CaseBudgetSubscription> {
  return upsertModel<CaseBudgetSubscription>(
    SUBSCRIPTIONS_TABLE,
    input.subscription,
    "save subscription",
  );
}

async function saveAiUsagePeriod(
  input: SaveAiUsagePeriodInput,
): Promise<CaseBudgetAiUsagePeriod> {
  return upsertModel<CaseBudgetAiUsagePeriod>(
    AI_USAGE_PERIODS_TABLE,
    input.usagePeriod,
    "save AI usage period",
  );
}

async function saveAiRequest(
  input: SaveAiRequestInput,
): Promise<CaseBudgetAiRequest> {
  return upsertModel<CaseBudgetAiRequest>(
    AI_REQUESTS_TABLE,
    input.request,
    "save AI request",
  );
}

async function upsertModel<Model>(
  table:
    string,
  model:
    unknown,
  operation:
    string,
): Promise<Model> {
  const payload =
    mapModelToRow(
      model,
    );

  const id =
    normalizeOptionalString(
      asRecord(model).id,
    );

  if (!id) {
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
      .from(table)
      .upsert(
        payload,
        {
          onConflict:
            "id",
        },
      )
      .select("*")
      .single();

  if (error) {
    throwRepositoryError(
      operation,
      error,
    );
  }

  return mapRow<Model>(
    asRecord(data),
  );
}

/*
 * Database rows are snake_case while CASE Budget models are camelCase.
 * Mapping every top-level key here keeps the repository compatible with
 * the shared subscription types without duplicating those definitions.
 */
function mapRow<Model>(
  row: UnknownRecord,
): Model {
  const result:
    UnknownRecord = {};

  for (
    const [
      key,
      value,
    ] of Object.entries(row)
  ) {
    result[
      snakeToCamel(key)
    ] =
      value;
  }

  return result as
    unknown as Model;
}

function mapModelToRow(
  model: unknown,
): UnknownRecord {
  const source =
    asRecord(model);

  const result:
    UnknownRecord = {};

  for (
    const [
      key,
      value,
    ] of Object.entries(source)
  ) {
    if (value === undefined) {
      continue;
    }

    result[
      camelToSnake(key)
    ] =
      value;
  }

  return result;
}

function snakeToCamel(
  value: string,
) {
  return value.replace(
    /_([a-z0-9])/g,
    (
      _match,
      character: string,
    ) =>
      character.toUpperCase(),
  );
}

function camelToSnake(
  value: string,
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
  value: unknown,
): UnknownRecord {
  if (
    typeof value !==
      "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as
    UnknownRecord;
}

function normalizeRequiredString(
  value: unknown,
  fieldName: string,
) {
  const normalized =
    normalizeOptionalString(
      value,
    );

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return normalized;
}

function normalizeOptionalString(
  value: unknown,
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

function throwRepositoryError(
  operation: string,
  error: unknown,
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
  error: unknown,
) {
  if (
    typeof error !==
      "object" ||
    error === null
  ) {
    return {
      code:
        null,
      message:
        String(error),
    };
  }

  const value =
    error as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
      hint?: unknown;
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
