"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

/* =========================================================
   TYPES
========================================================= */

type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
};

type InvoiceRow = {
  id: string;
  org_id?: string | null;
  vendor_id: string | null;
  project_id: string;
  estimate_id: string | null;
  invoice_number: string | null;
  status: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at?: string | null;
  project_name: string;
  client_name: string;
  vendor_name?: string | null;
  estimate_number?: string | null;
  estimate_status?: string | null;
  items: InvoiceItemRow[];
};

type ProfileAccessRow = {
  account_type: string | null;
  role: string | null;
  org_id: string | null;
  email: string | null;
};

type VendorInvoicesApiResponse = {
  ok?: boolean;
  error?: string;
  scope?: "admin" | "vendor" | string;
  vendor_id?: string | null;
  count?: number;
  invoices?: Array<{
    id: string;
    org_id?: string | null;
    vendor_id?: string | null;
    project_id: string;
    estimate_id?: string | null;
    invoice_number?: string | null;
    status?: string | null;
    subtotal?: number | null;
    tax?: number | null;
    total?: number | null;
    issued_at?: string | null;
    due_at?: string | null;
    paid_at?: string | null;
    notes?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    project_name?: string | null;
    client_name?: string | null;
    vendor_name?: string | null;
    estimate_number?: string | null;
    estimate_status?: string | null;
    items?: InvoiceItemRow[];
  }>;
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "Not set";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function isAdminRole(role: string | null | undefined) {
  return ["master_admin", "super_admin", "admin", "project_manager"].includes(
    normalizeText(role)
  );
}

function isVendorAccount(accountType: string | null | undefined) {
  return normalizeText(accountType) === "vendor";
}

function isVendorRole(role: string | null | undefined) {
  const r = normalizeText(role);
  return r === "vendor" || r === "vendor_admin";
}

function isVendorUser(profile: ProfileAccessRow | null | undefined) {
  if (!profile) return false;
  return isVendorAccount(profile.account_type) || isVendorRole(profile.role);
}

function invoiceStatusBadgeClasses(status: string | null | undefined) {
  const normalized = normalizeText(status);

  if (normalized === "paid") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }

  if (normalized === "approved") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "submitted") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (normalized === "draft") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (normalized === "cancelled") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }

  return "border-slate-700 bg-slate-800 text-slate-300";
}

async function authFetch(url: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });
}

