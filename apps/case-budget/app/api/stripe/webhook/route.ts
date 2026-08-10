import {
  NextResponse,
} from "next/server";

import Stripe from "stripe";

import {
  sendPaymentFailedEmail,
  sendReceiptEmail,
  sendTrialEndingEmail,
} from "@/lib/email";

import {
  getCaseBudgetPlanFromStripePriceId,
} from "@/lib/stripe/stripe-prices";

import {
  getStripeServer,
  getStripeWebhookSecret,
} from "@/lib/stripe/stripe-server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  getSupabaseSubscriptionRepository,
} from "@/lib/subscriptions/subscription-storage";

import type {
  CaseBudgetBillingInterval,
  CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

import type {
  CaseBudgetSubscription,
  CaseBudgetSubscriptionStatus,
} from "@/types/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_SIGNATURE_HEADER = "stripe-signature";
const BILLING_PROVIDER = "stripe";

type PaidCaseBudgetPlan = Exclude<CaseBudgetPlan, "free">;

type BillingEventProcessingStatus =
  | "pending"
  | "processed"
  | "failed"
  | "ignored";

type BillingEventRow = {
  id: string;
  processing_status: BillingEventProcessingStatus;
};

type StripeEventOutcome = {
  processingStatus: Extract<BillingEventProcessingStatus, "processed" | "ignored">;
  userId: string | null;
  workspaceId: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
};

type SubscriptionIdentity = {
  userId: string;
  workspaceId: string | null;
  plan: PaidCaseBudgetPlan;
  interval: CaseBudgetBillingInterval;
  priceId: string;
  productId: string | null;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get(STRIPE_SIGNATURE_HEADER);

  if (!signature) {
    return NextResponse.json(
      { success: false, error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripeServer().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    console.error(
      "[CASE Budget Stripe Webhook] Signature verification failed.",
      getErrorMessage(error),
    );

    return NextResponse.json(
      { success: false, error: "Invalid Stripe webhook signature." },
      { status: 400 },
    );
  }

  let ledgerId: string | null = null;

  try {
    const acquisition = await acquireBillingEvent(event);
    ledgerId = acquisition.ledgerId;

    if (acquisition.alreadyCompleted) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        eventId: event.id,
      });
    }

    const outcome = await processStripeEvent(event);

    await finalizeBillingEvent({
      ledgerId,
      processingStatus: outcome.processingStatus,
      userId: outcome.userId,
      workspaceId: outcome.workspaceId,
      providerCustomerId: outcome.providerCustomerId,
      providerSubscriptionId: outcome.providerSubscriptionId,
      errorMessage: null,
    });

    return NextResponse.json({
      success: true,
      eventId: event.id,
      eventType: event.type,
      processingStatus: outcome.processingStatus,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    console.error(
      "[CASE Budget Stripe Webhook] Event processing failed.",
      {
        eventId: event.id,
        eventType: event.type,
        error: message,
      },
    );

    if (ledgerId) {
      await safelyMarkBillingEventFailed({
        ledgerId,
        errorMessage: message,
      });
    }

    return NextResponse.json(
      { success: false, error: "Stripe webhook processing failed." },
      { status: 500 },
    );
  }
}

async function processStripeEvent(
  event: Stripe.Event,
): Promise<StripeEventOutcome> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
      );

    case "customer.subscription.trial_will_end":
      return handleTrialWillEnd(
        event.data.object as Stripe.Subscription,
      );

    case "invoice.payment_succeeded":
      return handleInvoicePaymentSucceeded(
        event.data.object as Stripe.Invoice,
      );

    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(
        event.data.object as Stripe.Invoice,
      );

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      return syncStripeSubscription(
        event.data.object as Stripe.Subscription,
      );

    default:
      return {
        processingStatus: "ignored",
        userId: null,
        workspaceId: null,
        providerCustomerId: null,
        providerSubscriptionId: null,
      };
  }
}

