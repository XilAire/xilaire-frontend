import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

export const dynamic = "force-dynamic";

type BillingInterval = "week" | "month" | "year";

type CreateOrganizationProductInput = {
  organization_id?: string;
  product_key?: string;
  name?: string;
  description?: string | null;
  feature_key?: string;
  amount?: number;
  billing_interval?: BillingInterval;
  discord_role_id?: string | null;
  active?: boolean;
  sort_order?: number;
};

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function getStripe() {
  const secretKey =
    process.env.STRIPE_MODE === "live"
      ? process.env.STRIPE_SECRET_KEY_CASE_TRADES
      : process.env.STRIPE_SECRET_KEY_TEST;

  if (!secretKey) {
    throw new Error("Missing Stripe secret key.");
  }

  return new Stripe(secretKey);
}

function isMasterAdmin(role: Awaited<ReturnType<typeof resolveCurrentUserRole>>) {
  return (
    role?.role_name === "master_admin" ||
    role?.role_rank === 4 ||
    String(role?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

function normalizeProductKey(value?: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toStripeAmount(amount?: number) {
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

export async function POST(req: Request) {
  try {
    const role = await resolveCurrentUserRole();

    if (!role || !isMasterAdmin(role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = (await req.json()) as CreateOrganizationProductInput;

    const organizationId = String(body.organization_id ?? "").trim();
    const productKey = normalizeProductKey(body.product_key);
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim() || null;
    const featureKey = String(body.feature_key ?? "").trim();
    const stripeAmount = toStripeAmount(body.amount);
    const billingInterval = body.billing_interval ?? "month";
    const discordRoleId = String(body.discord_role_id ?? "").trim() || null;
    const active = body.active ?? true;
    const sortOrder = Number.isFinite(body.sort_order)
      ? Number(body.sort_order)
      : 100;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organization_id is required." },
        { status: 400 }
      );
    }

    if (!productKey || !name || !featureKey) {
      return NextResponse.json(
        { error: "product_key, name, and feature_key are required." },
        { status: 400 }
      );
    }

    if (!stripeAmount) {
      return NextResponse.json(
        { error: "amount must be greater than 0." },
        { status: 400 }
      );
    }

    if (!["week", "month", "year"].includes(billingInterval)) {
      return NextResponse.json(
        { error: "billing_interval must be week, month, or year." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id, name, slug, active")
      .eq("id", organizationId)
      .eq("active", true)
      .maybeSingle();

    if (organizationError || !organization) {
      return NextResponse.json(
        { error: "Organization not found or inactive." },
        { status: 404 }
      );
    }

    const stripe = getStripe();

    const stripeProduct = await stripe.products.create({
      name,
      description: description ?? undefined,
      active,
      metadata: {
        organization_id: organization.id,
        organization_slug: organization.slug,
        organization_name: organization.name,
        product_key: productKey,
        feature_key: featureKey,
      },
    });

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: stripeAmount,
      currency: "usd",
      recurring: {
        interval: billingInterval,
      },
      active,
      metadata: {
        organization_id: organization.id,
        organization_slug: organization.slug,
        organization_name: organization.name,
        product_key: productKey,
        feature_key: featureKey,
      },
    });

    const { data: product, error: productError } = await supabase
      .from("organization_products")
      .upsert(
        {
          organization_id: organization.id,
          product_key: productKey,
          name,
          description,
          feature_key: featureKey,
          price_label: `$${(stripeAmount / 100).toFixed(2)}`,
          billing_interval: billingInterval,
          stripe_product_id: stripeProduct.id,
          stripe_price_id: stripePrice.id,
          discord_role_id: discordRoleId,
          active,
          sort_order: sortOrder,
        },
        {
          onConflict: "organization_id,product_key",
        }
      )
      .select("*")
      .single();

    if (productError || !product) {
      console.error("Failed to save organization product", productError);

      return NextResponse.json(
        { error: "Stripe product was created, but database save failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      organization_id: organization.id,
      product,
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripePrice.id,
    });
  } catch (error) {
    console.error("Create organization product failed", error);

    return NextResponse.json(
      { error: "Failed to create organization product." },
      { status: 500 }
    );
  }
}