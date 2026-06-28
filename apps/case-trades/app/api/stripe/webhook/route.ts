import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { syncUserDiscordRoles } from "@/lib/discord/syncUserDiscordRoles";
import { provisionUserOrganizationAccess } from "@/lib/orgs/provisionUserOrganizationAccess";

export const dynamic = "force-dynamic";

type StripeMode = "test" | "live";

type SubscriptionProvisionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled"
  | "expired"
  | "inactive";

type PlanLookupRow = {
  id: string;
  organization_id: string;
  key: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
};

type OrganizationProductLookupRow = {
  id: string;
  organization_id: string;
  product_key: string;
  name: string;
  feature_key: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  discord_role_id: string | null;
  active: boolean | null;
};

type SubscriptionCatalogItem = {
  source: "plans" | "organization_products";
  plan_id: string | null;
  plan_key: string | null;
  organization_product_id: string | null;
  organization_product_key: string | null;
  organization_id: string;
  feature_key: string | null;
  discord_role_id: string | null;
  stripe_product_id: string | null;
};

function getStripe(stripeMode: StripeMode = "test") {
  const secretKey =
    stripeMode === "test"
      ? process.env.STRIPE_SECRET_KEY_TEST
      : process.env.STRIPE_SECRET_KEY_CASE_TRADES;

  if (!secretKey) {
    throw new Error(
      stripeMode === "test"
        ? "Missing STRIPE_SECRET_KEY_TEST."
        : "Missing STRIPE_SECRET_KEY_CASE_TRADES."
    );
  }

  return new Stripe(secretKey);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

function toTimestamp(value: number | null | undefined) {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const record = subscription as any;

  return {
    currentPeriodStart:
      record.current_period_start ??
      record.items?.data?.[0]?.current_period_start ??
      null,
    currentPeriodEnd:
      record.current_period_end ??
      record.items?.data?.[0]?.current_period_end ??
      null,
  };
}

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id ?? null;
}

function getSubscriptionStripeProductId(subscription: Stripe.Subscription) {
  const product = subscription.items.data[0]?.price?.product;

  if (!product) return null;
  if (typeof product === "string") return product;

  return product.id ?? null;
}

function normalizeSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionProvisionStatus {
  if (status === "active" || status === "trialing" || status === "past_due") {
    return status;
  }

  if (status === "canceled") return "canceled";
  if (status === "paused") return "paused";
  if (status === "incomplete_expired") return "expired";

  return "inactive";
}

async function safeSyncDiscordRoles(userId: string) {
  try {
    const result = await syncUserDiscordRoles(userId);

    console.log("Discord roles synced from Stripe webhook", {
      user_id: userId,
      result,
    });

    return result;
  } catch (error) {
    console.error("Discord role sync failed after Stripe webhook", {
      user_id: userId,
      error,
    });

    return null;
  }
}

async function findUserIdForCustomer(stripeCustomerId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) throw error;

  return profile?.id ?? null;
}

async function findExistingDiscordAccess(userId: string, organizationId: string) {
  const { data, error } = await supabase
    .from("discord_org_access")
    .select("status, discord_role_id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("Existing Discord org access lookup failed", {
      user_id: userId,
      organization_id: organizationId,
      error,
    });
  }

  return data ?? null;
}

async function findOrganizationProductById(
  organizationProductId: string | null | undefined
) {
  if (!organizationProductId) return null;

  const { data, error } = await supabase
    .from("organization_products")
    .select(
      `
      id,
      organization_id,
      product_key,
      name,
      feature_key,
      stripe_product_id,
      stripe_price_id,
      discord_role_id,
      active
    `
    )
    .eq("id", organizationProductId)
    .maybeSingle();

  if (error) throw error;

  return data as OrganizationProductLookupRow | null;
}

async function findPlanById(planId: string | null | undefined) {
  if (!planId) return null;

  const { data, error } = await supabase
    .from("plans")
    .select("id, organization_id, key, stripe_product_id, stripe_price_id")
    .eq("id", planId)
    .maybeSingle();

  if (error) throw error;

  return data as PlanLookupRow | null;
}

