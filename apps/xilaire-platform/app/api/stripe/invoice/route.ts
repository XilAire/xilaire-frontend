import Stripe from "stripe";
import { requirePlatformBillingActor } from "@/lib/auth/requirePlatformBillingActor";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/* -------------------------------------------------
   POST - GENERATE STRIPE INVOICE
------------------------------------------------- */
export async function POST(req: Request) {
  console.log("[STRIPE-INVOICE] Route hit");

  try {
    // AUTH-04O: Verify current platform billing privileges before
    // reading invoice details or creating external Stripe objects.
    const actor = await requirePlatformBillingActor([
      "finance",
      "master_admin",
    ]);

    if (!actor) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { data: platformOrg, error: platformOrgError } =
      await supabaseAdmin
        .from("orgs")
        .select("id, is_platform_org")
        .eq("id", actor.org_id)
        .maybeSingle();

    if (
      platformOrgError ||
      !platformOrg ||
      platformOrg.is_platform_org !== true
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Both clients are created only after authorization, not at module load.
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM?.trim();
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM?.trim();

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      console.error("[STRIPE-INVOICE] Required server configuration is missing.");
      return new NextResponse("Invoice service unavailable", { status: 503 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return new NextResponse("Missing invoiceId", { status: 400 });
    }

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (error || !invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    const amountCents = Math.round(Number(invoice.total_amount) * 100);
    if (amountCents < 100) {
      return new NextResponse("Invoice total must be >= $1.00", { status: 400 });
    }

    // Preserve existing test-mode customer creation behavior.
    const customer = await stripe.customers.create({
      name: "XilAire Technologies",
      email: "receivable@xilairetechnologies.com",
      metadata: {
        internal_invoice_id: invoice.id,
        org_id: invoice.org_id,
      },
    });

    const stripeCustomerId = customer.id;
    await supabase
      .from("invoices")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", invoice.id);

    const stripeInvoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: "charge_automatically",
      auto_advance: false,
      payment_settings: {
        payment_method_types: ["card"],
      },
    });

    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      invoice: stripeInvoice.id,
      amount: amountCents,
      currency: "usd",
      description: `Invoice ${invoice.id}`,
    });

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(
      stripeInvoice.id
    );

    if (!finalizedInvoice.hosted_invoice_url) {
      throw new Error("Stripe did not return hosted_invoice_url");
    }

    await supabase
      .from("invoices")
      .update({
        stripe_invoice_id: finalizedInvoice.id,
        stripe_invoice_status: finalizedInvoice.status,
        hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
        issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    return NextResponse.json({
      stripeInvoiceId: finalizedInvoice.id,
      hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
    });
  } catch (err) {
    console.error("[STRIPE-INVOICE] FATAL ERROR", err);
    return new NextResponse("Stripe invoice failed", { status: 500 });
  }
}
