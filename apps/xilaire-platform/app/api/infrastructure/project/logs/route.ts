import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export const runtime = "nodejs"

/* =================================================
   SUPABASE CLIENT
================================================= */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!,
  { auth: { persistSession: false } }
)

/* =================================================
   TOKEN RESOLUTION
================================================= */

function resolveToken(req: Request) {

  const authHeader = req.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "")
  }

  const cookieStore = cookies()

  return (
    cookieStore.get("sb-access-token")?.value ||
    cookieStore.get("sb-access-token.0")?.value ||
    cookieStore.get("sb-access-token.1")?.value ||
    null
  )
}

/* =================================================
   GET PROJECT LOGS
================================================= */

export async function GET(req: Request) {

  try {

    const { searchParams } = new URL(req.url)

    const project_id = searchParams.get("project_id")

    if (!project_id) {
      return NextResponse.json(
        { error: "Missing project_id" },
        { status: 400 }
      )
    }

    /* -------------------------------------------------
       Resolve Token
    ------------------------------------------------- */

    const token = resolveToken(req)

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    /* -------------------------------------------------
       Decode JWT
    ------------------------------------------------- */

    let payload: any

    try {

      const base64 = token
        .split(".")[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/")

      payload = JSON.parse(
        Buffer.from(base64, "base64").toString()
      )

    } catch {

      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 401 }
      )
    }

    const org_id = payload?.org_id

    if (!org_id) {

      return NextResponse.json(
        { error: "Invalid token — missing org_id" },
        { status: 403 }
      )
    }

    console.log("PROJECT LOGS ORG:", org_id)
    console.log("PROJECT LOGS PROJECT:", project_id)

    /* -------------------------------------------------
       Verify Project Belongs to Org
    ------------------------------------------------- */

    const { data: project } = await supabase
      .from("infrastructure_projects")
      .select("id")
      .eq("id", project_id)
      .filter("org_id::text", "eq", org_id)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    /* -------------------------------------------------
       Fetch Logs
    ------------------------------------------------- */

    const { data: logs, error } = await supabase
      .from("infrastructure_project_logs")
      .select(`
        id,
        project_id,
        log_type,
        message,
        created_at
      `)
      .eq("project_id", project_id)
      .order("created_at", { ascending: false })

    if (error) {

      console.error("PROJECT LOG FETCH ERROR:", error)

      return NextResponse.json(
        { error: "Failed to fetch logs" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      logs: logs || []
    })

  } catch (err) {

    console.error("GET_PROJECT_LOGS_ERROR:", err)

    return NextResponse.json(
      { error: "Failed to load project logs" },
      { status: 500 }
    )
  }
}