"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";
import CreateInvoiceButton from "@/components/billing/CreateInvoiceButton";

/* -------------------------------------------------
   TYPES
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
  } | null;
};

type ContractGroup = {
  contractId: string;
  contractName: string;
  contractType: string;
  rows: BillingRow[];
  subtotal: number;
};

/* -------------------------------------------------
   PAGE
------------------------------------------------- */
export default function BillingPage() {
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);

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

    const normalized: BillingRow[] = (data ?? [])
      .map((row: any) => {
        const workItem = Array.isArray(row.work_item)
          ? row.work_item[0]
          : row.work_item;

        const contract = Array.isArray(workItem?.contract)
          ? workItem.contract[0]
          : workItem?.contract;

        if (!workItem?.id || !contract?.id) {
          return null;
        }

        return {
          id: row.id,
          duration_minutes: row.duration_minutes ?? null,
          calculated_cost: row.calculated_cost ?? null,
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
      })
      .filter(Boolean) as BillingRow[];

    setRows(normalized);
    setLoading(false);
  }

  useEffect(() => {
    loadBilling();
  }, []);

  /* -------------------------------------------------
     GROUP BY CONTRACT
  ------------------------------------------------- */
  const grouped = useMemo<ContractGroup[]>(() => {
    const map = new Map<string, ContractGroup>();

    rows.forEach((row) => {
      const contract = row.work_item?.contract;

      if (!contract?.id) {
        return;
      }

      if (!map.has(contract.id)) {
        map.set(contract.id, {
          contractId: contract.id,
          contractName: contract.name,
          contractType: contract.contract_type,
          rows: [],
          subtotal: 0,
        });
      }

      const group = map.get(contract.id)!;
      group.rows.push(row);
      group.subtotal += row.calculated_cost ?? 0;
    });

    return Array.from(map.values());
  }, [rows]);

  const grandTotal = grouped.reduce((sum, g) => sum + g.subtotal, 0);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading billing…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Billing</h1>

        <Link
          href="/billing/invoices"
          className="text-sm text-sky-600 hover:underline"
        >
          View invoices →
        </Link>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Entries" value={rows.length} />
        <SummaryCard label="Contracts" value={grouped.length} />
        <SummaryCard label="Grand total" value={`$${grandTotal.toFixed(2)}`} />
        <SummaryCard label="Status" value="Ready to invoice" />
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-md border">
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
            {grouped.map((group) => (
              <BillingGroupRows key={group.contractId} group={group} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------
   COMPONENTS
------------------------------------------------- */
function BillingGroupRows({ group }: { group: ContractGroup }) {
  return (
    <>
      {group.rows.map((row, idx) => (
        <tr key={row.id} className="border-t">
          <td className="p-3">{group.contractName}</td>
          <td className="p-3">{group.contractType}</td>
          <td className="p-3 text-right">{row.duration_minutes ?? "-"}</td>
          <td className="p-3 text-right">
            ${(row.calculated_cost ?? 0).toFixed(2)}
          </td>
          <td className="p-3 text-right">
            {idx === 0 && (
              <CreateInvoiceButton
                contractId={group.contractId}
                amount={group.subtotal}
              />
            )}
          </td>
        </tr>
      ))}

      <tr className="border-t bg-muted/40 font-medium">
        <td className="p-3" colSpan={3}>
          Subtotal — {group.contractName}
        </td>
        <td className="p-3 text-right">${group.subtotal.toFixed(2)}</td>
        <td />
      </tr>
    </>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}