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

type ProjectRow = {
  id: string
  org_id: string | null
  project_name: string | null
  project_type: string | null
}

type VendorRow = {
  id: string
  company_name: string | null
}

type AssignmentRow = {
  id: string
  org_id: string | null
  project_id: string
  vendor_id: string | null
  role: string | null
  vendor_role: string | null
  assigned_at: string | null
  assigned_by: string | null
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

function decodeJwtPayload(token: string | null) {
  if (!token) return null

  try {
    const parts = token.split(".")
    if (parts.length < 2) return null

    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=")

    const json = Buffer.from(base64, "base64").toString("utf8")
    return JSON.parse(json)
  } catch {
    return null
  }
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

function sortRowsNewestFirst(a: AssignmentRow, b: AssignmentRow) {
  const timeDiff = safeTime(b.assigned_at) - safeTime(a.assigned_at)
  if (timeDiff !== 0) return timeDiff
  return String(b.id || "").localeCompare(String(a.id || ""))
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

async function getVendorById(vendorId: string) {
  const { data, error } = await supabase
    .from("infrastructure_vendors")
    .select("id, company_name")
    .eq("id", vendorId)
    .maybeSingle<VendorRow>()

  if (error) throw error
  return data
}

async function getProjectById(projectId: string) {
  const { data, error } = await supabase
    .from("infrastructure_projects")
    .select("id, org_id, project_name, project_type")
    .eq("id", projectId)
    .maybeSingle<ProjectRow>()

  if (error) throw error
  return data
}

export async function POST(req: Request) {
  try {
    const token = resolveToken(req)

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const payload = decodeJwtPayload(token)
    const assignedBy = String(payload?.sub || "").trim() || null

    const body = await req.json()

    const project_id = String(body?.project_id || "").trim()
    const vendor_id = String(body?.vendor_id || "").trim()
    const normalizedTask = normalizeTaskCode(body?.task_code)

    if (!project_id) {
      return NextResponse.json(
        { success: false, error: "Missing project_id" },
        { status: 400 }
      )
    }

    if (!vendor_id) {
      return NextResponse.json(
        { success: false, error: "Missing vendor_id" },
        { status: 400 }
      )
    }

    if (!normalizedTask) {
      return NextResponse.json(
        { success: false, error: "Missing task_code" },
        { status: 400 }
      )
    }

    const project = await getProjectById(project_id)

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
          debug: {
            route_version: "vendors-assign-audit-v1",
            supabase_url: SUPABASE_URL,
            project_ref: extractProjectRef(SUPABASE_URL),
          },
        },
        { status: 404 }
      )
    }

    const allowedTasks = getAllowedTasksForProjectType(project.project_type)

    if (!allowedTasks.includes(normalizedTask)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid task_code '${normalizedTask}' for project type '${project.project_type || "Unknown"}'`,
          allowed_tasks: allowedTasks,
          debug: {
            route_version: "vendors-assign-audit-v1",
            supabase_url: SUPABASE_URL,
            project_ref: extractProjectRef(SUPABASE_URL),
          },
        },
        { status: 400 }
      )
    }

    const vendor = await getVendorById(vendor_id)

    if (!vendor) {
      return NextResponse.json(
        {
          success: false,
          error: "Vendor not found",
          debug: {
            route_version: "vendors-assign-audit-v1",
            supabase_url: SUPABASE_URL,
            project_ref: extractProjectRef(SUPABASE_URL),
          },
        },
        { status: 404 }
      )
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("infrastructure_project_vendors")
      .select("id, org_id, project_id, vendor_id, role, vendor_role, assigned_at, assigned_by")
      .eq("project_id", project_id)
      .or(`vendor_role.eq.${normalizedTask},role.eq.${normalizedTask}`)

    if (existingError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load existing task assignment",
          debug: {
            route_version: "vendors-assign-audit-v1",
            supabase_url: SUPABASE_URL,
            project_ref: extractProjectRef(SUPABASE_URL),
            query_error: existingError,
          },
        },
        { status: 500 }
      )
    }

    const rows: AssignmentRow[] = Array.isArray(existingRows)
      ? (existingRows as AssignmentRow[])
      : []

    const taskRows = rows
      .filter((row) => normalizeTaskCode(row.vendor_role || row.role || "general") === normalizedTask)
      .sort(sortRowsNewestFirst)

    const canonical = taskRows[0] || null
    const duplicateIds = taskRows
      .slice(1)
      .map((row) => String(row.id || "").trim())
      .filter(Boolean)

    if (duplicateIds.length > 0) {
      const { error: deleteDuplicateError } = await supabase
        .from("infrastructure_project_vendors")
        .delete()
        .in("id", duplicateIds)

      if (deleteDuplicateError) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to consolidate duplicate task assignments",
            debug: {
              route_version: "vendors-assign-audit-v1",
              supabase_url: SUPABASE_URL,
              project_ref: extractProjectRef(SUPABASE_URL),
              task_rows: taskRows,
              duplicate_ids: duplicateIds,
              delete_error: deleteDuplicateError,
            },
          },
          { status: 500 }
        )
      }
    }

    if (!canonical) {
      const { data: insertedAssignment, error: insertError } = await supabase
        .from("infrastructure_project_vendors")
        .insert({
          org_id: project.org_id,
          project_id,
          vendor_id,
          role: normalizedTask,
          vendor_role: normalizedTask,
          assigned_at: new Date().toISOString(),
          assigned_by: assignedBy,
        })
        .select("id, org_id, project_id, vendor_id, role, vendor_role, assigned_at, assigned_by")
        .single()

      if (insertError) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to create vendor assignment",
            debug: {
              route_version: "vendors-assign-audit-v1",
              supabase_url: SUPABASE_URL,
              project_ref: extractProjectRef(SUPABASE_URL),
              insert_error: insertError,
            },
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: "created",
        task_code: normalizedTask,
        assignment: insertedAssignment,
        vendor,
        project: {
          id: project.id,
          project_name: project.project_name,
          project_type: project.project_type,
        },
        debug: {
          route_version: "vendors-assign-audit-v1",
          supabase_url: SUPABASE_URL,
          project_ref: extractProjectRef(SUPABASE_URL),
          task_rows_before_write: taskRows,
        },
      })
    }

    if (String(canonical.vendor_id || "").trim() === vendor_id) {
      return NextResponse.json({
        success: true,
        action: "unchanged",
        task_code: normalizedTask,
        assignment: canonical,
        vendor,
        project: {
          id: project.id,
          project_name: project.project_name,
          project_type: project.project_type,
        },
        debug: {
          route_version: "vendors-assign-audit-v1",
          supabase_url: SUPABASE_URL,
          project_ref: extractProjectRef(SUPABASE_URL),
          task_rows_before_write: taskRows,
        },
      })
    }

    const { data: updatedAssignment, error: updateError } = await supabase
      .from("infrastructure_project_vendors")
      .update({
        vendor_id,
        role: normalizedTask,
        vendor_role: normalizedTask,
        assigned_at: new Date().toISOString(),
        assigned_by: assignedBy,
      })
      .eq("id", canonical.id)
      .select("id, org_id, project_id, vendor_id, role, vendor_role, assigned_at, assigned_by")
      .single()

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update vendor assignment",
          debug: {
            route_version: "vendors-assign-audit-v1",
            supabase_url: SUPABASE_URL,
            project_ref: extractProjectRef(SUPABASE_URL),
            task_rows_before_write: taskRows,
            update_error: updateError,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      action: "replaced",
      task_code: normalizedTask,
      assignment: updatedAssignment,
      vendor,
      project: {
        id: project.id,
        project_name: project.project_name,
        project_type: project.project_type,
      },
      debug: {
        route_version: "vendors-assign-audit-v1",
        supabase_url: SUPABASE_URL,
        project_ref: extractProjectRef(SUPABASE_URL),
        task_rows_before_write: taskRows,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        debug: {
          route_version: "vendors-assign-audit-v1",
          supabase_url: SUPABASE_URL,
          project_ref: extractProjectRef(SUPABASE_URL),
          exception: String(error),
        },
      },
      { status: 500 }
    )
  }
}