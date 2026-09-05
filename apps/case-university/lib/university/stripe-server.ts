import "server-only";

import Stripe from "stripe";

import {
  getUniversityStripeMode,
  type UniversityStripeMode,
} from "@/lib/university/stripe-mode";

const STRIPE_API_VERSION = "2025-05-28.basil" as const;

let stripeClient: Stripe | null = null;

function requireServerEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `[CASE University] Missing required server environment variable: ${name}`,
    );
  }

  return value;
}

export function getUniversityStripeSecretKey(
  mode: UniversityStripeMode = getUniversityStripeMode(),
): string {
  return mode === "test"
    ? requireServerEnvironmentVariable(
        "STRIPE_SECRET_KEY_CASE_UNIVERSITY_TEST",
      )
    : requireServerEnvironmentVariable(
        "STRIPE_SECRET_KEY_CASE_UNIVERSITY_LIVE",
      );
}

export function getUniversityStripePublishableKey(
  mode: UniversityStripeMode = getUniversityStripeMode(),
): string {
  return mode === "test"
    ? requireServerEnvironmentVariable(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_CASE_UNIVERSITY_TEST",
      )
    : requireServerEnvironmentVariable(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_CASE_UNIVERSITY_LIVE",
      );
}

export function getUniversityStripeWebhookSecret(
  mode: UniversityStripeMode = getUniversityStripeMode(),
): string {
  return mode === "test"
    ? requireServerEnvironmentVariable(
        "STRIPE_WEBHOOK_SECRET_CASE_UNIVERSITY_TEST",
      )
    : requireServerEnvironmentVariable(
        "STRIPE_WEBHOOK_SECRET_CASE_UNIVERSITY_LIVE",
      );
}

export function getUniversityStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  stripeClient = new Stripe(getUniversityStripeSecretKey(), {
    apiVersion: STRIPE_API_VERSION,
    appInfo: {
      name: "CASE University",
      version: "0.1.0",
    },
  });

  return stripeClient;
}
