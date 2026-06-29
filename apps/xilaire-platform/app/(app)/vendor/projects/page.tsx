"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

type VendorProject = {
  assignment_id: string;
  assignment_roles: string[];
  vendor_names: string[];
  id: string;
  project_name: string;
  client_name: string;
  status: string;
  created_at: string | null;
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

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleDateString();
}

function normalizeEmail(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
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

async function resolveVendorForUser(params: {
  orgId: string;
  authEmail: string | null;
  profileEmail: string | null;
}) {
  const authEmail = normalizeEmail(params.authEmail);
  const profileEmail = normalizeEmail(params.profileEmail);
  const lookupEmail = authEmail || profileEmail;

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
    console.error("VENDOR_PROJECTS_VENDOR_LOOKUP_ERROR:", vendorError);
    throw new Error("Unable to load the vendor company for this account.");
  }

  const vendor = (vendorRows?.[0] || null) as VendorLookupRow | null;

  if (!vendor?.id) {
    throw new Error("Unable to find the vendor company for this account.");
  }

  return vendor;
}

export default function VendorProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<VendorProject[]>([]);
  const [vendorName, setVendorName] = useState<string>("");
  const [isAdminView, setIsAdminView] = useState(false);
  const [isVendorView, setIsVendorView] = useState(false);
  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        setLoading(true);
        setError(null);
        setProjects([]);
        setVendorName("");
        setIsAdminView(false);
        setIsVendorView(false);
        setResolvedVendorId(null);

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

        const currentProfile = profile as ProfileRow;
        const vendorAccess = isVendorUser(currentProfile);
        const adminAccess = isAdminRole(currentProfile.role);

        if (!vendorAccess && !adminAccess) {
          throw new Error("You do not have access to vendor projects.");
        }

        if (!currentProfile.org_id) {
          throw new Error("Vendor account is missing org context.");
        }

        setIsAdminView(adminAccess);
        setIsVendorView(vendorAccess);

        let vendorId: string | null = null;

        if (vendorAccess && !adminAccess) {
          const currentVendor = await resolveVendorForUser({
            orgId: currentProfile.org_id,
            authEmail: user.email || null,
            profileEmail: currentProfile.email,
          });

          vendorId = currentVendor.id;
          setResolvedVendorId(currentVendor.id);
          setVendorName(currentVendor.company_name || "your company");
        }

        let query = supabase.from("infrastructure_project_vendors").select(`
            id,
            org_id,
            vendor_id,
            role,
            vendor_role,
            project:infrastructure_projects (
              id,
              org_id,
              project_name,
              client_name,
              status,
              created_at
            ),
            vendor:infrastructure_vendors (
              id,
              org_id,
              company_name
            )
          `);

        if (vendorId) {
          query = query.eq("vendor_id", vendorId);
        } else {
          query = query.eq("org_id", currentProfile.org_id);
        }

        const { data, error: assignmentError } = await query;

        if (assignmentError) {
          console.error(
            "VENDOR_PROJECTS_ASSIGNMENT_QUERY_ERROR:",
            assignmentError
          );
          throw new Error("Failed to load project assignments.");
        }

        const projectMap = new Map<string, VendorProject>();

        (data || []).forEach((row: any) => {
          const project = Array.isArray(row.project) ? row.project[0] : row.project;
          const vendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor;

          if (!project?.id) return;

          if (currentProfile.org_id && project?.org_id) {
            if (String(project.org_id) !== String(currentProfile.org_id)) return;
          }

          if (!projectMap.has(project.id)) {
            projectMap.set(project.id, {
              assignment_id: row.id,
              assignment_roles: [],
              vendor_names: [],
              id: project.id,
              project_name: project.project_name || "Untitled Project",
              client_name: project.client_name || "Unknown Client",
              status: project.status || "unknown",
              created_at: project.created_at || null,
            });
          }

          const existing = projectMap.get(project.id);
          if (!existing) return;

          if (row.role) {
            existing.assignment_roles.push(String(row.role));
          }

          if (row.vendor_role) {
            existing.assignment_roles.push(String(row.vendor_role));
          }

          if (vendor?.company_name) {
            existing.vendor_names.push(String(vendor.company_name));
          }
        });

        const mapped = Array.from(projectMap.values()).map((project) => ({
          ...project,
          assignment_roles: Array.from(
            new Set(
              project.assignment_roles
                .map((role) => String(role || "").trim())
                .filter(Boolean)
            )
          ),
          vendor_names: Array.from(
            new Set(
              project.vendor_names
                .map((name) => String(name || "").trim())
                .filter(Boolean)
            )
          ),
        }));

        mapped.sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        });

        if (!cancelled) {
          setProjects(mapped);
        }
      } catch (err: any) {
        console.error("VENDOR_PROJECTS_ERROR:", err);

        if (!cancelled) {
          setError(err?.message || "Failed to load projects.");
          setProjects([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    const searchValue = normalizeText(search);

    return projects.filter((project) => {
      const matchesStatus =
        statusFilter === "all" ||
        normalizeText(project.status) === normalizeText(statusFilter);

      const haystack = [
        project.project_name,
        project.client_name,
        project.status,
        ...project.assignment_roles,
        ...project.vendor_names,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchValue || haystack.includes(searchValue);

      return matchesStatus && matchesSearch;
    });
  }, [projects, search, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredProjects.length;
    const active = filteredProjects.filter((project) => {
      const status = normalizeText(project.status);
      return (
        status === "active" ||
        status === "in_progress" ||
        status === "scheduled"
      );
    }).length;

    const completed = filteredProjects.filter(
      (project) => normalizeText(project.status) === "completed"
    ).length;

    const pending = filteredProjects.filter((project) => {
      const status = normalizeText(project.status);
      return status === "pending" || status === "draft";
    }).length;

    return {
      total,
      active,
      completed,
      pending,
    };
  }, [filteredProjects]);

  const projectCountLabel = useMemo(() => {
    if (loading) return "Loading projects...";
    if (filteredProjects.length === 1) return "1 project";
    return `${filteredProjects.length} projects`;
  }, [loading, filteredProjects.length]);

  const headerDescription = useMemo(() => {
    if (isAdminView) {
      return "Admin view of all vendor project assignments in your organization.";
    }

    if (isVendorView) {
      return `Projects assigned to ${vendorName || "your company"}.`;
    }

    return "Vendor projects.";
  }, [isAdminView, isVendorView, vendorName]);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-200">
              Vendor Projects
            </h1>

            <p className="text-slate-400">
              {headerDescription}
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
          </div>
        )}
      </div>

      {!loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Total
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-100">
                {stats.total}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Active / Scheduled
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-100">
                {stats.active}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Pending / Draft
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-100">
                {stats.pending}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Completed
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-100">
                {stats.completed}
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-1">
              <label
                htmlFor="project-search"
                className="text-xs uppercase tracking-[0.16em] text-slate-500"
              >
                Search
              </label>
              <input
                id="project-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Project, client, vendor, role..."
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-600"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="status-filter"
                className="text-xs uppercase tracking-[0.16em] text-slate-500"
              >
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading projects...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6 text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && filteredProjects.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          No projects found.
        </div>
      )}

      {!loading && !error && filteredProjects.length > 0 && (
        <div className="grid gap-4">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/vendor/projects/${project.id}`}
              className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-sky-600 hover:bg-slate-900/70"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${statusBadgeClasses(
                        project.status
                      )}`}
                    >
                      {formatStatus(project.status)}
                    </span>

                    {project.assignment_roles.map((role) => (
                      <span
                        key={`${project.id}-${role}`}
                        className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300"
                      >
                        {formatStatus(role)}
                      </span>
                    ))}
                  </div>

                  <h2 className="mt-3 text-lg font-semibold text-slate-100">
                    {project.project_name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Client: {project.client_name}
                  </p>

                  {isAdminView && project.vendor_names.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Vendor{project.vendor_names.length > 1 ? "s" : ""}:{" "}
                      {project.vendor_names.join(", ")}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-slate-500">
                    Created {formatDate(project.created_at)}
                  </p>
                </div>

                <div className="flex items-center">
                  <span className="text-sm text-sky-400">
                    Open Project →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}