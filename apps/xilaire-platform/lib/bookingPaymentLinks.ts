// apps/xilaire-platform/lib/bookingPaymentLinks.ts

export type BookingKey =
  | "technical_consult_business"
  | "technical_consult_after"
  | "ai_strategy_session_business"
  | "security_assessment_call_business"
  | "m365_implementation_session_business"
  | "enterprise_architecture_review_business"
  | "priority_support_block_business"
  | "priority_support_block_after";

/**
 * Canonical Stripe Payment Link mapping for paid bookings.
 * - One-time payments
 * - Quantity locked to 1
 * - Price ID must match webhook validation
 * - All prices created in LIVE mode
 */
export const BOOKING_PAYMENT_LINKS: Record<BookingKey, string> = {
  technical_consult_business: "https://buy.stripe.com/7sYbJ044daVi1Bm3vUeZ204",
  technical_consult_after: "https://buy.stripe.com/4gM5kC9ox4wU5RC1nMeZ205",

  ai_strategy_session_business: "https://buy.stripe.com/fZuaEWgQZ8Na5RC6I6eZ206",

  security_assessment_call_business: "https://buy.stripe.com/aFa3cu58he7ua7S6I6eZ207",

  m365_implementation_session_business: "https://buy.stripe.com/bJe28q7gp6F21Bm3vUeZ208",

  enterprise_architecture_review_business: "https://buy.stripe.com/6oUdR844dgfC2Fq9UieZ209",

  priority_support_block_business: "https://buy.stripe.com/5kQ9ASdEN1kI7ZKfeCeZ20a",
  priority_support_block_after: "https://buy.stripe.com/28E9AS6cl6F293OgiGeZ20b",
};