"use client";

import { useEffect, useState } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { useParams, useRouter } from "next/navigation";

type Invoice = {
  id: string;
  contract_id: string;
  period_start: string;
  period_end: string;
  status: string;
  total_amount: number;
  created_at: string;
};

type InvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  time_entry?: {
    started_at: string;
    ended_at: string | null;
    duration_minutes: number;
    work_item_id: string;
  }[];
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  async function loadInvoice() {
    setLoading(true);
    setError(null);

    const { data: inv, error: invErr } = await supabasePlatform
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invErr) {
      console.error(invErr);
      setLoading(false);
      return;
    }

    const { data: lineData, error: lineErr } = await supabasePlatform
      .from("invoice_lines")
      .select(`
        id,
        description,
        quantity,
        unit_price,
        total_amount,
        time_entry:source_time_entry_id (
          started_at,
          ended_at,
          duration_minutes,
          work_item_id
        )
      `)
      .eq("invoice_id", invoiceId)
      .order("created_at");

    if (lineErr) console.error(lineErr);

    setInvoice(inv);
    setLines(lineData ?? []);
    setLoading(false);
  }

  async function postInvoice() {
    if (!confirm("Post this invoice? This action is irreversible.")) return;

    setPosting(true);
    setError(null);

    const res = await fetch(`/api/billing/invoices/${invoiceId}/post`, {
      method: "POST",
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to post invoice");
      setPosting(false);
      return;
    }

    router.refresh();
    setPosting(false);
  }

  if (loading) return <p className="p-6 text-sm">Loading invoice…</p>;
  if (!invoice) return <p className="p-6 text-sm text-red-500">Invoice not found</p>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Invoice #{invoice.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-slate-500">
            {invoice.period_start} → {invoice.period_end}
          </p>
          <p className="text-xs text-slate-400">Status: {invoice.status}</p>
        </div>

        {invoice.status === "draft" && (
          <button
            onClick={postInvoice}
            disabled={posting}
            className="rounded-lg bg-green-600 px-4 py-2 text-white"
          >
            {posting ? "Posting…" : "Post Invoice"}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="border rounded-xl overflow-hidden">
        {lines.map((l) => {
          const te = l.time_entry?.[0];

          return (
            <div key={l.id} className="px-6 py-4 border-b">
              <p className="font-medium">{l.description}</p>

              {te && (
                <p className="text-xs text-slate-500">
                  {te.duration_minutes} min · Work Item{" "}
                  {te.work_item_id.slice(0, 8)}
                </p>
              )}

              <div className="flex justify-between text-sm mt-2">
                <span>{l.quantity} × ${l.unit_price.toFixed(2)}</span>
                <span>${l.total_amount.toFixed(2)}</span>
              </div>
            </div>
          );
        })}

        <div className="px-6 py-4 text-right font-semibold">
          Total: ${invoice.total_amount.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