async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
): Promise<StripeEventOutcome> {
  const identity = resolveSubscriptionIdentity(subscription);

  if (!identity) {
    return {
      processingStatus: "ignored",
      userId: normalizeOptionalText(subscription.metadata?.user_id),
      workspaceId: normalizeOptionalText(subscription.metadata?.workspace_id),
      providerCustomerId: getStripeReferenceId(subscription.customer),
      providerSubscriptionId: subscription.id,
    };
  }

  const recipient = await resolveBillingRecipient({
    userId: identity.userId,
    customerId: getStripeReferenceId(subscription.customer),
    fallbackEmail: null,
  });

  if (!recipient.email) {
    throw new Error(
      `Could not resolve a billing email address for Stripe subscription ${subscription.id}.`,
    );
  }

  const trialEnd = fromUnixTimestamp(subscription.trial_end);
  const daysRemaining = getDaysRemaining(subscription.trial_end);

  const emailResult = await sendTrialEndingEmail({
    to: recipient.email,
    firstName: recipient.firstName ?? undefined,
    planName: formatPlanName(identity.plan),
    trialEndsOn: trialEnd ? formatDisplayDate(trialEnd) : undefined,
    daysRemaining,
    billingUrl: buildAppUrl("/dashboard/settings"),
  });

  assertEmailSent(emailResult, "trial-ending", subscription.id);

  return {
    processingStatus: "processed",
    userId: identity.userId,
    workspaceId: identity.workspaceId,
    providerCustomerId: getStripeReferenceId(subscription.customer),
    providerSubscriptionId: subscription.id,
  };
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
): Promise<StripeEventOutcome> {
  const subscription = await resolveInvoiceSubscription(invoice);
  const identity = subscription
    ? resolveSubscriptionIdentity(subscription)
    : null;

  const customerId = getStripeReferenceId(invoice.customer);
  const userId = identity?.userId ?? null;
  const workspaceId = identity?.workspaceId ?? null;
  const subscriptionId = subscription?.id ?? getInvoiceSubscriptionId(invoice);

  const recipient = await resolveBillingRecipient({
    userId,
    customerId,
    fallbackEmail: normalizeOptionalText(invoice.customer_email),
  });

  if (!recipient.email) {
    throw new Error(
      `Could not resolve a billing email address for Stripe invoice ${invoice.id}.`,
    );
  }

  const currency = normalizeOptionalText(invoice.currency) ?? "usd";
  const totalAmount = getInvoicePaidAmount(invoice);
  const subtotalAmount = getNumericProperty(invoice, "subtotal");
  const taxAmount = getInvoiceTaxAmount(invoice);

  const emailResult = await sendReceiptEmail({
    to: recipient.email,
    firstName: recipient.firstName ?? undefined,
    receiptNumber:
      normalizeOptionalText(invoice.number) ??
      normalizeOptionalText(invoice.id) ??
      undefined,
    billingDate: formatUnixDisplayDate(invoice.created) ?? undefined,
    planName: identity ? formatPlanName(identity.plan) : undefined,
    subtotal:
      subtotalAmount === null
        ? undefined
        : formatCurrencyAmount(subtotalAmount, currency),
    tax:
      taxAmount === null
        ? undefined
        : formatCurrencyAmount(taxAmount, currency),
    total: formatCurrencyAmount(totalAmount, currency),
    lineItems: invoice.lines.data
      .map((line) => ({
        label:
          normalizeOptionalText(line.description) ??
          "CASE Budget subscription",
        amount: formatCurrencyAmount(line.amount, currency),
      })),
    billingUrl: buildAppUrl("/dashboard/settings"),
    receiptUrl: normalizeOptionalText(invoice.hosted_invoice_url) ?? undefined,
  });

  assertEmailSent(emailResult, "receipt", invoice.id);

  return {
    processingStatus: "processed",
    userId,
    workspaceId,
    providerCustomerId: customerId,
    providerSubscriptionId: subscriptionId,
  };
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<StripeEventOutcome> {
  const subscription = await resolveInvoiceSubscription(invoice);
  const identity = subscription
    ? resolveSubscriptionIdentity(subscription)
    : null;

  const customerId = getStripeReferenceId(invoice.customer);
  const userId = identity?.userId ?? null;
  const workspaceId = identity?.workspaceId ?? null;
  const subscriptionId = subscription?.id ?? getInvoiceSubscriptionId(invoice);

  const recipient = await resolveBillingRecipient({
    userId,
    customerId,
    fallbackEmail: normalizeOptionalText(invoice.customer_email),
  });

  if (!recipient.email) {
    throw new Error(
      `Could not resolve a billing email address for Stripe invoice ${invoice.id}.`,
    );
  }

  const currency = normalizeOptionalText(invoice.currency) ?? "usd";
  const amountDue = getNumericProperty(invoice, "amount_due") ?? 0;
  const nextPaymentAttempt = getNumericProperty(invoice, "next_payment_attempt");

  const emailResult = await sendPaymentFailedEmail({
    to: recipient.email,
    firstName: recipient.firstName ?? undefined,
    planName: identity ? formatPlanName(identity.plan) : undefined,
    amountDue: formatCurrencyAmount(amountDue, currency),
    retryDate:
      nextPaymentAttempt === null
        ? undefined
        : formatUnixDisplayDate(nextPaymentAttempt) ?? undefined,
    billingUrl: buildAppUrl("/dashboard/settings"),
  });

  assertEmailSent(emailResult, "payment-failed", invoice.id);

  return {
    processingStatus: "processed",
    userId,
    workspaceId,
    providerCustomerId: customerId,
    providerSubscriptionId: subscriptionId,
  };
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<StripeEventOutcome> {
  if (session.mode !== "subscription") {
    return {
      processingStatus: "ignored",
      userId: normalizeOptionalText(session.metadata?.user_id),
      workspaceId: normalizeOptionalText(session.metadata?.workspace_id),
      providerCustomerId: getStripeReferenceId(session.customer),
      providerSubscriptionId: getStripeReferenceId(session.subscription),
    };
  }

  const subscriptionId = getStripeReferenceId(session.subscription);

  if (!subscriptionId) {
    return {
      processingStatus: "ignored",
      userId: normalizeOptionalText(session.metadata?.user_id),
      workspaceId: normalizeOptionalText(session.metadata?.workspace_id),
      providerCustomerId: getStripeReferenceId(session.customer),
      providerSubscriptionId: null,
    };
  }

  const subscription = await getStripeServer().subscriptions.retrieve(
    subscriptionId,
    {
      expand: ["items.data.price.product"],
    },
  );

  return syncStripeSubscription(subscription);
}

async function syncStripeSubscription(
  subscription: Stripe.Subscription,
): Promise<StripeEventOutcome> {
  const identity = resolveSubscriptionIdentity(subscription);

  if (!identity) {
    console.warn(
      "[CASE Budget Stripe Webhook] Subscription could not be mapped to CASE Budget.",
      {
        subscriptionId: subscription.id,
        priceId: getPrimarySubscriptionPriceId(subscription),
      },
    );

    return {
      processingStatus: "ignored",
      userId: normalizeOptionalText(subscription.metadata?.user_id),
      workspaceId: normalizeOptionalText(subscription.metadata?.workspace_id),
      providerCustomerId: getStripeReferenceId(subscription.customer),
      providerSubscriptionId: subscription.id,
    };
  }

  const repository = getSupabaseSubscriptionRepository();

  const existingSubscription = await repository.findSubscription({
    userId: identity.userId,
    workspaceId: identity.workspaceId,
  });

  const now = new Date().toISOString();
  const period = getSubscriptionPeriod(subscription);

  const subscriptionRecord: CaseBudgetSubscription = {
    id: existingSubscription?.id ?? crypto.randomUUID(),
    userId: identity.userId,
    workspaceId: identity.workspaceId,
    plan: identity.plan,
    billingProvider: "stripe",
    billingInterval: identity.interval,
    status: mapStripeSubscriptionStatus(subscription.status),
    source: "web",
    providerCustomerId: getStripeReferenceId(subscription.customer),
    providerSubscriptionId: subscription.id,
    providerPriceId: identity.priceId,
    providerProductId: identity.productId,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    canceledAt: fromUnixTimestamp(subscription.canceled_at),
    trialStart: fromUnixTimestamp(subscription.trial_start),
    trialEnd: fromUnixTimestamp(subscription.trial_end),
    createdAt:
      existingSubscription?.createdAt ??
      fromUnixTimestamp(subscription.created) ??
      now,
    updatedAt: now,
  };

  await repository.saveSubscription({
    subscription: subscriptionRecord,
  });

  return {
    processingStatus: "processed",
    userId: identity.userId,
    workspaceId: identity.workspaceId,
    providerCustomerId: getStripeReferenceId(subscription.customer),
    providerSubscriptionId: subscription.id,
  };
}

function resolveSubscriptionIdentity(
  subscription: Stripe.Subscription,
): SubscriptionIdentity | null {
  const priceId = getPrimarySubscriptionPriceId(subscription);

  if (!priceId) {
    return null;
  }

  const mapping = getCaseBudgetPlanFromStripePriceId(priceId);

  if (!mapping) {
    return null;
  }

  const metadataPlan = normalizeOptionalText(subscription.metadata?.plan);
  const metadataInterval = normalizeOptionalText(
    subscription.metadata?.billing_interval,
  );

  if (metadataPlan && metadataPlan !== mapping.plan) {
    throw new Error(
      `Stripe metadata plan "${metadataPlan}" does not match configured price plan "${mapping.plan}".`,
    );
  }

  if (metadataInterval && metadataInterval !== mapping.interval) {
    throw new Error(
      `Stripe metadata interval "${metadataInterval}" does not match configured price interval "${mapping.interval}".`,
    );
  }

  const userId = normalizeOptionalText(subscription.metadata?.user_id);

  if (!userId) {
    return null;
  }

  return {
    userId,
    workspaceId: normalizeOptionalText(subscription.metadata?.workspace_id),
    plan: mapping.plan,
    interval: mapping.interval,
    priceId,
    productId: getPrimarySubscriptionProductId(subscription),
  };
}

function getPrimarySubscriptionPriceId(
  subscription: Stripe.Subscription,
) {
  return normalizeOptionalText(
    subscription.items.data[0]?.price?.id,
  );
}

function getPrimarySubscriptionProductId(
  subscription: Stripe.Subscription,
) {
  const product = subscription.items.data[0]?.price?.product;

  if (!product) {
    return null;
  }

  if (typeof product === "string") {
    return normalizeOptionalText(product);
  }

  return normalizeOptionalText(product.id);
}

function getSubscriptionPeriod(
  subscription: Stripe.Subscription,
) {
  const item = subscription.items.data[0];

  return {
    start: fromUnixTimestamp(item?.current_period_start),
    end: fromUnixTimestamp(item?.current_period_end),
  };
}

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): CaseBudgetSubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "unpaid";
    case "canceled":
      return "canceled";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "paused":
      return "paused";
    default:
      return "none";
  }
}

