"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

type InvoiceStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "paid"
  | "cancelled";

type InvoiceItem = {
  id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  total?: number | null;
  line_total?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type InvoiceDetail = {
  id: string;
  org_id: string;
  estimate_id: string | null;
  project_id: string | null;
  vendor_id: string | null;
  invoice_number: string | null;
  status: InvoiceStatus;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  cancelled_at?: string | null;
  project: {
    id: string;
    project_name: string | null;
    client_name: string | null;
    status: string | null;
    project_type: string | null;
    project_address: string | null;
  } | null;
  vendor: {
    id: string;
    company_name: string | null;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    vendor_category: string | null;
  } | null;
  estimate: {
    id: string;
    estimate_number: string | null;
    status: string | null;
    amount?: number | null;
    total_cost?: number | null;
    labor_cost: number | null;
    material_cost: number | null;
    notes: string | null;
    submitted_at: string | null;
    approved_at: string | null;
  } | null;
  items: InvoiceItem[];
};

type StatusActionResponse = {
  ok?: boolean;
  invoice?: InvoiceDetail;
  error?: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(value: number | null | undefined) {
  return currency.format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function getStatusClasses(status: string) {
  switch ((status || "").toLowerCase()) {
    case "draft":
      return "border border-slate-700 bg-slate-800 text-slate-200";
    case "submitted":
      return "border border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "approved":
      return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "paid":
      return "border border-violet-500/30 bg-violet-500/10 text-violet-300";
    case "cancelled":
      return "border border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border border-slate-700 bg-slate-800 text-slate-200";
  }
}

function getItemTotal(item: InvoiceItem) {
  return Number(item.total ?? item.line_total ?? 0);
}

function formatStatusLabel(value: string | null | undefined) {
  return String(value || "-")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function InfrastructureInvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<InvoiceStatus | "refresh" | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers = new Headers(init?.headers || {});

    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }

    if (!(init?.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(input, {
      ...init,
      headers,
      cache: "no-store",
    });
  }

  async function loadInvoice() {
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(`/api/infrastructure/invoices/${invoiceId}`, {
        method: "GET",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load invoice.");
      }

      setInvoice(data?.invoice || null);
    } catch (err: any) {
      setError(err?.message || "Failed to load invoice.");
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(nextStatus: InvoiceStatus) {
    setActionLoading(nextStatus);
    setActionMessage(null);
    setError(null);

    try {
      const res = await authFetch(
        `/api/infrastructure/invoices/${invoiceId}/status`,
        {
          method: "POST",
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      const data: StatusActionResponse | null = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update invoice status.");
      }

      if (data.invoice) {
        setInvoice(data.invoice);
      } else {
        await loadInvoice();
      }

      setActionMessage(`Invoice updated to ${formatStatusLabel(nextStatus)}.`);
    } catch (err: any) {
      setError(err?.message || "Failed to update invoice status.");
    } finally {
      setActionLoading(null);
    }
  }

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const computedSubtotal = useMemo(() => {
    if (!invoice?.items?.length) {
      return Number(invoice?.subtotal || 0);
    }

    return invoice.items.reduce((sum, item) => sum + getItemTotal(item), 0);
  }, [invoice]);

  const canSubmit = invoice?.status === "draft";
  const canApprove = invoice?.status === "submitted";
  const canPay = invoice?.status === "approved";
  const canCancel =
    invoice?.status === "draft" ||
    invoice?.status === "submitted" ||
    invoice?.status === "approved";

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-sky-300">
              Infrastructure
            </p>
            <h1 className="text-2xl font-semibold text-slate-100">
              Invoice Detail
            </h1>
            <p className="text-slate-400">
              Review invoice details, linked estimate context, invoice items, and billing status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/infrastructure/invoices"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 text-sm text-slate-300 transition hover:border-sky-600 hover:text-white"
            >
              Back to Invoices
            </Link>

            <button
              type="button"
              onClick={loadInvoice}
              disabled={loading || actionLoading !== null}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 text-sm text-slate-300 transition hover:border-sky-600 hover:text-white disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {invoice ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs ${getStatusClasses(invoice.status)}`}>
              {formatStatusLabel(invoice.status)}
            </span>

            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">
              Invoice #{invoice.invoice_number || invoice.id}
            </span>

            <span className="text-xs text-slate-500">
              Invoice ID: {invoice.id}
            </span>
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-300">
            {actionMessage}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-300">
            {error}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading invoice...
        </div>
      ) : !invoice ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Invoice not found.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-slate-100">
                Billing Actions
              </h2>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!canSubmit || actionLoading !== null}
                  onClick={() => updateStatus("submitted")}
                  className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
                >
                  {actionLoading === "submitted" ? "Updating..." : "Mark Submitted"}
                </button>

                <button
                  type="button"
                  disabled={!canApprove || actionLoading !== null}
                  onClick={() => updateStatus("approved")}
                  className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {actionLoading === "approved" ? "Updating..." : "Mark Approved"}
                </button>

                <button
                  type="button"
                  disabled={!canPay || actionLoading !== null}
                  onClick={() => updateStatus("paid")}
                  className="inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {actionLoading === "paid" ? "Updating..." : "Mark Paid"}
                </button>

                <button
                  type="button"
                  disabled={!canCancel || actionLoading !== null}
                  onClick={() => updateStatus("cancelled")}
                  className="inline-flex rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-50"
                >
                  {actionLoading === "cancelled" ? "Updating..." : "Cancel Invoice"}
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Subtotal" value={formatCurrency(computedSubtotal)} />
                <MetricCard label="Tax" value={formatCurrency(invoice.tax)} />
                <MetricCard label="Total" value={formatCurrency(invoice.total)} />
                <MetricCard label="Items" value={String(invoice.items?.length || 0)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-slate-100">
                Invoice Items
              </h2>

              {invoice.items?.length ? (
                <div className="mt-4 space-y-3">
                  {invoice.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm text-slate-100">
                          {item.description || "Invoice item"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Qty: {Number(item.quantity || 0)} • Unit: {formatCurrency(item.unit_price)}
                        </p>
                      </div>

                      <p className="text-sm font-medium text-slate-100">
                        {formatCurrency(getItemTotal(item))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                  No invoice items found.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-slate-100">
                Notes
              </h2>

              <div className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">
                {invoice.notes?.trim() || "No invoice notes recorded."}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-slate-100">
                Invoice Details
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <DetailRow label="Invoice Number" value={invoice.invoice_number || "-"} />
                <DetailRow label="Status" value={formatStatusLabel(invoice.status)} />
                <DetailRow label="Created" value={formatDate(invoice.created_at)} />
                <DetailRow label="Updated" value={formatDate(invoice.updated_at)} />
                <DetailRow label="Issued" value={formatDate(invoice.issued_at)} />
                <DetailRow label="Due" value={formatDate(invoice.due_at)} />
                <DetailRow label="Paid" value={formatDate(invoice.paid_at)} />
                <DetailRow label="Submitted" value={formatDate(invoice.submitted_at)} />
                <DetailRow label="Approved" value={formatDate(invoice.approved_at)} />
                <DetailRow label="Cancelled" value={formatDate(invoice.cancelled_at)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-slate-100">
                Project
              </h2>

              {invoice.project ? (
                <div className="mt-4 space-y-3 text-sm">
                  <DetailRow label="Project Name" value={invoice.project.project_name || "-"} />
                  <DetailRow label="Client" value={invoice.project.client_name || "-"} />
                  <DetailRow label="Type" value={invoice.project.project_type || "-"} />
                  <DetailRow label="Status" value={invoice.project.status || "-"} />
                  <DetailRow label="Address" value={invoice.project.project_address || "-"} />

                  <Link
                    href={`/infrastructure/projects/${invoice.project.id}`}
                    className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                  >
                    Open Project
                  </Link>
                </div>
              ) : (
                <div className="mt-4 text-sm text-slate-400">
                  No project linked.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-slate-100">
                Vendor
              </h2>

              {invoice.vendor ? (
                <div className="mt-4 space-y-3 text-sm">
                  <DetailRow label="Company" value={invoice.vendor.company_name || "-"} />
                  <DetailRow label="Contact" value={invoice.vendor.contact_name || "-"} />
                  <DetailRow label="Email" value={invoice.vendor.email || "-"} />
                  <DetailRow label="Phone" value={invoice.vendor.phone || "-"} />
                  <DetailRow label="Category" value={invoice.vendor.vendor_category || "-"} />
                </div>
              ) : (
                <div className="mt-4 text-sm text-slate-400">
                  No vendor linked.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-slate-100">
                Source Estimate
              </h2>

              {invoice.estimate ? (
                <div className="mt-4 space-y-3 text-sm">
                  <DetailRow label="Estimate Number" value={invoice.estimate.estimate_number || "-"} />
                  <DetailRow label="Status" value={formatStatusLabel(invoice.estimate.status)} />
                  <DetailRow
                    label="Amount"
                    value={formatCurrency(
                      invoice.estimate.amount ?? invoice.estimate.total_cost ?? 0
                    )}
                  />
                  <DetailRow label="Labor" value={formatCurrency(invoice.estimate.labor_cost)} />
                  <DetailRow label="Material" value={formatCurrency(invoice.estimate.material_cost)} />
                  <DetailRow label="Submitted" value={formatDate(invoice.estimate.submitted_at)} />
                  <DetailRow label="Approved" value={formatDate(invoice.estimate.approved_at)} />

                  <Link
                    href="/infrastructure/estimates"
                    className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                  >
                    Open Estimates
                  </Link>
                </div>
              ) : (
                <div className="mt-4 text-sm text-slate-400">
                  No estimate linked.
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="text-slate-100">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-slate-100">{value}</p>
    </div>
  );
}