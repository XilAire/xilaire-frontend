import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

type PlanRow = {
  id: string;
  key: string;
  name: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  organization_id: string | null;
};

type OrganizationProductRow = {
  id: string;
  organization_id: string;
  product_key: string;
  name: string;
  description: string | null;
  feature_key: string;
  price_label: string | null;
  billing_interval: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  discord_role_id: string | null;
  active: boolean;
};

type CheckoutProduct = {
  source: "plans" | "organization_products";
  id: string;
  key: string;
  name: string;
  stripe_price_id: string;
  organization_id: string | null;
  plan_id: string | null;
  feature_key?: string | null;
  discord_role_id?: string | null;
  stripe_product_id?: string | null;
};

type ExistingSubscriptionRow = {
  id: string;
  status: string | null;
  cancel_at_period_end: boolean | null;
  stripe_subscription_id: string | null;
  plan_id: string | null;
  organization_id: string | null;
  plan:
    | {
        id: string;
        key: string;
        name: string | null;
        stripe_price_id: string | null;
        stripe_product_id: string | null;
      }
    | {
        id: string;
        key: string;
        name: string | null;
        stripe_price_id: string | null;
        stripe_product_id: string | null;
      }[]
    | null;
};

type OrganizationConnectRow = {
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_complete: boolean | null;
  stripe_connect_charges_enabled: boolean | null;
  stripe_connect_payouts_enabled: boolean | null;
  platform_fee_percent: number | null;
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

function normalizeSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

async function findMatchingPlanForOrganizationProduct(
  product: OrganizationProductRow
) {
  if (!product.stripe_price_id) return null;

  const { data: planByPrice } = await supabase
    .from("plans")
    .select("id, key, name, stripe_product_id, stripe_price_id, organization_id")
    .eq("stripe_price_id", product.stripe_price_id)
    .eq("active", true)
    .maybeSingle();

  if (planByPrice) {
    return planByPrice as PlanRow;
  }

  const legacyPlanKey = product.product_key.replace(/^case_/, "");

  const { data: planByKey } = await supabase
    .from("plans")
    .select("id, key, name, stripe_product_id, stripe_price_id, organization_id")
    .eq("key", legacyPlanKey)
    .eq("active", true)
    .maybeSingle();

  if (planByKey) {
    return planByKey as PlanRow;
  }

  return null;
}

async function getCheckoutProduct({
  planKey,
  organizationProductId,
}: {
  planKey: string | null;
  organizationProductId: string | null;
}): Promise<CheckoutProduct | null> {
  if (organizationProductId) {
    const { data: organizationProduct, error: organizationProductError } =
      await supabase
        .from("organization_products")
        .select(
          `
          id,
          organization_id,
          product_key,
          name,
          description,
          feature_key,
          price_label,
          billing_interval,
          stripe_product_id,
          stripe_price_id,
          discord_role_id,
          active
        `
        )
        .eq("id", organizationProductId)
        .eq("active", true)
        .maybeSingle();

    if (organizationProductError) {
      console.error("Organization product checkout lookup failed", {
        organizationProductId,
        organizationProductError,
      });
      return null;
    }

    if (!organizationProduct?.stripe_price_id) {
      return null;
    }

    const product = organizationProduct as OrganizationProductRow;
    const matchingPlan = await findMatchingPlanForOrganizationProduct(product);

    return {
      source: "organization_products",
      id: product.id,
      key: product.product_key,
      name: product.name,
      stripe_price_id: product.stripe_price_id!,
      organization_id: product.organization_id,
      plan_id: matchingPlan?.id ?? null,
      feature_key: product.feature_key,
      discord_role_id: product.discord_role_id,
      stripe_product_id: product.stripe_product_id,
    };
  }

  if (!planKey) {
    return null;
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, key, name, stripe_product_id, stripe_price_id, organization_id")
    .eq("key", planKey)
    .eq("active", true)
    .maybeSingle();

  if (planError) {
    console.error("Plan checkout lookup failed", {
      planKey,
      planError,
    });
    return null;
  }

  if (!plan?.stripe_price_id) {
    return null;
  }

  const planRow = plan as PlanRow;

  return {
    source: "plans",
    id: planRow.id,
    key: planRow.key,
    name: planRow.name,
    stripe_price_id: planRow.stripe_price_id!,
    organization_id: planRow.organization_id,
    plan_id: planRow.id,
    stripe_product_id: planRow.stripe_product_id,
  };
}

function subscriptionMatchesCheckoutProduct({
  subscription,
  checkoutProduct,
}: {
  subscription: ExistingSubscriptionRow;
  checkoutProduct: CheckoutProduct;
}) {
  const plan = normalizeSingle(subscription.plan);

  const values = [
    subscription.plan_id,
    plan?.id,
    plan?.key,
    plan?.stripe_price_id,
    plan?.stripe_product_id,
  ]
    .filter(Boolean)
    .map((value) => String(value));

  return (
    values.includes(checkoutProduct.plan_id ?? "") ||
    values.includes(checkoutProduct.key) ||
    values.includes(checkoutProduct.stripe_price_id) ||
    values.includes(checkoutProduct.stripe_product_id ?? "")
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const planKey = url.searchParams.get("plan");
    const organizationProductId = url.searchParams.get(
      "organization_product_id"
    );
    const product = url.searchParams.get("product");
    const testMode = url.searchParams.get("test") === "true";
    const email = url.searchParams.get("email");

    if (!planKey && !organizationProductId) {
      return NextResponse.json(
        {
          error:
            "Missing plan key or organization product ID. Use /api/stripe/checkout?plan=signals_weekly or /api/stripe/checkout?organization_product_id=PRODUCT_ID.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Missing email. Use /api/stripe/checkout?plan=signals_weekly&email=you@example.com",
        },
        { status: 400 }
      );
    }

    const stripe = getStripe(testMode);
    const origin = url.origin;

    const checkoutProduct = await getCheckoutProduct({
      planKey,
      organizationProductId,
    });

    if (!checkoutProduct) {
      return NextResponse.json(
        {
          error:
            "Plan or organization product not found, inactive, or missing Stripe Price ID.",
        },
        { status: 404 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .ilike("email", email)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: `Profile not found for email. ${
            profileError?.message ?? ""
          }`.trim(),
        },
        { status: 404 }
      );
    }

    const { data: existingSubscriptions, error: existingSubscriptionsError } =
      await supabase
        .from("subscriptions")
        .select(
          `
          id,
          status,
          cancel_at_period_end,
          stripe_subscription_id,
          plan_id,
          organization_id,
          plan:plans (
            id,
            key,
            name,
            stripe_price_id,
            stripe_product_id
          )
        `
        )
        .eq("user_id", profile.id)
        .in("status", ["active", "trialing", "past_due"])
        .order("updated_at", { ascending: false });

    if (existingSubscriptionsError) {
      console.error("Existing subscription lookup failed", {
        user_id: profile.id,
        email: profile.email,
        existingSubscriptionsError,
      });
    }

    const matchingExistingSubscription = (
      (existingSubscriptions ?? []) as ExistingSubscriptionRow[]
    ).find((subscription) =>
      subscriptionMatchesCheckoutProduct({
        subscription,
        checkoutProduct,
      })
    );

    if (matchingExistingSubscription) {
      console.log(
        "Existing active matching subscription found. Redirecting to portal.",
        {
          user_id: profile.id,
          email: profile.email,
          subscription_id:
            matchingExistingSubscription.stripe_subscription_id,
          status: matchingExistingSubscription.status,
          cancel_at_period_end:
            matchingExistingSubscription.cancel_at_period_end,
          checkout_product_key: checkoutProduct.key,
          checkout_product_id: checkoutProduct.id,
        }
      );

      return NextResponse.redirect(
        `${origin}/api/stripe/customer-portal?test=${testMode}&email=${encodeURIComponent(
          profile.email
        )}`
      );
    }

    let customerId = profile.stripe_customer_id as string | null;

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);

        if ("deleted" in customer && customer.deleted) {
          customerId = null;
        }
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          user_id: profile.id,
        },
      });

      customerId = customer.id;

      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateProfileError) {
        throw updateProfileError;
      }
    }

    const metadata = {
      user_id: profile.id,
      source: checkoutProduct.source,
      product: product ?? "",
      plan_id: checkoutProduct.plan_id ?? "",
      plan_key: checkoutProduct.key,
      organization_product_id:
        checkoutProduct.source === "organization_products"
          ? checkoutProduct.id
          : "",
      organization_id: checkoutProduct.organization_id ?? "",
      feature_key: checkoutProduct.feature_key ?? "",
      discord_role_id: checkoutProduct.discord_role_id ?? "",
      stripe_product_id: checkoutProduct.stripe_product_id ?? "",
      stripe_price_id: checkoutProduct.stripe_price_id,
      stripe_mode: testMode ? "test" : "live",
    };

    let subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
      {
        metadata,
      };

    if (checkoutProduct.organization_id) {
      const { data: organization, error: organizationError } = await supabase
        .from("organizations")
        .select(
          `
          stripe_connect_account_id,
          stripe_connect_onboarding_complete,
          stripe_connect_charges_enabled,
          stripe_connect_payouts_enabled,
          platform_fee_percent
          `
        )
        .eq("id", checkoutProduct.organization_id)
        .maybeSingle();

      if (organizationError) {
        throw organizationError;
      }

      const connectOrganization = organization as OrganizationConnectRow | null;

      if (
        connectOrganization?.stripe_connect_account_id &&
        connectOrganization.stripe_connect_onboarding_complete &&
        connectOrganization.stripe_connect_charges_enabled &&
        connectOrganization.stripe_connect_payouts_enabled
      ) {
        const applicationFeePercent = Number(
          connectOrganization.platform_fee_percent ?? 20
        );

        subscriptionData = {
          metadata,
          application_fee_percent: applicationFeePercent,
          transfer_data: {
            destination: connectOrganization.stripe_connect_account_id,
          },
        };

        console.log("Stripe Connect destination charge enabled", {
          organization_id: checkoutProduct.organization_id,
          destination: connectOrganization.stripe_connect_account_id,
          application_fee_percent: applicationFeePercent,
        });
      } else {
        console.log("Stripe Connect destination charge skipped", {
          organization_id: checkoutProduct.organization_id,
          reason:
            "Organization has not completed Stripe Connect onboarding or charges/payouts are not enabled.",
          has_connect_account: Boolean(
            connectOrganization?.stripe_connect_account_id
          ),
          onboarding_complete: Boolean(
            connectOrganization?.stripe_connect_onboarding_complete
          ),
          charges_enabled: Boolean(
            connectOrganization?.stripe_connect_charges_enabled
          ),
          payouts_enabled: Boolean(
            connectOrganization?.stripe_connect_payouts_enabled
          ),
        });
      }
    }

    console.log("CREATING CHECKOUT SESSION", {
      user_id: profile.id,
      email: profile.email,
      customer_id: customerId,
      source: checkoutProduct.source,
      product,
      plan_key: checkoutProduct.key,
      checkout_product_id: checkoutProduct.id,
      organization_product_id:
        checkoutProduct.source === "organization_products"
          ? checkoutProduct.id
          : null,
      plan_id: checkoutProduct.plan_id,
      price_id: checkoutProduct.stripe_price_id,
      organization_id: checkoutProduct.organization_id,
      feature_key: checkoutProduct.feature_key ?? null,
      discord_role_id: checkoutProduct.discord_role_id ?? null,
      stripe_mode: testMode ? "test" : "live",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: checkoutProduct.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${origin}/api/stripe/confirm-checkout?session_id={CHECKOUT_SESSION_ID}&mode=${
        testMode ? "test" : "live"
      }`,
      cancel_url: `${origin}/dashboard/billing?checkout=cancelled&plan=${encodeURIComponent(
        checkoutProduct.key
      )}`,
      metadata,
      subscription_data: subscriptionData,
    });

    console.log("CHECKOUT SESSION CREATED", {
      session_id: session.id,
      customer: session.customer,
      metadata: session.metadata,
    });

    if (!session.url) {
      throw new Error("Stripe Checkout session did not return a URL.");
    }

    return NextResponse.redirect(session.url);
  } catch (error: any) {
    console.error("❌ STRIPE CHECKOUT FAILED", {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      raw: error?.raw,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        error: error?.message ?? "Unknown checkout error",
      },
      {
        status: 500,
      }
    );
  }
}