async function acquireBillingEvent(
  event: Stripe.Event,
): Promise<{
  ledgerId: string;
  alreadyCompleted: boolean;
}> {
  const supabase = createAdminClient();
  const refs = getEventReferences(event);

  const {
    data,
    error,
  } = await supabase
    .from("case_budget_billing_events")
    .insert({
      billing_provider: BILLING_PROVIDER,
      provider_event_id: event.id,
      event_type: event.type,
      provider_customer_id: refs.customerId,
      provider_subscription_id: refs.subscriptionId,
      user_id: refs.userId,
      workspace_id: refs.workspaceId,
      processing_status: "pending",
      error_message: null,
      received_at: new Date().toISOString(),
      processed_at: null,
    })
    .select("id, processing_status")
    .single();

  if (!error) {
    const row = data as BillingEventRow;

    return {
      ledgerId: row.id,
      alreadyCompleted: false,
    };
  }

  if (getSupabaseErrorCode(error) !== "23505") {
    throw new Error(
      `Failed to record Stripe billing event. ${getErrorMessage(error)}`,
    );
  }

  const {
    data: existingData,
    error: existingError,
  } = await supabase
    .from("case_budget_billing_events")
    .select("id, processing_status")
    .eq("billing_provider", BILLING_PROVIDER)
    .eq("provider_event_id", event.id)
    .single();

  if (existingError) {
    throw new Error(
      `Failed to load existing Stripe billing event. ${getErrorMessage(existingError)}`,
    );
  }

  const existing = existingData as BillingEventRow;

  return {
    ledgerId: existing.id,
    alreadyCompleted:
      existing.processing_status === "processed" ||
      existing.processing_status === "ignored",
  };
}

