import "server-only";

import {
  resolveStripeCustomerForUser,
} from "@/lib/stripe/stripe-customer";

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

export type CheckoutTheme =
  | "light"
  | "dark";

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

  theme:
    CheckoutTheme;

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
  theme,
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

  const normalizedTheme =
    normalizeCheckoutTheme(
      theme,
    );

  const stripe =
    getStripeServer();

  const priceId =
    getStripePriceId({
      plan,
      interval,
    });

  const brandingSettings =
    getStripeBrandingSettings(
      normalizedTheme,
    );

  /*
   * Stripe Customer identity belongs to the billing user rather than
   * to an individual CASE Budget workspace.
   *
   * If this user has previously purchased a CASE Budget subscription,
   * reuse the Stripe Customer created for that user.
   *
   * This allows one person to own multiple independently billed
   * workspaces without creating duplicate Stripe Customer records.
   */
  const {
    customerId,
  } =
    await resolveStripeCustomerForUser({
      userId:
        normalizedUserId,
    });

  /*
   * Stripe Checkout should receive either:
   *
   *   customer
   *
   * OR:
   *
   *   customer_email
   *
   * We intentionally do not send both.
   *
   * Existing billing user:
   *   Reuse the existing Stripe Customer.
   *
   * First checkout:
   *   Supply the authenticated user's email and allow Stripe Checkout
   *   to create the initial Stripe Customer.
   */
  const customerConfiguration =
    customerId
      ? {
          customer:
            customerId,
        }
      : {
          customer_email:
            normalizedEmail ??
            undefined,
        };

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

      ...customerConfiguration,

      allow_promotion_codes:
        true,

      billing_address_collection:
        "auto",

      branding_settings:
        brandingSettings,

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

        theme:
          normalizedTheme,
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

function getStripeBrandingSettings(
  theme:
    CheckoutTheme,
) {
  if (
    theme ===
    "dark"
  ) {
    return {
      background_color:
        "#111827",

      button_color:
        "#10B981",

      border_style:
        "rounded" as const,

      display_name:
        "CASE Budget",
    };
  }

  return {
    background_color:
      "#FFFFFF",

    button_color:
      "#10B981",

    border_style:
      "rounded" as const,

    display_name:
      "CASE Budget",
  };
}

function normalizeCheckoutTheme(
  value:
    CheckoutTheme,
): CheckoutTheme {
  if (
    value ===
    "dark"
  ) {
    return "dark";
  }

  return "light";
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