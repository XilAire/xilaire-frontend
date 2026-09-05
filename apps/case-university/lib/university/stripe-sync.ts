import "server-only";

import type Stripe from "stripe";

import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";
import {
  getUniversityStripeClient,
} from "@/lib/university/stripe-server";
import {
  getUniversityStripeMode,
  type UniversityStripeMode,
} from "@/lib/university/stripe-mode";

const UNIVERSITY_USER_METADATA_KEY = "case_university_user_id";

const SUPPORTED_SUBSCRIPTION_STATUSES = new Set<string>([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
]);

function unixToIso(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function extractExpandableId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

function getSubscriptionIdFromCheckoutSession(
  session: Stripe.Checkout.Session,
): string | null {
  return extractExpandableId(session.subscription);
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;

  if (!parent || parent.type !== "subscription_details") {
    return null;
  }

  return extractExpandableId(
    parent.subscription_details?.subscription,
  );
}

async function getUniversityUserIdFromSubscription(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const subscriptionUserId =
    subscription.metadata[UNIVERSITY_USER_METADATA_KEY]?.trim();

  if (subscriptionUserId) {
    return subscriptionUserId;
  }

  const customerId = extractExpandableId(subscription.customer);

  if (!customerId) {
    return null;
  }

  const stripe = getUniversityStripeClient();
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    return null;
  }

  return customer.metadata[UNIVERSITY_USER_METADATA_KEY]?.trim() || null;
}

function getPrimarySubscriptionItem(
  subscription: Stripe.Subscription,
): Stripe.SubscriptionItem {
  const item = subscription.items.data[0];

  if (!item) {
    throw new Error(
      `[CASE University] Stripe subscription ${subscription.id} has no subscription items.`,
    );
  }

  return item;
}

export async function syncUniversitySubscriptionFromStripe({
  subscriptionId,
  stripeEventId,
  stripeEventCreatedAt,
}: {
  subscriptionId: string;
  stripeEventId: string;
  stripeEventCreatedAt: number | null;
}): Promise<void> {
  const stripe = getUniversityStripeClient();

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price.product"],
  });

  const userId = await getUniversityUserIdFromSubscription(subscription);

  if (!userId) {
    throw new Error(
      `[CASE University] Stripe subscription ${subscription.id} is missing trusted ${UNIVERSITY_USER_METADATA_KEY} metadata.`,
    );
  }

  if (!SUPPORTED_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    throw new Error(
      `[CASE University] Unsupported Stripe subscription status "${subscription.status}" for ${subscription.id}.`,
    );
  }

  const item = getPrimarySubscriptionItem(subscription);
  const priceId = item.price.id;
  const productId = extractExpandableId(item.price.product);

  if (!priceId) {
    throw new Error(
      `[CASE University] Stripe subscription ${subscription.id} has no price ID.`,
    );
  }

  if (!productId) {
    throw new Error(
      `[CASE University] Stripe subscription ${subscription.id} has no product ID.`,
    );
  }

  const currentPeriodStart = unixToIso(item.current_period_start);
  const currentPeriodEnd = unixToIso(item.current_period_end);
  const customerId = extractExpandableId(subscription.customer);

  if (!customerId) {
    throw new Error(
      `[CASE University] Stripe subscription ${subscription.id} has no customer ID.`,
    );
  }

  const stripeMode = getUniversityStripeMode();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { error } = await serviceSupabase.rpc(
    "upsert_university_subscription_from_stripe",
    {
      p_user_id: userId,
      p_stripe_mode: stripeMode,
      p_stripe_customer_id: customerId,
      p_stripe_subscription_id: subscription.id,
      p_stripe_price_id: priceId,
      p_stripe_product_id: productId,
      p_status: subscription.status,
      p_current_period_start: currentPeriodStart,
      p_current_period_end: currentPeriodEnd,
      p_cancel_at_period_end: subscription.cancel_at_period_end,
      p_canceled_at: unixToIso(subscription.canceled_at),
      p_stripe_event_id: stripeEventId,
      p_stripe_event_created_at: unixToIso(stripeEventCreatedAt),
    },
  );

  if (error) {
    throw new Error(
      `[CASE University] Failed to synchronize Stripe subscription ${subscription.id}: ${error.message}`,
    );
  }
}

export function getSubscriptionIdForUniversityStripeEvent(
  event: Stripe.Event,
): string | null {
  switch (event.type) {
    case "checkout.session.completed":
      return getSubscriptionIdFromCheckoutSession(
        event.data.object as Stripe.Checkout.Session,
      );

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return (event.data.object as Stripe.Subscription).id;

    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required":
      return getSubscriptionIdFromInvoice(
        event.data.object as Stripe.Invoice,
      );

    default:
      return null;
  }
}

export function stripeEventMatchesConfiguredMode(
  event: Stripe.Event,
  mode: UniversityStripeMode,
): boolean {
  return event.livemode === (mode === "live");
}
