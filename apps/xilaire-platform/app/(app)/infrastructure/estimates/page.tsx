"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

type ProfileRow = {
  id: string;
  role: string | null;
  account_type: string | null;
  org_id: string | null;
};

type EstimateStatus = "draft" | "submitted" | "approved" | "rejected";

type EstimateRow = {
  id: string;
  org_id: string;
  project_id: string;
  vendor_id: string | null;
  site_visit_id: string | null;
  status: EstimateStatus;
  notes: string;
  review_notes: string;
  labor_cost: number;
  material_cost: number;
  total_cost: number;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  project_name: string;
  client_name: string;
  vendor_name: string;
  attachment_count: number;
};

type StatusFilter = "all" | EstimateStatus;

type ConvertEstimateResponse = {
  ok?: boolean;
  already_exists?: boolean;
  message?: string;
  invoice?: {
    id?: string;
    invoice_number?: string | null;
  } | null;
  invoice_id?: string | null;
  details?: {
    existing_invoice_id?: string | null;
  } | null;
  error?: string;
};

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEstimateStatus(value: unknown): EstimateStatus {
  const normalized = normalizeText(String(value || "draft"));

  if (normalized === "submitted") return "submitted";
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  return "draft";
}

function isAdminRole(role: string | null | undefined) {
  return ["master_admin", "admin", "super_admin", "project_manager"].includes(
    normalizeText(role)
  );
}

function formatCurrency(value: number | null | undefined) {
  const safe = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(safe) ? safe : 0);
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

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusBadgeClass(status: EstimateStatus) {
  switch (status) {
    case "approved":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "submitted":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "rejected":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    case "draft":
    default:
      return "border-slate-700 bg-slate-800 text-slate-300";
  }
}

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

function normalizeEstimateRow(row: any): EstimateRow {
  const project = Array.isArray(row?.project) ? row.project[0] : row?.project;
  const vendor = Array.isArray(row?.vendor) ? row.vendor[0] : row?.vendor;
  const attachments = Array.isArray(row?.attachments) ? row.attachments : [];

  return {
    id: String(row?.id || "").trim(),
    org_id: String(row?.org_id || "").trim(),
    project_id: String(row?.project_id || "").trim(),
    vendor_id: row?.vendor_id ? String(row.vendor_id).trim() : null,
    site_visit_id: row?.site_visit_id ? String(row.site_visit_id).trim() : null,
    status: normalizeEstimateStatus(row?.status),
    notes: String(row?.notes || "").trim(),
    review_notes: String(row?.review_notes || "").trim(),
    labor_cost: Number(row?.labor_cost || 0),
    material_cost: Number(row?.material_cost || 0),
    total_cost: Number(row?.total_cost || 0),
    approved_at: row?.approved_at ? String(row.approved_at) : null,
    rejected_at: row?.rejected_at ? String(row.rejected_at) : null,
    created_at: row?.created_at ? String(row.created_at) : null,
    updated_at: row?.updated_at ? String(row.updated_at) : null,
    project_name: String(project?.project_name || "Untitled Project").trim(),
    client_name: String(project?.client_name || "Unknown Client").trim(),
    vendor_name: String(vendor?.company_name || "Unknown Vendor").trim(),
    attachment_count: attachments.length,
  };
}

