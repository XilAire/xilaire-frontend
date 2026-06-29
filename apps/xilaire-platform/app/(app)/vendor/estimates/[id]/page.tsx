"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

type Profile = {
  id: string;
  role: string | null;
  account_type: string | null;
  org_id: string | null;
  email: string | null;
};

type Project = {
  id: string;
  project_name: string;
  client_name: string;
  project_type: string;
  project_address: string;
};

type Estimate = {
  id: string;
  org_id: string;
  project_id: string;
  vendor_id: string | null;
  site_visit_id: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  notes: string;
  review_notes: string;
  labor_cost: number;
  material_cost: number;
  total_cost: number;
  created_by: string | null;
  updated_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  vendor_name: string | null;
};

type Attachment = {
  id: string;
  org_id: string | null;
  estimate_id: string | null;
  vendor_id: string | null;
  file_name: string;
  file_path: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string | null;
};

type VendorAccessRow = {
  id: string;
  company_name: string | null;
  email: string | null;
};

type AccessContext = {
  userId: string;
  orgId: string;
  isAdmin: boolean;
  isVendor: boolean;
  vendorId: string | null;
  vendorName: string;
};

type EstimateEditForm = {
  notes: string;
  review_notes: string;
  labor_cost: string;
  material_cost: string;
  total_cost: string;
};

const ESTIMATE_STATUS_STEPS = ["draft", "submitted", "approved", "rejected"] as const;

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

function normalizeEmail(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

function normalizeEstimateStatus(
  value: unknown
): "draft" | "submitted" | "approved" | "rejected" {
  const normalized = String(value || "draft").trim().toLowerCase();
  return ESTIMATE_STATUS_STEPS.includes(normalized as any)
    ? (normalized as "draft" | "submitted" | "approved" | "rejected")
    : "draft";
}

function normalizeMoney(value: unknown) {
  const safe = Number(value || 0);
  return Number.isFinite(safe) ? safe : 0;
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
  const safe = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(safe) ? safe : 0);
}

function toNullableTrimmedString(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toOptionalNumber(value: string) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(/,/g, ""));

  if (!Number.isFinite(parsed)) {
    throw new Error("Please enter valid numeric estimate values.");
  }

  return Number(parsed.toFixed(2));
}

