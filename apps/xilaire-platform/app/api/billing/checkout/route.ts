export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/* ---------------------------------------------
   Pricing Map
---------------------------------------------- */
const PRICE_MAP = {
  cloudsuite_pro: "price_XXXXXXXXXXXX", // Replace with a real Stripe price ID before use.
} as const;

type PlanKey = keyof typeof PRICE_MAP;

/* ---------------------------------------------
   POST /api/billing/checkout
---------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    // Do not initialize Stripe during module import: Next.js loads this
    // route while collecting page data during production builds.
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeSecretKey) {
      console.error("Stripe checkout unavailable: STRIPE_SECRET_KEY is missing.");
      return NextResponse.json({ error: "Checkout is unavailable" }, { status: 503 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL_PLATFORM?.trim();
    if (!appUrl) {
      console.error("Stripe checkout unavailable: NEXT_PUBLIC_APP_URL_PLATFORM is missing.");
      return NextResponse.json({ error: "Checkout is unavailable" }, { status: 503 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const body = await req.json();

    const {
      org_id,
      plan,
      seats = 1,
      stripe_customer_id,
    }: {
      org_id: string;
      plan: PlanKey;
      seats?: number;
      stripe_customer_id?: string;
    } = body;

    if (!org_id || !PRICE_MAP[plan]) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const quantity = Math.min(Math.max(seats, 1), 100);

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      customer: stripe_customer_id,
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_MAP[plan], quantity }],
      success_url: `${appUrl}/billing/success`,
      cancel_url: `${appUrl}/billing/cancel`,
      metadata: {
        org_id,
        plan,
        seats: String(quantity),
        platform: "xilaire-platform",
      },
      subscription_data: {
        metadata: { org_id, plan },
      },
    };

    const session = await stripe.checkout.sessions.create(params);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