function normalizeInvoiceRow(row: VendorInvoicesApiResponse["invoices"][number]): InvoiceRow {
  return {
    id: String(row?.id || "").trim(),
    org_id: row?.org_id ? String(row.org_id).trim() : null,
    vendor_id: row?.vendor_id ? String(row.vendor_id).trim() : null,
    project_id: String(row?.project_id || "").trim(),
    estimate_id: row?.estimate_id ? String(row.estimate_id).trim() : null,
    invoice_number: row?.invoice_number ? String(row.invoice_number).trim() : null,
    status: row?.status ? String(row.status).trim() : "draft",
    subtotal: row?.subtotal ?? null,
    tax: row?.tax ?? null,
    total: row?.total ?? null,
    issued_at: row?.issued_at ?? null,
    due_at: row?.due_at ?? null,
    paid_at: row?.paid_at ?? null,
    notes: row?.notes ?? null,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
    project_name: row?.project_name ? String(row.project_name) : "Untitled Project",
    client_name: row?.client_name ? String(row.client_name) : "Unknown Client",
    vendor_name: row?.vendor_name ? String(row.vendor_name) : null,
    estimate_number: row?.estimate_number ? String(row.estimate_number) : null,
    estimate_status: row?.estimate_status ? String(row.estimate_status) : null,
    items: Array.isArray(row?.items)
      ? row.items.map((item) => ({
          id: String(item?.id || "").trim(),
          invoice_id: String(item?.invoice_id || "").trim(),
          description: item?.description ?? null,
          quantity: item?.quantity ?? null,
          unit_price: item?.unit_price ?? null,
          total: item?.total ?? null,
        }))
      : [],
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function VendorInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [vendorName, setVendorName] = useState("");
  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isVendorView, setIsVendorView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadInvoices() {
    try {
      setLoading(true);
      setError(null);
      setInvoices([]);
      setVendorName("");
      setResolvedVendorId(null);
      setIsAdminView(false);
      setIsVendorView(false);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Unable to load user.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("account_type, role, org_id, email")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Unable to load profile.");
      }

      const typedProfile = profile as ProfileAccessRow;
      const adminView = isAdminRole(typedProfile.role);
      const vendorView = isVendorUser(typedProfile);

      if (!adminView && !vendorView) {
        throw new Error("You do not have access to vendor invoices.");
      }

      if (!typedProfile.org_id && !adminView) {
        throw new Error("Your account is missing org context.");
      }

      setIsAdminView(adminView);
      setIsVendorView(vendorView);

      const res = await authFetch("/api/vendor/invoices", {
        method: "GET",
      });

      const data: VendorInvoicesApiResponse | null = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load vendor invoices.");
      }

      const normalized = Array.isArray(data?.invoices)
        ? data.invoices.map((row) => normalizeInvoiceRow(row))
        : [];

      normalized.sort((a, b) => {
        const aTime = a.updated_at
          ? new Date(a.updated_at).getTime()
          : a.created_at
            ? new Date(a.created_at).getTime()
            : 0;

        const bTime = b.updated_at
          ? new Date(b.updated_at).getTime()
          : b.created_at
            ? new Date(b.created_at).getTime()
            : 0;

        return bTime - aTime;
      });

      if (data.scope === "vendor") {
        setResolvedVendorId(data.vendor_id ?? null);

        const firstVendorName =
          normalized.find((invoice) => invoice.vendor_name)?.vendor_name || "";

        setVendorName(firstVendorName || "your company");
      } else {
        setVendorName("all vendors");
      }

      setInvoices(normalized);
    } catch (err: any) {
      console.error("VENDOR_INVOICES_ERROR:", err);
      setError(err?.message || "Failed to load invoices.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  const counts = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        const status = normalizeText(invoice.status || "draft");

        if (status === "draft") acc.draft += 1;
        if (status === "submitted") acc.submitted += 1;
        if (status === "approved") acc.approved += 1;
        if (status === "paid") acc.paid += 1;
        if (status === "cancelled") acc.cancelled += 1;

        return acc;
      },
      {
        draft: 0,
        submitted: 0,
        approved: 0,
        paid: 0,
        cancelled: 0,
      }
    );
  }, [invoices]);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-200">
              Vendor Invoices
            </h1>

            <p className="text-slate-400">
              {isAdminView
                ? "Admin view of all vendor invoices in your organization."
                : `Invoices assigned to ${vendorName || "your company"}.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadInvoices}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 text-sm text-slate-300 transition hover:border-sky-600 hover:text-white disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <Link
              href="/vendor/invoices/create"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-700 bg-cyan-950 px-4 text-sm text-cyan-200 transition hover:bg-cyan-900 hover:text-white"
            >
              Create Invoice
            </Link>

            <Link
              href="/vendor"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 text-sm text-slate-300 transition hover:border-sky-600 hover:text-white"
            >
              Back to Vendor Portal
            </Link>
          </div>
        </div>

        {(isVendorView || isAdminView) && (
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {isVendorView && !isAdminView && resolvedVendorId ? (
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                Vendor scope active
              </span>
            ) : null}

            {isAdminView ? (
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                Admin org-wide view
              </span>
            ) : null}

            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
              Total loaded: {invoices.length}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Draft" value={counts.draft} />
        <SummaryCard label="Submitted" value={counts.submitted} />
        <SummaryCard label="Approved" value={counts.approved} />
        <SummaryCard label="Paid" value={counts.paid} />
        <SummaryCard label="Cancelled" value={counts.cancelled} />
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading invoices...
        </div>
      )}

      {!loading && !error && invoices.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p>
                {isAdminView
                  ? "No invoices found for this organization."
                  : "No invoices found for your vendor account."}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Create the first invoice to start the vendor billing workflow.
              </p>
            </div>

            <Link
              href="/vendor/invoices/create"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-700 bg-cyan-950 px-4 text-sm text-cyan-200 transition hover:bg-cyan-900 hover:text-white"
            >
              Create Invoice
            </Link>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6 text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">
                      {invoice.project_name}
                    </h2>
                    <p className="text-sm text-slate-400">
                      Client: {invoice.client_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Vendor: {invoice.vendor_name || "Assigned Vendor"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${invoiceStatusBadgeClasses(
                        invoice.status
                      )}`}
                    >
                      {formatStatus(invoice.status)}
                    </span>

                    {invoice.invoice_number ? (
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        Invoice #{invoice.invoice_number}
                      </span>
                    ) : null}

                    {invoice.estimate_id ? (
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        Estimate #{invoice.estimate_number || "Linked"}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="text-sm md:text-right">
                  <p className="text-slate-500">Invoice Total</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {formatCurrency(invoice.total)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Created {formatDateTime(invoice.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <MetricCard
                  label="Subtotal"
                  value={formatCurrency(invoice.subtotal)}
                />
                <MetricCard
                  label="Tax"
                  value={formatCurrency(invoice.tax)}
                />
                <MetricCard
                  label="Issued"
                  value={formatDate(invoice.issued_at)}
                />
                <MetricCard
                  label="Due"
                  value={formatDate(invoice.due_at)}
                />
              </div>

              {invoice.items.length > 0 ? (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Invoice Items
                  </p>

                  <div className="mt-3 space-y-3">
                    {invoice.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 border-b border-slate-800 pb-3 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm text-slate-200">
                            {item.description || "Invoice item"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Qty: {item.quantity ?? 0} • Unit:{" "}
                            {formatCurrency(item.unit_price)}
                          </p>
                        </div>

                        <p className="text-sm font-medium text-slate-100">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {(invoice.notes ||
                invoice.created_at ||
                invoice.paid_at ||
                invoice.estimate_status) ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Notes
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {invoice.notes || "No notes provided."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Timeline
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-slate-300">
                      <p>Created: {formatDate(invoice.created_at)}</p>
                      <p>Paid: {formatDate(invoice.paid_at)}</p>
                      <p>
                        Estimate Status: {formatStatus(invoice.estimate_status)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/vendor/invoices/${invoice.id}`}
                  className="inline-flex rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-900"
                >
                  Open Invoice
                </Link>

                <Link
                  href={`/vendor/projects/${invoice.project_id}`}
                  className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  Open Project
                </Link>

                {invoice.estimate_id ? (
                  <Link
                    href={`/vendor/estimates/${invoice.estimate_id}`}
                    className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                  >
                    Open Estimate
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-100">{value}</p>
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
      <p className="mt-2 text-sm text-slate-200">{value}</p>
    </div>
  );
}