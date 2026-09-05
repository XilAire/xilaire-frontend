import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";
import {
  getUniversityStripeClient,
  getUniversityStripeWebhookSecret,
} from "@/lib/university/stripe-server";
import {
  getSubscriptionIdForUniversityStripeEvent,
  stripeEventMatchesConfiguredMode,
  syncUniversitySubscriptionFromStripe,
} from "@/lib/university/stripe-sync";
import {
  getUniversityStripeMode,
} from "@/lib/university/stripe-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_EVENTS = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
]);

async function completeWebhookEvent({
  eventId,
  stripeMode,
  status,
  errorMessage,
}: {
  eventId: string;
  stripeMode: "test" | "live";
  status: "processed" | "ignored" | "failed";
  errorMessage?: string | null;
}) {
  const serviceSupabase = createSupabaseServerServiceClient();

  const { error } = await serviceSupabase.rpc(
    "complete_university_stripe_webhook_event",
    {
      p_stripe_event_id: eventId,
      p_stripe_mode: stripeMode,
      p_processing_status: status,
      p_error_message: errorMessage ?? null,
    },
  );

  if (error) {
    throw new Error(
      `[CASE University] Unable to complete Stripe webhook ledger event ${eventId}: ${error.message}`,
    );
  }
}

async function shouldProcessWebhookEvent({
  event,
  stripeMode,
}: {
  event: Stripe.Event;
  stripeMode: "test" | "live";
}): Promise<boolean> {
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data: inserted, error: registerError } = await serviceSupabase.rpc(
    "register_university_stripe_webhook_event",
    {
      p_stripe_event_id: event.id,
      p_stripe_mode: stripeMode,
      p_event_type: event.type,
      p_stripe_created_at: new Date(event.created * 1000).toISOString(),
      p_payload_object_id:
        "id" in event.data.object ? String(event.data.object.id) : null,
      p_metadata: {
        api_version: event.api_version ?? null,
        livemode: event.livemode,
      },
    },
  );

  if (registerError) {
    throw new Error(
      `[CASE University] Unable to register Stripe webhook event ${event.id}: ${registerError.message}`,
    );
  }

  if (inserted === true) {
    return true;
  }

  const { data: existingEvent, error: existingError } =
    await serviceSupabase
      .from("university_stripe_webhook_events")
      .select("processing_status")
      .eq("stripe_event_id", event.id)
      .eq("stripe_mode", stripeMode)
      .maybeSingle();

  if (existingError) {
    throw new Error(
      `[CASE University] Unable to inspect duplicate Stripe webhook event ${event.id}: ${existingError.message}`,
    );
  }

  return (
    existingEvent?.processing_status === "received" ||
    existingEvent?.processing_status === "failed"
  );
}

export async function POST(request: Request) {
  const stripeMode = getUniversityStripeMode();
  const stripe = getUniversityStripeClient();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getUniversityStripeWebhookSecret(stripeMode),
    );
  } catch (error) {
    console.error(
      "[CASE University] Stripe webhook signature verification failed.",
      error,
    );

    return NextResponse.json(
      { error: "Invalid Stripe webhook signature." },
      { status: 400 },
    );
  }

  if (!stripeEventMatchesConfiguredMode(event, stripeMode)) {
    console.error(
      `[CASE University] Rejected Stripe event ${event.id}: livemode=${event.livemode} does not match configured mode=${stripeMode}.`,
    );

    return NextResponse.json(
      { error: "Stripe event mode mismatch." },
      { status: 400 },
    );
  }

  try {
    const shouldProcess = await shouldProcessWebhookEvent({
      event,
      stripeMode,
    });

    if (!shouldProcess) {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }

    if (!SUPPORTED_EVENTS.has(event.type)) {
      await completeWebhookEvent({
        eventId: event.id,
        stripeMode,
        status: "ignored",
      });

      return NextResponse.json({
        received: true,
        ignored: true,
      });
    }

    const subscriptionId = getSubscriptionIdForUniversityStripeEvent(event);

    if (!subscriptionId) {
      await completeWebhookEvent({
        eventId: event.id,
        stripeMode,
        status: "ignored",
      });

      return NextResponse.json({
        received: true,
        ignored: true,
      });
    }

    await syncUniversitySubscriptionFromStripe({
      subscriptionId,
      stripeEventId: event.id,
      stripeEventCreatedAt: event.created,
    });

    await completeWebhookEvent({
      eventId: event.id,
      stripeMode,
      status: "processed",
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Stripe webhook processing error.";

    console.error(
      `[CASE University] Stripe webhook processing failed for event ${event.id}.`,
      error,
    );

    try {
      await completeWebhookEvent({
        eventId: event.id,
        stripeMode,
        status: "failed",
        errorMessage: message,
      });
    } catch (ledgerError) {
      console.error(
        `[CASE University] Unable to mark webhook event ${event.id} as failed.`,
        ledgerError,
      );
    }

    return NextResponse.json(
      { error: "Stripe webhook processing failed." },
      { status: 500 },
    );
  }
}
