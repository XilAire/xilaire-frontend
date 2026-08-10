import "server-only";

import {
  getStripePriceId,
} from "@/lib/stripe/stripe-prices";

import {
  getStripeServer,
} from "@/lib/stripe/stripe-server";

import type {
  CaseBudgetBillingInterval,
  CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

type PaidCaseBudgetPlan =
  Exclude<
    CaseBudgetPlan,
    "free"
  >;

export type CreateEmbeddedCheckoutInput = {
  userId:
    string;

  email?:
    string | null;

  workspaceId?:
    string | null;

  plan:
    PaidCaseBudgetPlan;

  interval:
    CaseBudgetBillingInterval;

  returnUrl:
    string;
};

export type EmbeddedCheckoutSessionResult = {
  sessionId:
    string;

  clientSecret:
    string;

  plan:
    PaidCaseBudgetPlan;

  interval:
    CaseBudgetBillingInterval;

  priceId:
    string;
};

export async function createEmbeddedCheckoutSession({
  userId,
  email,
  workspaceId,
  plan,
  interval,
  returnUrl,
}: CreateEmbeddedCheckoutInput): Promise<EmbeddedCheckoutSessionResult> {
  const normalizedUserId =
    normalizeRequiredValue(
      userId,
      "userId",
    );

  const normalizedEmail =
    normalizeOptionalValue(
      email,
    );

  const normalizedWorkspaceId =
    normalizeOptionalValue(
      workspaceId,
    );

  const normalizedReturnUrl =
    normalizeReturnUrl(
      returnUrl,
    );

  const stripe =
    getStripeServer();

  const priceId =
    getStripePriceId({
      plan,
      interval,
    });

  const session =
    await stripe.checkout.sessions.create({
      mode:
        "subscription",

      ui_mode:
        "embedded_page",

      line_items: [
        {
          price:
            priceId,

          quantity:
            1,
        },
      ],

      return_url:
        normalizedReturnUrl,

      customer_email:
        normalizedEmail ??
        undefined,

      allow_promotion_codes:
        true,

      billing_address_collection:
        "auto",

      metadata: {
        app:
          "case-budget",

        user_id:
          normalizedUserId,

        workspace_id:
          normalizedWorkspaceId ??
          "",

        plan,

        billing_interval:
          interval,
      },

      subscription_data: {
        metadata: {
          app:
            "case-budget",

          user_id:
            normalizedUserId,

          workspace_id:
            normalizedWorkspaceId ??
            "",

          plan,

          billing_interval:
            interval,
        },
      },
    });

  const clientSecret =
    session.client_secret
      ?.trim();

  if (
    !clientSecret
  ) {
    throw new Error(
      "Stripe Embedded Checkout did not return a client secret.",
    );
  }

  return {
    sessionId:
      session.id,

    clientSecret,

    plan,

    interval,

    priceId,
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

function normalizeReturnUrl(
  value:
    string,
) {
  const normalizedValue =
    normalizeRequiredValue(
      value,
      "returnUrl",
    );

  let parsedUrl:
    URL;

  try {
    parsedUrl =
      new URL(
        normalizedValue,
      );
  } catch {
    throw new Error(
      "returnUrl must be a valid absolute URL.",
    );
  }

  if (
    parsedUrl.protocol !==
      "http:" &&
    parsedUrl.protocol !==
      "https:"
  ) {
    throw new Error(
      "returnUrl must use http or https.",
    );
  }

  return parsedUrl
    .toString();
}