async function findPlanByPriceId(priceId: string) {
  const { data, error } = await supabase
    .from("plans")
    .select("id, organization_id, key, stripe_product_id, stripe_price_id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();

  if (error) throw error;

  return data as PlanLookupRow | null;
}

async function findPlanByProductKey(productKey: string | null | undefined) {
  if (!productKey) return null;

  const normalizedKey = productKey.replace(/^case_/, "");

  const { data, error } = await supabase
    .from("plans")
    .select("id, organization_id, key, stripe_product_id, stripe_price_id")
    .eq("key", normalizedKey)
    .maybeSingle();

  if (error) throw error;

  return data as PlanLookupRow | null;
}

async function findCatalogItemForSubscription({
  priceId,
  stripeProductId,
  metadata,
}: {
  priceId: string;
  stripeProductId: string | null;
  metadata: Stripe.Metadata | null | undefined;
}): Promise<SubscriptionCatalogItem | null> {
  const metadataOrganizationProductId =
    metadata?.organization_product_id || null;

  const metadataPlanId = metadata?.plan_id || null;
  const metadataPlanKey = metadata?.plan_key || null;
  const metadataOrganizationId = metadata?.organization_id || null;
  const metadataFeatureKey = metadata?.feature_key || null;
  const metadataDiscordRoleId = metadata?.discord_role_id || null;
  const metadataStripeProductId = metadata?.stripe_product_id || stripeProductId;

  const metadataPlan = await findPlanById(metadataPlanId);

  if (metadataPlan?.id) {
    return {
      source: "plans",
      plan_id: metadataPlan.id,
      plan_key: metadataPlan.key,
      organization_product_id: metadataOrganizationProductId || null,
      organization_product_key: metadataPlanKey || null,
      organization_id: metadataPlan.organization_id,
      feature_key: metadataFeatureKey || metadataPlan.key || null,
      discord_role_id: metadataDiscordRoleId || null,
      stripe_product_id:
        metadataPlan.stripe_product_id ?? metadataStripeProductId ?? null,
    };
  }

  const metadataOrganizationProduct = await findOrganizationProductById(
    metadataOrganizationProductId
  );

  if (metadataOrganizationProduct?.id) {
    const matchingPlan =
      (await findPlanByPriceId(priceId)) ??
      (await findPlanByProductKey(metadataOrganizationProduct.product_key));

    return {
      source: "organization_products",
      plan_id: matchingPlan?.id ?? null,
      plan_key: matchingPlan?.key ?? metadataPlanKey ?? null,
      organization_product_id: metadataOrganizationProduct.id,
      organization_product_key: metadataOrganizationProduct.product_key,
      organization_id: metadataOrganizationProduct.organization_id,
      feature_key:
        metadataOrganizationProduct.feature_key ?? metadataFeatureKey ?? null,
      discord_role_id:
        metadataOrganizationProduct.discord_role_id ??
        metadataDiscordRoleId ??
        null,
      stripe_product_id:
        metadataOrganizationProduct.stripe_product_id ??
        metadataStripeProductId ??
        null,
    };
  }

  const { data: organizationProduct, error: organizationProductError } =
    await supabase
      .from("organization_products")
      .select(
        `
        id,
        organization_id,
        product_key,
        name,
        feature_key,
        stripe_product_id,
        stripe_price_id,
        discord_role_id,
        active
      `
      )
      .eq("stripe_price_id", priceId)
      .eq("active", true)
      .maybeSingle();

  if (organizationProductError) throw organizationProductError;

  if (organizationProduct?.id) {
    const product = organizationProduct as OrganizationProductLookupRow;

    const matchingPlan =
      (await findPlanByPriceId(priceId)) ??
      (await findPlanByProductKey(product.product_key));

    return {
      source: "organization_products",
      plan_id: matchingPlan?.id ?? null,
      plan_key: matchingPlan?.key ?? metadataPlanKey ?? product.product_key,
      organization_product_id: product.id,
      organization_product_key: product.product_key,
      organization_id: product.organization_id,
      feature_key: product.feature_key ?? metadataFeatureKey ?? null,
      discord_role_id: product.discord_role_id ?? metadataDiscordRoleId ?? null,
      stripe_product_id:
        product.stripe_product_id ?? metadataStripeProductId ?? null,
    };
  }

  const planByPrice = await findPlanByPriceId(priceId);

  if (planByPrice?.id) {
    return {
      source: "plans",
      plan_id: planByPrice.id,
      plan_key: planByPrice.key,
      organization_product_id: metadataOrganizationProductId || null,
      organization_product_key: null,
      organization_id: planByPrice.organization_id,
      feature_key: metadataFeatureKey || planByPrice.key || null,
      discord_role_id: metadataDiscordRoleId || null,
      stripe_product_id:
        planByPrice.stripe_product_id ?? metadataStripeProductId ?? null,
    };
  }

  if (metadataOrganizationId) {
    return {
      source: metadataOrganizationProductId ? "organization_products" : "plans",
      plan_id: metadataPlanId || null,
      plan_key: metadataPlanKey || null,
      organization_product_id: metadataOrganizationProductId || null,
      organization_product_key: metadataPlanKey || null,
      organization_id: metadataOrganizationId,
      feature_key: metadataFeatureKey || null,
      discord_role_id: metadataDiscordRoleId || null,
      stripe_product_id: metadataStripeProductId || null,
    };
  }

  return null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const priceId = getSubscriptionPriceId(subscription);
  const stripeProductId = getSubscriptionStripeProductId(subscription);

  if (!priceId) {
    console.warn("Skipping Stripe subscription missing price ID", {
      subscription_id: subscription.id,
      customer_id: stripeCustomerId,
      status: subscription.status,
    });

    return null;
  }

  const catalogItem = await findCatalogItemForSubscription({
    priceId,
    stripeProductId,
    metadata: subscription.metadata,
  });

  if (!catalogItem) {
    console.warn("Skipping Stripe subscription with unknown price", {
      subscription_id: subscription.id,
      customer_id: stripeCustomerId,
      price_id: priceId,
      stripe_product_id: stripeProductId,
      status: subscription.status,
      metadata: subscription.metadata,
    });

    return null;
  }

  let userId = subscription.metadata?.user_id ?? null;

  if (!userId) {
    userId = await findUserIdForCustomer(stripeCustomerId);
  }

  if (!userId) {
    console.warn("Skipping Stripe subscription because no profile was found", {
      subscription_id: subscription.id,
      customer_id: stripeCustomerId,
      price_id: priceId,
      status: subscription.status,
    });

    return null;
  }

  const record = subscription as any;
  const { currentPeriodStart, currentPeriodEnd } =
    getSubscriptionPeriod(subscription);

  const subscriptionStatus = normalizeSubscriptionStatus(subscription.status);
  const now = new Date().toISOString();

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_id: catalogItem.plan_id,
      organization_id: catalogItem.organization_id,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: toTimestamp(currentPeriodStart),
      current_period_end: toTimestamp(currentPeriodEnd),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: toTimestamp(record.canceled_at),
      updated_at: now,
    },
    {
      onConflict: "stripe_subscription_id",
    }
  );

  if (error) throw error;

  await supabase
    .from("profiles")
    .update({
      stripe_customer_id: stripeCustomerId,
      updated_at: now,
    })
    .eq("id", userId);

  const existingDiscordAccess = await findExistingDiscordAccess(
    userId,
    catalogItem.organization_id
  );

  const provisionResult = await provisionUserOrganizationAccess({
    userId,
    organizationId: catalogItem.organization_id,
    role: "member",
    subscriptionStatus,
    planId: catalogItem.plan_id,
    discordStatus:
      existingDiscordAccess?.status === "active" ? "active" : "inactive",
    discordRoleId:
      catalogItem.discord_role_id ??
      existingDiscordAccess?.discord_role_id ??
      null,
  });

  if (!provisionResult.success) {
    throw new Error(provisionResult.error);
  }

  console.log("Subscription synced and organization access provisioned", {
    user_id: userId,
    organization_id: catalogItem.organization_id,
    subscription_id: subscription.id,
    customer_id: stripeCustomerId,
    price_id: priceId,
    stripe_product_id: catalogItem.stripe_product_id,
    source: catalogItem.source,
    plan_id: catalogItem.plan_id,
    plan_key: catalogItem.plan_key,
    organization_product_id: catalogItem.organization_product_id,
    organization_product_key: catalogItem.organization_product_key,
    feature_key: catalogItem.feature_key,
    discord_role_id: catalogItem.discord_role_id,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: toTimestamp(record.canceled_at),
  });

  await safeSyncDiscordRoles(userId);

  return userId;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const customerId =
    typeof session.customer === "string" ? session.customer : null;

  if (!userId || !customerId) {
    console.warn("Skipping checkout.session.completed without user/customer", {
      session_id: session.id,
      customer: session.customer,
      metadata: session.metadata,
    });

    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;

  if (typeof session.subscription === "string") {
    const stripeMode: StripeMode = session.livemode ? "live" : "test";
    const stripe = getStripe(stripeMode);

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    );

    await syncSubscription(subscription);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof (invoice as any).subscription === "string"
      ? (invoice as any).subscription
      : null;

  if (!subscriptionId) return;

  const stripeMode: StripeMode = invoice.livemode ? "live" : "test";
  const stripe = getStripe(stripeMode);

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await syncSubscription(subscription);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof (invoice as any).subscription === "string"
      ? (invoice as any).subscription
      : null;

  if (!subscriptionId) return;

  const { data: existingSubscription, error: lookupError } = await supabase
    .from("subscriptions")
    .select(
      `
      user_id,
      organization_id,
      plan_id
    `
    )
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) throw error;

  if (existingSubscription?.user_id && existingSubscription.organization_id) {
    const existingDiscordAccess = await findExistingDiscordAccess(
      existingSubscription.user_id,
      existingSubscription.organization_id
    );

    const provisionResult = await provisionUserOrganizationAccess({
      userId: existingSubscription.user_id,
      organizationId: existingSubscription.organization_id,
      role: "member",
      subscriptionStatus: "past_due",
      planId: existingSubscription.plan_id,
      discordStatus:
        existingDiscordAccess?.status === "active" ? "active" : "inactive",
      discordRoleId: existingDiscordAccess?.discord_role_id ?? null,
    });

    if (!provisionResult.success) {
      throw new Error(provisionResult.error);
    }

    await safeSyncDiscordRoles(existingSubscription.user_id);
  }
}

