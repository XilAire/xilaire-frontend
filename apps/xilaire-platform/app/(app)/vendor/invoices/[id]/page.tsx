"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

type ProfileRow = {
  id: string;
  role: string | null;
  account_type: string | null;
  org_id: string | null;
  email: string | null;
};

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
  org_id: string | null;
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
  updated_at: string | null;
  project_name: string;
  client_name: string;
  vendor_name: string;
  estimate_number: string | null;
  estimate_status: string | null;
  items: InvoiceItemRow[];
};

type InvoiceEditForm = {
  invoice_number: string;
  status: string;
  subtotal: string;
  tax: string;
  total: string;
  issued_at: string;
  due_at: string;
  paid_at: string;
  notes: string;
  items: Array<{
    id?: string;
    description: string;
    quantity: string;
    unit_price: string;
    total: string;
  }>;
};

type VendorInvoiceDetailApiResponse = {
  error?: string;
  invoice?: {
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
    project?: {
      id: string;
      name?: string | null;
      status?: string | null;
    } | null;
    vendor?: {
      id: string;
      company_name?: string | null;
      contact_name?: string | null;
      email?: string | null;
      phone?: string | null;
      onboarding_status?: string | null;
      is_active?: boolean | null;
    } | null;
    estimate?: {
      id: string;
      estimate_number?: string | null;
      status?: string | null;
      project_id?: string | null;
      vendor_id?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    } | null;
    items?: Array<{
      id: string;
      invoice_id: string;
      description?: string | null;
      quantity?: number | null;
      unit_price?: number | null;
      total?: number | null;
      created_at?: string | null;
      updated_at?: string | null;
    }>;
  };
};

async function authFetch(url: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });
}

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
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
  const normalized = normalizeText(role);
  return normalized === "vendor" || normalized === "vendor_admin";
}

function isVendorUser(profile: ProfileRow | null | undefined) {
  if (!profile) return false;
  return isVendorAccount(profile.account_type) || isVendorRole(profile.role);
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null | undefined) {
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

function toInputNumber(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function normalizeMoneyInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function toOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toOptionalNumber(value: string) {
  const trimmed = String(value || "").trim();

  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) {
    throw new Error("Please enter valid numeric values.");
  }

  return Number(parsed.toFixed(2));
}

function toOptionalDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Please enter a valid date.");
  }

  return date.toISOString();
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function statusBadgeClasses(status: string | null | undefined) {
  const normalized = normalizeText(status);

  if (normalized === "approved") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "submitted") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (normalized === "paid") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }

  if (normalized === "draft") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (normalized === "cancelled") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }

  return "border-slate-700 bg-slate-800 text-slate-300";
}

function canVendorEdit(status: string | null | undefined) {
  const normalized = normalizeText(status || "draft");
  return normalized === "draft" || normalized === "submitted";
}

function canVendorSetStatus(nextStatus: string) {
  const normalized = normalizeText(nextStatus);
  return normalized === "draft" || normalized === "submitted";
}

function canAdminSetStatus(nextStatus: string) {
  const normalized = normalizeText(nextStatus);
  return ["draft", "submitted", "approved", "paid", "cancelled"].includes(normalized);
}

function buildInitialForm(invoice: InvoiceRow): InvoiceEditForm {
  return {
    invoice_number: invoice.invoice_number || "",
    status: invoice.status || "draft",
    subtotal: toInputNumber(invoice.subtotal),
    tax: toInputNumber(invoice.tax),
    total: toInputNumber(invoice.total),
    issued_at: toDateInput(invoice.issued_at),
    due_at: toDateInput(invoice.due_at),
    paid_at: toDateInput(invoice.paid_at),
    notes: invoice.notes || "",
    items:
      invoice.items.length > 0
        ? invoice.items.map((item) => ({
            id: item.id,
            description: item.description || "",
            quantity: toInputNumber(item.quantity),
            unit_price: toInputNumber(item.unit_price),
            total: toInputNumber(item.total),
          }))
        : [
            {
              description: "",
              quantity: "1",
              unit_price: "",
              total: "",
            },
          ],
  };
}

