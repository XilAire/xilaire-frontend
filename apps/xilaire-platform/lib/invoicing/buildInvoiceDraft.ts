import { SupabaseClient } from "@supabase/supabase-js";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type DraftInvoiceResult = {
  invoice: {
    contract_id: string;
    status: "draft";
    total_amount: number;
  };
  lines: {
    time_entry_id: string;
    minutes: number | null;
    amount: number | null;
  }[];
  timeEntryIds: string[];
};

/* -------------------------------------------------
   BUILD DRAFT INVOICE (PURE LOGIC)
------------------------------------------------- */
export async function buildInvoiceDraft(
  supabase: SupabaseClient,
  contractId: string
): Promise<DraftInvoiceResult> {
  /* -----------------------------------------------
     LOAD BILLABLE TIME ENTRIES
  ----------------------------------------------- */
  const { data: entries, error } = await supabase
    .from("time_entries")
    .select(`
      id,
      duration_minutes,
      calculated_cost
    `)
    .eq("contract_id", contractId)
    .eq("invoice_ready", true)
    .eq("billed", false);

  if (error) {
    throw error;
  }

  if (!entries || entries.length === 0) {
    throw new Error("No billable time entries found");
  }

  /* -----------------------------------------------
     CALCULATE TOTAL
  ----------------------------------------------- */
  const total = entries.reduce(
    (sum, e) => sum + (e.calculated_cost ?? 0),
    0
  );

  /* -----------------------------------------------
     BUILD INVOICE LINES
  ----------------------------------------------- */
  const lines = entries.map((e) => ({
    time_entry_id: e.id,
    minutes: e.duration_minutes,
    amount: e.calculated_cost,
  }));

  return {
    invoice: {
      contract_id: contractId,
      status: "draft",
      total_amount: total,
    },
    lines,
    timeEntryIds: entries.map((e) => e.id),
  };
}
