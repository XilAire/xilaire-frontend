"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

type Project = {
  id: string;
  name: string;
};

type Vendor = {
  id: string;
  company_name: string;
};

type Profile = {
  id: string;
  role: string | null;
  account_type: string | null;
  org_id: string | null;
  email?: string | null;
};

type AssignmentRow = {
  id: string;
  role: string | null;
  vendor_role: string | null;
};

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEmail(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

function normalizeTaskCode(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function prettifyTask(task: string) {
  return task.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function dedupeTaskCodes(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeTaskCode(value))
        .filter(Boolean)
    )
  );
}

function buildTaskSnapshotText(taskCodes: string[]) {
  if (!taskCodes.length) return "";

  return [
    "Assigned Tasks Snapshot:",
    ...taskCodes.map((task) => `- ${prettifyTask(task)} [${task}]`),
  ].join("\n");
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

function normalizeMoneyInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function toOptionalNumber(value: string) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return 0;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error("Please enter valid numeric values for the estimate costs.");
  }

  return Number(parsed.toFixed(2));
}

function formatCurrency(value: string | number | null | undefined) {
  const parsed = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(parsed) ? parsed : 0);
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

async function resolveVendorForUser(params: {
  orgId: string;
  authEmail: string | null;
  profileEmail: string | null | undefined;
}) {
  const lookupEmail =
    normalizeEmail(params.authEmail) || normalizeEmail(params.profileEmail);

  if (!lookupEmail) {
    throw new Error("Your vendor account is missing an email address.");
  }

  const { data: vendorRows, error } = await supabase
    .from("infrastructure_vendors")
    .select("id, company_name, email")
    .eq("org_id", params.orgId)
    .ilike("email", lookupEmail)
    .limit(2);

  if (error) {
    throw new Error(error.message || "Unable to resolve vendor account.");
  }

  const vendor = vendorRows?.[0];

  if (!vendor?.id) {
    throw new Error(
      "No vendor record is linked to this login. Current schema requires infrastructure_vendors.email to match your profile email."
    );
  }

  return {
    id: String(vendor.id),
    company_name: String(vendor.company_name || "Unnamed Vendor"),
  };
}

async function loadAssignmentsForVendorProject(params: {
  orgId: string;
  projectId: string;
  vendorId: string;
}) {
  const { data, error } = await supabase
    .from("infrastructure_project_vendors")
    .select("id, role, vendor_role")
    .eq("org_id", params.orgId)
    .eq("project_id", params.projectId)
    .eq("vendor_id", params.vendorId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to load assigned project tasks.");
  }

  const rows = (data || []) as AssignmentRow[];

  return dedupeTaskCodes(
    rows.flatMap((row) => [row.vendor_role, row.role])
  );
}

