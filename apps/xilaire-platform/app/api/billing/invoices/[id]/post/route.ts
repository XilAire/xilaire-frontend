import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;
  const supabase = await createServerSupabaseClient();

  /* -------------------------------------------------
     1️⃣ AUTH — REQUIRE USER
  ------------------------------------------------- */
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (!user || authErr) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  /* -------------------------------------------------
     2️⃣ MARK INVOICE AS POSTED
  ------------------------------------------------- */
  const { error: invoiceErr } = await supabase
    .from("invoices")
    .update({
      status: "posted",
      posted_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (invoiceErr) {
    return NextResponse.json(
      { error: "Failed to post invoice", details: invoiceErr },
      { status: 500 }
    );
  }

  /* -------------------------------------------------
     3️⃣ BILL LINKED TIME ENTRIES (CRITICAL)
  ------------------------------------------------- */
  const { error: timeErr } = await supabase.rpc(
    "mark_time_entries_billed",
    { p_invoice_id: invoiceId }
  );

  if (timeErr) {
    return NextResponse.json(
      { error: "Failed to bill time entries", details: timeErr },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
