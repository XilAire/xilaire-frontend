"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

type ProfileRow = {
  id: string;
  role: string | null;
  account_type: string | null;
  org_id: string | null;
};

type InvoiceStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "paid"
  | "cancelled";

type StatusFilter = "all" | InvoiceStatus;

type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type InvoiceRow = {
  id: string;
  org_id: string;
  vendor_id: string | null;
  project_id: string;
  estimate_id: string | null;
  invoice_number: string | null;
  status: InvoiceStatus;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  project_name: string;
  client_name: string;
  vendor_name: string;
  estimate_number: string | null;
  estimate_status: string | null;
  items: InvoiceItemRow[];
};

type InvoicesApiResponse = {
  ok?: boolean;
  error?: string;
  invoices?: InvoiceRow[];
  count?: number;
  scope?: string;
  org_id?: string | null;
  status_filter?: StatusFilter;
  include_items?: boolean;
};

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function isAdminRole(role: string | null | undefined) {
  return ["master_admin", "admin", "super_admin", "project_manager"].includes(
    normalizeText(role)
  );
}

function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  const normalized = normalizeText(String(value || "draft"));

  if (normalized === "submitted") return "submitted";
  if (normalized === "approved") return "approved";
  if (normalized === "paid") return "paid";
  if (normalized === "cancelled") return "cancelled";
  return "draft";
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCurrency(value: number | null | undefined) {
  const safe = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(safe) ? safe : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusBadgeClass(status: InvoiceStatus) {
  switch (status) {
    case "paid":
      return "border-violet-500/30 bg-violet-500/10 text-violet-300";
    case "approved":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "submitted":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "cancelled":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    case "draft":
    default:
      return "border-slate-700 bg-slate-800 text-slate-300";
  }
}

function getInvoiceItemTotal(item: InvoiceItemRow) {
  return Number(item.total || 0);
}

function normalizeInvoiceRow(row: any): InvoiceRow | null {
  const id = String(row?.id || "").trim();
  const projectId = String(row?.project_id || "").trim();

  if (!id || !projectId) return null;

  return {
    id,
    org_id: String(row?.org_id || "").trim(),
    vendor_id: row?.vendor_id ? String(row.vendor_id).trim() : null,
    project_id: projectId,
    estimate_id: row?.estimate_id ? String(row.estimate_id).trim() : null,
    invoice_number: row?.invoice_number ? String(row.invoice_number).trim() : null,
    status: normalizeInvoiceStatus(row?.status),
    subtotal: row?.subtotal ?? null,
    tax: row?.tax ?? null,
    total: row?.total ?? null,
    issued_at: row?.issued_at ? String(row.issued_at) : null,
    due_at: row?.due_at ? String(row.due_at) : null,
    paid_at: row?.paid_at ? String(row.paid_at) : null,
    notes: row?.notes ? String(row.notes) : null,
    created_at: row?.created_at ? String(row.created_at) : null,
    updated_at: row?.updated_at ? String(row.updated_at) : null,
    project_name: String(row?.project_name || "Untitled Project").trim(),
    client_name: String(row?.client_name || "Unknown Client").trim(),
    vendor_name: String(row?.vendor_name || "Unknown Vendor").trim(),
    estimate_number: row?.estimate_number ? String(row.estimate_number).trim() : null,
    estimate_status: row?.estimate_status ? String(row.estimate_status).trim() : null,
    items: Array.isArray(row?.items)
      ? row.items.map((item: any) => ({
          id: String(item?.id || "").trim(),
          invoice_id: String(item?.invoice_id || "").trim(),
          description: item?.description ? String(item.description) : null,
          quantity: item?.quantity ?? null,
          unit_price: item?.unit_price ?? null,
          total: item?.total ?? null,
          created_at: item?.created_at ? String(item.created_at) : null,
          updated_at: item?.updated_at ? String(item.updated_at) : null,
        }))
      : [],
  };
}

export default function InfrastructureInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const isRefreshingRef = useRef(false);

  async function authFetch(input: string, init?: RequestInit) {
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

  async function loadProfile() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(userError?.message || "You must be signed in.");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, account_type, org_id")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to load profile.");
    }

    const normalizedProfile: ProfileRow = {
      id: String(data.id || "").trim(),
      role: data.role ?? null,
      account_type: data.account_type ?? null,
      org_id: data.org_id ?? null,
    };

    if (!normalizedProfile.org_id) {
      throw new Error("Your profile is missing org context.");
    }

    if (!isAdminRole(normalizedProfile.role)) {
      throw new Error("You do not have access to infrastructure invoices.");
    }

    setProfile(normalizedProfile);
    return normalizedProfile;
  }

  async function loadInvoices() {
    const params = new URLSearchParams();
    params.set("include_items", "true");

    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    const res = await authFetch(`/api/infrastructure/invoices?${params.toString()}`, {
      method: "GET",
    });

    const data: InvoicesApiResponse | null = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Failed to load infrastructure invoices.");
    }

    const normalized = Array.isArray(data?.invoices)
      ? data.invoices
          .map((row: any) => normalizeInvoiceRow(row))
          .filter(Boolean) as InvoiceRow[]
      : [];

    normalized.sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });

    setInvoices(normalized);
    setLastRefreshedAt(new Date().toISOString());
  }

  async function loadAll(options?: { silent?: boolean }) {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;

    if (!options?.silent) {
      setLoading(true);
    }

    setError(null);

    try {
      if (!profile) {
        await loadProfile();
      }

      await loadInvoices();
    } catch (err: any) {
      console.error("INFRASTRUCTURE_INVOICES_LOAD_ERROR:", err);
      setError(err?.message || "Failed to load infrastructure invoices.");
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
      isRefreshingRef.current = false;
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!profile) return;
    loadAll({ silent: true });
  }, [statusFilter, profile]);

  useEffect(() => {
    function handleWindowFocus() {
      loadAll({ silent: true });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadAll({ silent: true });
      }
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadAll({ silent: true });
      }
    }, 15000);

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [profile, statusFilter]);

  const filteredInvoices = useMemo(() => {
    return invoices;
  }, [invoices]);

  const counts = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        acc.all += 1;
        if (invoice.status === "draft") acc.draft += 1;
        if (invoice.status === "submitted") acc.submitted += 1;
        if (invoice.status === "approved") acc.approved += 1;
        if (invoice.status === "paid") acc.paid += 1;
        if (invoice.status === "cancelled") acc.cancelled += 1;
        return acc;
      },
      {
        all: 0,
        draft: 0,
        submitted: 0,
        approved: 0,
        paid: 0,
        cancelled: 0,
      }
    );
  }, [invoices]);

  const totals = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        acc.subtotal += Number(invoice.subtotal || 0);
        acc.tax += Number(invoice.tax || 0);
        acc.total += Number(invoice.total || 0);
        return acc;
      },
      {
        subtotal: 0,
        tax: 0,
        total: 0,
      }
    );
  }, [invoices]);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-sky-300">
              Infrastructure
            </p>
            <h1 className="text-2xl font-semibold text-slate-100">
              Infrastructure Invoices
            </h1>
            <p className="text-slate-400">
              Review all project-linked invoices, track vendor billing status, and monitor invoice totals across infrastructure work.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadAll()}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 text-sm text-slate-300 transition hover:border-sky-600 hover:text-white disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <Link
              href="/infrastructure/projects"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 text-sm text-slate-300 transition hover:border-sky-600 hover:text-white"
            >
              Open Projects
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-500">
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
            Org-wide review
          </span>
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
            Active filter: {formatStatusLabel(statusFilter)}
          </span>
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
            Loaded invoices: {counts.all}
          </span>
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
            Showing: {filteredInvoices.length}
          </span>
          {lastRefreshedAt ? (
            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
              Last refreshed: {formatDateTime(lastRefreshedAt)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <SummaryCard
          label="All"
          value={counts.all}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <SummaryCard
          label="Draft"
          value={counts.draft}
          active={statusFilter === "draft"}
          onClick={() => setStatusFilter("draft")}
        />
        <SummaryCard
          label="Submitted"
          value={counts.submitted}
          active={statusFilter === "submitted"}
          onClick={() => setStatusFilter("submitted")}
        />
        <SummaryCard
          label="Approved"
          value={counts.approved}
          active={statusFilter === "approved"}
          onClick={() => setStatusFilter("approved")}
        />
        <SummaryCard
          label="Paid"
          value={counts.paid}
          active={statusFilter === "paid"}
          onClick={() => setStatusFilter("paid")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Subtotal Total" value={formatCurrency(totals.subtotal)} />
        <MetricCard label="Tax Total" value={formatCurrency(totals.tax)} />
        <MetricCard label="Invoice Total" value={formatCurrency(totals.total)} />
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading infrastructure invoices...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6 text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && filteredInvoices.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          No invoices found for the selected filter.
        </div>
      )}

      {!loading && !error && filteredInvoices.length > 0 && (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${getStatusBadgeClass(
                        invoice.status
                      )}`}
                    >
                      {formatStatusLabel(invoice.status)}
                    </span>

                    {invoice.invoice_number ? (
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        Invoice #{invoice.invoice_number}
                      </span>
                    ) : null}

                    <span className="text-xs text-slate-500">
                      Invoice ID: {invoice.id}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">
                      {invoice.project_name}
                    </h2>
                    <p className="text-sm text-slate-400">
                      Client: {invoice.client_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Vendor: {invoice.vendor_name}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
                    <p>Created: {formatDateTime(invoice.created_at)}</p>
                    <p>Updated: {formatDateTime(invoice.updated_at)}</p>
                    <p>Issued: {formatDate(invoice.issued_at)}</p>
                    <p>Due: {formatDate(invoice.due_at)}</p>
                    <p>Paid: {formatDate(invoice.paid_at)}</p>
                    <p>
                      Estimate:{" "}
                      {invoice.estimate_number
                        ? `${invoice.estimate_number} (${formatStatusLabel(
                            invoice.estimate_status || "unknown"
                          )})`
                        : "-"}
                    </p>
                    <p>Items: {invoice.items.length}</p>
                  </div>
                </div>

                <div className="grid min-w-[280px] gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                  <MetricCard
                    label="Subtotal"
                    value={formatCurrency(invoice.subtotal)}
                  />
                  <MetricCard
                    label="Tax"
                    value={formatCurrency(invoice.tax)}
                  />
                  <MetricCard
                    label="Total"
                    value={formatCurrency(invoice.total)}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                    {invoice.notes || "No notes provided."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Invoice Items
                  </p>

                  {invoice.items.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-400">
                      No invoice items found.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-3">
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
                            {formatCurrency(getInvoiceItemTotal(item))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/infrastructure/invoices/${invoice.id}`}
                  className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                >
                  Open Invoice
                </Link>

                <Link
                  href={`/infrastructure/projects/${invoice.project_id}`}
                  className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  Open Project
                </Link>

                {invoice.estimate_id ? (
                  <Link
                    href="/infrastructure/estimates"
                    className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                  >
                    Open Estimates
                  </Link>
                ) : null}

                <Link
                  href="/vendor/invoices"
                  className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  Open Vendor Invoices
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && counts.cancelled > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          Cancelled invoices in org: {counts.cancelled}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        active
          ? "border-sky-700 bg-sky-950/30"
          : "border-slate-800 bg-slate-900 hover:border-slate-700"
      }`}
    >
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-100">{value}</p>
    </button>
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