function normalizeInvoiceFromDetailApi(
  row: VendorInvoiceDetailApiResponse["invoice"]
): InvoiceRow {
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
    project_name: row?.project?.name ? String(row.project.name) : "Untitled Project",
    client_name: "XilAire Technologies",
    vendor_name: row?.vendor?.company_name ? String(row.vendor.company_name) : "Unknown Vendor",
    estimate_number: row?.estimate?.estimate_number
      ? String(row.estimate.estimate_number)
      : null,
    estimate_status: row?.estimate?.status ? String(row.estimate.status) : null,
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

export default function VendorInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = String(params?.id || "").trim();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [form, setForm] = useState<InvoiceEditForm | null>(null);

  const [viewerVendorId, setViewerVendorId] = useState<string | null>(null);
  const [viewerVendorName, setViewerVendorName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAdmin = isAdminRole(profile?.role);
  const isVendor = isVendorUser(profile);
  const isBusy = saving || statusLoading;

  async function resolveProfile() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unable to load the signed-in user.");
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, account_type, org_id, email")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData) {
      throw new Error("Unable to load the user profile.");
    }

    const typedProfile = profileData as ProfileRow;
    setProfile(typedProfile);

    if (!typedProfile.org_id && !isAdminRole(typedProfile.role)) {
      throw new Error("Your account is missing org context.");
    }

    return typedProfile;
  }

  async function loadInvoice(profileOverride?: ProfileRow | null) {
    const activeProfile = profileOverride ?? profile;

    if (!activeProfile) {
      throw new Error("Missing user profile.");
    }

    const adminView = isAdminRole(activeProfile.role);
    const vendorView = isVendorUser(activeProfile);

    if (!adminView && !vendorView) {
      throw new Error("You do not have access to vendor invoice details.");
    }

    const response = await authFetch(`/api/vendor/invoices/${invoiceId}`, {
      method: "GET",
    });

    const result: VendorInvoiceDetailApiResponse | null = await response
      .json()
      .catch(() => null);

    if (!response.ok || !result?.invoice) {
      throw new Error(result?.error || "Failed to load invoice details.");
    }

    const mapped = normalizeInvoiceFromDetailApi(result.invoice);

    setViewerVendorId(result.invoice.vendor?.id || null);
    setViewerVendorName(result.invoice.vendor?.company_name || "your company");

    setInvoice(mapped);
    setForm(buildInitialForm(mapped));
  }

  async function loadAll() {
    if (!invoiceId) {
      setError("Missing invoice id.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const loadedProfile = await resolveProfile();
      await loadInvoice(loadedProfile);
    } catch (err: any) {
      setError(err?.message || "Failed to load invoice details.");
      setInvoice(null);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [invoiceId]);

  function updateFormField<K extends keyof InvoiceEditForm>(field: K, value: InvoiceEditForm[K]) {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
  }

  function updateItemField(
    index: number,
    field: "description" | "quantity" | "unit_price" | "total",
    value: string
  ) {
    setForm((prev) => {
      if (!prev) return prev;

      const items = [...prev.items];
      const existing = items[index];

      if (!existing) return prev;

      const nextValue =
        field === "quantity" || field === "unit_price" || field === "total"
          ? normalizeMoneyInput(value)
          : value;

      items[index] = {
        ...existing,
        [field]: nextValue,
      };

      const quantity = Number(items[index].quantity || 0);
      const unitPrice = Number(items[index].unit_price || 0);

      if (
        (field === "quantity" || field === "unit_price") &&
        Number.isFinite(quantity) &&
        Number.isFinite(unitPrice)
      ) {
        items[index].total = String(Number((quantity * unitPrice).toFixed(2)));
      }

      return {
        ...prev,
        items,
      };
    });
  }

  function addItem() {
    setForm((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            description: "",
            quantity: "1",
            unit_price: "",
            total: "",
          },
        ],
      };
    });
  }

  function removeItem(index: number) {
    setForm((prev) => {
      if (!prev) return prev;

      const items = prev.items.filter((_, i) => i !== index);

      return {
        ...prev,
        items: items.length
          ? items
          : [
              {
                description: "",
                quantity: "1",
                unit_price: "",
                total: "",
              },
            ],
      };
    });
  }

  const itemSubtotalPreview = useMemo(() => {
    if (!form) return 0;

    return Number(
      form.items.reduce((sum, item) => sum + Number(item.total || 0), 0).toFixed(2)
    );
  }, [form]);

  const effectiveSubtotalPreview = useMemo(() => {
    if (!form) return 0;

    const explicit = Number(form.subtotal || 0);
    if (explicit > 0) return explicit;
    return itemSubtotalPreview;
  }, [form, itemSubtotalPreview]);

  const effectiveTaxPreview = useMemo(() => {
    if (!form) return 0;
    return Number(form.tax || 0);
  }, [form]);

  const effectiveTotalPreview = useMemo(() => {
    if (!form) return 0;

    const explicit = Number(form.total || 0);
    if (explicit > 0) return explicit;

    return Number((effectiveSubtotalPreview + effectiveTaxPreview).toFixed(2));
  }, [form, effectiveSubtotalPreview, effectiveTaxPreview]);

  const canEditInvoice = useMemo(() => {
    if (!invoice) return false;
    if (isAdmin) return true;
    if (isVendor && !isAdmin) return canVendorEdit(invoice.status);
    return false;
  }, [invoice, isAdmin, isVendor]);

  async function handleSaveInvoice() {
    if (!form || !invoice) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const normalizedItems = form.items
        .map((item) => {
          const description = toOptionalText(item.description);
          const quantity = toOptionalNumber(item.quantity);
          const unitPrice = toOptionalNumber(item.unit_price);
          const total = toOptionalNumber(item.total);

          if (!description && quantity == null && unitPrice == null && total == null) {
            return null;
          }

          return {
            id: item.id || null,
            description: description || "Invoice item",
            quantity: quantity ?? 1,
            unit_price: unitPrice ?? 0,
            total:
              total ?? Number(((quantity ?? 1) * (unitPrice ?? 0)).toFixed(2)),
          };
        })
        .filter(Boolean);

      const requestedStatus = form.status;

      if (!isAdmin && !canVendorSetStatus(requestedStatus)) {
        throw new Error("Vendor users may only set invoice status to draft or submitted.");
      }

      if (isAdmin && !canAdminSetStatus(requestedStatus)) {
        throw new Error("Invalid invoice status.");
      }

      const response = await authFetch("/api/vendor/invoices/update", {
        method: "POST",
        body: JSON.stringify({
          id: invoice.id,
          invoice_number: toOptionalText(form.invoice_number),
          status: requestedStatus,
          subtotal: toOptionalNumber(form.subtotal) ?? effectiveSubtotalPreview,
          tax: toOptionalNumber(form.tax) ?? 0,
          total: toOptionalNumber(form.total) ?? effectiveTotalPreview,
          issued_at: toOptionalDate(form.issued_at),
          due_at: toOptionalDate(form.due_at),
          paid_at: isAdmin ? toOptionalDate(form.paid_at) : undefined,
          notes: toOptionalText(form.notes),
          items: normalizedItems,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update invoice.");
      }

      setSuccessMessage("Invoice updated successfully.");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "Failed to update invoice.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusAction(nextStatus: string) {
    if (!invoice) return;

    try {
      setStatusLoading(true);
      setError(null);
      setSuccessMessage(null);

      if (!isAdmin && !canVendorSetStatus(nextStatus)) {
        throw new Error("Vendor users may only set invoice status to draft or submitted.");
      }

      if (isAdmin && !canAdminSetStatus(nextStatus)) {
        throw new Error("Invalid invoice status.");
      }

      const response = await authFetch("/api/vendor/invoices/status", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: invoice.id,
          status: nextStatus,
          ...(isAdmin && nextStatus === "paid" && form?.paid_at
            ? { paid_at: toOptionalDate(form.paid_at) }
            : {}),
          notes: form?.notes ? toOptionalText(form.notes) : undefined,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update invoice status.");
      }

      setSuccessMessage(`Invoice marked as ${formatStatus(nextStatus)}.`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "Failed to update invoice status.");
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading invoice details...
        </div>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="p-6 space-y-4">
        <Link
          href="/vendor/invoices"
          className="inline-flex text-sm text-sky-400 transition hover:text-sky-300"
        >
          ← Back to Invoices
        </Link>

        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6 text-rose-300">
          {error}
        </div>
      </div>
    );
  }

  if (!invoice || !form) {
    return (
      <div className="p-6 space-y-4">
        <Link
          href="/vendor/invoices"
          className="inline-flex text-sm text-sky-400 transition hover:text-sky-300"
        >
          ← Back to Invoices
        </Link>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
          Invoice not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Link
            href="/vendor/invoices"
            className="inline-flex text-sm text-sky-400 transition hover:text-sky-300"
          >
            ← Back to Invoices
          </Link>

          <h1 className="text-2xl font-semibold text-slate-200">
            Invoice Details
          </h1>

          <p className="text-sm text-slate-400">
            Invoice ID: {invoice.id}
          </p>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {isAdmin ? (
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                Admin org-wide view
              </span>
            ) : null}

            {!isAdmin && isVendor && viewerVendorName ? (
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                Vendor scope: {viewerVendorName}
              </span>
            ) : null}

            <span className={`rounded-full border px-3 py-1 ${statusBadgeClasses(invoice.status)}`}>
              {formatStatus(invoice.status)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/vendor/projects/${invoice.project_id}`}
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
          >
            Open Project
          </Link>

          {invoice.estimate_id ? (
            <Link
              href={`/vendor/estimates/${invoice.estimate_id}`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
            >
              Open Estimate
            </Link>
          ) : null}
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4 text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-4 text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Project" value={invoice.project_name} />
        <MetricCard label="Client" value={invoice.client_name} />
        <MetricCard label="Vendor" value={invoice.vendor_name} />
        <MetricCard label="Estimate" value={invoice.estimate_number || "Not linked"} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MoneyCard label="Subtotal Preview" value={effectiveSubtotalPreview} />
        <MoneyCard label="Tax Preview" value={effectiveTaxPreview} />
        <MoneyCard label="Total Preview" value={effectiveTotalPreview} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-100">
            Invoice Details
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Review and update invoice information below.
          </p>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Field>
              <Label>Invoice Number</Label>
              <input
                type="text"
                value={form.invoice_number}
                onChange={(e) => updateFormField("invoice_number", e.target.value)}
                disabled={!canEditInvoice || isBusy}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Field>

            <Field>
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => updateFormField("status", e.target.value)}
                disabled={!canEditInvoice || isBusy}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                {isAdmin ? <option value="approved">Approved</option> : null}
                {isAdmin ? <option value="paid">Paid</option> : null}
                {isAdmin ? <option value="cancelled">Cancelled</option> : null}
              </select>
            </Field>

            <Field>
              <Label>Issued Date</Label>
              <input
                type="date"
                value={form.issued_at}
                onChange={(e) => updateFormField("issued_at", e.target.value)}
                disabled={!canEditInvoice || isBusy}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Field>
              <Label>Due Date</Label>
              <input
                type="date"
                value={form.due_at}
                onChange={(e) => updateFormField("due_at", e.target.value)}
                disabled={!canEditInvoice || isBusy}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Field>

            <Field>
              <Label>Paid Date</Label>
              <input
                type="date"
                value={form.paid_at}
                onChange={(e) => updateFormField("paid_at", e.target.value)}
                disabled={!isAdmin || isBusy}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Field>

            <Field>
              <Label>Estimate Status</Label>
              <div className="flex h-11 items-center rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-300">
                {formatStatus(invoice.estimate_status)}
              </div>
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Field>
              <Label>Subtotal</Label>
              <input
                type="text"
                inputMode="decimal"
                value={form.subtotal}
                onChange={(e) => updateFormField("subtotal", normalizeMoneyInput(e.target.value))}
                disabled={!canEditInvoice || isBusy}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Field>

            <Field>
              <Label>Tax</Label>
              <input
                type="text"
                inputMode="decimal"
                value={form.tax}
                onChange={(e) => updateFormField("tax", normalizeMoneyInput(e.target.value))}
                disabled={!canEditInvoice || isBusy}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Field>

            <Field>
              <Label>Total</Label>
              <input
                type="text"
                inputMode="decimal"
                value={form.total}
                onChange={(e) => updateFormField("total", normalizeMoneyInput(e.target.value))}
                disabled={!canEditInvoice || isBusy}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Field>
          </div>

          <Field>
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => updateFormField("notes", e.target.value)}
              rows={5}
              disabled={!canEditInvoice || isBusy}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Invoice Items
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Manage the invoice item breakdown and totals.
            </p>
          </div>

          {canEditInvoice ? (
            <button
              type="button"
              onClick={addItem}
              disabled={isBusy}
              className="inline-flex items-center justify-center rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add Item
            </button>
          ) : null}
        </div>

        <div className="space-y-4 px-6 py-6">
          {form.items.map((item, index) => (
            <div
              key={item.id || `new-${index}`}
              className="rounded-xl border border-slate-800 bg-slate-950 p-4"
            >
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-5">
                  <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-500">
                    Description
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItemField(index, "description", e.target.value)}
                    disabled={!canEditInvoice || isBusy}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-500">
                    Qty
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) => updateItemField(index, "quantity", e.target.value)}
                    disabled={!canEditInvoice || isBusy}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-500">
                    Unit Price
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.unit_price}
                    onChange={(e) => updateItemField(index, "unit_price", e.target.value)}
                    disabled={!canEditInvoice || isBusy}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-500">
                    Total
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.total}
                    onChange={(e) => updateItemField(index, "total", e.target.value)}
                    disabled={!canEditInvoice || isBusy}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div className="flex items-end md:col-span-1">
                  {canEditInvoice ? (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={isBusy}
                      className="h-11 w-full rounded-xl border border-rose-700 bg-rose-950 px-3 text-sm text-rose-200 transition hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MoneyCard label="Items Subtotal" value={itemSubtotalPreview} />
        <MoneyCard label="Effective Subtotal" value={effectiveSubtotalPreview} />
        <MoneyCard label="Effective Total" value={effectiveTotalPreview} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Created" value={formatDateTime(invoice.created_at)} />
        <MetricCard label="Updated" value={formatDateTime(invoice.updated_at)} />
        <MetricCard label="Issued" value={formatDate(invoice.issued_at)} />
        <MetricCard label="Paid" value={formatDate(invoice.paid_at)} />
      </div>

      <div className="flex flex-wrap gap-3">
        {canEditInvoice ? (
          <button
            type="button"
            onClick={handleSaveInvoice}
            disabled={isBusy}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-cyan-700 bg-cyan-950 px-5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Invoice"}
          </button>
        ) : null}

        {!isAdmin && canVendorSetStatus("submitted") && canVendorEdit(invoice.status) ? (
          <button
            type="button"
            onClick={() => handleStatusAction("submitted")}
            disabled={isBusy}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-700 bg-sky-950 px-5 text-sm font-medium text-sky-200 transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {statusLoading ? "Updating..." : "Submit Invoice"}
          </button>
        ) : null}

        {!isAdmin && normalizeText(invoice.status) === "submitted" ? (
          <button
            type="button"
            onClick={() => handleStatusAction("draft")}
            disabled={isBusy}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-700 bg-amber-950 px-5 text-sm font-medium text-amber-200 transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {statusLoading ? "Updating..." : "Return to Draft"}
          </button>
        ) : null}

        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => handleStatusAction("approved")}
              disabled={isBusy}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-700 bg-emerald-950 px-5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statusLoading ? "Updating..." : "Approve"}
            </button>

            <button
              type="button"
              onClick={() => handleStatusAction("paid")}
              disabled={isBusy}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-violet-700 bg-violet-950 px-5 text-sm font-medium text-violet-200 transition hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statusLoading ? "Updating..." : "Mark Paid"}
            </button>

            <button
              type="button"
              onClick={() => handleStatusAction("cancelled")}
              disabled={isBusy}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-700 bg-rose-950 px-5 text-sm font-medium text-rose-200 transition hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statusLoading ? "Updating..." : "Cancel"}
            </button>

            <button
              type="button"
              onClick={() => handleStatusAction("draft")}
              disabled={isBusy}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statusLoading ? "Updating..." : "Return to Draft"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs uppercase tracking-[0.16em] text-slate-500">
      {children}
    </label>
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm text-slate-100">{value}</p>
    </div>
  );
}

function MoneyCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-slate-100">
        {formatCurrency(value)}
      </p>
    </div>
  );
}