async function handleConnectAccountUpdated(account: Stripe.Account) {
  const onboardingComplete =
    Boolean(account.details_submitted) &&
    Boolean(account.charges_enabled) &&
    Boolean(account.payouts_enabled);

  const { error } = await supabase
    .from("organizations")
    .update({
      stripe_connect_onboarding_complete: onboardingComplete,
      stripe_connect_charges_enabled: Boolean(account.charges_enabled),
      stripe_connect_payouts_enabled: Boolean(account.payouts_enabled),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_connect_account_id", account.id);

  if (error) throw error;

  console.log("Stripe Connect account synchronized", {
    stripe_connect_account_id: account.id,
    onboarding_complete: onboardingComplete,
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const defaultMode: StripeMode =
      process.env.STRIPE_MODE === "live" ? "live" : "test";

    const stripe = getStripe(defaultMode);

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET_CASE_TRADES!
    );
  } catch (error) {
    console.error("Stripe webhook signature failed", error);

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  try {
    const stripeMode: StripeMode = event.livemode ? "live" : "test";
    const stripe = getStripe(stripeMode);

    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;
      }

      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }

      case "account.updated": {
        await handleConnectAccountUpdated(event.data.object as Stripe.Account);
        break;
      }

      case "capability.updated": {
        const capability = event.data.object as Stripe.Capability;
        const accountId =
          typeof capability.account === "string"
            ? capability.account
            : capability.account.id;

        const account = await stripe.accounts.retrieve(accountId);

        await handleConnectAccountUpdated(account);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler failed", error);

    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }
}