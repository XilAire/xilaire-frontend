"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { buildInvoiceDraft } from "@/lib/invoicing/buildInvoiceDraft";

/* -------------------------------------------------
   CREATE INVOICE (EXECUTION LAYER)
------------------------------------------------- */
export async function createInvoiceForContract(contractId: string) {
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies }
  );

  /* -----------------------------------------------
     BUILD DRAFT
  ----------------------------------------------- */
  const draft = await buildInvoiceDraft(supabase, contractId);

  /* -----------------------------------------------
     CREATE INVOICE
  ----------------------------------------------- */
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert(draft.invoice)
    .select()
    .single();

  if (invoiceError) {
    throw invoiceError;
  }

  /* -----------------------------------------------
     CREATE INVOICE LINES
  ----------------------------------------------- */
  const { error: linesError } = await supabase
    .from("invoice_lines")
    .insert(
      draft.lines.map((l) => ({
        ...l,
        invoice_id: invoice.id,
      }))
    );

  if (linesError) {
    throw linesError;
  }

  /* -----------------------------------------------
     MARK TIME ENTRIES AS BILLED
  ----------------------------------------------- */
  const { error: markError } = await supabase
    .from("time_entries")
    .update({ billed: true })
    .in("id", draft.timeEntryIds);

  if (markError) {
    throw markError;
  }

  return invoice.id;
}
