import "server-only";

export type UniversityStripeMode =
  | "test"
  | "live";

/**
 * Returns the trusted CASE University Stripe environment.
 *
 * SECURITY:
 * This value must come exclusively from the server environment.
 * Never accept Stripe mode from browser input, form data, URL
 * parameters, client components, or other user-controlled values.
 */
export function getUniversityStripeMode(): UniversityStripeMode {
  const value =
    process.env
      .CASE_UNIVERSITY_STRIPE_MODE
      ?.trim()
      .toLowerCase();

  if (
    value === "test" ||
    value === "live"
  ) {
    return value;
  }

  throw new Error(
    '[CASE University] CASE_UNIVERSITY_STRIPE_MODE must be set to either "test" or "live".',
  );
}