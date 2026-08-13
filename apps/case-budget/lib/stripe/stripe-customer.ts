import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type StripeCustomerRow = {
  provider_customer_id:
    string | null;

  updated_at:
    string;

  created_at:
    string;
};

export type ResolveStripeCustomerInput = {
  userId:
    string;
};

export type ResolveStripeCustomerResult = {
  customerId:
    string | null;
};

export async function resolveStripeCustomerForUser({
  userId,
}: ResolveStripeCustomerInput): Promise<ResolveStripeCustomerResult> {
  const normalizedUserId =
    normalizeRequiredValue(
      userId,
      "userId",
    );

  const supabase =
    createAdminClient();

  /*
   * Stripe Customer identity belongs to the billing person,
   * not to an individual CASE Budget workspace.
   *
   * Therefore we intentionally search every Stripe subscription
   * record owned by this user, regardless of:
   *
   * - workspace_id
   * - plan
   * - subscription status
   *
   * A canceled historical subscription can still provide the
   * correct reusable Stripe Customer ID for a future workspace
   * subscription.
   */
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
          provider_customer_id,
          updated_at,
          created_at
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
      .not(
        "provider_customer_id",
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
    console.error(
      "[CASE Budget Stripe Customer] Failed to resolve existing Stripe customer.",
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
      "CASE Budget could not resolve the Stripe customer for this account.",
    );
  }

  if (
    !data
  ) {
    return {
      customerId:
        null,
    };
  }

  const row =
    data as
      StripeCustomerRow;

  return {
    customerId:
      normalizeOptionalValue(
        row.provider_customer_id,
      ),
  };
}

function normalizeRequiredValue(
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

function normalizeOptionalValue(
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