import "server-only";

import Stripe from "stripe";

let stripeInstance:
  Stripe | null =
  null;

export function getStripeServer() {
  if (
    stripeInstance
  ) {
    return stripeInstance;
  }

  const secretKey =
    process.env
      .STRIPE_SECRET_KEY_CASE_BUDGET
      ?.trim();

  if (
    !secretKey
  ) {
    throw new Error(
      "Stripe is not configured for CASE Budget. STRIPE_SECRET_KEY_CASE_BUDGET is missing.",
    );
  }

  stripeInstance =
    new Stripe(
      secretKey,
      {
        appInfo: {
          name:
            "CASE Budget",

          version:
            "1.0.0",
        },
      },
    );

  return stripeInstance;
}

export function getStripeWebhookSecret() {
  const webhookSecret =
    process.env
      .STRIPE_WEBHOOK_SECRET_CASE_BUDGET
      ?.trim();

  if (
    !webhookSecret
  ) {
    throw new Error(
      "Stripe webhook handling is not configured for CASE Budget. STRIPE_WEBHOOK_SECRET_CASE_BUDGET is missing.",
    );
  }

  return webhookSecret;
}

export function getStripePublishableKey() {
  const publishableKey =
    process.env
      .NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_CASE_BUDGET
      ?.trim();

  if (
    !publishableKey
  ) {
    throw new Error(
      "Stripe is not configured for CASE Budget. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_CASE_BUDGET is missing.",
    );
  }

  return publishableKey;
}