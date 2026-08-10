import {
  NextResponse,
} from "next/server";

import {
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  changeStripeSubscription,
} from "@/lib/stripe/stripe-subscription";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  isCaseBudgetPlan,
  type CaseBudgetBillingInterval,
  type CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

import type {
  CaseBudgetSubscriptionStatus,
} from "@/types/subscription";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type UnknownRecord =
  Record<
    string,
    unknown
  >;

type ChangeSubscriptionRequestBody = {
  plan:
    Exclude<
      CaseBudgetPlan,
      "free"
    >;

  interval:
    CaseBudgetBillingInterval;
};

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

  provider_customer_id:
    string | null;

  provider_subscription_id:
    string | null;

  provider_price_id:
    string | null;

  current_period_end:
    string | null;

  cancel_at_period_end:
    boolean;

  updated_at:
    string;
};

type ManagedSubscription = {
  id:
    string;

  workspaceId:
    string | null;

  plan:
    Exclude<
      CaseBudgetPlan,
      "free"
    >;

  billingInterval:
    CaseBudgetBillingInterval | null;

  status:
    CaseBudgetSubscriptionStatus;

  providerCustomerId:
    string | null;

  providerSubscriptionId:
    string;

  providerPriceId:
    string | null;

  currentPeriodEnd:
    string | null;

  cancelAtPeriodEnd:
    boolean;
};

const MANAGEABLE_STATUSES:
  CaseBudgetSubscriptionStatus[] =
  [
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "incomplete",
    "paused",
  ];

export async function POST(
  request:
    Request,
) {
  try {
    const auth =
      await requireCaseBudgetServerAuth();

    const rawBody =
      await readJsonBody(
        request,
      );

    if (
      !rawBody.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            rawBody.error,
        },
        {
          status:
            400,
        },
      );
    }

    const validatedRequest =
      validateChangeRequest(
        rawBody.value,
      );

    if (
      !validatedRequest.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            validatedRequest.error,
        },
        {
          status:
            400,
        },
      );
    }

    const {
      plan,
      interval,
    } =
      validatedRequest.value;

    const existingSubscription =
      await findManagedSubscription(
        auth.userId,
      );

    if (
      !existingSubscription
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "NO_ACTIVE_SUBSCRIPTION",

          error:
            "No active CASE Budget subscription was found to change.",
        },
        {
          status:
            404,
        },
      );
    }

    if (
      existingSubscription.plan ===
        plan &&
      existingSubscription.billingInterval ===
        interval
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "SUBSCRIPTION_ALREADY_MATCHES",

          error:
            "Your CASE Budget subscription already uses this plan and billing interval.",

          existingSubscription: {
            plan:
              existingSubscription.plan,

            interval:
              existingSubscription.billingInterval,

            status:
              existingSubscription.status,

            providerSubscriptionId:
              existingSubscription.providerSubscriptionId,

            currentPeriodEnd:
              existingSubscription.currentPeriodEnd,
          },
        },
        {
          status:
            409,
        },
      );
    }

    const result =
      await changeStripeSubscription({
        subscriptionId:
          existingSubscription
            .providerSubscriptionId,

        userId:
          auth.userId,

        workspaceId:
          auth.workspaceId,

        plan,

        interval,
      });

    return NextResponse.json(
      {
        success:
          true,

        subscriptionId:
          result.subscriptionId,

        subscriptionItemId:
          result.subscriptionItemId,

        previousPriceId:
          result.previousPriceId,

        newPriceId:
          result.newPriceId,

        plan:
          result.plan,

        interval:
          result.interval,

        status:
          result.status,

        pendingUpdate:
          result.pendingUpdate,
      },
    );
  } catch (
    error
  ) {
    if (
      error instanceof
      CaseBudgetServerAuthError
    ) {
      const response =
        getCaseBudgetServerAuthErrorResponse(
          error,
        );

      return NextResponse.json(
        {
          success:
            false,

          error:
            response.body.error.message,

          authError: {
            code:
              response.body.error.code,

            message:
              response.body.error.message,
          },
        },
        {
          status:
            response.status,
        },
      );
    }

    console.error(
      "[CASE Budget Stripe Subscription Change] Failed to change subscription.",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "CASE Budget could not change your subscription. Please try again.",
      },
      {
        status:
          500,
      },
    );
  }
}

async function findManagedSubscription(
  userId:
    string,
): Promise<ManagedSubscription | null> {
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
        "case_budget_subscriptions",
      )
      .select(
        `
            id,
            user_id,
            workspace_id,
            plan,
            billing_provider,
            billing_interval,
            status,
            provider_customer_id,
            provider_subscription_id,
            provider_price_id,
            current_period_end,
            cancel_at_period_end,
            updated_at
        `,
        )
      .eq(
        "user_id",
        normalizedUserId,
      )
      .eq(
        "billing_provider",
        "stripe",
      )
      .neq(
        "plan",
        "free",
      )
      .in(
        "status",
        MANAGEABLE_STATUSES,
      )
      .not(
        "provider_subscription_id",
        "is",
        null,
      )
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
    console.error(
      "[CASE Budget Stripe Subscription Change] Existing subscription lookup failed.",
      {
        userId:
          normalizedUserId,

        code:
          getSupabaseErrorCode(
            error,
          ),

        message:
          getErrorMessage(
            error,
          ),
      },
    );

    throw new Error(
      "CASE Budget could not load the existing subscription.",
    );
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

