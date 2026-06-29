import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM")
}

if (!SUPABASE_SERVICE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM")
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

type VendorRelation =
  | {
      id?: string | null
      company_name?: string | null
    }
  | Array<{
      id?: string | null
      company_name?: string | null
    }>
  | null

type ProjectRow = {
  id: string
  org_id: string | null
  project_name: string | null
  project_type: string | null
}

type ProjectVendorRow = {
  id: string
  org_id: string | null
  project_id: string
  vendor_id: string | null
  role: string | null
  vendor_role: string | null
  assigned_at: string | null
  assigned_by: string | null
  vendor: VendorRelation
}

type NormalizedVendor = {
  id: string
  company_name: string
} | null

type NormalizedAssignment = {
  id: string
  project_id: string
  vendor_id: string | null
  role: string
  vendor_role: string
  assigned_at: string | null
  assigned_by: string | null
  vendor: NormalizedVendor
}

const PROJECT_TASK_MAP: Record<string, string[]> = {
  "Run Wires": ["wire_run", "termination", "testing", "labeling"],
  "Camera Install": ["site_walk", "mounting", "cabling", "configuration", "testing"],
  "VoIP Deployment": ["cabling", "handset_install", "switch_config", "testing"],
  "Network Install": ["rack_install", "cabling", "patching", "switch_config", "testing"],
  "Access Control": ["door_hardware", "reader_install", "controller_config", "testing"],
}

function resolveToken(req: Request) {
  const authHeader = req.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim()
  }

  const cookieStore = cookies()

  return (
    cookieStore.get("sb-access-token")?.value ||
    cookieStore.get("sb-access-token.0")?.value ||
    cookieStore.get("sb-access-token.1")?.value ||
    null
  )
}

function normalizeTaskCode(value: unknown) {
  return String(value || "general")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
}

function safeTime(value: unknown) {
  const time = new Date(String(value || "")).getTime()
  return Number.isFinite(time) ? time : 0
}

function sortRowsNewestFirst(
  a: { assigned_at?: string | null; id?: string },
  b: { assigned_at?: string | null; id?: string }
) {
  const timeDiff = safeTime(b.assigned_at) - safeTime(a.assigned_at)
  if (timeDiff !== 0) return timeDiff
  return String(b.id || "").localeCompare(String(a.id || ""))
}

function normalizeVendorRelation(vendor: VendorRelation): NormalizedVendor {
  if (Array.isArray(vendor)) {
    const first = vendor[0]
    if (!first) return null

    const id = String(first.id || "").trim()
    const company_name = String(first.company_name || "").trim()

    if (!id && !company_name) return null

    return { id, company_name }
  }

  if (vendor && typeof vendor === "object") {
    const id = String(vendor.id || "").trim()
    const company_name = String(vendor.company_name || "").trim()

    if (!id && !company_name) return null

    return { id, company_name }
  }

  return null
}

function getAllowedTasksForProjectType(projectType: string | null | undefined) {
  if (!projectType) return ["general"]
  return PROJECT_TASK_MAP[projectType] || ["general"]
}

function extractProjectRef(url: string) {
  try {
    const host = new URL(url).host
    return host.split(".")[0] || host
  } catch {
    return "unknown"
  }
}

export async function GET(req: Request) {
  try {
    const token = resolveToken(req)

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const url = new URL(req.url)
    const project_id = String(url.searchParams.get("project_id") || "").trim()

    if (!project_id) {
      return NextResponse.json(
        { success: false, error: "Missing project_id" },
        { status: 400 }
      )
    }

    const { data: project, error: projectError } = await supabase
      .from("infrastructure_projects")
      .select("id, org_id, project_name, project_type")
      .eq("id", project_id)
      .maybeSingle<ProjectRow>()

    if (projectError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load project",
          debug: {
            route_version: "vendors-get-audit-v1",
            supabase_url: SUPABASE_URL,
            project_ref: extractProjectRef(SUPABASE_URL),
            project_error: projectError,
          },
        },
        { status: 500 }
      )
    }

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
          debug: {
            route_version: "vendors-get-audit-v1",
            supabase_url: SUPABASE_URL,
            project_ref: extractProjectRef(SUPABASE_URL),
          },
        },
        { status: 404 }
      )
    }

    const allowedTasks = getAllowedTasksForProjectType(project.project_type)

    const { data, error } = await supabase
      .from("infrastructure_project_vendors")
      .select(`
        id,
        org_id,
        project_id,
        vendor_id,
        role,
        vendor_role,
        assigned_at,
        assigned_by,
        vendor:infrastructure_vendors (
          id,
          company_name
        )
      `)
      .eq("project_id", project_id)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load project vendors",
          debug: {
            route_version: "vendors-get-audit-v1",
            supabase_url: SUPABASE_URL,
            project_ref: extractProjectRef(SUPABASE_URL),
            query_error: error,
          },
        },
        { status: 500 }
      )
    }

    const sourceRows: ProjectVendorRow[] = Array.isArray(data)
      ? (data as ProjectVendorRow[])
      : []

    const filteredRows = sourceRows.filter((row) => {
      const task = normalizeTaskCode(row.vendor_role || row.role || "general")
      return allowedTasks.includes(task)
    })

    const groupedByTask = new Map<string, ProjectVendorRow[]>()

    for (const row of filteredRows) {
      const task = normalizeTaskCode(row.vendor_role || row.role || "general")

      if (!groupedByTask.has(task)) {
        groupedByTask.set(task, [])
      }

      groupedByTask.get(task)!.push(row)
    }

    const vendors: NormalizedAssignment[] = []

    for (const task of allowedTasks) {
      const rowsForTask = (groupedByTask.get(task) || []).sort(sortRowsNewestFirst)

      if (rowsForTask.length === 0) {
        continue
      }

      const canonical = rowsForTask[0]

      vendors.push({
        id: canonical.id,
        project_id: canonical.project_id,
        vendor_id: canonical.vendor_id,
        role: task,
        vendor_role: task,
        assigned_at: canonical.assigned_at,
        assigned_by: canonical.assigned_by,
        vendor: normalizeVendorRelation(canonical.vendor),
      })
    }

    vendors.sort((a, b) => a.vendor_role.localeCompare(b.vendor_role))

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        project_name: project.project_name,
        project_type: project.project_type,
      },
      allowed_tasks: allowedTasks,
      vendors,
      debug: {
        route_version: "vendors-get-audit-v1",
        supabase_url: SUPABASE_URL,
        project_ref: extractProjectRef(SUPABASE_URL),
        raw_rows: sourceRows.map((row) => ({
          id: row.id,
          vendor_id: row.vendor_id,
          role: row.role,
          vendor_role: row.vendor_role,
          assigned_at: row.assigned_at,
        })),
        filtered_rows: filteredRows.map((row) => ({
          id: row.id,
          vendor_id: row.vendor_id,
          role: row.role,
          vendor_role: row.vendor_role,
          assigned_at: row.assigned_at,
        })),
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        debug: {
          route_version: "vendors-get-audit-v1",
          supabase_url: SUPABASE_URL,
          project_ref: extractProjectRef(SUPABASE_URL),
          exception: String(err),
        },
      },
      { status: 500 }
    )
  }
}