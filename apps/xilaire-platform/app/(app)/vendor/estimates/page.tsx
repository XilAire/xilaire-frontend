"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

type EstimateAttachmentRow = {
  id: string;
  estimate_id: string;
  vendor_id: string | null;
  file_name: string | null;
  file_url: string | null;
  storage_path: string | null;
  content_type: string | null;
  file_size_bytes: number | null;
  created_at: string | null;
};

type EstimateRow = {
  id: string;
  org_id: string | null;
  vendor_id: string;
  project_id: string;
  site_visit_id: string | null;
  status: string | null;
  estimate_number: string | null;
  amount: number | null;
  labor_cost: number | null;
  material_cost: number | null;
  total_cost: number | null;
  notes: string | null;
  review_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  project_name: string;
  client_name: string;
  vendor_name: string;
  site_visit_date: string | null;
  site_visit_status: string | null;
  attachments: EstimateAttachmentRow[];
};

type UploadFileMap = Record<string, File | null>;

type EditFormRow = {
  notes: string;
  review_notes: string;
  labor_cost: string;
  material_cost: string;
  total_cost: string;
};

type EditFormMap = Record<string, EditFormRow>;

type ActionStateMap = Record<string, boolean>;

type ProfileAccessRow = {
  account_type: string | null;
  role: string | null;
  org_id: string | null;
  email: string | null;
};

type VendorAccessRow = {
  id: string;
  company_name: string | null;
  email: string | null;
};

type CountsShape = {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  attachments: number;
};

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEmail(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
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

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString();
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

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

function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null || Number.isNaN(bytes)) return "Unknown size";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function asSingleObject<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
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

function isVendorUser(profile: ProfileAccessRow | null | undefined) {
  if (!profile) return false;
  return isVendorAccount(profile.account_type) || isVendorRole(profile.role);
}

function toInputNumber(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function toOptionalTrimmedString(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(/,/g, ""));

  if (!Number.isFinite(parsed)) {
    throw new Error("Please enter valid numeric cost values.");
  }

  return Number(parsed.toFixed(2));
}

function getDisplayAmount(estimate: EstimateRow) {
  if (estimate.amount != null) return estimate.amount;
  if (estimate.total_cost != null) return estimate.total_cost;
  return null;
}

function canVendorEdit(status: string | null | undefined) {
  const normalized = normalizeText(status);
  return normalized === "draft" || normalized === "submitted" || normalized === "rejected";
}

function canVendorSubmit(status: string | null | undefined) {
  const normalized = normalizeText(status);
  return normalized === "draft" || normalized === "rejected";
}

function canVendorReturnToDraft(status: string | null | undefined) {
  return normalizeText(status) === "submitted";
}

function canAdminApprove(status: string | null | undefined) {
  return normalizeText(status) === "submitted";
}

function canAdminReject(status: string | null | undefined) {
  return normalizeText(status) === "submitted";
}

function canAdminReturnToDraft(status: string | null | undefined) {
  const normalized = normalizeText(status);
  return (
    normalized === "submitted" ||
    normalized === "rejected" ||
    normalized === "approved"
  );
}

function statusBadgeClasses(status: string | null | undefined) {
  const normalized = normalizeText(status);

  if (normalized === "approved") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "submitted") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (normalized === "draft") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (normalized === "rejected") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }

  return "border-slate-700 bg-slate-800 text-slate-300";
}

function getAttachmentHref(attachment: EstimateAttachmentRow) {
  return attachment.file_url || attachment.storage_path || null;
}

function computeCounts(items: EstimateRow[]): CountsShape {
  return items.reduce(
    (acc, estimate) => {
      const status = normalizeText(estimate.status) || "draft";

      acc.total += 1;
      if (status === "draft") acc.draft += 1;
      if (status === "submitted") acc.submitted += 1;
      if (status === "approved") acc.approved += 1;
      if (status === "rejected") acc.rejected += 1;
      acc.attachments += estimate.attachments.length;

      return acc;
    },
    {
      total: 0,
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      attachments: 0,
    }
  );
}