export default function InfrastructureEstimatesPage() {
  const [loading, setLoading] = useState(true);
  const [actionEstimateId, setActionEstimateId] = useState<string | null>(null);
  const [convertEstimateId, setConvertEstimateId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [estimates, setEstimates] = useState<EstimateRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [reviewNotesByEstimate, setReviewNotesByEstimate] = useState<Record<string, string>>(
    {}
  );
  const [createdInvoiceIdsByEstimate, setCreatedInvoiceIdsByEstimate] = useState<
    Record<string, string>
  >({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = isAdminRole(profile?.role);

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
      throw new Error("You do not have access to infrastructure estimate approvals.");
    }

    setProfile(normalizedProfile);
    return normalizedProfile;
  }

  async function loadEstimates(profileOverride?: ProfileRow | null) {
    const effectiveProfile = profileOverride ?? profile;
    const effectiveOrgId = effectiveProfile?.org_id || null;

    if (!effectiveOrgId) {
      throw new Error("Missing org context for estimate load.");
    }

    const { data, error } = await supabase
      .from("infrastructure_estimates")
      .select(`
        id,
        org_id,
        project_id,
        vendor_id,
        site_visit_id,
        status,
        notes,
        review_notes,
        labor_cost,
        material_cost,
        total_cost,
        approved_at,
        rejected_at,
        created_at,
        updated_at,
        project:infrastructure_projects (
          project_name,
          client_name
        ),
        vendor:infrastructure_vendors (
          company_name
        ),
        attachments:infrastructure_estimate_attachments (
          id
        )
      `)
      .eq("org_id", effectiveOrgId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "Failed to load infrastructure estimates.");
    }

    const rows = Array.isArray(data) ? data : [];
    const normalized = rows
      .map(normalizeEstimateRow)
      .filter((row) => Boolean(row.id) && Boolean(row.project_id));

    setEstimates(normalized);

    setReviewNotesByEstimate((prev) => {
      const nextReviewNotes: Record<string, string> = {};
      for (const estimate of normalized) {
        nextReviewNotes[estimate.id] = prev[estimate.id] ?? estimate.review_notes ?? "";
      }
      return nextReviewNotes;
    });
  }

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const loadedProfile = await loadProfile();
      await loadEstimates(loadedProfile);
    } catch (err: any) {
      console.error("INFRASTRUCTURE_ESTIMATES_LOAD_ERROR:", err);
      setError(err?.message || "Failed to load infrastructure estimates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredEstimates = useMemo(() => {
    if (statusFilter === "all") return estimates;
    return estimates.filter((estimate) => estimate.status === statusFilter);
  }, [estimates, statusFilter]);

  const counts = useMemo(() => {
    return estimates.reduce(
      (acc, estimate) => {
        acc.all += 1;
        if (estimate.status === "draft") acc.draft += 1;
        if (estimate.status === "submitted") acc.submitted += 1;
        if (estimate.status === "approved") acc.approved += 1;
        if (estimate.status === "rejected") acc.rejected += 1;
        return acc;
      },
      {
        all: 0,
        draft: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [estimates]);

  const totals = useMemo(() => {
    return estimates.reduce(
      (acc, estimate) => {
        acc.labor += Number(estimate.labor_cost || 0);
        acc.material += Number(estimate.material_cost || 0);
        acc.total += Number(estimate.total_cost || 0);
        return acc;
      },
      {
        labor: 0,
        material: 0,
        total: 0,
      }
    );
  }, [estimates]);

  async function updateEstimate(
    estimateId: string,
    updates: {
      status?: EstimateStatus;
      review_notes?: string | null;
    }
  ) {
    try {
      setActionEstimateId(estimateId);
      setError(null);
      setSuccessMessage(null);

      const res = await authFetch("/api/vendor/estimates/update", {
        method: "POST",
        body: JSON.stringify({
          id: estimateId,
          ...updates,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update estimate.");
      }

      await loadEstimates();
      setSuccessMessage("Estimate updated successfully.");
    } catch (err: any) {
      console.error("INFRASTRUCTURE_ESTIMATE_UPDATE_ERROR:", err);
      setError(err?.message || "Failed to update estimate.");
    } finally {
      setActionEstimateId(null);
    }
  }

  async function approveEstimate(estimateId: string) {
    await updateEstimate(estimateId, {
      status: "approved",
      review_notes: reviewNotesByEstimate[estimateId] || null,
    });
  }

  async function rejectEstimate(estimateId: string) {
    await updateEstimate(estimateId, {
      status: "rejected",
      review_notes: reviewNotesByEstimate[estimateId] || null,
    });
  }

  async function returnToDraft(estimateId: string) {
    await updateEstimate(estimateId, {
      status: "draft",
      review_notes: reviewNotesByEstimate[estimateId] || null,
    });
  }

  async function convertToInvoice(estimateId: string) {
    try {
      setConvertEstimateId(estimateId);
      setError(null);
      setSuccessMessage(null);

      const res = await authFetch(
        "/api/infrastructure/invoices/create-from-estimate",
        {
          method: "POST",
          body: JSON.stringify({
            estimate_id: estimateId,
          }),
        }
      );

      const data: ConvertEstimateResponse | null = await res.json().catch(() => null);

      const createdInvoiceId =
        String(
          data?.invoice?.id ||
            data?.invoice_id ||
            data?.details?.existing_invoice_id ||
            ""
        ).trim() || null;

      const alreadyExists =
        Boolean(data?.already_exists) ||
        (res.status === 409 && Boolean(data?.details?.existing_invoice_id));

      if (!res.ok && !alreadyExists) {
        throw new Error(data?.error || "Failed to convert estimate to invoice.");
      }

      if (createdInvoiceId) {
        setCreatedInvoiceIdsByEstimate((prev) => ({
          ...prev,
          [estimateId]: createdInvoiceId,
        }));
      }

      await loadEstimates();

      if (alreadyExists && createdInvoiceId) {
        setSuccessMessage("Invoice already exists for this estimate. You can open it now.");
      } else if (createdInvoiceId) {
        setSuccessMessage("Invoice created successfully from approved estimate.");
      } else {
        setSuccessMessage("Estimate converted to invoice successfully.");
      }
    } catch (err: any) {
      console.error("INFRASTRUCTURE_ESTIMATE_CONVERT_ERROR:", err);
      setError(err?.message || "Failed to convert estimate to invoice.");
    } finally {
      setConvertEstimateId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-sky-300">
              Infrastructure
            </p>
            <h1 className="text-2xl font-semibold text-slate-100">
              Infrastructure Estimates
            </h1>
            <p className="text-slate-400">
              Review all project-linked vendor estimates, manage internal approval
              state, and move estimates through the approval pipeline.
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

            <Link
              href="/infrastructure/invoices"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 text-sm text-slate-300 transition hover:border-sky-600 hover:text-white"
            >
              Open Invoices
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-500">
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
            Org-wide review
          </span>
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
            Total estimates: {counts.all}
          </span>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-300">
          {successMessage}
        </div>
      )}

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
          label="Rejected"
          value={counts.rejected}
          active={statusFilter === "rejected"}
          onClick={() => setStatusFilter("rejected")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Labor Total" value={formatCurrency(totals.labor)} />
        <MetricCard label="Material Total" value={formatCurrency(totals.material)} />
        <MetricCard label="Estimate Total" value={formatCurrency(totals.total)} />
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading infrastructure estimates...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6 text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && filteredEstimates.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          No estimates found for the selected filter.
        </div>
      )}

      {!loading && !error && filteredEstimates.length > 0 && (
        <div className="space-y-4">
          {filteredEstimates.map((estimate) => {
            const isBusy = actionEstimateId === estimate.id;
            const isConverting = convertEstimateId === estimate.id;
            const canApprove = isAdmin && estimate.status !== "approved";
            const canReject = isAdmin && estimate.status !== "rejected";
            const canReturnToDraft =
              isAdmin &&
              (estimate.status === "submitted" || estimate.status === "rejected");
            const canConvert = isAdmin && estimate.status === "approved";
            const createdInvoiceId = createdInvoiceIdsByEstimate[estimate.id] || null;

            return (
              <div
                key={estimate.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${getStatusBadgeClass(
                          estimate.status
                        )}`}
                      >
                        {formatStatusLabel(estimate.status)}
                      </span>

                      <span className="text-xs text-slate-500">
                        Estimate ID: {estimate.id}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">
                        {estimate.project_name}
                      </h2>
                      <p className="text-sm text-slate-400">
                        Client: {estimate.client_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Vendor: {estimate.vendor_name}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
                      <p>Created: {formatDateTime(estimate.created_at)}</p>
                      <p>Updated: {formatDateTime(estimate.updated_at)}</p>
                      <p>Approved: {formatDateTime(estimate.approved_at)}</p>
                      <p>Rejected: {formatDateTime(estimate.rejected_at)}</p>
                      <p>Attachments: {estimate.attachment_count}</p>
                      <p>Site Visit ID: {estimate.site_visit_id || "-"}</p>
                    </div>
                  </div>

                  <div className="grid min-w-[280px] gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                    <MetricCard
                      label="Labor"
                      value={formatCurrency(estimate.labor_cost)}
                    />
                    <MetricCard
                      label="Material"
                      value={formatCurrency(estimate.material_cost)}
                    />
                    <MetricCard
                      label="Total"
                      value={formatCurrency(estimate.total_cost)}
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Vendor Notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                      {estimate.notes || "No notes provided."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Internal Review Notes
                    </p>

                    <textarea
                      value={reviewNotesByEstimate[estimate.id] ?? ""}
                      onChange={(e) =>
                        setReviewNotesByEstimate((prev) => ({
                          ...prev,
                          [estimate.id]: e.target.value,
                        }))
                      }
                      rows={5}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-600"
                      placeholder="Internal approval notes, revision comments, rejection reason..."
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/infrastructure/projects/${estimate.project_id}`}
                    className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                  >
                    Open Project
                  </Link>

                  <Link
                    href="/vendor/estimates"
                    className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                  >
                    Open Vendor Estimates
                  </Link>

                  {createdInvoiceId ? (
                    <Link
                      href={`/infrastructure/invoices/${createdInvoiceId}`}
                      className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm text-white transition hover:bg-sky-500"
                    >
                      Open Created Invoice
                    </Link>
                  ) : null}

                  {canApprove && (
                    <button
                      type="button"
                      onClick={() => approveEstimate(estimate.id)}
                      disabled={isBusy || isConverting}
                      className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {isBusy ? "Saving..." : "Approve"}
                    </button>
                  )}

                  {canReject && (
                    <button
                      type="button"
                      onClick={() => rejectEstimate(estimate.id)}
                      disabled={isBusy || isConverting}
                      className="inline-flex rounded-xl bg-rose-600 px-4 py-2 text-sm text-white transition hover:bg-rose-500 disabled:opacity-50"
                    >
                      {isBusy ? "Saving..." : "Reject"}
                    </button>
                  )}

                  {canReturnToDraft && (
                    <button
                      type="button"
                      onClick={() => returnToDraft(estimate.id)}
                      disabled={isBusy || isConverting}
                      className="inline-flex rounded-xl bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-600 disabled:opacity-50"
                    >
                      {isBusy ? "Saving..." : "Return to Draft"}
                    </button>
                  )}

                  {canConvert && (
                    <button
                      type="button"
                      onClick={() => convertToInvoice(estimate.id)}
                      disabled={isConverting || isBusy}
                      className="inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm text-white transition hover:bg-violet-500 disabled:opacity-50"
                    >
                      {isConverting ? "Converting..." : "Convert to Invoice"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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