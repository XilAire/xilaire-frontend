export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/* ---------------------------------------------
   Stripe Client (NO apiVersion per rules)
---------------------------------------------- */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/* ---------------------------------------------
   Pricing Map
---------------------------------------------- */
const PRICE_MAP = {
  cloudsuite_pro: "price_XXXXXXXXXXXX", // replace with real price ID
} as const;

type PlanKey = keyof typeof PRICE_MAP;

/* ---------------------------------------------
   POST /api/billing/checkout
---------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    // Clamp seats (enterprise safety)
    const quantity = Math.min(Math.max(seats, 1), 100);

    /* ---------------------------------------------
       ✅ ENTERPRISE-SAFE CHECKOUT PARAMS
    ---------------------------------------------- */
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",

      customer: stripe_customer_id,

      payment_method_types: ["card"],

      line_items: [
        {
          price: PRICE_MAP[plan],
          quantity,
        },
      ],

      success_url: `${process.env.NEXT_PUBLIC_APP_URL_PLATFORM}/billing/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL_PLATFORM}/billing/cancel`,

      metadata: {
        org_id,
        plan,
        seats: String(quantity),
        platform: "xilaire-platform",
      },

      subscription_data: {
        metadata: {
          org_id,
          plan,
        },
      },
    };

    const session = await stripe.checkout.sessions.create(params);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Checkout failed" },
      { status: 500 }
    );
  }
}