async function finalizeBillingEvent({
  ledgerId,
  processingStatus,
  userId,
  workspaceId,
  providerCustomerId,
  providerSubscriptionId,
  errorMessage,
}: {
  ledgerId: string;
  processingStatus: Extract<
    BillingEventProcessingStatus,
    "processed" | "ignored" | "failed"
  >;
  userId: string | null;
  workspaceId: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  errorMessage: string | null;
}) {
  const { error } = await createAdminClient()
    .from("case_budget_billing_events")
    .update({
      user_id: userId,
      workspace_id: workspaceId,
      provider_customer_id: providerCustomerId,
      provider_subscription_id: providerSubscriptionId,
      processing_status: processingStatus,
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
    })
    .eq("id", ledgerId);

  if (error) {
    throw new Error(
      `Failed to finalize Stripe billing event. ${getErrorMessage(error)}`,
    );
  }
}

async function safelyMarkBillingEventFailed({
  ledgerId,
  errorMessage,
}: {
  ledgerId: string;
  errorMessage: string;
}) {
  try {
    await finalizeBillingEvent({
      ledgerId,
      processingStatus: "failed",
      userId: null,
      workspaceId: null,
      providerCustomerId: null,
      providerSubscriptionId: null,
      errorMessage: errorMessage.slice(0, 2000),
    });
  } catch (error) {
    console.error(
      "[CASE Budget Stripe Webhook] Could not mark event failed.",
      error,
    );
  }
}