function mapSubscriptionRow(
  row:
    SubscriptionRow,
): ManagedSubscription {
  const plan =
    parsePaidPlan(
      row.plan,
    );

  if (
    !plan
  ) {
    throw new Error(
      `Unsupported CASE Budget subscription plan "${row.plan}".`,
    );
  }

  const status =
    parseSubscriptionStatus(
      row.status,
    );

  if (
    !status
  ) {
    throw new Error(
      `Unsupported CASE Budget subscription status "${row.status}".`,
    );
  }

  const providerSubscriptionId =
    normalizeOptionalString(
      row.provider_subscription_id,
    );

  if (
    !providerSubscriptionId
  ) {
    throw new Error(
      "CASE Budget subscription is missing its Stripe subscription ID.",
    );
  }

  return {
    id:
      row.id,

    workspaceId:
      normalizeOptionalString(
        row.workspace_id,
      ),

    plan,

    billingInterval:
      parseBillingInterval(
        row.billing_interval,
      ),

    status,

    providerCustomerId:
      normalizeOptionalString(
        row.provider_customer_id,
      ),

    providerSubscriptionId,

    providerPriceId:
      normalizeOptionalString(
        row.provider_price_id,
      ),

    currentPeriodEnd:
      normalizeOptionalString(
        row.current_period_end,
      ),

    cancelAtPeriodEnd:
      Boolean(
        row.cancel_at_period_end,
      ),
  };
}

async function readJsonBody(
  request:
    Request,
):
  Promise<
    | {
        success:
          true;

        value:
          unknown;
      }
    | {
        success:
          false;

        error:
          string;
      }
  > {
  try {
    return {
      success:
        true,

      value:
        await request.json(),
    };
  } catch {
    return {
      success:
        false,

      error:
        "The subscription change request body must contain valid JSON.",
    };
  }
}

function validateChangeRequest(
  value:
    unknown,
):
  | {
      success:
        true;

      value:
        ChangeSubscriptionRequestBody;
    }
  | {
      success:
        false;

      error:
        string;
    } {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return {
      success:
        false,

      error:
        "Invalid CASE Budget subscription change request.",
    };
  }

  const planValue =
    getString(
      record.plan,
    );

  if (
    !planValue ||
    !isCaseBudgetPlan(
      planValue,
    ) ||
    planValue ===
      "free"
  ) {
    return {
      success:
        false,

      error:
        "Choose either CASE Budget Plus or CASE Budget Pro.",
    };
  }

  const intervalValue =
    getString(
      record.interval,
    );

  if (
    intervalValue !==
      "monthly" &&
    intervalValue !==
      "annual"
  ) {
    return {
      success:
        false,

      error:
        "Choose either monthly or annual billing.",
    };
  }

  return {
    success:
      true,

    value: {
      plan:
        planValue,

      interval:
        intervalValue,
    },
  };
}

function parsePaidPlan(
  value:
    string,
):
  | Exclude<
      CaseBudgetPlan,
      "free"
    >
  | null {
  if (
    value ===
      "plus" ||
    value ===
      "pro"
  ) {
    return value;
  }

  return null;
}

function parseBillingInterval(
  value:
    string | null,
): CaseBudgetBillingInterval | null {
  if (
    value ===
      "monthly" ||
    value ===
      "annual"
  ) {
    return value;
  }

  return null;
}

function parseSubscriptionStatus(
  value:
    string,
): CaseBudgetSubscriptionStatus | null {
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

  return null;
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

function getString(
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

function normalizeRequiredString(
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

  const normalizedValue =
    value.trim();

  return (
    normalizedValue ||
    null
  );
}

function getSupabaseErrorCode(
  error:
    unknown,
) {
  if (
    typeof error !==
      "object" ||
    error ===
      null
  ) {
    return null;
  }

  const code =
    (
      error as {
        code?:
          unknown;
      }
    ).code;

  return typeof code ===
    "string"
      ? code
      : null;
}

function getErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
      Error
  ) {
    const message =
      error.message
        .trim();

    if (
      message
    ) {
      return message;
    }
  }

  if (
    typeof error ===
      "object" &&
    error !==
      null
  ) {
    const message =
      (
        error as {
          message?:
            unknown;
        }
      ).message;

    if (
      typeof message ===
        "string" &&
      message.trim()
    ) {
      return message.trim();
    }
  }

  return "Unknown error.";
}