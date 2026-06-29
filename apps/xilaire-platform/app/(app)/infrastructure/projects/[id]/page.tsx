"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!
)

async function authFetch(url: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  })
}

const STATUS_STEPS = [
  "pipeline",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]

const ESTIMATE_STATUS_STEPS = [
  "draft",
  "submitted",
  "approved",
  "rejected",
]

const PROJECT_TASK_MAP: Record<string, string[]> = {
  "Run Wires": ["wire_run", "termination", "testing", "labeling"],
  "Camera Install": ["site_walk", "mounting", "cabling", "configuration", "testing"],
  "VoIP Deployment": ["cabling", "handset_install", "switch_config", "testing"],
  "Network Install": ["rack_install", "cabling", "patching", "switch_config", "testing"],
  "Access Control": ["door_hardware", "reader_install", "controller_config", "testing"],
}

function prettifyTask(task: string) {
  return task.replace(/_/g, " ")
}

function normalizeTask(value: unknown) {
  return String(value || "general").trim() || "general"
}

function normalizeStatus(value: unknown) {
  const normalized = String(value || "pipeline").trim().toLowerCase()
  return STATUS_STEPS.includes(normalized) ? normalized : "pipeline"
}

function normalizeEstimateStatus(value: unknown) {
  const normalized = String(value || "draft").trim().toLowerCase()
  return ESTIMATE_STATUS_STEPS.includes(normalized) ? normalized : "draft"
}

function normalizeMoney(value: unknown) {
  const safe = Number(value || 0)
  return Number.isFinite(safe) ? safe : 0
}

function isAdminRole(role: string | null | undefined) {
  return ["master_admin", "admin", "super_admin"].includes(String(role || ""))
}

function isVendorAccount(accountType: string | null | undefined) {
  return String(accountType || "").toLowerCase() === "vendor"
}

function normalizeProject(row: any): Project {
  return {
    id: String(row?.id || "").trim(),
    client_name: String(row?.client_name || "").trim(),
    project_name: String(row?.project_name || "").trim(),
    project_type: String(row?.project_type || "").trim(),
    project_address: String(row?.project_address || "").trim(),
    project_value: Number(row?.project_value || 0),
    electrical_wholesale: Number(row?.electrical_wholesale || 0),
    tech_cost: Number(row?.tech_cost || 0),
    projected_margin: Number(row?.projected_margin || 0),
    status: normalizeStatus(row?.status),
  }
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
    attachment_count: Number(row?.attachment_count || 0),
  }
}

function getStatusPillClass(status: string) {
  switch (normalizeStatus(status)) {
    case "completed":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    case "in_progress":
      return "bg-sky-500/20 text-sky-300 border-sky-500/30"
    case "scheduled":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30"
    case "cancelled":
      return "bg-red-500/20 text-red-300 border-red-500/30"
    case "pipeline":
    default:
      return "bg-zinc-800 text-zinc-200 border-zinc-700"
  }
}

function getEstimateStatusPillClass(status: string) {
  switch (normalizeEstimateStatus(status)) {
    case "approved":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    case "submitted":
      return "bg-sky-500/20 text-sky-300 border-sky-500/30"
    case "rejected":
      return "bg-red-500/20 text-red-300 border-red-500/30"
    case "draft":
    default:
      return "bg-zinc-800 text-zinc-200 border-zinc-700"
  }
}

function getProjectStatusStorageKey(projectId: string) {
  return `xilaire.infrastructure.project.status.${projectId}`
}

function readPersistedProjectStatus(projectId: string) {
  if (typeof window === "undefined" || !projectId) return null

  const value = window.sessionStorage.getItem(getProjectStatusStorageKey(projectId))
  return value ? normalizeStatus(value) : null
}

function writePersistedProjectStatus(projectId: string, status: string) {
  if (typeof window === "undefined" || !projectId) return
  window.sessionStorage.setItem(
    getProjectStatusStorageKey(projectId),
    normalizeStatus(status)
  )
}

