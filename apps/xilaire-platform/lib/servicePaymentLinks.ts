// apps/xilaire-platform/lib/servicePaymentLinks.ts

export type ServiceKey =
  | "individual_core"
  | "individual_advanced"
  | "business_core"
  | "business_advanced";

/**
 * Canonical mapping of service tiers to Stripe Payment Links.
 * - Payment Links only (no Checkout Sessions)
 * - Quantity locked to 1
 * - Flat recurring monthly pricing
 * - Metadata-driven provisioning
 */
export const SERVICE_PAYMENT_LINKS: Record<ServiceKey, string> = {
  individual_core: "https://buy.stripe.com/eVq28qcAJ1kIeo84zYeZ200",
  individual_advanced: "https://buy.stripe.com/14A4gy3094wUbbW7MaeZ201",
  business_core: "https://buy.stripe.com/4gM6oGeIR2oM5RC2rQeZ202",
  business_advanced: "https://buy.stripe.com/14A8wObwF9Re1Bm5E2eZ203",
};