"use client";

import { useEffect, useState } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import Link from "next/link";

type Invoice = {
  id: string;
  contract_id: string;
  period_start: string;
  period_end: string;
  status: string;
  total_amount: number;
  created_at: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);

    const { data, error } = await supabasePlatform
      .from("invoices")
      .select("*")
      .order("period_end", { ascending: false });

    if (error) {
      console.error("[InvoicesPage] load failed:", error);
      setInvoices([]);
    } else {
      setInvoices(data ?? []);
    }

    setLoading(false);
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
        Invoices
      </h1>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow">
        <div className="grid grid-cols-[1fr,140px,140px,120px,140px] px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div>Invoice</div>
          <div className="text-center">Period</div>
          <div className="text-center">Status</div>
          <div className="text-right">Total</div>
          <div className="text-right">Created</div>
        </div>

        {loading && (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        )}

        {!loading && invoices.length === 0 && (
          <p className="p-6 text-sm text-slate-500">
            No invoices found.
          </p>
        )}

        {!loading &&
          invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/billing/invoices/${inv.id}`}
              className="grid grid-cols-[1fr,140px,140px,120px,140px] px-6 py-4 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  Invoice #{inv.id.slice(0, 8)}
                </p>
                <p className="text-xs text-slate-500">
                  Contract {inv.contract_id.slice(0, 8)}
                </p>
              </div>

              <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                {inv.period_start} → {inv.period_end}
              </div>

              <div className="text-center">
                <span
                  className={
                    "px-3 py-1 rounded-full text-xs font-medium " +
                    (inv.status === "posted"
                      ? "bg-green-500/10 text-green-700 dark:text-green-300"
                      : "bg-gray-500/10 text-gray-600 dark:text-gray-300")
                  }
                >
                  {inv.status}
                </span>
              </div>

              <div className="text-right font-medium text-slate-900 dark:text-white">
                ${inv.total_amount.toFixed(2)}
              </div>

              <div className="text-right text-xs text-slate-500">
                {new Date(inv.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
