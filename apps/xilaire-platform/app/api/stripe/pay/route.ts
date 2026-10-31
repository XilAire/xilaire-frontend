import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/* -------------------------------------------------
   POST — REDIRECT TO STRIPE HOSTED INVOICE

   No Stripe SDK client is needed: this endpoint reads
   the hosted invoice URL already stored in Supabase.
   Initialize Supabase inside the handler so Next.js
   can import this module during production builds.
------------------------------------------------- */
export async function POST(req: Request) {
  try {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return new NextResponse("Invalid JSON body", { status: 400 });
    }

    const invoiceId =
      body && typeof body === "object" && "invoiceId" in body &&
      typeof body.invoiceId === "string"
        ? body.invoiceId.trim()
        : "";

    if (!invoiceId) {
      return new NextResponse("Missing invoiceId", { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[STRIPE-PAY] Missing Supabase server configuration");
      return new NextResponse("Payment service unavailable", { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("stripe_invoice_id, hosted_invoice_url")
      .eq("id", invoiceId)
      .single();

    if (error || !invoice) {
      console.error("[STRIPE-PAY] Invoice lookup failed", error);
      return new NextResponse("Invoice not found", { status: 404 });
    }

    if (!invoice.stripe_invoice_id || !invoice.hosted_invoice_url) {
      return new NextResponse("Stripe invoice not ready", { status: 400 });
    }

    // Preserve the existing behavior: redirect to the URL stored
    // for this invoice. The stored URL must only be written by
    // trusted Stripe invoice creation code.
    return NextResponse.redirect(invoice.hosted_invoice_url);
  } catch (error) {
    console.error("[STRIPE-PAY] Payment redirect failed", error);
    return new NextResponse("Payment redirect failed", { status: 500 });
  }
}
