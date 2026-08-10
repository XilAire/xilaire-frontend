import {
  NextResponse,
} from "next/server";

import {
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  createEmbeddedCheckoutSession,
} from "@/lib/stripe/stripe-checkout";

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

type CheckoutRequestBody = {
  plan:
    Exclude<
      CaseBudgetPlan,
      "free"
    >;

  interval:
    CaseBudgetBillingInterval;
};

type ExistingSubscriptionRow = {
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

type ExistingManagedSubscription = {
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

const SUBSCRIPTION_STATUSES_REQUIRING_MANAGEMENT:
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
      validateCheckoutRequest(
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

    /*
     * CASE Budget allows one managed paid subscription per member.
     *
     * This lookup intentionally operates at the USER level instead
     * of the workspace level. A member changing active workspaces
     * must never be able to create another Stripe subscription.
     */
    const existingSubscription =
      await findExistingManagedSubscription(
        auth.userId,
      );

    if (
      existingSubscription
    ) {
      const sameSelection =
        existingSubscription.plan ===
          plan &&
        existingSubscription.billingInterval ===
          interval;

      return NextResponse.json(
        {
          success:
            false,

          code:
            "ACTIVE_SUBSCRIPTION_EXISTS",

          error:
            sameSelection
              ? "You already have this CASE Budget subscription. Manage your existing subscription instead of creating another one."
              : "You already have a CASE Budget subscription. Use Billing to change your existing plan or billing interval.",

          existingSubscription: {
            id:
              existingSubscription.id,

            plan:
              existingSubscription.plan,

            interval:
              existingSubscription.billingInterval,

            status:
              existingSubscription.status,

            workspaceId:
              existingSubscription.workspaceId,

            providerSubscriptionId:
              existingSubscription.providerSubscriptionId,

            currentPeriodEnd:
              existingSubscription.currentPeriodEnd,

            cancelAtPeriodEnd:
              existingSubscription.cancelAtPeriodEnd,

            sameSelection,
          },
        },
        {
          status:
            409,
        },
      );
    }

    const returnUrl =
      buildCheckoutReturnUrl({
        request,

        plan,

        interval,

        workspaceId:
          auth.workspaceId,
      });

    const checkout =
      await createEmbeddedCheckoutSession({
        userId:
          auth.userId,

        email:
          normalizeOptionalString(
            auth.user.email,
          ),

        workspaceId:
          auth.workspaceId,

        plan,

        interval,

        returnUrl,
      });

    return NextResponse.json(
      {
        success:
          true,

        sessionId:
          checkout.sessionId,

        clientSecret:
          checkout.clientSecret,

        plan:
          checkout.plan,

        interval:
          checkout.interval,

        priceId:
          checkout.priceId,
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
      "[CASE Budget Stripe Checkout] Failed to create embedded checkout session.",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "CASE Budget could not start checkout. Please try again.",
      },
      {
        status:
          500,
      },
    );
  }
}

async function findExistingManagedSubscription(
  userId:
    string,
): Promise<ExistingManagedSubscription | null> {
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
        SUBSCRIPTION_STATUSES_REQUIRING_MANAGEMENT,
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
      "[CASE Budget Stripe Checkout] Existing subscription lookup failed.",
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
      "CASE Budget could not verify whether an existing subscription is already active.",
    );
  }

  if (
    !data
  ) {
    return null;
  }

  return mapExistingSubscriptionRow(
      data,
    );
    }

function mapExistingSubscriptionRow(
  row:
    ExistingSubscriptionRow,
): ExistingManagedSubscription {
  const plan =
    parsePaidPlan(
      row.plan,
    );

  if (
    !plan
  ) {
    throw new Error(
      `CASE Budget found an unsupported paid subscription plan "${row.plan}".`,
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
      `CASE Budget found an unsupported subscription status "${row.status}".`,
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
      "CASE Budget found a managed Stripe subscription without a Stripe subscription ID.",
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
        "The checkout request body must contain valid JSON.",
    };
  }
}

function validateCheckoutRequest(
  value:
    unknown,
):
  | {
      success:
        true;

      value:
        CheckoutRequestBody;
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
        "Invalid CASE Budget checkout request.",
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

function buildCheckoutReturnUrl({
  request,
  plan,
  interval,
  workspaceId,
}: {
  request:
    Request;

  plan:
    Exclude<
      CaseBudgetPlan,
      "free"
    >;

  interval:
    CaseBudgetBillingInterval;

  workspaceId:
    string;
}) {
  const requestUrl =
    new URL(
      request.url,
    );

  const returnUrl =
    new URL(
      "/dashboard/settings/billing/checkout/return",
      requestUrl.origin,
    );

  /*
   * These values are informational only on the return page.
   *
   * Plan entitlements are not granted from query-string values.
   * Stripe Price IDs + webhook synchronization remain authoritative.
   */
  returnUrl.searchParams.set(
    "plan",
    plan,
  );

  returnUrl.searchParams.set(
    "interval",
    interval,
  );

  returnUrl.searchParams.set(
    "workspaceId",
    workspaceId,
  );

  /*
   * IMPORTANT:
   *
   * Do not use URLSearchParams.set() for CHECKOUT_SESSION_ID.
   *
   * Doing so encodes:
   *
   *   {CHECKOUT_SESSION_ID}
   *
   * as:
   *
   *   %7BCHECKOUT_SESSION_ID%7D
   *
   * Stripe requires the literal template token so it can replace it
   * with the actual cs_test_... / cs_live_... Checkout Session ID
   * before returning the customer to CASE Budget.
   */
  const separator =
    returnUrl.search
      ? "&"
      : "?";

  return (
    `${returnUrl.toString()}${separator}` +
    "session_id={CHECKOUT_SESSION_ID}"
  );
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