function getEventReferences(
  event: Stripe.Event,
) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    return {
      customerId: getStripeReferenceId(session.customer),
      subscriptionId: getStripeReferenceId(session.subscription),
      userId: normalizeOptionalText(session.metadata?.user_id),
      workspaceId: normalizeOptionalText(session.metadata?.workspace_id),
    };
  }

  if (
    event.type === "invoice.payment_succeeded" ||
    event.type === "invoice.payment_failed"
  ) {
    const invoice = event.data.object as Stripe.Invoice;

    return {
      customerId: getStripeReferenceId(invoice.customer),
      subscriptionId: getInvoiceSubscriptionId(invoice),
      userId: null,
      workspaceId: null,
    };
  }

  if (
    event.type === "customer.subscription.trial_will_end" ||
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.paused" ||
    event.type === "customer.subscription.resumed"
  ) {
    const subscription = event.data.object as Stripe.Subscription;

    return {
      customerId: getStripeReferenceId(subscription.customer),
      subscriptionId: subscription.id,
      userId: normalizeOptionalText(subscription.metadata?.user_id),
      workspaceId: normalizeOptionalText(
        subscription.metadata?.workspace_id,
      ),
    };
  }

  return {
    customerId: null,
    subscriptionId: null,
    userId: null,
    workspaceId: null,
  };
}

async function resolveInvoiceSubscription(
  invoice: Stripe.Invoice,
) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return null;
  }

  return getStripeServer().subscriptions.retrieve(
    subscriptionId,
    {
      expand: ["items.data.price.product"],
    },
  );
}

function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
) {
  const invoiceRecord = invoice as unknown as Record<string, unknown>;
  const directSubscription = getReferenceIdFromUnknown(
    invoiceRecord.subscription,
  );

  if (directSubscription) {
    return directSubscription;
  }

  const parent = getObjectRecord(invoiceRecord.parent);
  const subscriptionDetails = getObjectRecord(parent?.subscription_details);

  return getReferenceIdFromUnknown(subscriptionDetails?.subscription);
}

async function resolveBillingRecipient({
  userId,
  customerId,
  fallbackEmail,
}: {
  userId: string | null;
  customerId: string | null;
  fallbackEmail: string | null;
}) {
  if (userId) {
    const {
      data,
      error,
    } = await createAdminClient().auth.admin.getUserById(userId);

    if (!error && data.user) {
      const email = normalizeOptionalText(data.user.email);
      const firstName = normalizeOptionalText(
        typeof data.user.user_metadata?.first_name === "string"
          ? data.user.user_metadata.first_name
          : undefined,
      );

      if (email) {
        return {
          email,
          firstName,
        };
      }
    }
  }

  if (fallbackEmail) {
    return {
      email: fallbackEmail,
      firstName: null,
    };
  }

  if (customerId) {
    const customer = await getStripeServer().customers.retrieve(customerId);

    if (!customer.deleted) {
      return {
        email: normalizeOptionalText(customer.email),
        firstName: normalizeOptionalText(customer.name?.split(" ")[0]),
      };
    }
  }

  return {
    email: null,
    firstName: null,
  };
}

