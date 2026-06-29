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
   GET PROJECT
================================================= */

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {

  try {

    const projectId = params?.id

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing project id" },
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

    console.log("PROJECT DETAILS ORG:", org_id)
    console.log("PROJECT DETAILS ID:", projectId)

    /* -------------------------------------------------
       Fetch Project
    ------------------------------------------------- */

    const { data: project, error } = await supabase
      .from("infrastructure_projects")
      .select(`
        id,
        client_name,
        project_name,
        project_type,
        project_address,
        status,
        project_value,
        electrical_wholesale,
        tech_cost,
        projected_margin,
        permit_required,
        permit_status,
        start_date,
        estimated_completion,
        billing_status,
        created_at,
        updated_at
      `)
      .eq("id", projectId)
      .filter("org_id::text", "eq", org_id)
      .single()

    if (error || !project) {

      console.error("PROJECT FETCH ERROR:", error)

      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      project
    })

  } catch (err) {

    console.error("GET_INFRA_PROJECT_ERROR:", err)

    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 }
    )
  }
}