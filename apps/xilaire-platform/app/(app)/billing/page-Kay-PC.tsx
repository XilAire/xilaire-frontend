"use client";

import { useEffect, useMemo, useState } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import CreateInvoiceButton from "@/components/billing/CreateInvoiceButton";

/* -------------------------------------------------
   TYPES (UI TRUTH SHAPE)
------------------------------------------------- */
type BillingRow = {
  id: string;
  duration_minutes: number | null;
  calculated_cost: number | null;
  work_item: {
    id: string;
    source_id: string;
    contract: {
      id: string;
      name: string;
      contract_type: string;
    };
  };
};

/* -------------------------------------------------
   PAGE
------------------------------------------------- */
export default function BillingPage() {
  const supabase = supabasePlatform;
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------
     LOAD BILLING DATA
  ------------------------------------------------- */
  async function loadBilling() {
    setLoading(true);

    const { data, error } = await supabase
      .from("time_entries")
      .select(`
        id,
        duration_minutes,
        calculated_cost,
        work_item:work_item_id (
          id,
          source_id,
          contract:contract_id (
            id,
            name,
            contract_type
          )
        )
      `)
      .eq("invoice_ready", true)
      .eq("billed", false)
      .order("started_at", { ascending: true });

    if (error) {
      console.error("[Billing] Load failed:", error);
      setRows([]);
      setLoading(false);
      return;
    }

    /**
     * 🔽 NORMALIZE SUPABASE ARRAYS → OBJECTS
     */
    const normalized: BillingRow[] =
      (data ?? []).map((row: any) => {
        const workItem = row.work_item?.[0];
        const contract = workItem?.contract?.[0];

        return {
          id: row.id,
          duration_minutes: row.duration_minutes,
          calculated_cost: row.calculated_cost,
          work_item: {
            id: workItem.id,
            source_id: workItem.source_id,
            contract: {
              id: contract.id,
              name: contract.name,
              contract_type: contract.contract_type,
            },
          },
        };
      });

    setRows(normalized);
    setLoading(false);
  }

  useEffect(() => {
    loadBilling();
  }, []);

  /* -------------------------------------------------
     GROUP BY CONTRACT (PSA-CORRECT)
  ------------------------------------------------- */
  const groupedByContract = useMemo(() => {
    const map = new Map<string, BillingRow[]>();

    rows.forEach((row) => {
      const contractId = row.work_item.contract.id;
      if (!map.has(contractId)) {
        map.set(contractId, []);
      }
      map.get(contractId)!.push(row);
    });

    return Array.from(map.values());
  }, [rows]);

  /* -------------------------------------------------
     SUMMARY
  ------------------------------------------------- */
  const summary = useMemo(() => {
    const workItems = new Set<string>();
    const contracts = new Set<string>();
    let total = 0;

    rows.forEach((r) => {
      workItems.add(r.work_item.id);
      contracts.add(r.work_item.contract.id);
      total += r.calculated_cost ?? 0;
    });

    return {
      entries: rows.length,
      workItems: workItems.size,
      contracts: contracts.size,
      total,
    };
  }, [rows]);

  /* -------------------------------------------------
     RENDER
  ------------------------------------------------- */
  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading billing…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* SUMMARY */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Entries" value={summary.entries} />
        <SummaryCard label="Work Items" value={summary.workItems} />
        <SummaryCard label="Contracts" value={summary.contracts} />
        <SummaryCard
          label="Total"
          value={`$${summary.total.toFixed(2)}`}
        />
      </div>

      {/* TABLE */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">Contract</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-right">Minutes</th>
              <th className="p-3 text-right">Cost</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {groupedByContract.map((group) => {
              const contract = group[0].work_item.contract;

              return (
                <>
                  {group.map((r, idx) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3">
                        {contract.name}
                      </td>
                      <td className="p-3">
                        {contract.contract_type}
                      </td>
                      <td className="p-3 text-right">
                        {r.duration_minutes ?? "-"}
                      </td>
                      <td className="p-3 text-right">
                        ${r.calculated_cost?.toFixed(2) ?? "0.00"}
                      </td>
                      <td className="p-3 text-right">
                        {idx === 0 && (
                          <CreateInvoiceButton
                            contractId={contract.id}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------
   COMPONENTS
------------------------------------------------- */
function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border rounded-md p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