function assertEmailSent(
  result: Awaited<ReturnType<typeof sendReceiptEmail>>,
  emailType: string,
  sourceId: string,
) {
  if (result.success) {
    return;
  }

  throw new Error(
    `CASE Budget ${emailType} email failed for ${sourceId}. ${result.error.code}: ${result.error.message}`,
  );
}

function getInvoicePaidAmount(
  invoice: Stripe.Invoice,
) {
  return (
    getNumericProperty(invoice, "amount_paid") ??
    getNumericProperty(invoice, "total") ??
    0
  );
}

function getInvoiceTaxAmount(
  invoice: Stripe.Invoice,
) {
  const invoiceRecord = invoice as unknown as Record<string, unknown>;
  const totalTaxes = invoiceRecord.total_taxes;

  if (Array.isArray(totalTaxes)) {
    const total = totalTaxes.reduce((sum, tax) => {
      const amount = getNumericProperty(tax, "amount");
      return sum + (amount ?? 0);
    }, 0);

    return total;
  }

  return getNumericProperty(invoice, "tax");
}

function getNumericProperty(
  value: unknown,
  propertyName: string,
) {
  const record = getObjectRecord(value);
  const propertyValue = record?.[propertyName];

  return typeof propertyValue === "number" && Number.isFinite(propertyValue)
    ? propertyValue
    : null;
}

function getObjectRecord(
  value: unknown,
): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getReferenceIdFromUnknown(
  value: unknown,
) {
  if (typeof value === "string") {
    return normalizeOptionalText(value);
  }

  const record = getObjectRecord(value);
  const id = record?.id;

  return typeof id === "string"
    ? normalizeOptionalText(id)
    : null;
}

function getDaysRemaining(
  unixTimestamp: number | null | undefined,
) {
  if (
    unixTimestamp === null ||
    unixTimestamp === undefined ||
    !Number.isFinite(unixTimestamp)
  ) {
    return 3;
  }

  const millisecondsRemaining = unixTimestamp * 1000 - Date.now();

  return Math.max(
    1,
    Math.ceil(millisecondsRemaining / (24 * 60 * 60 * 1000)),
  );
}

function formatPlanName(
  plan: PaidCaseBudgetPlan,
) {
  return plan === "pro"
    ? "CASE Budget Pro"
    : "CASE Budget Plus";
}

function formatCurrencyAmount(
  amountInMinorUnits: number,
  currency: string,
) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountInMinorUnits / 100);
  } catch {
    return `${(amountInMinorUnits / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatUnixDisplayDate(
  unixTimestamp: number,
) {
  return formatDisplayDate(
    new Date(unixTimestamp * 1000).toISOString(),
  );
}

function formatDisplayDate(
  isoDate: string,
) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function buildAppUrl(
  path: string,
) {
  const appUrl = (
    process.env.NEXT_PUBLIC_CASE_BUDGET_APP_URL ??
    "http://localhost:3004"
  ).replace(/\/+$/, "");

  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${appUrl}${normalizedPath}`;
}

function getStripeReferenceId(
  value:
    | string
    | { id: string }
    | null
    | undefined,
) {
  if (!value) {
    return null;
  }

  return typeof value === "string"
    ? normalizeOptionalText(value)
    : normalizeOptionalText(value.id);
}

function normalizeOptionalText(
  value: string | null | undefined,
) {
  const normalized = value?.trim();

  return normalized || null;
}

function fromUnixTimestamp(
  value: number | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function getSupabaseErrorCode(
  error: unknown,
) {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return null;
  }

  const code = (
    error as {
      code?: unknown;
    }
  ).code;

  return typeof code === "string"
    ? code
    : null;
}

function getErrorMessage(
  error: unknown,
) {
  if (error instanceof Error) {
    return error.message.trim() || "Unknown error.";
  }

  if (
    typeof error === "object" &&
    error !== null
  ) {
    const message = (
      error as {
        message?: unknown;
      }
    ).message;

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      return message.trim();
    }
  }

  return "Unknown error.";
}
