"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Plus, X } from "lucide-react"
import { supabase } from "@/lib/supabasePlatformClient"

type Project = {
  id: string
  project_name: string
  created_at: string
  client_name: string
  status: string
  billing_status: string
  project_value: number
}

function normalizeProject(p: any): Project {
  return {
    id: String(p?.id || "").trim(),
    project_name: p?.project_name ?? "Unnamed Project",
    created_at: p?.created_at ?? new Date().toISOString(),
    client_name: p?.client_name ?? "—",
    status: p?.status ?? "pipeline",
    billing_status: p?.billing_status ?? "inactive",
    project_value: Number(p?.project_value ?? p?.contract_value ?? 0),
  }
}

async function getAccessTokenOrThrow() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message || "Unable to verify authenticated user")
  }

  if (!user) {
    throw new Error("No active user")
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error(sessionError.message || "Unable to load session")
  }

  if (!session?.access_token) {
    throw new Error("No active session")
  }

  return session.access_token
}

export default function InfrastructureProjectPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [form, setForm] = useState({
    client_name: "",
    project_name: "",
    project_type: "",
    project_address: "",
    permit_required: false,
  })

  async function loadProjects(forceFresh = false, preserveExisting = false) {
    if (!preserveExisting) {
      setLoading(true)
    }

    setError(null)

    try {
      const accessToken = await getAccessTokenOrThrow()

      const url = forceFresh
        ? `/api/infrastructure/project/list?_ts=${Date.now()}`
        : "/api/infrastructure/project/list"

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load projects")
      }

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.projects)
          ? data.projects
          : []

      const normalized = rows.map(normalizeProject)

      setProjects(normalized)
    } catch (err: any) {
      console.error("PROJECT_LOAD_ERROR:", err)
      setError(err?.message ?? "Failed to load projects")

      if (!preserveExisting) {
        setProjects([])
      }
    } finally {
      if (!preserveExisting) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadProjects(true)
  }, [])

  function resetCreateForm() {
    setForm({
      client_name: "",
      project_name: "",
      project_type: "",
      project_address: "",
      permit_required: false,
    })
    setCreateError(null)
  }

  function closeCreateModal() {
    setShowCreate(false)
    resetCreateForm()
  }

  async function handleCreate() {
    const clientName = form.client_name.trim()
    const projectName = form.project_name.trim()
    const projectType = form.project_type.trim()
    const projectAddress = form.project_address.trim()

    if (!clientName || !projectName) {
      setCreateError("Client name and project name are required")
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      const accessToken = await getAccessTokenOrThrow()

      const res = await fetch("/api/infrastructure/project/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          client_name: clientName,
          project_name: projectName,
          project_type: projectType,
          project_address: projectAddress,
          permit_required: form.permit_required,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create project")
      }

      const createdProject = data?.project

      if (createdProject?.id) {
        const normalizedCreated = normalizeProject(createdProject)

        setProjects((prev) => {
          const withoutDuplicate = prev.filter(
            (project) => project.id !== normalizedCreated.id
          )

          return [normalizedCreated, ...withoutDuplicate]
        })
      }

      closeCreateModal()

      await loadProjects(true, true)
    } catch (err: any) {
      console.error("CREATE_PROJECT_ERROR:", err)
      setCreateError(err?.message ?? "Failed to create project")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-200">
            Infrastructure Projects
          </h1>

          <p className="text-slate-400 mt-1">
            Active and pending infrastructure deployments.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateError(null)
            setShowCreate(true)
          }}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-400 p-3 rounded">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No infrastructure projects found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3">Project</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Billing</th>
                <th className="text-right px-4 py-3">Value</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>

            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-t border-slate-800 hover:bg-slate-800/50 transition"
                >
                  <td className="px-4 py-3 font-medium text-slate-200">
                    {project.project_name}
                  </td>

                  <td className="px-4 py-3 text-slate-400">
                    {project.client_name}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={project.status} />
                  </td>

                  <td className="px-4 py-3">
                    <BillingBadge status={project.billing_status} />
                  </td>

                  <td className="px-4 py-3 text-right text-slate-300">
                    ${Number(project.project_value || 0).toLocaleString()}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {project.created_at
                      ? new Date(project.created_at).toLocaleDateString()
                      : "—"}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/infrastructure/projects/${project.id}`}
                      className="text-sky-400 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h2 className="text-lg text-slate-100">Create New Project</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Add a new infrastructure project to the pipeline.
                </p>
              </div>

              <button
                onClick={closeCreateModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {createError && (
                <div className="bg-red-500/20 border border-red-500/40 text-red-400 p-3 rounded">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={form.client_name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        client_name: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                    placeholder="XilAire Technologies"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={form.project_name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        project_name: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                    placeholder="Office Wiring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Project Type
                </label>
                <select
                  value={form.project_type}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      project_type: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                >
                  <option value="">Select project type</option>
                  <option value="Run Wires">Run Wires</option>
                  <option value="Camera Install">Camera Install</option>
                  <option value="VoIP Deployment">VoIP Deployment</option>
                  <option value="Network Install">Network Install</option>
                  <option value="Access Control">Access Control</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Project Address
                </label>
                <textarea
                  value={form.project_address}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      project_address: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                  placeholder="123 Main St, West Palm Beach, FL"
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.permit_required}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      permit_required: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                />
                Permit required
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
              <button
                onClick={closeCreateModal}
                disabled={creating}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm text-white hover:bg-sky-600 disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const base = "px-2 py-1 rounded-full text-xs font-medium "

  const map: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400",
    pending: "bg-amber-500/20 text-amber-400",
    cancelled: "bg-red-500/20 text-red-400",
    billing_hold: "bg-orange-500/20 text-orange-400",
    pipeline: "bg-slate-700 text-slate-300",
  }

  return (
    <span className={base + (map[status] ?? "bg-slate-700 text-slate-300")}>
      {status}
    </span>
  )
}

function BillingBadge({ status }: { status: string }) {
  const base = "px-2 py-1 rounded-full text-xs font-medium "

  const map: Record<string, string> = {
    paid: "bg-emerald-500/20 text-emerald-400",
    payment_failed: "bg-red-500/20 text-red-400",
    cancelled: "bg-slate-700 text-slate-300",
    inactive: "bg-slate-700 text-slate-300",
  }

  return (
    <span className={base + (map[status] ?? "bg-slate-700 text-slate-300")}>
      {status}
    </span>
  )
}