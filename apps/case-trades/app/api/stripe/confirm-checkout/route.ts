import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { syncUserDiscordRoles } from "@/lib/discord/syncUserDiscordRoles";

export const dynamic = "force-dynamic";

type StripeMode = "test" | "live";

type PlanRow = {
  id: string;
  key: string;
  name: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  organization_id: string | null;
};

type OrganizationProductRow = {
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

type ResolvedCheckoutProduct = {
  plan_id: string | null;
  plan_key: string | null;
  organization_id: string;
  organization_product_id: string | null;
  organization_product_key: string | null;
  resolved_plan_key: string;
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

function toTimestamp(value: number | null | undefined) {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const subscriptionRecord = subscription as any;

  return {
    currentPeriodStart:
      subscriptionRecord.current_period_start ??
      subscriptionRecord.items?.data?.[0]?.current_period_start ??
      null,
    currentPeriodEnd:
      subscriptionRecord.current_period_end ??
      subscriptionRecord.items?.data?.[0]?.current_period_end ??
      null,
  };
}

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id ?? null;
}

function normalizeStripeMode(value: string | null): StripeMode {
  return value === "live" ? "live" : "test";
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

async function safeSyncDiscordRoles(userId: string) {
  try {
    const result = await syncUserDiscordRoles(userId);

    console.log("Discord roles synced from confirm checkout", {
      user_id: userId,
      result,
    });
  } catch (error) {
    console.error("Discord role sync failed from confirm checkout", {
      user_id: userId,
      error,
    });
  }
}

async function getOrganizationProduct(
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

  if (error) {
    console.error("Confirm checkout organization product lookup failed", {
      organization_product_id: organizationProductId,
      error,
    });

    return null;
  }

  return data as OrganizationProductRow | null;
}

async function getPlanById(planId: string | null | undefined) {
  if (!planId) return null;

  const { data, error } = await supabase
    .from("plans")
    .select("id, key, name, stripe_product_id, stripe_price_id, organization_id")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    console.error("Confirm checkout plan lookup by id failed", {
      plan_id: planId,
      error,
    });

    return null;
  }

  return data as PlanRow | null;
}

async function getPlanByPriceId(priceId: string | null | undefined) {
  if (!priceId) return null;

  const { data, error } = await supabase
    .from("plans")
    .select("id, key, name, stripe_product_id, stripe_price_id, organization_id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();

  if (error) {
    console.error("Confirm checkout plan lookup by price failed", {
      stripe_price_id: priceId,
      error,
    });

    return null;
  }

  return data as PlanRow | null;
}

async function getPlanByKey(planKey: string | null | undefined) {
  if (!planKey) return null;

  const normalizedPlanKey = planKey.replace(/^case_/, "");

  const { data, error } = await supabase
    .from("plans")
    .select("id, key, name, stripe_product_id, stripe_price_id, organization_id")
    .eq("key", normalizedPlanKey)
    .maybeSingle();

  if (error) {
    console.error("Confirm checkout plan lookup by key failed", {
      plan_key: planKey,
      normalized_plan_key: normalizedPlanKey,
      error,
    });

    return null;
  }

  return data as PlanRow | null;
}

async function resolveCheckoutProduct({
  metadata,
  priceId,
}: {
  metadata: Stripe.Metadata | null | undefined;
  priceId: string | null;
}): Promise<ResolvedCheckoutProduct | null> {
  const metadataPlanId = metadata?.plan_id || null;
  const metadataPlanKey = metadata?.plan_key || null;
  const metadataOrganizationId = metadata?.organization_id || null;
  const metadataOrganizationProductId =
    metadata?.organization_product_id || null;

  const organizationProduct = await getOrganizationProduct(
    metadataOrganizationProductId
  );

  const planFromMetadataId = await getPlanById(metadataPlanId);
  const planFromPrice = await getPlanByPriceId(priceId);
  const planFromKey = await getPlanByKey(
    organizationProduct?.product_key ?? metadataPlanKey
  );

  const resolvedPlan = planFromMetadataId ?? planFromPrice ?? planFromKey;

  const organizationId =
    organizationProduct?.organization_id ??
    resolvedPlan?.organization_id ??
    metadataOrganizationId;

  if (!organizationId) {
    return null;
  }

  return {
    plan_id: resolvedPlan?.id ?? null,
    plan_key: resolvedPlan?.key ?? metadataPlanKey,
    organization_id: organizationId,
    organization_product_id: organizationProduct?.id ?? metadataOrganizationProductId,
    organization_product_key:
      organizationProduct?.product_key ?? metadataPlanKey ?? null,
    resolved_plan_key:
      organizationProduct?.product_key ??
      resolvedPlan?.key ??
      metadataPlanKey ??
      "subscription",
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const sessionId = url.searchParams.get("session_id");
  const stripeMode = normalizeStripeMode(url.searchParams.get("mode"));

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing session_id." },
      { status: 400 }
    );
  }

  const stripe = getStripe(stripeMode);

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const userId = session.metadata?.user_id;
  const customerId =
    typeof session.customer === "string" ? session.customer : null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  if (!userId || !customerId || !subscriptionId) {
    console.error("Confirm checkout missing required session data", {
      session_id: session.id,
      customer: session.customer,
      subscription: session.subscription,
      metadata: session.metadata,
    });

    return NextResponse.json(
      { error: "Checkout session missing required data." },
      { status: 400 }
    );
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionRecord = subscription as any;

  const priceId = getSubscriptionPriceId(subscription);

  const resolvedCheckoutProduct = await resolveCheckoutProduct({
    metadata: subscription.metadata?.user_id
      ? subscription.metadata
      : session.metadata,
    priceId,
  });

  if (!resolvedCheckoutProduct) {
    console.error("Confirm checkout could not resolve plan or organization", {
      session_id: session.id,
      subscription_id: subscription.id,
      price_id: priceId,
      session_metadata: session.metadata,
      subscription_metadata: subscription.metadata,
    });

    return NextResponse.json(
      { error: "Could not resolve subscription plan or organization." },
      { status: 400 }
    );
  }

  const { currentPeriodStart, currentPeriodEnd } =
    getSubscriptionPeriod(subscription);

  const now = new Date().toISOString();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      updated_at: now,
    })
    .eq("id", userId);

  if (profileError) {
    console.error("Confirm checkout profile update failed", profileError);

    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }

  const subscriptionPayload = {
    user_id: userId,
    plan_id: resolvedCheckoutProduct.plan_id,
    organization_id: resolvedCheckoutProduct.organization_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_start: toTimestamp(currentPeriodStart),
    current_period_end: toTimestamp(currentPeriodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: toTimestamp(subscriptionRecord.canceled_at),
    updated_at: now,
  };

  const { data: sameStripeSubscription, error: sameStripeLookupError } =
    await supabase
      .from("subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

  if (sameStripeLookupError) {
    console.error(
      "Confirm checkout subscription lookup failed",
      sameStripeLookupError
    );

    return NextResponse.json(
      { error: "Failed to check existing subscription." },
      { status: 500 }
    );
  }

  if (sameStripeSubscription?.id) {
    const { error: updateSameError } = await supabase
      .from("subscriptions")
      .update(subscriptionPayload)
      .eq("id", sameStripeSubscription.id);

    if (updateSameError) {
      console.error(
        "Confirm checkout subscription update failed",
        updateSameError
      );

      return NextResponse.json(
        { error: "Failed to update subscription." },
        { status: 500 }
      );
    }

    await safeSyncDiscordRoles(userId);

    return NextResponse.redirect(
      `${url.origin}/dashboard/billing?checkout=success&plan=${encodeURIComponent(
        resolvedCheckoutProduct.resolved_plan_key
      )}`
    );
  }

  const { data: existingCurrentSubscription, error: currentLookupError } =
    await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id, status, cancel_at_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"])
      .eq("cancel_at_period_end", false)
      .maybeSingle();

  if (currentLookupError) {
    console.error(
      "Confirm checkout current subscription lookup failed",
      currentLookupError
    );

    return NextResponse.json(
      { error: "Failed to check current subscription." },
      { status: 500 }
    );
  }

  if (
    existingCurrentSubscription?.id &&
    existingCurrentSubscription.stripe_subscription_id !== subscription.id
  ) {
    console.warn("Confirm checkout found existing current subscription", {
      user_id: userId,
      existing_subscription_id:
        existingCurrentSubscription.stripe_subscription_id,
      new_subscription_id: subscription.id,
      status: existingCurrentSubscription.status,
      cancel_at_period_end: existingCurrentSubscription.cancel_at_period_end,
    });

    await safeSyncDiscordRoles(userId);

    return NextResponse.redirect(
      `${url.origin}/dashboard/billing?checkout=already_active&plan=${encodeURIComponent(
        resolvedCheckoutProduct.resolved_plan_key
      )}`
    );
  }

  const { error: insertError } = await supabase
    .from("subscriptions")
    .insert(subscriptionPayload);

  if (insertError) {
    console.error("Confirm checkout subscription insert failed", {
      error: insertError,
      payload: subscriptionPayload,
    });

    return NextResponse.json(
      { error: "Failed to save subscription." },
      { status: 500 }
    );
  }

  await safeSyncDiscordRoles(userId);

  return NextResponse.redirect(
    `${url.origin}/dashboard/billing?checkout=success&plan=${encodeURIComponent(
      resolvedCheckoutProduct.resolved_plan_key
    )}`
  );
}