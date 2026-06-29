"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!
);

async function authFetch(url: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });
}

const STATUS_STEPS = [
  "pipeline",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

type ProjectStatus = (typeof STATUS_STEPS)[number];

type Project = {
  id: string;
  client_name: string;
  project_name: string;
  project_type: string;
  project_address: string;
  contract_value: number;
  billing_status: string;
  status: ProjectStatus;
  created_at: string;
};

function normalizeStatus(value: unknown): ProjectStatus {
  const normalized = String(value || "pipeline").trim().toLowerCase();
  return STATUS_STEPS.includes(normalized as ProjectStatus)
    ? (normalized as ProjectStatus)
    : "pipeline";
}

function normalizeProject(row: any): Project {
  return {
    id: String(row?.id || "").trim(),
    client_name: String(row?.client_name || "").trim(),
    project_name: String(row?.project_name || "").trim(),
    project_type: String(row?.project_type || "").trim(),
    project_address: String(row?.project_address || "").trim(),
    contract_value: Number(row?.contract_value || row?.project_value || 0),
    billing_status: String(row?.billing_status || "unbilled").trim(),
    status: normalizeStatus(row?.status),
    created_at: String(row?.created_at || "").trim(),
  };
}

function formatCurrency(value: number) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function formatStatus(value: string) {
  return String(value || "").replace(/_/g, " ");
}

function getStatusBadgeClass(status: ProjectStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
    case "in_progress":
      return "bg-sky-500/15 text-sky-300 border border-sky-500/30";
    case "scheduled":
      return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
    case "cancelled":
      return "bg-red-500/15 text-red-300 border border-red-500/30";
    case "pipeline":
    default:
      return "bg-zinc-800 text-zinc-200 border border-zinc-700";
  }
}

export default function InfrastructureDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProjects() {
    try {
      const res = await authFetch(`/api/infrastructure/project/list?_ts=${Date.now()}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("INFRA_DASHBOARD_PROJECT_LIST_FAILED:", data);
        setProjects([]);
        return;
      }

      const rows = Array.isArray(data?.projects) ? data.projects : [];

      const normalized = rows
        .map((row: any) => normalizeProject(row))
        .filter((row: Project) => Boolean(row.id));

      setProjects(normalized);
    } catch (err) {
      console.error("INFRA_DASHBOARD_PROJECT_LIST_ERROR:", err);
      setProjects([]);
      throw err;
    }
  }

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([loadProjects()]);
    } catch (err) {
      console.error("INFRA_DASHBOARD_LOAD_ALL_ERROR:", err);
      setError("Failed to load infrastructure dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<ProjectStatus | "total", number> = {
      total: projects.length,
      pipeline: 0,
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const project of projects) {
      counts[project.status] += 1;
    }

    return counts;
  }, [projects]);

  const totalContractValue = useMemo(() => {
    return projects.reduce((sum, project) => sum + Number(project.contract_value || 0), 0);
  }, [projects]);

  const activeProjects = useMemo(() => {
    return projects.filter(
      (project) => project.status === "scheduled" || project.status === "in_progress"
    ).length;
  }, [projects]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [projects]);

  if (loading) {
    return <div className="p-6 text-slate-300">Loading infrastructure dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-slate-200">
          Infrastructure Dashboard
        </h1>

        <p className="text-slate-400">
          Overview of infrastructure deployments and billing.
        </p>

        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-200">
          Infrastructure Dashboard
        </h1>
        <p className="mt-2 text-slate-400">
          Overview of infrastructure deployments, vendors, and billing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Total Projects"
          value={String(statusCounts.total)}
          helper="All infrastructure jobs"
        />
        <DashboardCard
          label="Active Projects"
          value={String(activeProjects)}
          helper="Scheduled + in progress"
        />
        <DashboardCard
          label="Completed"
          value={String(statusCounts.completed)}
          helper="Closed successfully"
        />
        <DashboardCard
          label="Contract Value"
          value={formatCurrency(totalContractValue)}
          helper="Across loaded projects"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6 xl:col-span-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-200">
                Project Pipeline Snapshot
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Live breakdown of infrastructure project statuses.
              </p>
            </div>

            <Link
              href="/infrastructure/projects"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              View Projects
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatusTile status="pipeline" count={statusCounts.pipeline} />
            <StatusTile status="scheduled" count={statusCounts.scheduled} />
            <StatusTile status="in_progress" count={statusCounts.in_progress} />
            <StatusTile status="completed" count={statusCounts.completed} />
            <StatusTile status="cancelled" count={statusCounts.cancelled} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6 xl:col-span-2">
          <h2 className="text-lg font-semibold text-slate-200">Quick Actions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Jump into your infrastructure workflows.
          </p>

          <div className="mt-6 grid gap-3">
            <Link
              href="/infrastructure/projects"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              Open Projects
            </Link>

            <Link
              href="/infrastructure/recurring-billing"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              Open Recurring Billing
            </Link>

            <Link
              href="/infrastructure/projects"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              Review Active Deployments
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">
              Recent Infrastructure Projects
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Quick preview of the most recent project records.
            </p>
          </div>

          <Link
            href="/infrastructure/projects"
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            Manage Projects
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">
            No infrastructure projects found yet.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Billing</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-slate-900 text-slate-200"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/infrastructure/projects/${project.id}`}
                        className="transition hover:text-sky-300"
                      >
                        {project.project_name || "Unnamed Project"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {project.client_name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {project.project_type || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs capitalize ${getStatusBadgeClass(project.status)}`}
                      >
                        {formatStatus(project.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-300">
                      {formatStatus(project.billing_status || "unbilled")}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(project.contract_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-100">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function StatusTile({
  status,
  count,
}: {
  status: ProjectStatus;
  count: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {formatStatus(status)}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{count}</p>
    </div>
  );
}