function toInputNumber(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function normalizeMoneyInput(value: string) {
  return value.replace(/[^0-9.]/g, "");
}

function getEstimateStatusPillClass(status: string) {
  switch (normalizeEstimateStatus(status)) {
    case "approved":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "submitted":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "rejected":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    case "draft":
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
}

function isAdminRole(role: string | null | undefined) {
  return ["master_admin", "admin", "super_admin", "project_manager"].includes(
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

function isVendorUser(profile: Profile | null | undefined) {
  if (!profile) return false;
  return isVendorAccount(profile.account_type) || isVendorRole(profile.role);
}

function canVendorEdit(status: string | null | undefined) {
  const normalized = normalizeEstimateStatus(status);
  return normalized === "draft" || normalized === "rejected";
}

function canVendorSubmit(status: string | null | undefined) {
  const normalized = normalizeEstimateStatus(status);
  return normalized === "draft" || normalized === "rejected";
}

function canVendorReturnToDraft(status: string | null | undefined) {
  return normalizeEstimateStatus(status) === "submitted";
}

function canAdminApprove(status: string | null | undefined) {
  return normalizeEstimateStatus(status) === "submitted";
}

function canAdminReject(status: string | null | undefined) {
  return normalizeEstimateStatus(status) === "submitted";
}

function canAdminReturnToDraft(status: string | null | undefined) {
  const normalized = normalizeEstimateStatus(status);
  return (
    normalized === "submitted" ||
    normalized === "rejected" ||
    normalized === "approved"
  );
}

function getAttachmentHref(attachment: Attachment) {
  return attachment.file_url || attachment.file_path || null;
}

function normalizeEstimate(row: any): Estimate {
  return {
    id: String(row?.id || "").trim(),
    org_id: String(row?.org_id || "").trim(),
    project_id: String(row?.project_id || "").trim(),
    vendor_id: row?.vendor_id ? String(row.vendor_id).trim() : null,
    site_visit_id: row?.site_visit_id ? String(row.site_visit_id).trim() : null,
    status: normalizeEstimateStatus(row?.status),
    notes: row?.notes ? String(row.notes).trim() : "",
    review_notes: row?.review_notes ? String(row.review_notes).trim() : "",
    labor_cost: normalizeMoney(row?.labor_cost),
    material_cost: normalizeMoney(row?.material_cost),
    total_cost: normalizeMoney(row?.total_cost),
    created_by: row?.created_by ? String(row.created_by).trim() : null,
    updated_by: row?.updated_by ? String(row.updated_by).trim() : null,
    approved_at: row?.approved_at ? String(row.approved_at) : null,
    approved_by: row?.approved_by ? String(row.approved_by).trim() : null,
    rejected_at: row?.rejected_at ? String(row.rejected_at) : null,
    rejected_by: row?.rejected_by ? String(row.rejected_by).trim() : null,
    created_at: row?.created_at ? String(row.created_at) : null,
    updated_at: row?.updated_at ? String(row.updated_at) : null,
    vendor_name:
      row?.vendor?.company_name
        ? String(row.vendor.company_name).trim()
        : row?.vendor_company_name
        ? String(row.vendor_company_name).trim()
        : null,
  };
}

async function resolveVendorForUser(params: {
  orgId: string;
  authEmail: string | null;
  profileEmail: string | null;
}) {
  const lookupEmail =
    normalizeEmail(params.authEmail) || normalizeEmail(params.profileEmail);

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
    console.error("ESTIMATE_DETAIL_VENDOR_LOOKUP_ERROR:", vendorError);
    throw new Error("Unable to resolve the vendor company for this account.");
  }

  const vendor = (vendorRows?.[0] || null) as VendorAccessRow | null;

  if (!vendor?.id) {
    throw new Error(
      "No vendor record is linked to this login. Current schema requires infrastructure_vendors.email to match your profile email."
    );
  }

  return {
    id: String(vendor.id).trim(),
    company_name: String(vendor.company_name || "").trim() || "Unnamed Vendor",
  };
}

export default function EstimateDetailPage() {
  const params = useParams();
  const estimateId = String(params?.id || "").trim();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [form, setForm] = useState<EstimateEditForm>({
    notes: "",
    review_notes: "",
    labor_cost: "",
    material_cost: "",
    total_cost: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(null);
  const [resolvedVendorName, setResolvedVendorName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAdmin = isAdminRole(profile?.role);
  const isVendor = isVendorUser(profile);

  const isBusy = saving || statusLoading || uploading;

  async function loadProfile(): Promise<AccessContext | null> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("ESTIMATE_DETAIL_PROFILE_USER_ERROR:", userError);
        setProfile(null);
        setResolvedVendorId(null);
        setResolvedVendorName("");
        return null;
      }

      if (!user) {
        setProfile(null);
        setResolvedVendorId(null);
        setResolvedVendorName("");
        return null;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, account_type, org_id, email")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("ESTIMATE_DETAIL_PROFILE_LOAD_ERROR:", error);
        setProfile(null);
        setResolvedVendorId(null);
        setResolvedVendorName("");
        return null;
      }

      const normalizedProfile: Profile = {
        id: String(data.id || "").trim(),
        role: data.role ?? null,
        account_type: data.account_type ?? null,
        org_id: data.org_id ?? null,
        email: data.email ?? null,
      };

      setProfile(normalizedProfile);

      if (!normalizedProfile.org_id) {
        throw new Error("Your account is missing org context.");
      }

      const adminAccess = isAdminRole(normalizedProfile.role);
      const vendorAccess = isVendorUser(normalizedProfile);

      if (!adminAccess && !vendorAccess) {
        throw new Error("You do not have access to vendor estimate details.");
      }

      let vendorId: string | null = null;
      let vendorName = "";

      if (vendorAccess && !adminAccess) {
        const resolvedVendor = await resolveVendorForUser({
          orgId: normalizedProfile.org_id,
          authEmail: user.email || null,
          profileEmail: normalizedProfile.email,
        });

        vendorId = resolvedVendor.id;
        vendorName = resolvedVendor.company_name;
      }

      setResolvedVendorId(vendorId);
      setResolvedVendorName(vendorName);

      return {
        userId: normalizedProfile.id,
        orgId: normalizedProfile.org_id,
        isAdmin: adminAccess,
        isVendor: vendorAccess,
        vendorId,
        vendorName,
      };
    } catch (err) {
      console.error("ESTIMATE_DETAIL_PROFILE_LOAD_EXCEPTION:", err);
      setProfile(null);
      setResolvedVendorId(null);
      setResolvedVendorName("");
      throw err;
    }
  }

  async function loadEstimate(access: AccessContext) {
    try {
      let query = supabase
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
          created_by,
          updated_by,
          approved_at,
          approved_by,
          rejected_at,
          rejected_by,
          created_at,
          updated_at,
          vendor:infrastructure_vendors!infrastructure_estimates_vendor_id_fkey (
            company_name
          )
        `)
        .eq("id", estimateId)
        .eq("org_id", access.orgId);

      if (access.isVendor && !access.isAdmin) {
        if (!access.vendorId) {
          throw new Error("Unable to resolve the vendor company for this account.");
        }

        query = query.eq("vendor_id", access.vendorId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        console.error("ESTIMATE_DETAIL_LOAD_ERROR:", error);
        setEstimate(null);
        setProject(null);
        return null;
      }

      const normalized = normalizeEstimate(data);
      setEstimate(normalized);
      setForm({
        notes: normalized.notes || "",
        review_notes: normalized.review_notes || "",
        labor_cost: toInputNumber(normalized.labor_cost),
        material_cost: toInputNumber(normalized.material_cost),
        total_cost: toInputNumber(normalized.total_cost),
      });

      if (normalized.project_id) {
        const { data: projectData, error: projectError } = await supabase
          .from("infrastructure_projects")
          .select("id, project_name, client_name, project_type, project_address")
          .eq("id", normalized.project_id)
          .eq("org_id", access.orgId)
          .single();

        if (projectError || !projectData) {
          console.error("ESTIMATE_DETAIL_PROJECT_LOAD_ERROR:", projectError);
          setProject(null);
        } else {
          setProject({
            id: String(projectData.id || "").trim(),
            project_name: String(projectData.project_name || "").trim(),
            client_name: String(projectData.client_name || "").trim(),
            project_type: String(projectData.project_type || "").trim(),
            project_address: String(projectData.project_address || "").trim(),
          });
        }
      } else {
        setProject(null);
      }

      return normalized;
    } catch (err) {
      console.error("ESTIMATE_DETAIL_LOAD_EXCEPTION:", err);
      setEstimate(null);
      setProject(null);
      throw err;
    }
  }

  async function loadAttachments(access: AccessContext) {
    try {
      let query = supabase
        .from("infrastructure_estimate_attachments")
        .select(`
          id,
          org_id,
          estimate_id,
          vendor_id,
          file_name,
          file_path,
          file_url,
          notes,
          created_at
        `)
        .eq("estimate_id", estimateId)
        .eq("org_id", access.orgId)
        .order("created_at", { ascending: false });

      if (access.isVendor && !access.isAdmin) {
        if (!access.vendorId) {
          throw new Error("Unable to resolve the vendor company for this account.");
        }

        query = query.eq("vendor_id", access.vendorId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("ESTIMATE_DETAIL_ATTACHMENTS_LOAD_ERROR:", error);
        setAttachments([]);
        return;
      }

      const rows = Array.isArray(data) ? data : [];

      setAttachments(
        rows.map((row: any) => ({
          id: String(row?.id || "").trim(),
          org_id: row?.org_id ? String(row.org_id).trim() : null,
          estimate_id: row?.estimate_id ? String(row.estimate_id).trim() : null,
          vendor_id: row?.vendor_id ? String(row.vendor_id).trim() : null,
          file_name: String(row?.file_name || "Unnamed File").trim(),
          file_path: row?.file_path ? String(row.file_path).trim() : null,
          file_url: row?.file_url ? String(row.file_url).trim() : null,
          notes: row?.notes ? String(row.notes).trim() : null,
          created_at: row?.created_at ? String(row.created_at) : null,
        }))
      );
    } catch (err) {
      console.error("ESTIMATE_DETAIL_ATTACHMENTS_LOAD_EXCEPTION:", err);
      setAttachments([]);
      throw err;
    }
  }

  async function loadAll() {
    if (!estimateId) {
      setError("Missing estimate id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const access = await loadProfile();

      if (!access?.orgId) {
        throw new Error("Unable to resolve access context.");
      }

      await loadEstimate(access);
      await loadAttachments(access);
    } catch (err: any) {
      console.error("ESTIMATE_DETAIL_LOAD_ALL_ERROR:", err);
      setError(err?.message || "Failed to load estimate details.");
    } finally {
      setLoading(false);
    }
  }

  function handleFieldChange(
    field: keyof EstimateEditForm,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === "labor_cost" || field === "material_cost" || field === "total_cost"
          ? normalizeMoneyInput(value)
          : value,
    }));
  }

  async function handleSaveEstimate() {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await authFetch("/api/vendor/estimates/update", {
        method: "POST",
        body: JSON.stringify({
          id: estimateId,
          notes: toNullableTrimmedString(form.notes),
          labor_cost: toOptionalNumber(form.labor_cost),
          material_cost: toOptionalNumber(form.material_cost),
          total_cost: toOptionalNumber(form.total_cost),
          ...(isAdmin
            ? {
                review_notes: toNullableTrimmedString(form.review_notes),
              }
            : {}),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to save estimate.");
      }

      setSuccessMessage("Estimate updated successfully.");
      await loadAll();
    } catch (err: any) {
      console.error("ESTIMATE_DETAIL_SAVE_ERROR:", err);
      setError(err?.message || "Failed to save estimate.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveReviewNotesOnly() {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await authFetch("/api/vendor/estimates/update", {
        method: "POST",
        body: JSON.stringify({
          id: estimateId,
          review_notes: toNullableTrimmedString(form.review_notes),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to save review notes.");
      }

      setSuccessMessage("Review notes updated successfully.");
      await loadAll();
    } catch (err: any) {
      console.error("ESTIMATE_DETAIL_SAVE_REVIEW_NOTES_ERROR:", err);
      setError(err?.message || "Failed to save review notes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate(
    status: "draft" | "submitted" | "approved" | "rejected"
  ) {
    try {
      setStatusLoading(true);
      setError(null);
      setSuccessMessage(null);

      const response = await authFetch("/api/vendor/estimates/status", {
        method: "POST",
        body: JSON.stringify({
          estimate_id: estimateId,
          status,
          ...(isAdmin
            ? {
                review_notes: toNullableTrimmedString(form.review_notes),
              }
            : {}),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update estimate status.");
      }

      setSuccessMessage(`Estimate marked as ${formatStatus(status)}.`);
      await loadAll();
    } catch (err: any) {
      console.error("ESTIMATE_DETAIL_STATUS_UPDATE_ERROR:", err);
      setError(err?.message || "Failed to update estimate status.");
    } finally {
      setStatusLoading(false);
    }
  }

  async function uploadAttachment() {
    try {
      if (!selectedFile) {
        setError("Please choose a file before uploading.");
        return;
      }

      if (!isAdmin && !resolvedVendorId) {
        setError("Unable to resolve the vendor company for this account.");
        return;
      }

      setUploading(true);
      setError(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append("estimate_id", estimateId);
      formData.append("file", selectedFile);

      const response = await authFetch("/api/vendor/estimates/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to upload attachment.");
      }

      setSelectedFile(null);
      setSuccessMessage("Attachment uploaded successfully.");
      await loadAll();
    } catch (err: any) {
      console.error("ESTIMATE_DETAIL_UPLOAD_EXCEPTION:", err);
      setError(err?.message || "Unexpected error uploading attachment.");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (estimateId) {
      loadAll();
    }
  }, [estimateId]);

  const canEditEstimate = useMemo(() => {
    if (!estimate) return false;
    if (isAdmin) return true;
    if (isVendor && !isAdmin) return canVendorEdit(estimate.status);
    return false;
  }, [estimate, isAdmin, isVendor]);

  const canSubmit = useMemo(() => {
    return !!estimate && (isVendor || isAdmin) && canVendorSubmit(estimate.status);
  }, [estimate, isVendor, isAdmin]);

  const canAdminReview = useMemo(() => {
    return isAdmin && !!estimate && canAdminApprove(estimate.status);
  }, [estimate, isAdmin]);

  const canAdminRejectThis = useMemo(() => {
    return isAdmin && !!estimate && canAdminReject(estimate.status);
  }, [estimate, isAdmin]);

  const canAdminReturnThisToDraft = useMemo(() => {
    return isAdmin && !!estimate && canAdminReturnToDraft(estimate.status);
  }, [estimate, isAdmin]);

  const canVendorReturnThisToDraft = useMemo(() => {
    return !isAdmin && isVendor && !!estimate && canVendorReturnToDraft(estimate.status);
  }, [estimate, isAdmin, isVendor]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading estimate details...
        </div>
      </div>
    );
  }

  if (error && !estimate) {
    return (
      <div className="p-6 space-y-4">
        <Link
          href="/vendor/estimates"
          className="inline-flex text-sm text-sky-400 transition hover:text-sky-300"
        >
          ← Back to Estimates
        </Link>

        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6 text-rose-300">
          {error}
        </div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="p-6 space-y-4">
        <Link
          href="/vendor/estimates"
          className="inline-flex text-sm text-sky-400 transition hover:text-sky-300"
        >
          ← Back to Estimates
        </Link>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
          Estimate not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Link
            href="/vendor/estimates"
            className="inline-flex text-sm text-sky-400 transition hover:text-sky-300"
          >
            ← Back to Estimates
          </Link>

          <h1 className="text-2xl font-semibold text-slate-200">
            Estimate Details
          </h1>

          <p className="text-sm text-slate-400">Estimate ID: {estimate.id}</p>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {isAdmin ? (
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                Admin org-wide view
              </span>
            ) : null}

            {!isAdmin && isVendor && resolvedVendorName ? (
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                Vendor scope: {resolvedVendorName}
              </span>
            ) : null}

            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
              Status: {formatStatus(estimate.status)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {project?.id ? (
            <Link
              href={`/vendor/projects/${project.id}`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
            >
              Open Project
            </Link>
          ) : null}

          {project?.id ? (
            <Link
              href={`/vendor/estimates/create?project_id=${project.id}`}
              className="inline-flex items-center justify-center rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-900"
            >
              Create Another Estimate
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

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs ${getEstimateStatusPillClass(
              estimate.status
            )}`}
          >
            {formatStatus(estimate.status)}
          </span>

          <span className="text-sm text-slate-400">
            Vendor: {estimate.vendor_name || "Not assigned"}
          </span>
        </div>
      </div>

      {project ? (
        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard label="Project" value={project.project_name} />
          <DetailCard label="Client" value={project.client_name} />
          <DetailCard label="Project Type" value={project.project_type || "Not set"} />
          <DetailCard label="Address" value={project.project_address || "Not set"} />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MoneyInputCard
          label="Labor"
          value={form.labor_cost}
          disabled={!canEditEstimate || isBusy}
          onChange={(value) => handleFieldChange("labor_cost", value)}
        />
        <MoneyInputCard
          label="Material"
          value={form.material_cost}
          disabled={!canEditEstimate || isBusy}
          onChange={(value) => handleFieldChange("material_cost", value)}
        />
        <MoneyInputCard
          label="Total"
          value={form.total_cost}
          disabled={!canEditEstimate || isBusy}
          onChange={(value) => handleFieldChange("total_cost", value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailCard label="Created" value={formatDateTime(estimate.created_at)} />
        <DetailCard label="Updated" value={formatDateTime(estimate.updated_at)} />
        <DetailCard label="Approved" value={formatDateTime(estimate.approved_at)} />
        <DetailCard label="Rejected" value={formatDateTime(estimate.rejected_at)} />
        <DetailCard label="Site Visit ID" value={estimate.site_visit_id || "Not linked"} />
        <DetailCard label="Attachment Count" value={String(attachments.length)} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Estimate Notes</p>

        <textarea
          value={form.notes}
          onChange={(e) => handleFieldChange("notes", e.target.value)}
          rows={6}
          disabled={!canEditEstimate || isBusy}
          placeholder="Scope notes, assumptions, exclusions, labor details, material details..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
        />

        {canEditEstimate ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveEstimate}
              disabled={isBusy}
              className="rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Estimate"}
            </button>
          </div>
        ) : null}
      </div>

      {(isAdmin || estimate.review_notes || form.review_notes) ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Review Notes</p>

          {isAdmin ? (
            <>
              <textarea
                value={form.review_notes}
                onChange={(e) => handleFieldChange("review_notes", e.target.value)}
                rows={5}
                placeholder="Internal review notes, approval comments, rejection reason..."
                disabled={isBusy}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveReviewNotesOnly}
                  disabled={isBusy}
                  className="rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Notes"}
                </button>

                {canAdminReview ? (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate("approved")}
                    disabled={isBusy}
                    className="rounded-xl border border-emerald-700 bg-emerald-950 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {statusLoading ? "Updating..." : "Approve"}
                  </button>
                ) : null}

                {canAdminRejectThis ? (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate("rejected")}
                    disabled={isBusy}
                    className="rounded-xl border border-rose-700 bg-rose-950 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {statusLoading ? "Updating..." : "Reject"}
                  </button>
                ) : null}

                {canAdminReturnThisToDraft ? (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate("draft")}
                    disabled={isBusy}
                    className="rounded-xl border border-amber-700 bg-amber-950 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {statusLoading ? "Updating..." : "Return to Draft"}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-slate-200">
              {estimate.review_notes || "No review notes yet."}
            </p>
          )}
        </div>
      ) : null}

      {canSubmit ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleStatusUpdate("submitted")}
              disabled={isBusy}
              className="rounded-xl border border-sky-700 bg-sky-950 px-4 py-2 text-sm text-sky-200 transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statusLoading ? "Updating..." : "Submit Estimate"}
            </button>

            {canVendorReturnThisToDraft ? (
              <button
                type="button"
                onClick={() => handleStatusUpdate("draft")}
                disabled={isBusy}
                className="rounded-xl border border-amber-700 bg-amber-950 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {statusLoading ? "Updating..." : "Return to Draft"}
              </button>
            ) : null}
          </div>
        </div>
      ) : canVendorReturnThisToDraft ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <button
            type="button"
            onClick={() => handleStatusUpdate("draft")}
            disabled={isBusy}
            className="rounded-xl border border-amber-700 bg-amber-950 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {statusLoading ? "Updating..." : "Return to Draft"}
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Upload Attachment
        </p>

        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          disabled={isBusy}
          className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
        />

        {selectedFile ? (
          <p className="text-xs text-slate-400">Selected file: {selectedFile.name}</p>
        ) : null}

        <button
          type="button"
          onClick={uploadAttachment}
          disabled={!selectedFile || isBusy}
          className="rounded-xl border border-violet-700 bg-violet-950 px-4 py-2 text-sm text-violet-200 transition hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload Attachment"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-slate-100">Attachments</h2>
          <span className="text-xs text-slate-400">{attachments.length} total</span>
        </div>

        {attachments.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">
            No attachments found for this estimate yet.
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => {
              const href = getAttachmentHref(attachment);

              return (
                <div
                  key={attachment.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-100">{attachment.file_name}</p>

                      <p className="text-xs text-slate-400">
                        Uploaded: {formatDateTime(attachment.created_at)}
                      </p>

                      {attachment.notes ? (
                        <p className="text-xs text-slate-400">
                          Notes: {attachment.notes}
                        </p>
                      ) : null}

                      {attachment.file_path ? (
                        <p className="break-all text-xs text-slate-500">
                          Path: {attachment.file_path}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
                        >
                          Open File
                        </a>
                      ) : (
                        <span className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-500">
                          File reference not available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-base text-slate-100">{value ?? "Not set"}</p>
    </div>
  );
}

function MoneyInputCard({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="0.00"
        className="mt-3 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-base text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {!disabled ? (
        <p className="mt-2 text-xs text-slate-500">
          Preview: {formatCurrency(Number(value || 0))}
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          {formatCurrency(Number(value || 0))}
        </p>
      )}
    </div>
  );
}