export default function CreateEstimatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedProjectId = String(searchParams.get("project_id") || "").trim();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [projectId, setProjectId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [siteVisitId, setSiteVisitId] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [notes, setNotes] = useState("");

  const [resolvedVendorName, setResolvedVendorName] = useState("");
  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(null);
  const [assignedTaskCodes, setAssignedTaskCodes] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = useMemo(() => isAdminRole(profile?.role), [profile?.role]);
  const isVendor = useMemo(() => isVendorUser(profile), [profile]);
  const isProjectLocked = Boolean(requestedProjectId);

  const effectiveVendorId = isAdmin ? vendorId : resolvedVendorId || "";
  const effectiveVendorName = isAdmin
    ? vendors.find((vendor) => vendor.id === vendorId)?.company_name || ""
    : resolvedVendorName;

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setProjects([]);
      setVendors([]);
      setResolvedVendorName("");
      setResolvedVendorId(null);
      setAssignedTaskCodes([]);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw new Error(userError.message || "Failed to load session.");
        }

        if (!user) {
          throw new Error("You must be signed in to create an estimate.");
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, account_type, org_id, email")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          throw new Error(profileError?.message || "Unable to load user profile.");
        }

        const typedProfile = profileData as Profile;

        if (!typedProfile.org_id) {
          throw new Error("Your account is missing org context.");
        }

        const adminAccess = isAdminRole(typedProfile.role);
        const vendorAccess = isVendorUser(typedProfile);

        if (!adminAccess && !vendorAccess) {
          throw new Error("You do not have access to create vendor estimates.");
        }

        setProfile(typedProfile);

        if (vendorAccess && !adminAccess) {
          const resolvedVendor = await resolveVendorForUser({
            orgId: typedProfile.org_id,
            authEmail: user.email || null,
            profileEmail: typedProfile.email,
          });

          setResolvedVendorId(resolvedVendor.id);
          setResolvedVendorName(resolvedVendor.company_name);
        }

        const { data: projectRows, error: projectsError } = await supabase
          .from("infrastructure_projects")
          .select("id, project_name, org_id")
          .eq("org_id", typedProfile.org_id)
          .order("project_name", { ascending: true });

        if (projectsError) {
          throw new Error(projectsError.message || "Failed to load projects.");
        }

        const normalizedProjects: Project[] = (projectRows || [])
          .map((row: any) => ({
            id: String(row?.id || "").trim(),
            name: String(row?.project_name || "Unnamed Project").trim(),
          }))
          .filter((row) => Boolean(row.id));

        setProjects(normalizedProjects);

        if (requestedProjectId) {
          const exists = normalizedProjects.some(
            (project) => project.id === requestedProjectId
          );

          if (exists) {
            setProjectId(requestedProjectId);
          } else {
            throw new Error(
              "The requested project was not found or is not available in your org."
            );
          }
        } else if (normalizedProjects.length === 1) {
          setProjectId(normalizedProjects[0].id);
        }

        if (adminAccess) {
          const { data: vendorRows, error: vendorsError } = await supabase
            .from("infrastructure_vendors")
            .select("id, company_name, org_id")
            .eq("org_id", typedProfile.org_id)
            .order("company_name", { ascending: true });

          if (vendorsError) {
            throw new Error(vendorsError.message || "Failed to load vendors.");
          }

          const normalizedVendors: Vendor[] = (vendorRows || [])
            .map((row: any) => ({
              id: String(row?.id || "").trim(),
              company_name: String(row?.company_name || "Unnamed Vendor").trim(),
            }))
            .filter((row) => Boolean(row.id));

          setVendors(normalizedVendors);

          if (normalizedVendors.length === 1) {
            setVendorId(normalizedVendors[0].id);
          }
        }
      } catch (err: any) {
        setError(err?.message || "Unexpected error loading create estimate page.");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [requestedProjectId]);

  useEffect(() => {
    const labor = Number(laborCost || 0);
    const material = Number(materialCost || 0);

    if (!Number.isFinite(labor) || !Number.isFinite(material)) return;

    const next = labor + material;

    if (next > 0) {
      setTotalCost(String(Number(next.toFixed(2))));
    } else if (!laborCost && !materialCost) {
      setTotalCost("");
    }
  }, [laborCost, materialCost]);

  useEffect(() => {
    async function loadAssignedTasks() {
      if (!profile?.org_id || !projectId || !effectiveVendorId) {
        setAssignedTaskCodes([]);
        return;
      }

      try {
        setTaskLoading(true);

        const taskCodes = await loadAssignmentsForVendorProject({
          orgId: profile.org_id,
          projectId,
          vendorId: effectiveVendorId,
        });

        setAssignedTaskCodes(taskCodes);
      } catch (err: any) {
        setAssignedTaskCodes([]);
        setError(
          err?.message || "Failed to load assigned tasks for this project/vendor."
        );
      } finally {
        setTaskLoading(false);
      }
    }

    loadAssignedTasks();
  }, [profile?.org_id, projectId, effectiveVendorId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!projectId) {
        throw new Error("Please select a project.");
      }

      if (isAdmin && !vendorId) {
        throw new Error("Please select a vendor.");
      }

      if (!isAdmin && isVendor && !resolvedVendorId) {
        throw new Error("Unable to resolve the vendor company for this account.");
      }

      if (!assignedTaskCodes.length) {
        throw new Error(
          "No assigned tasks were found for this vendor on the selected project."
        );
      }

      const res = await authFetch("/api/vendor/estimates/create", {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId,
          vendor_id: isAdmin ? vendorId : null,
          site_visit_id: siteVisitId.trim() || null,
          labor_cost: toOptionalNumber(laborCost),
          material_cost: toOptionalNumber(materialCost),
          total_cost: toOptionalNumber(totalCost),
          notes: notes.trim() || null,
          assigned_task_codes: assignedTaskCodes,
          status: "draft",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create estimate.");
      }

      setSuccess("Estimate created successfully.");

      setTimeout(() => {
        router.push("/vendor/estimates");
      }, 900);
    } catch (err: any) {
      setError(err?.message || "Unexpected error creating estimate.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedProjectName =
    projects.find((project) => project.id === projectId)?.name || "No project selected";

  const taskSnapshotPreview = buildTaskSnapshotText(assignedTaskCodes);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading create estimate page...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <Link
            href={projectId ? `/vendor/projects/${projectId}` : "/vendor/estimates"}
            className="inline-flex text-sm text-sky-400 transition hover:text-sky-300"
          >
            ← Back
          </Link>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
            Create Estimate
          </h1>

          <p className="text-sm text-slate-400">
            Create a new project-linked estimate for the vendor workflow.
          </p>

          {!isAdmin && isVendor && resolvedVendorName ? (
            <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-500">
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                Vendor scope active
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                {resolvedVendorName}
              </span>
            </div>
          ) : null}

          {isAdmin ? (
            <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-500">
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                Admin org-wide create view
              </span>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-300">
            {success}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Selected Project" value={selectedProjectName} />
          <SummaryCard label="Vendor" value={effectiveVendorName || "No vendor selected"} />
          <SummaryCard
            label="Assigned Tasks"
            value={
              taskLoading
                ? "Loading..."
                : assignedTaskCodes.length
                ? assignedTaskCodes.map(prettifyTask).join(", ")
                : "None found"
            }
          />
          <SummaryCard label="Total Preview" value={formatCurrency(totalCost)} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900"
        >
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-100">
              Estimate Details
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Fill out the estimate information below, then save it as a draft.
            </p>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Field>
                <Label>Project</Label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={isProjectLocked || submitting}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {isProjectLocked ? (
                  <HelpText>
                    Project was preselected from the project details page.
                  </HelpText>
                ) : null}
              </Field>

              {isAdmin ? (
                <Field>
                  <Label>Vendor</Label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    disabled={submitting}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.company_name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field>
                  <Label>Vendor</Label>
                  <div className="flex h-11 items-center rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200">
                    {resolvedVendorName || "Resolved automatically"}
                  </div>
                  <HelpText>
                    Vendor is automatically resolved from the signed-in account.
                  </HelpText>
                </Field>
              )}
            </div>

            <Field>
              <Label>Assigned Tasks</Label>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                {taskLoading ? (
                  <p className="text-sm text-slate-400">Loading assigned tasks...</p>
                ) : assignedTaskCodes.length ? (
                  <div className="flex flex-wrap gap-2">
                    {assignedTaskCodes.map((task) => (
                      <span
                        key={task}
                        className="rounded-full border border-cyan-800 bg-cyan-950/40 px-3 py-1 text-xs text-cyan-200"
                      >
                        {prettifyTask(task)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-amber-300">
                    No assigned tasks found yet for this vendor on this project.
                  </p>
                )}
              </div>
              <HelpText>
                These tasks are automatically pulled from the project assignment and will be attached to the estimate snapshot.
              </HelpText>
            </Field>

            <div className="grid gap-6 md:grid-cols-1">
              <Field>
                <Label>Site Visit ID</Label>
                <input
                  type="text"
                  value={siteVisitId}
                  onChange={(e) => setSiteVisitId(e.target.value)}
                  placeholder="Optional UUID"
                  disabled={submitting}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </Field>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Field>
                <Label>Labor Cost</Label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={laborCost}
                  onChange={(e) =>
                    setLaborCost(normalizeMoneyInput(e.target.value))
                  }
                  placeholder="0.00"
                  disabled={submitting}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </Field>

              <Field>
                <Label>Material Cost</Label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={materialCost}
                  onChange={(e) =>
                    setMaterialCost(normalizeMoneyInput(e.target.value))
                  }
                  placeholder="0.00"
                  disabled={submitting}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </Field>

              <Field>
                <Label>Total Cost</Label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={totalCost}
                  onChange={(e) =>
                    setTotalCost(normalizeMoneyInput(e.target.value))
                  }
                  placeholder="0.00"
                  disabled={submitting}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <HelpText>
                  Total auto-calculates from labor + material, but can still be adjusted.
                </HelpText>
              </Field>
            </div>

            <Field>
              <Label>Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={7}
                placeholder="Scope notes, assumptions, exclusions, labor details, material details..."
                disabled={submitting}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Field>

            {assignedTaskCodes.length ? (
              <Field>
                <Label>Estimate Task Snapshot Preview</Label>
                <textarea
                  value={taskSnapshotPreview}
                  readOnly
                  rows={Math.max(4, assignedTaskCodes.length + 1)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-300 outline-none"
                />
                <HelpText>
                  This snapshot is attached automatically on create so the estimate keeps the assigned-task context.
                </HelpText>
              </Field>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-800 px-6 py-5">
            <button
              type="submit"
              disabled={submitting || !assignedTaskCodes.length}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-cyan-700 bg-cyan-950 px-5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create Estimate"}
            </button>

            <button
              type="button"
              onClick={() => {
                if (projectId) {
                  router.push(`/vendor/projects/${projectId}`);
                } else {
                  router.push("/vendor/estimates");
                }
              }}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({
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
      <p className="mt-2 line-clamp-2 text-sm text-slate-100">{value}</p>
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

function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-500">{children}</p>;
}