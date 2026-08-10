import {
  NextResponse,
} from "next/server";

import {
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  scheduleStripeSubscriptionCancellation,
} from "@/lib/stripe/stripe-subscription-lifecycle";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  CaseBudgetSubscriptionStatus,
} from "@/types/subscription";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

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
    string;

  billingInterval:
    string | null;

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

const CANCELABLE_STATUSES:
  CaseBudgetSubscriptionStatus[] =
  [
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "incomplete",
    "paused",
  ];

export async function POST() {
  try {
    const auth =
      await requireCaseBudgetServerAuth();

    const subscription =
      await findCancelableSubscription(
        auth.userId,
      );

    if (
      !subscription
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "NO_ACTIVE_SUBSCRIPTION",

          error:
            "No active CASE Budget subscription was found to cancel.",
        },
        {
          status:
            404,
        },
      );
    }

    if (
      subscription.cancelAtPeriodEnd
    ) {
      return NextResponse.json(
        {
          success:
            true,

          code:
            "CANCELLATION_ALREADY_SCHEDULED",

          subscriptionId:
            subscription.providerSubscriptionId,

          status:
            subscription.status,

          cancelAtPeriodEnd:
            true,

          currentPeriodEnd:
            subscription.currentPeriodEnd,

          message:
            getAlreadyScheduledMessage(
              subscription.currentPeriodEnd,
            ),
        },
      );
    }

    const result =
      await scheduleStripeSubscriptionCancellation({
        subscriptionId:
          subscription.providerSubscriptionId,

        userId:
          auth.userId,
      });

    return NextResponse.json(
      {
        success:
          true,

        code:
          "CANCELLATION_SCHEDULED",

        subscriptionId:
          result.subscriptionId,

        status:
          result.status,

        cancelAtPeriodEnd:
          result.cancelAtPeriodEnd,

        canceledAt:
          result.canceledAt,

        currentPeriodEnd:
          result.currentPeriodEnd,

        message:
          getCancellationScheduledMessage(
            result.currentPeriodEnd,
          ),
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
      "[CASE Budget Stripe Subscription Cancel] Failed to schedule cancellation.",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "CASE Budget could not schedule your subscription cancellation. Please try again.",
      },
      {
        status:
          500,
      },
    );
  }
}

async function findCancelableSubscription(
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
        CANCELABLE_STATUSES,
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
      "[CASE Budget Stripe Subscription Cancel] Subscription lookup failed.",
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
    data,
  );
}

function mapSubscriptionRow(
  row:
    SubscriptionRow,
): ManagedSubscription {
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

    plan:
      row.plan,

    billingInterval:
      normalizeOptionalString(
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

function getCancellationScheduledMessage(
  currentPeriodEnd:
    string | null,
) {
  const formattedDate =
    formatDate(
      currentPeriodEnd,
    );

  if (
    formattedDate
  ) {
    return `Your CASE Budget subscription will remain active until ${formattedDate}. It will not renew after that date.`;
  }

  return "Your CASE Budget subscription is scheduled to end at the end of the current billing period.";
}

function getAlreadyScheduledMessage(
  currentPeriodEnd:
    string | null,
) {
  const formattedDate =
    formatDate(
      currentPeriodEnd,
    );

  if (
    formattedDate
  ) {
    return `Your CASE Budget subscription is already scheduled to end on ${formattedDate}.`;
  }

  return "Your CASE Budget subscription is already scheduled to end at the end of the current billing period.";
}

function formatDate(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "long",

      day:
        "numeric",

      year:
        "numeric",
    },
  ).format(
    date,
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