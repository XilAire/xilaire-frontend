import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { estimate_id } = body;

    if (!estimate_id) {
      return NextResponse.json(
        { error: "estimate_id is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      }
    );

    // 1. Load estimate
    const { data: estimate, error: estimateError } = await supabase
      .from("infrastructure_estimates")
      .select("*")
      .eq("id", estimate_id)
      .single();

    if (estimateError || !estimate) {
      return NextResponse.json(
        { error: "Estimate not found" },
        { status: 404 }
      );
    }

    // 🔴 HARD REQUIREMENTS
    if (!estimate.vendor_id) {
      return NextResponse.json(
        { error: "Estimate is missing vendor_id" },
        { status: 400 }
      );
    }

    if (!estimate.project_id) {
      return NextResponse.json(
        { error: "Estimate is missing project_id" },
        { status: 400 }
      );
    }

    // 2. Prevent duplicate invoice
    const { data: existing } = await supabase
      .from("infrastructure_invoices")
      .select("id")
      .eq("estimate_id", estimate_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        message: "Invoice already exists",
        invoice_id: existing.id,
      });
    }

    // 3. Create invoice (FIXED)
    const { data: invoice, error: invoiceError } = await supabase
      .from("infrastructure_invoices")
      .insert([
        {
          org_id: estimate.org_id,
          project_id: estimate.project_id,
          vendor_id: estimate.vendor_id, // ✅ FIX
          estimate_id: estimate.id, // ✅ FIX
          status: "draft",
          total: estimate.total || 0,
          issued_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Failed to create invoice", details: invoiceError },
        { status: 500 }
      );
    }

    // 4. Load estimate items
    const { data: items, error: itemsError } = await supabase
      .from("infrastructure_estimate_items")
      .select("*")
      .eq("estimate_id", estimate_id);

    if (itemsError) {
      return NextResponse.json(
        { error: "Failed to load estimate items" },
        { status: 500 }
      );
    }

    // 5. Insert invoice items
    if (items && items.length > 0) {
      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: insertItemsError } = await supabase
        .from("infrastructure_invoice_items")
        .insert(invoiceItems);

      if (insertItemsError) {
        // rollback
        await supabase
          .from("infrastructure_invoices")
          .delete()
          .eq("id", invoice.id);

        return NextResponse.json(
          { error: "Failed to create invoice items" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected error", details: err },
      { status: 500 }
    );
  }
}