import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

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
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found." },
        { status: 404 }
      );
    }

    let customerId = profile.stripe_customer_id as string | null;

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);

        if ("deleted" in customer && customer.deleted) {
          customerId = null;
        }
      } catch (error) {
        console.warn("Stored Stripe customer could not be retrieved", {
          profile_id: profile.id,
          email: profile.email,
          customer_id: customerId,
          testMode,
          error,
        });

        customerId = null;
      }
    }

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
        console.error("Customer portal latest subscription lookup failed", {
          profile_id: profile.id,
          email: profile.email,
          error: latestSubscriptionError,
        });
      }

      customerId = latestSubscription?.stripe_customer_id ?? null;
    }

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);

        if ("deleted" in customer && customer.deleted) {
          customerId = null;
        }
      } catch (error) {
        console.warn("Fallback Stripe customer could not be retrieved", {
          profile_id: profile.id,
          email: profile.email,
          customer_id: customerId,
          testMode,
          error,
        });

        customerId = null;
      }
    }

    if (!customerId) {
      const customers = await stripe.customers.list({
        email: profile.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          user_id: profile.id,
          stripe_mode: testMode ? "test" : "live",
        },
      });

      customerId = customer.id;

      console.log("Created new Stripe customer", {
        profile_id: profile.id,
        customer_id: customerId,
        stripe_mode: testMode ? "test" : "live",
      });
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (updateError) {
      throw updateError;
    }

    console.log("CUSTOMER PORTAL PROFILE", {
      profile_id: profile.id,
      email: profile.email,
      customer_id: customerId,
      testMode,
      returnTo,
    });

    const syncReturnUrl = new URL("/api/stripe/sync-customer", url.origin);

    syncReturnUrl.searchParams.set("test", String(testMode));
    syncReturnUrl.searchParams.set("email", profile.email);
    syncReturnUrl.searchParams.set("return_to", returnTo);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: syncReturnUrl.toString(),
    });

    return NextResponse.redirect(session.url);
  } catch (error: any) {
    console.error("Customer portal failed", {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      raw: error?.raw,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        error: error?.message ?? "Customer portal failed. Check terminal logs.",
      },
      {
        status: 500,
      }
    );
  }
}