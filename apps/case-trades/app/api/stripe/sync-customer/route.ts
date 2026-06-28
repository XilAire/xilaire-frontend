import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { syncUserDiscordRoles } from "@/lib/discord/syncUserDiscordRoles";
import { provisionUserOrganizationAccess } from "@/lib/orgs/provisionUserOrganizationAccess";

export const dynamic = "force-dynamic";

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

function getStripe(testMode = false) {
  const secretKey = testMode
    ? process.env.STRIPE_SECRET_KEY_TEST
    : process.env.STRIPE_SECRET_KEY_CASE_TRADES;

  if (!secretKey) {
    throw new Error(
      testMode
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

function safeReturnPath(value: string | null) {
  if (!value) return "/dashboard/billing";

  try {
    const decoded = decodeURIComponent(value);

    if (!decoded.startsWith("/") || decoded.startsWith("//")) {
      return "/dashboard/billing";
    }

    return decoded;
  } catch {
    if (!value.startsWith("/") || value.startsWith("//")) {
      return "/dashboard/billing";
    }

    return value;
  }
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

async function findPlanByPriceId(priceId: string | null | undefined) {
  if (!priceId) return null;

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

async function findOrganizationProductByPriceId(priceId: string) {
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
    .eq("stripe_price_id", priceId)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;

  return data as OrganizationProductLookupRow | null;
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
      organization_product_id: metadataOrganizationProductId,
      organization_product_key: metadataPlanKey,
      organization_id: metadataPlan.organization_id,
      feature_key: metadataFeatureKey || metadataPlan.key,
      discord_role_id: metadataDiscordRoleId,
      stripe_product_id:
        metadataPlan.stripe_product_id ?? metadataStripeProductId,
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
      plan_key: matchingPlan?.key ?? metadataPlanKey,
      organization_product_id: metadataOrganizationProduct.id,
      organization_product_key: metadataOrganizationProduct.product_key,
      organization_id: metadataOrganizationProduct.organization_id,
      feature_key:
        metadataOrganizationProduct.feature_key ?? metadataFeatureKey,
      discord_role_id:
        metadataOrganizationProduct.discord_role_id ?? metadataDiscordRoleId,
      stripe_product_id:
        metadataOrganizationProduct.stripe_product_id ??
        metadataStripeProductId,
    };
  }

  const organizationProduct = await findOrganizationProductByPriceId(priceId);

  if (organizationProduct?.id) {
    const matchingPlan =
      (await findPlanByPriceId(priceId)) ??
      (await findPlanByProductKey(organizationProduct.product_key));

    return {
      source: "organization_products",
      plan_id: matchingPlan?.id ?? null,
      plan_key:
        matchingPlan?.key ?? metadataPlanKey ?? organizationProduct.product_key,
      organization_product_id: organizationProduct.id,
      organization_product_key: organizationProduct.product_key,
      organization_id: organizationProduct.organization_id,
      feature_key: organizationProduct.feature_key ?? metadataFeatureKey,
      discord_role_id:
        organizationProduct.discord_role_id ?? metadataDiscordRoleId,
      stripe_product_id:
        organizationProduct.stripe_product_id ?? metadataStripeProductId,
    };
  }

  const planByPrice = await findPlanByPriceId(priceId);

  if (planByPrice?.id) {
    return {
      source: "plans",
      plan_id: planByPrice.id,
      plan_key: planByPrice.key,
      organization_product_id: metadataOrganizationProductId,
      organization_product_key: null,
      organization_id: planByPrice.organization_id,
      feature_key: metadataFeatureKey || planByPrice.key,
      discord_role_id: metadataDiscordRoleId,
      stripe_product_id: planByPrice.stripe_product_id ?? metadataStripeProductId,
    };
  }

  if (metadataOrganizationId) {
    return {
      source: metadataOrganizationProductId ? "organization_products" : "plans",
      plan_id: metadataPlanId,
      plan_key: metadataPlanKey,
      organization_product_id: metadataOrganizationProductId,
      organization_product_key: metadataPlanKey,
      organization_id: metadataOrganizationId,
      feature_key: metadataFeatureKey,
      discord_role_id: metadataDiscordRoleId,
      stripe_product_id: metadataStripeProductId,
    };
  }

  return null;
}

async function syncStripeSubscriptionToSupabase({
  subscription,
  userId,
  customerId,
}: {
  subscription: Stripe.Subscription;
  userId: string;
  customerId: string;
}) {
  const priceId = getSubscriptionPriceId(subscription);
  const stripeProductId = getSubscriptionStripeProductId(subscription);

  if (!priceId) {
    console.warn("Skipping customer sync subscription missing price ID", {
      subscription_id: subscription.id,
      customer_id: customerId,
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
    console.warn("Skipping subscription with unknown Stripe price", {
      subscription_id: subscription.id,
      price_id: priceId,
      stripe_product_id: stripeProductId,
      status: subscription.status,
      metadata: subscription.metadata,
    });

    return null;
  }

  const record = subscription as any;
  const { currentPeriodStart, currentPeriodEnd } =
    getSubscriptionPeriod(subscription);

  const now = new Date().toISOString();

  const subscriptionPayload = {
    user_id: userId,
    plan_id: catalogItem.plan_id,
    organization_id: catalogItem.organization_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_start: toTimestamp(currentPeriodStart),
    current_period_end: toTimestamp(currentPeriodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: toTimestamp(record.canceled_at),
    updated_at: now,
  };

  const { error: subscriptionError } = await supabase
    .from("subscriptions")
    .upsert(subscriptionPayload, {
      onConflict: "stripe_subscription_id",
    });

  if (subscriptionError) {
    throw subscriptionError;
  }

  const existingDiscordAccess = await findExistingDiscordAccess(
    userId,
    catalogItem.organization_id
  );

  const provisionResult = await provisionUserOrganizationAccess({
    userId,
    organizationId: catalogItem.organization_id,
    role: "member",
    subscriptionStatus: normalizeSubscriptionStatus(subscription.status),
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

  console.log("Customer subscription synced", {
    user_id: userId,
    customer_id: customerId,
    subscription_id: subscription.id,
    source: catalogItem.source,
    plan_id: catalogItem.plan_id,
    plan_key: catalogItem.plan_key,
    organization_product_id: catalogItem.organization_product_id,
    organization_product_key: catalogItem.organization_product_key,
    organization_id: catalogItem.organization_id,
    feature_key: catalogItem.feature_key,
    discord_role_id: catalogItem.discord_role_id,
    stripe_product_id: catalogItem.stripe_product_id,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_end: toTimestamp(currentPeriodEnd),
  });

  return {
    subscriptionId: subscription.id,
    catalogItem,
  };
}

async function markStaleSubscriptionsCanceled({
  userId,
  customerId,
  syncedSubscriptionIds,
}: {
  userId: string;
  customerId: string;
  syncedSubscriptionIds: string[];
}) {
  if (syncedSubscriptionIds.length === 0) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_at_period_end: false,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("stripe_customer_id", customerId)
      .in("status", ["active", "trialing", "past_due"]);

    if (error) {
      console.error("Failed to mark all stale subscriptions canceled", {
        user_id: userId,
        customer_id: customerId,
        error,
      });
    }

    return;
  }

  const { data: currentRows, error: lookupError } = await supabase
    .from("subscriptions")
    .select("id, stripe_subscription_id")
    .eq("user_id", userId)
    .eq("stripe_customer_id", customerId)
    .in("status", ["active", "trialing", "past_due"]);

  if (lookupError) {
    console.error("Failed to load stale subscriptions", {
      user_id: userId,
      customer_id: customerId,
      error: lookupError,
    });

    return;
  }

  const staleIds = (currentRows ?? [])
    .filter(
      (row) =>
        row.stripe_subscription_id &&
        !syncedSubscriptionIds.includes(row.stripe_subscription_id)
    )
    .map((row) => row.id);

  if (staleIds.length === 0) return;

  const { error: staleSubscriptionError } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("id", staleIds);

  if (staleSubscriptionError) {
    console.error("Failed to mark stale subscriptions canceled", {
      user_id: userId,
      customer_id: customerId,
      syncedSubscriptionIds,
      staleIds,
      error: staleSubscriptionError,
    });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const email = url.searchParams.get("email");
    const testMode = url.searchParams.get("test") === "true";
    const returnTo = safeReturnPath(url.searchParams.get("return_to"));

    if (!email) {
      return NextResponse.json({ error: "Missing email." }, { status: 400 });
    }

    const stripe = getStripe(testMode);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .ilike("email", email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found." },
        { status: 404 }
      );
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const { data: latestSubscription, error: latestSubscriptionError } =
        await supabase
          .from("subscriptions")
          .select("stripe_customer_id")
          .eq("user_id", profile.id)
          .not("stripe_customer_id", "is", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (latestSubscriptionError) {
        console.error("Customer sync latest subscription lookup failed", {
          profile_id: profile.id,
          email: profile.email,
          error: latestSubscriptionError,
        });
      }

      customerId = latestSubscription?.stripe_customer_id ?? null;
    }

    if (!customerId) {
      const redirectUrl = new URL(returnTo, url.origin);
      redirectUrl.searchParams.set("sync", "no_customer");

      return NextResponse.redirect(redirectUrl.toString());
    }

    const customer = await stripe.customers.retrieve(customerId);

    if ("deleted" in customer && customer.deleted) {
      const redirectUrl = new URL(returnTo, url.origin);
      redirectUrl.searchParams.set("sync", "customer_deleted");

      return NextResponse.redirect(redirectUrl.toString());
    }

    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

    const syncedSubscriptionIds: string[] = [];

    for (const subscription of stripeSubscriptions.data) {
      const result = await syncStripeSubscriptionToSupabase({
        subscription,
        userId: profile.id,
        customerId,
      });

      if (result?.subscriptionId) {
        syncedSubscriptionIds.push(result.subscriptionId);
      }
    }

    await supabase
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    await markStaleSubscriptionsCanceled({
      userId: profile.id,
      customerId,
      syncedSubscriptionIds,
    });

    try {
      await syncUserDiscordRoles(profile.id);
    } catch (discordSyncError) {
      console.error("Customer sync Discord role sync failed", {
        user_id: profile.id,
        error: discordSyncError,
      });

      const redirectUrl = new URL(returnTo, url.origin);
      redirectUrl.searchParams.set("sync", "success_discord_failed");

      return NextResponse.redirect(redirectUrl.toString());
    }

    const redirectUrl = new URL(returnTo, url.origin);
    redirectUrl.searchParams.set("sync", "success");

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Customer sync failed", error);

    return NextResponse.json(
      { error: "Customer sync failed. Check terminal logs." },
      { status: 500 }
    );
  }
}