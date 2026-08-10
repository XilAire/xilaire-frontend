import {
  loadStripe,
  type Stripe,
} from "@stripe/stripe-js";

let stripePromise:
  Promise<Stripe | null> | null =
  null;

export function getStripeClient() {
  if (
    stripePromise
  ) {
    return stripePromise;
  }

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

  stripePromise =
    loadStripe(
      publishableKey,
    );

  return stripePromise;
}

export function isStripeClientConfigured() {
  return Boolean(
    process.env
      .NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_CASE_BUDGET
      ?.trim(),
  );
}