async function resolveVendorForUser(params: {
  orgId: string;
  authEmail: string | null;
  profileEmail: string | null;
}) {
  const authEmail = normalizeEmail(params.authEmail);
  const profileEmail = normalizeEmail(params.profileEmail);
  const lookupEmail = authEmail || profileEmail;

  if (!lookupEmail) {
    throw new Error("Your vendor account is missing an email address.");
  }

  const { data: vendorRows, error: vendorError } = await supabase
    .from("infrastructure_vendors")
    .select("id, company_name, email")
    .eq("org_id", params.orgId)
    .ilike("email", lookupEmail)
    .limit(2);

  if (vendorError) {
    console.error("VENDOR_ESTIMATES_VENDOR_LOOKUP_ERROR:", vendorError);
    throw new Error("Unable to load the vendor company for this account.");
  }

  const vendor = (vendorRows?.[0] || null) as VendorAccessRow | null;

  if (!vendor) {
    throw new Error(
      "No vendor record is linked to this login. Current schema requires infrastructure_vendors.email to match your profile email."
    );
  }

  return vendor;
}

export default function VendorEstimatesPage() {
  const [loading, setLoading] = useState(true);
  const [estimates, setEstimates] = useState<EstimateRow[]>([]);
  const [vendorName, setVendorName] = useState("");
  const [isAdminView, setIsAdminView] = useState(false);
  const [isVendorView, setIsVendorView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [uploadFiles, setUploadFiles] = useState<UploadFileMap>({});
  const [uploadingEstimateId, setUploadingEstimateId] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const [editForms, setEditForms] = useState<EditFormMap>({});
  const [savingMap, setSavingMap] = useState<ActionStateMap>({});
  const [statusMap, setStatusMap] = useState<ActionStateMap>({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function loadEstimates() {
      try {
        setLoading(true);
        setError(null);
        setUploadMessage(null);
        setEstimates([]);
        setVendorName("");
        setIsAdminView(false);
        setIsVendorView(false);
        setResolvedVendorId(null);
        setEditForms({});
        setSavingMap({});
        setStatusMap({});
        setUploadFiles({});

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
        const vendorView = isVendorUser(typedProfile);
        const adminView = isAdminRole(typedProfile.role);

        if (!vendorView && !adminView) {
          throw new Error("You do not have access to vendor estimates.");
        }

        if (!typedProfile.org_id) {
          throw new Error("Your account is missing org context.");
        }

        setIsAdminView(adminView);
        setIsVendorView(vendorView);

        let vendorId: string | null = null;

        if (vendorView && !adminView) {
          const vendor = await resolveVendorForUser({
            orgId: typedProfile.org_id,
            authEmail: user.email || null,
            profileEmail: typedProfile.email,
          });

          vendorId = vendor.id;
          setResolvedVendorId(vendor.id);
          setVendorName(vendor.company_name || "your company");
        }

        let query = supabase
          .from("infrastructure_estimates")
          .select(`
            id,
            org_id,
            vendor_id,
            project_id,
            site_visit_id,
            status,
            estimate_number,
            amount,
            labor_cost,
            material_cost,
            total_cost,
            notes,
            review_notes,
            submitted_at,
            approved_at,
            rejected_at,
            created_at,
            updated_at,
            project:infrastructure_projects (
              id,
              org_id,
              project_name,
              client_name
            ),
            vendor:infrastructure_vendors (
              id,
              org_id,
              company_name
            ),
            site_visit:infrastructure_site_visits (
              id,
              visit_date,
              status
            )
          `)
          .order("created_at", { ascending: false });

        if (vendorId) {
          query = query.eq("vendor_id", vendorId);
        } else {
          query = query.eq("org_id", typedProfile.org_id);
        }

        const { data, error: estimateError } = await query;

        if (estimateError) {
          console.error("VENDOR_ESTIMATES_QUERY_ERROR:", estimateError);
          throw new Error("Failed to load estimates.");
        }

        const safeEstimateRows = (data || []).filter((row: any) => {
          const project = asSingleObject<any>(row.project);
          const vendor = asSingleObject<any>(row.vendor);

          const sameEstimateOrg =
            !typedProfile.org_id ||
            !row.org_id ||
            String(row.org_id) === String(typedProfile.org_id);

          const sameProjectOrg =
            !typedProfile.org_id ||
            !project?.org_id ||
            String(project.org_id) === String(typedProfile.org_id);

          const sameVendorOrg =
            !typedProfile.org_id ||
            !vendor?.org_id ||
            String(vendor.org_id) === String(typedProfile.org_id);

          return sameEstimateOrg && sameProjectOrg && sameVendorOrg;
        });

        const estimateIds =
          safeEstimateRows.map((row: any) => row?.id).filter(Boolean) || [];

        let attachmentsByEstimateId = new Map<string, EstimateAttachmentRow[]>();

        if (estimateIds.length > 0) {
          let attachmentsQuery = supabase
            .from("infrastructure_estimate_attachments")
            .select(`
              id,
              estimate_id,
              vendor_id,
              file_name,
              file_url,
              storage_path,
              content_type,
              file_size_bytes,
              created_at
            `)
            .in("estimate_id", estimateIds)
            .order("created_at", { ascending: false });

          if (vendorId) {
            attachmentsQuery = attachmentsQuery.eq("vendor_id", vendorId);
          }

          const { data: attachmentData, error: attachmentError } =
            await attachmentsQuery;

          if (attachmentError) {
            console.error(
              "VENDOR_ESTIMATES_ATTACHMENTS_QUERY_ERROR:",
              attachmentError
            );
            throw new Error("Failed to load estimate attachments.");
          }

          attachmentsByEstimateId = (attachmentData || []).reduce(
            (map, attachment: any) => {
              const current = map.get(attachment.estimate_id) || [];

              current.push({
                id: attachment.id,
                estimate_id: attachment.estimate_id,
                vendor_id: attachment.vendor_id || null,
                file_name: attachment.file_name || null,
                file_url: attachment.file_url || null,
                storage_path: attachment.storage_path || null,
                content_type: attachment.content_type || null,
                file_size_bytes: attachment.file_size_bytes ?? null,
                created_at: attachment.created_at || null,
              });

              map.set(attachment.estimate_id, current);
              return map;
            },
            new Map<string, EstimateAttachmentRow[]>()
          );
        }

        const mapped: EstimateRow[] =
          safeEstimateRows.flatMap((row: any) => {
            if (!row?.id) return [];

            const project = asSingleObject<any>(row.project);
            const vendor = asSingleObject<any>(row.vendor);
            const siteVisit = asSingleObject<any>(row.site_visit);

            return [
              {
                id: row.id,
                org_id: row.org_id || null,
                vendor_id: row.vendor_id || "",
                project_id: row.project_id || "",
                site_visit_id: row.site_visit_id || null,
                status: row.status || "draft",
                estimate_number: row.estimate_number || null,
                amount: row.amount ?? null,
                labor_cost: row.labor_cost ?? null,
                material_cost: row.material_cost ?? null,
                total_cost: row.total_cost ?? null,
                notes: row.notes || null,
                review_notes: row.review_notes || null,
                submitted_at: row.submitted_at || null,
                approved_at: row.approved_at || null,
                rejected_at: row.rejected_at || null,
                created_at: row.created_at || null,
                updated_at: row.updated_at || null,
                project_name:
                  project?.project_name ||
                  row.project_name ||
                  `Project ${row.project_id || ""}`.trim() ||
                  "Untitled Project",
                client_name:
                  project?.client_name || row.client_name || "Unknown Client",
                vendor_name:
                  vendor?.company_name || row.vendor_name || "Unknown Vendor",
                site_visit_date: siteVisit?.visit_date || null,
                site_visit_status: siteVisit?.status || null,
                attachments: attachmentsByEstimateId.get(row.id) || [],
              },
            ];
          }) || [];

        const nextForms: EditFormMap = {};

        for (const estimate of mapped) {
          nextForms[estimate.id] = {
            notes: estimate.notes || "",
            review_notes: estimate.review_notes || "",
            labor_cost: toInputNumber(estimate.labor_cost),
            material_cost: toInputNumber(estimate.material_cost),
            total_cost: toInputNumber(estimate.total_cost),
          };
        }

        if (!cancelled) {
          setEstimates(mapped);
          setEditForms(nextForms);
        }
      } catch (err: any) {
        console.error("VENDOR_ESTIMATES_ERROR:", err);

        if (!cancelled) {
          setError(err?.message || "Failed to load estimates.");
          setEstimates([]);
          setEditForms({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEstimates();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filteredEstimates = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return estimates.filter((estimate) => {
      const matchesStatus =
        statusFilter === "all" ||
        normalizeText(estimate.status) === normalizeText(statusFilter);

      const haystack = [
        estimate.project_name,
        estimate.client_name,
        estimate.vendor_name,
        estimate.estimate_number,
        estimate.notes,
        estimate.review_notes,
        estimate.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || haystack.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [estimates, search, statusFilter]);

  const counts = useMemo(() => computeCounts(estimates), [estimates]);
  const filteredCounts = useMemo(
    () => computeCounts(filteredEstimates),
    [filteredEstimates]
  );

  const projectCountLabel = useMemo(() => {
    if (loading) return "Loading estimates...";
    if (filteredEstimates.length === 1) return "1 estimate";
    return `${filteredEstimates.length} estimates`;
  }, [loading, filteredEstimates.length]);

  async function getAccessToken() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("Unable to resolve your session.");
    }

    return session.access_token;
  }

  function setSaving(estimateId: string, value: boolean) {
    setSavingMap((prev) => ({
      ...prev,
      [estimateId]: value,
    }));
  }

  function setStatusLoading(estimateId: string, value: boolean) {
    setStatusMap((prev) => ({
      ...prev,
      [estimateId]: value,
    }));
  }

  function handleFieldChange(
    estimateId: string,
    field: keyof EditFormRow,
    value: string
  ) {
    setEditForms((prev) => ({
      ...prev,
      [estimateId]: {
        ...(prev[estimateId] || {
          notes: "",
          review_notes: "",
          labor_cost: "",
          material_cost: "",
          total_cost: "",
        }),
        [field]: value,
      },
    }));
  }

  async function handleSaveEstimate(estimateId: string) {
    try {
      setError(null);
      setUploadMessage(null);
      setSaving(estimateId, true);

      const token = await getAccessToken();
      const form = editForms[estimateId];

      if (!form) {
        throw new Error("Missing estimate form state.");
      }

      const response = await fetch("/api/vendor/estimates/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: estimateId,
          notes: toOptionalTrimmedString(form.notes),
          labor_cost: toOptionalNumber(form.labor_cost),
          material_cost: toOptionalNumber(form.material_cost),
          total_cost: toOptionalNumber(form.total_cost),
          ...(isAdminView
            ? { review_notes: toOptionalTrimmedString(form.review_notes) }
            : {}),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to save estimate.");
      }

      setUploadMessage("Estimate updated successfully.");
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      console.error("VENDOR_ESTIMATE_SAVE_ERROR:", err);
      setError(err?.message || "Failed to save estimate.");
    } finally {
      setSaving(estimateId, false);
    }
  }

  async function handleStatusAction(
    estimateId: string,
    status: "draft" | "submitted" | "approved" | "rejected"
  ) {
    try {
      setError(null);
      setUploadMessage(null);
      setStatusLoading(estimateId, true);

      const token = await getAccessToken();
      const form = editForms[estimateId];

      const response = await fetch("/api/vendor/estimates/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          estimate_id: estimateId,
          status,
          ...(isAdminView
            ? {
                review_notes: toOptionalTrimmedString(form?.review_notes || ""),
              }
            : {}),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update estimate status.");
      }

      setUploadMessage(`Estimate marked as ${formatStatus(status)}.`);
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      console.error("VENDOR_ESTIMATE_STATUS_ERROR:", err);
      setError(err?.message || "Failed to update estimate status.");
    } finally {
      setStatusLoading(estimateId, false);
    }
  }

  async function handleAttachmentUpload(estimateId: string) {
    try {
      setError(null);
      setUploadMessage(null);

      const file = uploadFiles[estimateId];

      if (!file) {
        throw new Error("Please choose a file before uploading.");
      }

      if (!isAdminView && !resolvedVendorId) {
        throw new Error("Unable to resolve the vendor company for this account.");
      }

      setUploadingEstimateId(estimateId);

      const token = await getAccessToken();

      const formData = new FormData();
      formData.append("estimate_id", estimateId);
      formData.append("file", file);

      const response = await fetch("/api/vendor/estimates/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Attachment upload failed.");
      }

      setUploadMessage("Estimate attachment uploaded successfully.");

      setUploadFiles((prev) => ({
        ...prev,
        [estimateId]: null,
      }));

      const input = document.getElementById(
        `estimate-file-${estimateId}`
      ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      console.error("VENDOR_ESTIMATE_UPLOAD_ERROR:", err);
      setError(err?.message || "Attachment upload failed.");
    } finally {
      setUploadingEstimateId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-200">
              Vendor Estimates
            </h1>

            <p className="text-slate-400">
              {isAdminView
                ? "Admin view of all vendor estimates in your organization."
                : `Estimates assigned to ${vendorName || "your company"}.`}
            </p>

            <p className="text-sm text-slate-500">{projectCountLabel}</p>
          </div>

          <div className="flex flex-wrap gap-2">
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
              Total loaded: {counts.total}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Draft" value={filteredCounts.draft} />
        <SummaryCard label="Submitted" value={filteredCounts.submitted} />
        <SummaryCard label="Approved" value={filteredCounts.approved} />
        <SummaryCard label="Rejected" value={filteredCounts.rejected} />
        <SummaryCard label="Attachments" value={filteredCounts.attachments} />
      </div>

      {!loading && !error && (
        <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[1fr_220px]">
          <div className="space-y-1">
            <label
              htmlFor="estimate-search"
              className="text-xs uppercase tracking-[0.16em] text-slate-500"
            >
              Search
            </label>
            <input
              id="estimate-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Project, client, estimate #, notes..."
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-600"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="estimate-status-filter"
              className="text-xs uppercase tracking-[0.16em] text-slate-500"
            >
              Status
            </label>
            <select
              id="estimate-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading estimates...
        </div>
      )}

      {!loading && uploadMessage && (
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-6 text-emerald-300">
          {uploadMessage}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6 text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && filteredEstimates.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          No estimates found for the current filter. Estimate attachments will appear here once estimate
          records and uploaded files exist.
        </div>
      )}

      {!loading && !error && filteredEstimates.length > 0 && (
        <div className="grid gap-4">
          {filteredEstimates.map((estimate) => {
            const form = editForms[estimate.id] || {
              notes: "",
              review_notes: "",
              labor_cost: "",
              material_cost: "",
              total_cost: "",
            };

            const currentStatus = normalizeText(estimate.status || "draft");
            const saving = !!savingMap[estimate.id];
            const statusLoading = !!statusMap[estimate.id];
            const uploading = uploadingEstimateId === estimate.id;
            const canVendorEditThis =
              isVendorView && !isAdminView && canVendorEdit(currentStatus);
            const canAdminEditThis = isAdminView;
            const canEditThis = canVendorEditThis || canAdminEditThis;
            const attachmentUploadDisabled =
              uploading || saving || statusLoading || (!isAdminView && !resolvedVendorId);

            return (
              <div
                key={estimate.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">
                        {estimate.project_name}
                      </h2>
                      <p className="text-sm text-slate-400">
                        Client: {estimate.client_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Vendor: {estimate.vendor_name}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${statusBadgeClasses(
                          estimate.status
                        )}`}
                      >
                        {formatStatus(estimate.status)}
                      </span>

                      {estimate.estimate_number ? (
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          Estimate #{estimate.estimate_number}
                        </span>
                      ) : null}

                      {estimate.site_visit_id ? (
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          Site Visit: {formatDate(estimate.site_visit_date)}
                        </span>
                      ) : null}

                      <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        Attachments: {estimate.attachments.length}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm md:text-right">
                    <p className="text-slate-500">Total Amount</p>
                    <p className="text-lg font-semibold text-slate-100">
                      {formatCurrency(getDisplayAmount(estimate))}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Updated {formatDateTime(estimate.updated_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Labor Cost
                    </label>
                    <input
                      type="text"
                      value={form.labor_cost}
                      onChange={(e) =>
                        handleFieldChange(
                          estimate.id,
                          "labor_cost",
                          e.target.value
                        )
                      }
                      disabled={!canEditThis || saving || statusLoading}
                      className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Material Cost
                    </label>
                    <input
                      type="text"
                      value={form.material_cost}
                      onChange={(e) =>
                        handleFieldChange(
                          estimate.id,
                          "material_cost",
                          e.target.value
                        )
                      }
                      disabled={!canEditThis || saving || statusLoading}
                      className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Total Cost
                    </label>
                    <input
                      type="text"
                      value={form.total_cost}
                      onChange={(e) =>
                        handleFieldChange(
                          estimate.id,
                          "total_cost",
                          e.target.value
                        )
                      }
                      disabled={!canEditThis || saving || statusLoading}
                      className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Notes
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) =>
                        handleFieldChange(estimate.id, "notes", e.target.value)
                      }
                      disabled={!canEditThis || saving || statusLoading}
                      rows={4}
                      className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Review Notes
                    </label>
                    <textarea
                      value={form.review_notes}
                      onChange={(e) =>
                        handleFieldChange(
                          estimate.id,
                          "review_notes",
                          e.target.value
                        )
                      }
                      disabled={!isAdminView || saving || statusLoading}
                      rows={4}
                      className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {canEditThis ? (
                    <button
                      type="button"
                      onClick={() => handleSaveEstimate(estimate.id)}
                      disabled={saving || statusLoading || uploading}
                      className="inline-flex rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save Estimate"}
                    </button>
                  ) : null}

                  {isVendorView && !isAdminView && canVendorSubmit(currentStatus) ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusAction(estimate.id, "submitted")
                      }
                      disabled={saving || statusLoading || uploading}
                      className="inline-flex rounded-xl border border-emerald-700 bg-emerald-950 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {statusLoading ? "Updating..." : "Submit Estimate"}
                    </button>
                  ) : null}

                  {isVendorView && !isAdminView && canVendorReturnToDraft(currentStatus) ? (
                    <button
                      type="button"
                      onClick={() => handleStatusAction(estimate.id, "draft")}
                      disabled={saving || statusLoading || uploading}
                      className="inline-flex rounded-xl border border-amber-700 bg-amber-950 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {statusLoading ? "Updating..." : "Return to Draft"}
                    </button>
                  ) : null}

                  {isAdminView && canAdminApprove(currentStatus) ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusAction(estimate.id, "approved")
                      }
                      disabled={saving || statusLoading || uploading}
                      className="inline-flex rounded-xl border border-emerald-700 bg-emerald-950 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {statusLoading ? "Updating..." : "Approve"}
                    </button>
                  ) : null}

                  {isAdminView && canAdminReject(currentStatus) ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusAction(estimate.id, "rejected")
                      }
                      disabled={saving || statusLoading || uploading}
                      className="inline-flex rounded-xl border border-rose-700 bg-rose-950 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {statusLoading ? "Updating..." : "Reject"}
                    </button>
                  ) : null}

                  {isAdminView && canAdminReturnToDraft(currentStatus) ? (
                    <button
                      type="button"
                      onClick={() => handleStatusAction(estimate.id, "draft")}
                      disabled={saving || statusLoading || uploading}
                      className="inline-flex rounded-xl border border-amber-700 bg-amber-950 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {statusLoading ? "Updating..." : "Return to Draft"}
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Upload Estimate File
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="grid gap-2">
                      <label
                        htmlFor={`estimate-file-${estimate.id}`}
                        className="text-sm font-medium text-slate-300"
                      >
                        File
                      </label>
                      <input
                        id={`estimate-file-${estimate.id}`}
                        type="file"
                        onChange={(e) =>
                          setUploadFiles((prev) => ({
                            ...prev,
                            [estimate.id]: e.target.files?.[0] || null,
                          }))
                        }
                        disabled={attachmentUploadDisabled}
                        className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-cyan-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAttachmentUpload(estimate.id)}
                      disabled={attachmentUploadDisabled}
                      className="inline-flex rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploading ? "Uploading..." : "Upload Attachment"}
                    </button>
                  </div>
                </div>

                {estimate.attachments.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Estimate Files
                    </p>

                    <div className="mt-3 space-y-3">
                      {estimate.attachments.map((attachment) => {
                        const href = getAttachmentHref(attachment);

                        return (
                          <div
                            key={attachment.id}
                            className="flex flex-col gap-2 border-b border-slate-800 pb-3 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="text-sm text-slate-200">
                                {attachment.file_name || "Attachment"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {attachment.content_type || "Unknown type"} •{" "}
                                {formatFileSize(attachment.file_size_bytes)} • Added{" "}
                                {formatDate(attachment.created_at)}
                              </p>
                            </div>

                            <div className="break-words text-xs text-slate-400 md:max-w-[420px] md:text-right">
                              {href ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sky-400 transition hover:text-sky-300"
                                >
                                  Open file
                                </a>
                              ) : (
                                "No file reference"
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Timeline
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-slate-300">
                      <p>Created: {formatDate(estimate.created_at)}</p>
                      <p>Submitted: {formatDate(estimate.submitted_at)}</p>
                      <p>Approved: {formatDate(estimate.approved_at)}</p>
                      <p>Rejected: {formatDate(estimate.rejected_at)}</p>
                      <p>Updated: {formatDate(estimate.updated_at)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Site Visit / Links
                    </p>
                    <div className="mt-2 space-y-2 text-sm text-slate-300">
                      <p>
                        Site Visit Date: {formatDate(estimate.site_visit_date)}
                      </p>
                      <p>
                        Site Visit Status: {formatStatus(
                          estimate.site_visit_status
                        )}
                      </p>

                      <div className="flex flex-wrap gap-3 pt-2">
                        {estimate.project_id ? (
                          <Link
                            href={`/vendor/projects/${estimate.project_id}`}
                            className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                          >
                            Open Project
                          </Link>
                        ) : null}

                        {estimate.site_visit_id ? (
                          <Link
                            href="/vendor/site-visits"
                            className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                          >
                            View Site Visits
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
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