function clearPersistedProjectStatus(projectId: string) {
  if (typeof window === "undefined" || !projectId) return
  window.sessionStorage.removeItem(getProjectStatusStorageKey(projectId))
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

type Project = {
  id: string
  client_name: string
  project_name: string
  project_type: string
  project_address: string
  project_value: number
  electrical_wholesale: number
  tech_cost: number
  projected_margin: number
  status: string
}

type Vendor = {
  id: string
  company_name: string
}

type Assignment = {
  id?: string
  project_id?: string
  vendor_id?: string
  role?: string | null
  vendor_role?: string | null
  assigned_at?: string | null
  assigned_by?: string | null
  vendor: {
    id: string
    company_name: string
  } | null
}

type Estimate = {
  id: string
  org_id: string
  project_id: string
  vendor_id: string | null
  site_visit_id: string | null
  status: string
  notes: string
  review_notes: string
  labor_cost: number
  material_cost: number
  total_cost: number
  created_by: string | null
  updated_by: string | null
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  created_at: string | null
  updated_at: string | null
  vendor_name: string | null
  attachment_count: number
}

type Profile = {
  id: string
  role: string | null
  account_type: string | null
  org_id: string | null
}

export default function ProjectPage() {
  const params = useParams()
  const projectId = params?.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [selectedTask, setSelectedTask] = useState("general")
  const [selectedVendorByTask, setSelectedVendorByTask] = useState<Record<string, string>>({})
  const [reviewNotesByEstimate, setReviewNotesByEstimate] = useState<Record<string, string>>({})
  const [selectedFilesByEstimate, setSelectedFilesByEstimate] = useState<Record<string, File | null>>({})
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [estimatesLoading, setEstimatesLoading] = useState(false)
  const [estimateActionId, setEstimateActionId] = useState<string | null>(null)
  const [estimateUploadId, setEstimateUploadId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const statusMenuRef = useRef<HTMLDivElement | null>(null)

  const isAdmin = isAdminRole(profile?.role)
  const isVendor = isVendorAccount(profile?.account_type)

  async function loadProfile() {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("PROFILE_SESSION_ERROR:", sessionError)
        setProfile(null)
        return null
      }

      const user = sessionData.session?.user

      if (!user) {
        setProfile(null)
        return null
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, account_type, org_id")
        .eq("id", user.id)
        .single()

      if (error) {
        console.error("PROFILE_LOAD_ERROR:", error)
        setProfile(null)
        return null
      }

      const normalizedProfile = {
        id: String(data?.id || "").trim(),
        role: data?.role ?? null,
        account_type: data?.account_type ?? null,
        org_id: data?.org_id ?? null,
      }

      setProfile(normalizedProfile)
      return normalizedProfile
    } catch (err) {
      console.error("PROFILE_LOAD_EXCEPTION:", err)
      setProfile(null)
      return null
    }
  }

  async function loadProject() {
    try {
      const res = await authFetch(
        `/api/infrastructure/project/${projectId}?_ts=${Date.now()}`
      )
      const data = await res.json()

      if (!res.ok) {
        console.error("PROJECT_LOAD_FAILED:", data)
        setProject(null)
        return
      }

      if (data?.success && data?.project) {
        const normalizedProject = normalizeProject(data.project)
        const persistedStatus = readPersistedProjectStatus(projectId)

        if (persistedStatus) {
          if (persistedStatus !== normalizedProject.status) {
            normalizedProject.status = persistedStatus
          } else {
            clearPersistedProjectStatus(projectId)
          }
        }

        setProject(normalizedProject)
        return
      }

      setProject(null)
    } catch (err) {
      console.error("PROJECT_LOAD_ERROR:", err)
      setProject(null)
    }
  }

  async function loadVendors() {
    try {
      const res = await authFetch(`/api/infrastructure/vendor/list?_ts=${Date.now()}`)
      const data = await res.json()

      if (!res.ok) {
        console.error("VENDOR_LIST_FAILED:", data)
        setVendors([])
        return
      }

      const rows = Array.isArray(data?.vendors) ? data.vendors : []

      const normalized = rows
        .map((row: any) => ({
          id: String(row?.id || "").trim(),
          company_name: String(row?.company_name || "Unnamed Vendor").trim(),
        }))
        .filter((row: Vendor) => Boolean(row.id))
        .sort((a: Vendor, b: Vendor) => a.company_name.localeCompare(b.company_name))

      setVendors(normalized)
    } catch (err) {
      console.error("VENDOR_LOAD_ERROR:", err)
      setVendors([])
    }
  }

  async function loadAssignments() {
    try {
      const res = await authFetch(
        `/api/infrastructure/project/vendors?project_id=${projectId}&_ts=${Date.now()}`
      )
      const data = await res.json()

      if (!res.ok) {
        console.error("ASSIGNMENTS_LOAD_FAILED:", data)
        setAssignments([])
        return
      }

      const rows = Array.isArray(data?.vendors) ? data.vendors : []

      const normalized: Assignment[] = rows.map((row: any) => ({
        id: row?.id,
        project_id: row?.project_id,
        vendor_id: row?.vendor_id,
        role: row?.role ?? null,
        vendor_role: row?.vendor_role ?? null,
        assigned_at: row?.assigned_at ?? null,
        assigned_by: row?.assigned_by ?? null,
        vendor: row?.vendor
          ? {
              id: String(row.vendor.id || "").trim(),
              company_name: String(row.vendor.company_name || "").trim(),
            }
          : null,
      }))

      setAssignments(normalized)
    } catch (err) {
      console.error("ASSIGNMENTS_LOAD_ERROR:", err)
      setAssignments([])
    }
  }

  async function loadEstimates(profileOverride?: Profile | null) {
    try {
      setEstimatesLoading(true)

      const effectiveProfile = profileOverride ?? profile
      const effectiveOrgId = effectiveProfile?.org_id || null

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
          vendor:infrastructure_vendors!fk_infrastructure_estimates_vendor (
            company_name
          ),
          attachments:infrastructure_estimate_attachments (
            id
          )
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (effectiveOrgId) {
        query = query.eq("org_id", effectiveOrgId)
      }

      const { data, error } = await query

      if (error) {
        console.error("ESTIMATES_LOAD_ERROR:", error)
        setEstimates([])
        return
      }

      const rows = Array.isArray(data) ? data : []

      const normalized = rows.map((row: any) =>
        normalizeEstimate({
          ...row,
          attachment_count: Array.isArray(row?.attachments) ? row.attachments.length : 0,
        })
      )

      setEstimates(normalized)

      const nextReviewNotes: Record<string, string> = {}
      const nextFiles: Record<string, File | null> = {}

      for (const estimate of normalized) {
        nextReviewNotes[estimate.id] =
          reviewNotesByEstimate[estimate.id] ?? estimate.review_notes ?? ""
        nextFiles[estimate.id] = selectedFilesByEstimate[estimate.id] ?? null
      }

      setReviewNotesByEstimate(nextReviewNotes)
      setSelectedFilesByEstimate(nextFiles)
    } catch (err) {
      console.error("ESTIMATES_LOAD_EXCEPTION:", err)
      setEstimates([])
    } finally {
      setEstimatesLoading(false)
    }
  }

  async function updateStatus(newStatus: string) {
    if (!project) return

    const normalizedStatus = normalizeStatus(newStatus)

    if (normalizedStatus === project.status) return

    try {
      setStatusUpdating(true)

      const res = await authFetch("/api/infrastructure/project/update", {
        method: "POST",
        body: JSON.stringify({
          id: projectId,
          updates: { status: normalizedStatus },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("STATUS_UPDATE_FAILED:", data)
        alert(data?.error || "Failed to update project status")
        return
      }

      writePersistedProjectStatus(projectId, normalizedStatus)

      if (data?.success && data?.project) {
        const updatedProject = normalizeProject(data.project)
        updatedProject.status = normalizedStatus
        setProject(updatedProject)
        return
      }

      setProject((prev) =>
        prev ? { ...prev, status: normalizedStatus } : prev
      )
    } catch (err) {
      console.error("STATUS_UPDATE_ERROR:", err)
      alert("Unexpected error updating project status")
    } finally {
      setStatusUpdating(false)
    }
  }

  async function assignVendor() {
    try {
      const taskCode = selectedTask
      const vendorId = String(selectedVendorByTask[taskCode] || "").trim()

      if (!vendorId) {
        alert("Please select a vendor")
        return
      }

      setAssigning(true)

      const res = await authFetch("/api/infrastructure/project/vendors/assign", {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId,
          vendor_id: vendorId,
          task_code: taskCode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("VENDOR_ASSIGN_FAILED:", data)
        alert(data?.error || "Vendor assignment failed")
        return
      }

      await loadAssignments()
      await loadProject()
      await loadEstimates()
    } catch (err) {
      console.error("VENDOR_ASSIGN_ERROR:", err)
      alert("Unexpected error assigning vendor")
    } finally {
      setAssigning(false)
    }
  }

  async function updateEstimate(
    estimateId: string,
    updates: {
      status?: string
      review_notes?: string | null
    }
  ) {
    try {
      setEstimateActionId(estimateId)

      const res = await authFetch("/api/vendor/estimates/update", {
        method: "POST",
        body: JSON.stringify({
          id: estimateId,
          ...updates,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("ESTIMATE_UPDATE_FAILED:", data)
        alert(data?.error || "Failed to update estimate")
        return
      }

      await loadEstimates()
    } catch (err) {
      console.error("ESTIMATE_UPDATE_ERROR:", err)
      alert("Unexpected error updating estimate")
    } finally {
      setEstimateActionId(null)
    }
  }

  async function submitEstimate(estimateId: string) {
    await updateEstimate(estimateId, { status: "submitted" })
  }

  async function approveEstimate(estimateId: string) {
    await updateEstimate(estimateId, {
      status: "approved",
      review_notes: reviewNotesByEstimate[estimateId] || null,
    })
  }

  async function rejectEstimate(estimateId: string) {
    await updateEstimate(estimateId, {
      status: "rejected",
      review_notes: reviewNotesByEstimate[estimateId] || null,
    })
  }

  async function revertEstimateToDraft(estimateId: string) {
    await updateEstimate(estimateId, {
      status: "draft",
      review_notes: reviewNotesByEstimate[estimateId] || null,
    })
  }

  async function uploadEstimateAttachment(estimateId: string) {
    try {
      const file = selectedFilesByEstimate[estimateId]

      if (!file) {
        alert("Please choose a file first")
        return
      }

      setEstimateUploadId(estimateId)

      const formData = new FormData()
      formData.append("estimate_id", estimateId)
      formData.append("file", file)

      const res = await authFetch("/api/vendor/estimates/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("ESTIMATE_ATTACHMENT_UPLOAD_FAILED:", data)
        alert(data?.error || "Failed to upload estimate attachment")
        return
      }

      setSelectedFilesByEstimate((prev) => ({
        ...prev,
        [estimateId]: null,
      }))

      await loadEstimates()
    } catch (err) {
      console.error("ESTIMATE_ATTACHMENT_UPLOAD_ERROR:", err)
      alert("Unexpected error uploading estimate attachment")
    } finally {
      setEstimateUploadId(null)
    }
  }

  async function loadAll() {
    if (!projectId) {
      setError("Missing project id")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const loadedProfile = await loadProfile()

      await Promise.all([
        loadProject(),
        loadVendors(),
        loadAssignments(),
        loadEstimates(loadedProfile),
      ])
    } catch (err) {
      console.error("PROJECT_PAGE_LOAD_ALL_ERROR:", err)
      setError("Failed to load project data")
    } finally {
      setLoading(false)
    }
  }

  function handleStatusSelect(step: string) {
    setStatusMenuOpen(false)
    updateStatus(step)
  }

  useEffect(() => {
    if (projectId) {
      loadAll()
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) return

    const handleFocus = () => {
      loadProject()
      loadVendors()
      loadAssignments()
      loadEstimates()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadProject()
        loadVendors()
        loadAssignments()
        loadEstimates()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [projectId])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!statusMenuRef.current) return

      if (!statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [])

  const projectTasks = useMemo(() => {
    if (!project?.project_type) return ["general"]
    return PROJECT_TASK_MAP[project.project_type] || ["general"]
  }, [project?.project_type])

  useEffect(() => {
    if (!projectTasks.includes(selectedTask)) {
      setSelectedTask(projectTasks[0])
    }
  }, [projectTasks, selectedTask])

  const assignmentsByTask = useMemo(() => {
    const map: Record<string, Assignment | undefined> = {}

    for (const assignment of assignments) {
      const task = normalizeTask(
        assignment?.vendor_role || assignment?.role || "general"
      )

      map[task] = assignment
    }

    return map
  }, [assignments])

  useEffect(() => {
    setSelectedVendorByTask((prev) => {
      const next = { ...prev }

      for (const task of projectTasks) {
        if (next[task] === undefined) {
          next[task] = String(assignmentsByTask[task]?.vendor?.id || "").trim()
        }
      }

      return next
    })
  }, [projectTasks, assignmentsByTask])

  const selectedVendorIdForTask = String(
    selectedVendorByTask[selectedTask] || ""
  ).trim()

  const currentAssignedVendorForTask = assignmentsByTask[selectedTask]?.vendor || null

  const selectedVendorForTask =
    vendors.find((v) => v.id === selectedVendorIdForTask) || null

  const availableVendorCount = vendors.length

  const estimateSummary = useMemo(() => {
    const total = estimates.reduce((sum, estimate) => sum + normalizeMoney(estimate.total_cost), 0)
    const labor = estimates.reduce((sum, estimate) => sum + normalizeMoney(estimate.labor_cost), 0)
    const material = estimates.reduce((sum, estimate) => sum + normalizeMoney(estimate.material_cost), 0)
    const approved = estimates.filter((estimate) => estimate.status === "approved").length
    const submitted = estimates.filter((estimate) => estimate.status === "submitted").length
    const draft = estimates.filter((estimate) => estimate.status === "draft").length
    const rejected = estimates.filter((estimate) => estimate.status === "rejected").length

    return {
      count: estimates.length,
      total,
      labor,
      material,
      approved,
      submitted,
      draft,
      rejected,
    }
  }, [estimates])

  if (loading) {
    return <div className="p-6">Loading project...</div>
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <Link
          href="/infrastructure/projects"
          className="text-blue-400 text-sm"
        >
          ← Back to Projects
        </Link>

        <div className="bg-red-500/20 border border-red-500/40 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <Link
          href="/infrastructure/projects"
          className="text-blue-400 text-sm"
        >
          ← Back to Projects
        </Link>

        <div className="bg-zinc-900 p-6 rounded-xl text-zinc-300">
          Project not found.
        </div>
      </div>
    )
  }

  const totalCost =
    Number(project.electrical_wholesale || 0) +
    Number(project.tech_cost || 0)

  const profit =
    Number(project.project_value || 0) - totalCost

  const marginPercent =
    Number(project.project_value || 0) > 0
      ? (profit / Number(project.project_value || 0)) * 100
      : 0

  return (
    <div className="p-6 space-y-8">
      <Link
        href="/infrastructure/projects"
        className="text-blue-400 text-sm"
      >
        ← Back to Projects
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {project.project_name}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Project ID: {project.id}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/vendor/estimates/create?project_id=${project.id}`}
            className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
          >
            Create Estimate
          </Link>

          <button
            type="button"
            onClick={() => {
              loadVendors()
              loadAssignments()
              loadEstimates()
            }}
            disabled={estimatesLoading}
            className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
          >
            {estimatesLoading ? "Refreshing..." : "Refresh Vendors / Estimates"}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl">
        <h2 className="text-sm mb-4">Project Status</h2>

        <div className="flex items-center gap-3">
          <div className="relative" ref={statusMenuRef}>
            <button
              type="button"
              onClick={() => !statusUpdating && setStatusMenuOpen((prev) => !prev)}
              disabled={statusUpdating}
              className={`inline-flex min-w-[180px] items-center justify-between gap-3 rounded-full border px-4 py-2 text-sm capitalize outline-none transition ${getStatusPillClass(project.status)} ${statusUpdating ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
            >
              <span>{project.status.replace(/_/g, " ")}</span>
              <span className="text-xs opacity-80">{statusMenuOpen ? "▲" : "▼"}</span>
            </button>

            {statusMenuOpen && (
              <div className="absolute left-0 top-full z-30 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
                {STATUS_STEPS.map((step) => {
                  const isActive = normalizeStatus(project.status) === step

                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleStatusSelect(step)}
                      className={`block w-full px-4 py-3 text-left text-sm capitalize transition ${
                        isActive
                          ? "bg-sky-600 text-white"
                          : "bg-zinc-950 text-zinc-100 hover:bg-zinc-800"
                      }`}
                    >
                      {step.replace(/_/g, " ")}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {statusUpdating && (
            <span className="text-xs text-zinc-400">Saving...</span>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <Info label="Client" value={project.client_name} />
        <Info label="Project Type" value={project.project_type} />
        <Info label="Address" value={project.project_address} />
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Kpi label="Project Value" value={project.project_value} />
        <Kpi label="Electrical Wholesale" value={project.electrical_wholesale} />
        <Kpi label="Tech Cost" value={project.tech_cost} />
        <Kpi label="Projected Margin" value={project.projected_margin} />
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-6">
        <Kpi label="Total Cost" value={totalCost} />
        <Kpi label="Profit" value={profit} />
        <Percent label="Margin %" value={marginPercent} />
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm">Project Vendors</h2>
          <span className="text-xs text-zinc-400">
            {assignments.length} assigned
          </span>
        </div>

        <div className="space-y-2">
          {projectTasks.map((task) => {
            const assignment = assignmentsByTask[task]

            return (
              <div key={task}>
                <span className="text-zinc-400 capitalize">
                  {prettifyTask(task)}
                </span>
                {" → "}
                <span className="font-medium">
                  {assignment?.vendor?.company_name || "Not assigned"}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm">Assign / Change Vendor</h2>
          <span className="text-xs text-zinc-400">
            {availableVendorCount} potential vendors loaded
          </span>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-2">
            Project Task
          </label>

          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-w-[240px]"
          >
            {projectTasks.map((task) => (
              <option key={task} value={task}>
                {prettifyTask(task)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-2">
            All Potential Vendors
          </label>

          <select
            value={selectedVendorIdForTask}
            onChange={(e) =>
              setSelectedVendorByTask((prev) => ({
                ...prev,
                [selectedTask]: e.target.value,
              }))
            }
            className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-w-[320px]"
          >
            <option value="">Select a vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.company_name}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs text-zinc-500">
            This list should contain all potential vendors in the org, not just currently assigned vendors.
          </p>
        </div>

        <div className="text-sm">
          <span className="text-zinc-400">Current vendor for task:</span>{" "}
          <span className="font-medium">
            {currentAssignedVendorForTask?.company_name || "None assigned"}
          </span>
        </div>

        <div className="text-sm">
          <span className="text-zinc-400">Selected vendor to assign:</span>{" "}
          <span className="font-medium">
            {selectedVendorForTask?.company_name || "None selected"}
          </span>
        </div>

        <div>
          <button
            onClick={assignVendor}
            disabled={assigning || !selectedVendorIdForTask}
            className="bg-zinc-700 px-4 py-2 rounded-lg text-sm hover:bg-zinc-600 disabled:opacity-50"
          >
            {assigning ? "Assigning..." : "Assign Vendor"}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm">Project Estimates</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Estimates tied directly to this project
            </p>
          </div>

          <div className="text-xs text-zinc-400">
            {estimatesLoading ? "Refreshing..." : `${estimateSummary.count} total`}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
          <Kpi label="Estimate Total" value={estimateSummary.total} />
          <Kpi label="Labor Total" value={estimateSummary.labor} />
          <Kpi label="Material Total" value={estimateSummary.material} />
          <CountKpi label="Draft" value={estimateSummary.draft} />
          <CountKpi label="Submitted" value={estimateSummary.submitted} />
          <CountKpi label="Approved" value={estimateSummary.approved} />
          <CountKpi label="Rejected" value={estimateSummary.rejected} />
        </div>

        {estimates.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
            No estimates found for this project yet.
          </div>
        ) : (
          <div className="space-y-4">
            {estimates.map((estimate) => {
              const isBusy = estimateActionId === estimate.id
              const isUploading = estimateUploadId === estimate.id
              const currentReviewNotes =
                reviewNotesByEstimate[estimate.id] ?? estimate.review_notes ?? ""
              const selectedFile = selectedFilesByEstimate[estimate.id] ?? null
              const canSubmit = estimate.status === "draft"
              const canReturnToDraft =
                isAdmin && (estimate.status === "submitted" || estimate.status === "rejected")
              const canAdminReview =
                isAdmin &&
                (estimate.status === "submitted" ||
                  estimate.status === "draft" ||
                  estimate.status === "rejected")
              const canVendorSeeSubmit = isVendor || isAdmin

              return (
                <div
                  key={estimate.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs capitalize ${getEstimateStatusPillClass(estimate.status)}`}
                        >
                          {estimate.status.replace(/_/g, " ")}
                        </span>

                        <span className="text-xs text-zinc-400">
                          Estimate ID: {estimate.id}
                        </span>
                      </div>

                      <div className="text-sm text-zinc-300">
                        Vendor: {estimate.vendor_name || "Not assigned"}
                      </div>

                      <div className="text-sm text-zinc-400">
                        Created: {formatDateTime(estimate.created_at)}
                      </div>

                      <div className="text-sm text-zinc-400">
                        Updated: {formatDateTime(estimate.updated_at)}
                      </div>

                      <div className="text-sm text-zinc-400">
                        Attachments: {estimate.attachment_count}
                      </div>

                      {estimate.approved_at && (
                        <div className="text-sm text-emerald-300">
                          Approved: {formatDateTime(estimate.approved_at)}
                        </div>
                      )}

                      {estimate.rejected_at && (
                        <div className="text-sm text-red-300">
                          Rejected: {formatDateTime(estimate.rejected_at)}
                        </div>
                      )}

                      {estimate.site_visit_id && (
                        <div className="text-sm text-zinc-400 break-all">
                          Site Visit ID: {estimate.site_visit_id}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                      <MiniKpi label="Labor" value={estimate.labor_cost} />
                      <MiniKpi label="Material" value={estimate.material_cost} />
                      <MiniKpi label="Total" value={estimate.total_cost} />
                    </div>
                  </div>

                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <p className="mb-2 text-xs text-zinc-400">Notes</p>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">
                      {estimate.notes || "No notes provided."}
                    </p>
                  </div>

                  {(isAdmin || estimate.review_notes) && (
                    <div className="mt-4 border-t border-zinc-800 pt-4 space-y-3">
                      <p className="text-xs text-zinc-400">Review Notes</p>

                      {isAdmin ? (
                        <textarea
                          value={currentReviewNotes}
                          onChange={(e) =>
                            setReviewNotesByEstimate((prev) => ({
                              ...prev,
                              [estimate.id]: e.target.value,
                            }))
                          }
                          rows={3}
                          placeholder="Internal review notes, approval comments, rejection reason..."
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                        />
                      ) : (
                        <p className="text-sm text-zinc-200 whitespace-pre-wrap">
                          {estimate.review_notes || "No review notes yet."}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 border-t border-zinc-800 pt-4 space-y-3">
                    <p className="text-xs text-zinc-400">Estimate Attachment</p>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          setSelectedFilesByEstimate((prev) => ({
                            ...prev,
                            [estimate.id]: file,
                          }))
                        }}
                        className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:text-zinc-100 hover:file:bg-zinc-700"
                      />

                      <button
                        type="button"
                        onClick={() => uploadEstimateAttachment(estimate.id)}
                        disabled={!selectedFile || isUploading}
                        className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
                      >
                        {isUploading ? "Uploading..." : "Upload Attachment"}
                      </button>
                    </div>

                    {selectedFile && (
                      <p className="text-xs text-zinc-400">
                        Selected file: {selectedFile.name}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/vendor/estimates/create?project_id=${project.id}`}
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
                    >
                      New Estimate
                    </Link>

                    <Link
                      href="/vendor/estimates"
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
                    >
                      Open Estimates
                    </Link>

                    {canVendorSeeSubmit && canSubmit && (
                      <button
                        type="button"
                        onClick={() => submitEstimate(estimate.id)}
                        disabled={isBusy}
                        className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
                      >
                        {isBusy ? "Saving..." : "Submit Estimate"}
                      </button>
                    )}

                    {canAdminReview && (
                      <button
                        type="button"
                        onClick={() => approveEstimate(estimate.id)}
                        disabled={isBusy}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {isBusy ? "Saving..." : "Approve"}
                      </button>
                    )}

                    {canAdminReview && (
                      <button
                        type="button"
                        onClick={() => rejectEstimate(estimate.id)}
                        disabled={isBusy}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        {isBusy ? "Saving..." : "Reject"}
                      </button>
                    )}

                    {canReturnToDraft && (
                      <button
                        type="button"
                        onClick={() => revertEstimateToDraft(estimate.id)}
                        disabled={isBusy}
                        className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
                      >
                        {isBusy ? "Saving..." : "Return to Draft"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-lg">{value ?? "-"}</p>
    </div>
  )
}

function Kpi({
  label,
  value,
}: {
  label: string
  value: number | string | null | undefined
}) {
  const safe = Number(value || 0)

  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-lg font-semibold">
        ${safe.toLocaleString()}
      </p>
    </div>
  )
}

function MiniKpi({
  label,
  value,
}: {
  label: string
  value: number | string | null | undefined
}) {
  const safe = Number(value || 0)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-base font-semibold text-zinc-100">
        ${safe.toLocaleString()}
      </p>
    </div>
  )
}

function CountKpi({
  label,
  value,
}: {
  label: string
  value: number | string | null | undefined
}) {
  const safe = Number(value || 0)

  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-lg font-semibold">
        {safe.toLocaleString()}
      </p>
    </div>
  )
}

function Percent({
  label,
  value,
}: {
  label: string
  value: number | string | null | undefined
}) {
  const safe = Number(value || 0)

  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-lg font-semibold">
        {safe.toFixed(1)}%
      </p>
    </div>
  )
}