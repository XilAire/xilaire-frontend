"use client";

import { useEffect, useState } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type Invoice = {
  id: string;
  contract_id: string;
  period_start: string;
  period_end: string;
  status: string;
  total_amount: number;
  created_at: string;
  approved_at?: string | null;
  issued_at?: string | null;
  paid_at?: string | null;
  locked_at?: string | null;
  hosted_invoice_url?: string | null;
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

function formatDateTime(ts?: string | null) {
  if (!ts) return null;
  return new Date(ts).toLocaleString();
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -------------------------------------------------
     LOAD
  ------------------------------------------------- */
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

    if (invErr || !inv) {
      console.error("[InvoiceDetail] Invoice load failed:", invErr);
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

    if (lineErr) {
      console.error("[InvoiceDetail] Line load failed:", lineErr);
    }

    setInvoice(inv);
    setLines(lineData ?? []);
    setLoading(false);
  }

  /* -------------------------------------------------
     ACTIONS
  ------------------------------------------------- */
  async function postInvoice() {
    if (!confirm("Post this invoice? This action is irreversible.")) return;

    setPosting(true);
    setError(null);

    const res = await fetch(
      `/api/billing/invoices/${invoiceId}/post`,
      { method: "POST" }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to post invoice");
      setPosting(false);
      return;
    }

    router.refresh();
    setPosting(false);
  }

  /* -------------------------------------------------
     STATES
  ------------------------------------------------- */
  if (loading) {
    return <p className="p-6 text-sm text-slate-500">Loading invoice…</p>;
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Invoice not found</p>
        <Link
          href="/billing/invoices"
          className="text-sm text-sky-500 hover:underline"
        >
          ← Back to invoices
        </Link>
      </div>
    );
  }

  const canPost = invoice.status === "draft";
  const canPay =
    invoice.status === "open" && !!invoice.hosted_invoice_url;

  const isLocked =
    invoice.status !== "draft" &&
    invoice.status !== "open";

  const canDownloadPdf = !!invoice.hosted_invoice_url;

  let statusBadge: { label: string; color: string };

  if (invoice.status === "paid" && invoice.paid_at) {
    statusBadge = { label: "Paid", color: "bg-emerald-600" };
  } else if (invoice.status === "open") {
    statusBadge = { label: "Awaiting Payment", color: "bg-amber-500" };
  } else if (invoice.status === "draft") {
    statusBadge = { label: "Draft", color: "bg-slate-500" };
  } else {
    statusBadge = { label: "Locked", color: "bg-slate-700" };
  }

  const timelineEvents = [
    { label: "Invoice created", at: invoice.created_at, icon: "🧾" },
    invoice.approved_at && {
      label: "Invoice approved",
      at: invoice.approved_at,
      icon: "✅",
    },
    invoice.issued_at && {
      label: "Invoice issued",
      at: invoice.issued_at,
      icon: "📤",
    },
    invoice.paid_at && {
      label: "Invoice paid",
      at: invoice.paid_at,
      icon: "💳",
    },
    invoice.locked_at && {
      label: "Invoice locked",
      at: invoice.locked_at,
      icon: "🔒",
    },
  ].filter(Boolean) as {
    label: string;
    at: string;
    icon: string;
  }[];

  /* -------------------------------------------------
     PAGE
  ------------------------------------------------- */
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold">
            Invoice #{invoice.id.slice(0, 8)}
          </h1>

          <div className="flex items-center gap-3 mt-1">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>

            <span className="text-xs text-slate-500">
              {invoice.period_start} → {invoice.period_end}
            </span>
          </div>

          {isLocked && (
            <p className="text-xs text-slate-400 mt-1">
              This invoice is locked and cannot be modified.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/billing/invoices"
            className="text-sm text-sky-500 hover:underline"
          >
            ← Back
          </Link>

          {canDownloadPdf && (
            <a
              href={invoice.hosted_invoice_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View / Download PDF
            </a>
          )}

          {canPost && (
            <button
              onClick={postInvoice}
              disabled={posting}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {posting ? "Posting…" : "Post Invoice"}
            </button>
          )}

          {canPay && (
            <a
              href={invoice.hosted_invoice_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Pay Invoice
            </a>
          )}
        </div>
      </div>

      {/* TIMELINE */}
      <div className="border rounded-xl p-6">
        <h2 className="text-sm font-semibold mb-4">Invoice Activity</h2>

        <ul className="space-y-3">
          {timelineEvents.map((e, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="text-lg">{e.icon}</span>
              <div>
                <p className="font-medium">{e.label}</p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(e.at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* LINE ITEMS */}
      <div className="border rounded-xl overflow-hidden">
        {lines.length === 0 && (
          <p className="p-6 text-sm text-slate-500">
            No line items on this invoice.
          </p>
        )}

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
                <span>
                  {l.quantity} × ${l.unit_price.toFixed(2)}
                </span>
                <span className="font-medium">
                  ${l.total_amount.toFixed(2)}
                </span>
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
