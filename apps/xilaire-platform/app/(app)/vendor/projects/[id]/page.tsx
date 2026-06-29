"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabasePlatformClient";

type ProjectCore = {
  id: string;
  org_id: string | null;
  project_name: string | null;
  client_name: string | null;
  status: string | null;
  created_at: string | null;
};

type AssignmentView = {
  assignment_id: string;
  vendor_id: string | null;
  vendor_name: string;
  role: string | null;
  vendor_role: string | null;
};

type EstimateView = {
  id: string;
  org_id: string | null;
  project_id: string | null;
  vendor_id: string | null;
  estimate_number: string | null;
  status: string | null;
  total_cost: number | null;
  labor_cost: number | null;
  material_cost: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  vendor_name: string;
};

type ProfileRow = {
  account_type: string | null;
  role: string | null;
  org_id: string | null;
  email: string | null;
};

type VendorLookupRow = {
  id: string;
  company_name: string | null;
  email: string | null;
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
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString();
}

function formatDateTime(value: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
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

function isAdminRole(role: string | null | undefined) {
  const normalized = normalizeText(role);

  return (
    normalized === "master_admin" ||
    normalized === "super_admin" ||
    normalized === "admin" ||
    normalized === "project_manager"
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

function statusBadgeClasses(status: string | null | undefined) {
  const normalized = normalizeText(status);

  if (
    normalized === "active" ||
    normalized === "in_progress" ||
    normalized === "scheduled"
  ) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "completed") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (normalized === "pending" || normalized === "draft") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (normalized === "blocked" || normalized === "cancelled") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }

  return "border-slate-700 bg-slate-800 text-slate-300";
}

function estimateStatusBadgeClasses(status: string | null | undefined) {
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

async function resolveVendorForUser(params: {
  orgId: string;
  authEmail: string | null;
  profileEmail: string | null;
}) {
  const lookupEmail =
    normalizeEmail(params.authEmail) || normalizeEmail(params.profileEmail);

  if (!lookupEmail) {
    throw new Error("Vendor email is missing from your account.");
  }

  const { data: vendorRows, error: vendorError } = await supabase
    .from("infrastructure_vendors")
    .select("id, company_name, email")
    .eq("org_id", params.orgId)
    .ilike("email", lookupEmail)
    .limit(2);

  if (vendorError) {
    console.error("VENDOR_PROJECT_DETAIL_VENDOR_ERROR:", vendorError);
    throw new Error("Unable to load the vendor company for this account.");
  }

  const vendor = (vendorRows?.[0] || null) as VendorLookupRow | null;

  if (!vendor?.id) {
    throw new Error("Unable to find the vendor company for this account.");
  }

  return vendor;
}

export default function VendorProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdminView, setIsAdminView] = useState(false);
  const [isVendorView, setIsVendorView] = useState(false);
  const [viewerVendorName, setViewerVendorName] = useState("");
  const [viewerVendorId, setViewerVendorId] = useState<string | null>(null);

  const [project, setProject] = useState<ProjectCore | null>(null);
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [estimates, setEstimates] = useState<EstimateView[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadProjectDetail() {
      try {
        setLoading(true);
        setError(null);
        setProject(null);
        setAssignments([]);
        setEstimates([]);
        setIsAdminView(false);
        setIsVendorView(false);
        setViewerVendorName("");
        setViewerVendorId(null);

        if (!projectId || typeof projectId !== "string") {
          throw new Error("Invalid project id.");
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("Unable to load the signed-in user.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("account_type, role, org_id, email")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          console.error("VENDOR_PROJECT_DETAIL_PROFILE_ERROR:", profileError);
          throw new Error("Unable to load the user profile.");
        }

        const currentProfile = profile as ProfileRow;
        const vendorAccess = isVendorUser(currentProfile);
        const adminAccess = isAdminRole(currentProfile.role);

        if (!vendorAccess && !adminAccess) {
          throw new Error("You do not have access to this project.");
        }

        if (!currentProfile.org_id) {
          throw new Error("Vendor account is missing org context.");
        }

        setIsAdminView(adminAccess);
        setIsVendorView(vendorAccess);

        let resolvedVendorId: string | null = null;

        if (vendorAccess && !adminAccess) {
          const currentVendor = await resolveVendorForUser({
            orgId: currentProfile.org_id,
            authEmail: user.email || null,
            profileEmail: currentProfile.email,
          });

          resolvedVendorId = currentVendor.id;
          setViewerVendorId(currentVendor.id);
          setViewerVendorName(currentVendor.company_name || "your company");
        }

        let assignmentQuery = supabase
          .from("infrastructure_project_vendors")
          .select(`
            id,
            org_id,
            vendor_id,
            role,
            vendor_role,
            vendor:infrastructure_vendors (
              id,
              org_id,
              company_name
            ),
            project:infrastructure_projects (
              id,
              org_id,
              project_name,
              client_name,
              status,
              created_at
            )
          `)
          .eq("project_id", projectId);

        if (resolvedVendorId) {
          assignmentQuery = assignmentQuery.eq("vendor_id", resolvedVendorId);
        } else {
          assignmentQuery = assignmentQuery.eq("org_id", currentProfile.org_id);
        }

        const { data: assignmentRows, error: assignmentError } =
          await assignmentQuery;

        if (assignmentError) {
          console.error(
            "VENDOR_PROJECT_DETAIL_ASSIGNMENT_QUERY_ERROR:",
            assignmentError
          );
          throw new Error("Unable to load project assignments.");
        }

        if (!assignmentRows || assignmentRows.length === 0) {
          throw new Error(
            adminAccess
              ? "No vendor assignments were found for this project."
              : "This project is not assigned to your vendor company."
          );
        }

        const safeRows = (assignmentRows || []).filter((row: any) => {
          const rawProject = Array.isArray(row.project) ? row.project[0] : row.project;
          const rawVendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor;

          const sameProjectOrg =
            !currentProfile.org_id ||
            !rawProject?.org_id ||
            String(rawProject.org_id) === String(currentProfile.org_id);

          const sameVendorOrg =
            !currentProfile.org_id ||
            !rawVendor?.org_id ||
            String(rawVendor.org_id) === String(currentProfile.org_id);

          return sameProjectOrg && sameVendorOrg;
        });

        if (safeRows.length === 0) {
          throw new Error(
            "No valid project assignments were found in your organization."
          );
        }

        const firstRow: any = safeRows[0];

        const rawProject = Array.isArray(firstRow.project)
          ? firstRow.project[0]
          : firstRow.project;

        if (!rawProject?.id) {
          throw new Error("Unable to load the project details.");
        }

        const mappedProject: ProjectCore = {
          id: rawProject.id,
          org_id: rawProject.org_id || null,
          project_name: rawProject.project_name || "Untitled Project",
          client_name: rawProject.client_name || "Unknown Client",
          status: rawProject.status || "unknown",
          created_at: rawProject.created_at || null,
        };

        const mappedAssignments: AssignmentView[] = safeRows.map((row: any) => {
          const vendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor;

          return {
            assignment_id: row.id,
            vendor_id: row.vendor_id || null,
            vendor_name: vendor?.company_name || "Unknown Vendor",
            role: row.role || null,
            vendor_role: row.vendor_role || null,
          };
        });

        const dedupedAssignments = Array.from(
          new Map(
            mappedAssignments.map((assignment) => [
              assignment.assignment_id,
              assignment,
            ])
          ).values()
        );

        let estimatesQuery = supabase
          .from("infrastructure_estimates")
          .select(`
            id,
            org_id,
            project_id,
            vendor_id,
            estimate_number,
            status,
            total_cost,
            labor_cost,
            material_cost,
            notes,
            created_at,
            updated_at,
            vendor:infrastructure_vendors (
              id,
              org_id,
              company_name
            )
          `)
          .eq("project_id", projectId)
          .eq("org_id", currentProfile.org_id)
          .order("created_at", { ascending: false });

        if (resolvedVendorId) {
          estimatesQuery = estimatesQuery.eq("vendor_id", resolvedVendorId);
        }

        const { data: estimateRows, error: estimatesError } =
          await estimatesQuery;

        if (estimatesError) {
          console.error(
            "VENDOR_PROJECT_DETAIL_ESTIMATES_QUERY_ERROR:",
            estimatesError
          );
          throw new Error("Unable to load project estimates.");
        }

        const mappedEstimates: EstimateView[] = (estimateRows || [])
          .map((row: any) => {
            const vendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor;

            const sameEstimateOrg =
              !currentProfile.org_id ||
              !row?.org_id ||
              String(row.org_id) === String(currentProfile.org_id);

            const sameVendorOrg =
              !currentProfile.org_id ||
              !vendor?.org_id ||
              String(vendor.org_id) === String(currentProfile.org_id);

            if (!sameEstimateOrg || !sameVendorOrg) {
              return null;
            }

            return {
              id: String(row.id || "").trim(),
              org_id: row.org_id || null,
              project_id: row.project_id || null,
              vendor_id: row.vendor_id || null,
              estimate_number: row.estimate_number || null,
              status: row.status || "draft",
              total_cost: row.total_cost ?? null,
              labor_cost: row.labor_cost ?? null,
              material_cost: row.material_cost ?? null,
              notes: row.notes || null,
              created_at: row.created_at || null,
              updated_at: row.updated_at || null,
              vendor_name: vendor?.company_name || "Unknown Vendor",
            };
          })
          .filter(Boolean) as EstimateView[];

        if (!cancelled) {
          setProject(mappedProject);
          setAssignments(dedupedAssignments);
          setEstimates(mappedEstimates);
        }
      } catch (err) {
        console.error("VENDOR_PROJECT_DETAIL_FATAL_ERROR:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong while loading the project."
          );
          setProject(null);
          setAssignments([]);
          setEstimates([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProjectDetail();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const headerDescription = useMemo(() => {
    if (isAdminView) {
      return "Admin view of vendor project details, assignments, and estimates.";
    }

    if (viewerVendorName) {
      return `Project details for ${viewerVendorName}.`;
    }

    return "Vendor project details.";
  }, [isAdminView, viewerVendorName]);

  const assignmentCountLabel = useMemo(() => {
    if (loading) return "Loading assignments...";
    if (assignments.length === 1) return "1 assignment";
    return `${assignments.length} assignments`;
  }, [loading, assignments.length]);

  const estimateCountLabel = useMemo(() => {
    if (loading) return "Loading estimates...";
    if (estimates.length === 1) return "1 estimate";
    return `${estimates.length} estimates`;
  }, [loading, estimates.length]);

  const estimateSummary = useMemo(() => {
    return estimates.reduce(
      (acc, estimate) => {
        const status = normalizeText(estimate.status);

        acc.total += 1;
        if (status === "draft") acc.draft += 1;
        if (status === "submitted") acc.submitted += 1;
        if (status === "approved") acc.approved += 1;
        if (status === "rejected") acc.rejected += 1;

        return acc;
      },
      {
        total: 0,
        draft: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [estimates]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Link
            href="/vendor/projects"
            className="inline-flex text-sm text-sky-400 transition hover:text-sky-300"
          >
            ← Back to Vendor Projects
          </Link>

          <h1 className="text-2xl font-semibold text-slate-200">
            {project?.project_name || "Vendor Project"}
          </h1>

          <p className="text-slate-400">{headerDescription}</p>

          {!loading && !error ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              {isVendorView && !isAdminView && viewerVendorId ? (
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
                {assignmentCountLabel}
              </span>

              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                {estimateCountLabel}
              </span>
            </div>
          ) : null}
        </div>

        {!loading && !error && project?.id ? (
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/vendor/estimates/create?project_id=${project.id}`}
              className="inline-flex items-center justify-center rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-900"
            >
              Create Estimate
            </Link>

            <Link
              href="/vendor/estimates"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
            >
              Open All Estimates
            </Link>
          </div>
        ) : null}
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading project details...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6 text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && project && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Client
              </p>
              <p className="mt-2 text-base text-slate-100">
                {project.client_name || "Unknown Client"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Status
              </p>
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusBadgeClasses(
                    project.status
                  )}`}
                >
                  {formatStatus(project.status)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Created
              </p>
              <p className="mt-2 text-base text-slate-100">
                {formatDate(project.created_at)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Assignment Count
              </p>
              <p className="mt-2 text-base text-slate-100">
                {assignments.length}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-100">
                Assigned Vendors
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {isAdminView
                  ? "All vendor assignments for this project."
                  : "Your vendor assignment for this project."}
              </p>
            </div>

            <div className="divide-y divide-slate-800">
              {assignments.map((assignment) => (
                <div
                  key={assignment.assignment_id}
                  className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-base text-slate-100">
                      {assignment.vendor_name}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {assignment.role ? (
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          Role: {formatStatus(assignment.role)}
                        </span>
                      ) : null}

                      {assignment.vendor_role ? (
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          Trade: {formatStatus(assignment.vendor_role)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-sm text-slate-500">
                    Assignment ID: {assignment.assignment_id}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Total Estimates
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-100">
                {estimateSummary.total}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Draft
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-100">
                {estimateSummary.draft}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Submitted
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-100">
                {estimateSummary.submitted}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Approved
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-100">
                {estimateSummary.approved}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Estimates
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Create, review, and open project-linked estimates from here.
                </p>
              </div>

              {project.id ? (
                <Link
                  href={`/vendor/estimates/create?project_id=${project.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-900"
                >
                  New Estimate
                </Link>
              ) : null}
            </div>

            {estimates.length === 0 ? (
              <div className="px-5 py-8">
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-6">
                  <h3 className="text-base text-slate-100">
                    No estimates yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    This project does not have any estimate records yet. Use the
                    create action to start a draft estimate for this assigned
                    project.
                  </p>

                  {project.id ? (
                    <div className="mt-4">
                      <Link
                        href={`/vendor/estimates/create?project_id=${project.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-900"
                      >
                        Create First Estimate
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {estimates.map((estimate) => (
                  <Link
                    key={estimate.id}
                    href={`/vendor/estimates/${estimate.id}`}
                    className="block px-5 py-4 transition hover:bg-slate-950/60"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs ${estimateStatusBadgeClasses(
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

                          <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                            Vendor: {estimate.vendor_name}
                          </span>
                        </div>

                        <div className="grid gap-1 text-sm text-slate-300">
                          <p>Total: {formatCurrency(estimate.total_cost)}</p>
                          <p>Labor: {formatCurrency(estimate.labor_cost)}</p>
                          <p>Material: {formatCurrency(estimate.material_cost)}</p>
                          <p>Updated: {formatDateTime(estimate.updated_at || estimate.created_at)}</p>
                        </div>

                        {estimate.notes ? (
                          <p className="max-w-3xl text-sm text-slate-400 line-clamp-2">
                            {estimate.notes}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center">
                        <span className="text-sm text-sky-400">
                          Open Estimate →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-5">
              <h3 className="text-base text-slate-100">Site Visits</h3>
              <p className="mt-2 text-sm text-slate-400">
                Site visit history, scheduling, and field coordination will appear here next.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-5">
              <h3 className="text-base text-slate-100">Invoices</h3>
              <p className="mt-2 text-sm text-slate-400">
                Invoice workflow, approvals, and payment visibility will appear here next.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}