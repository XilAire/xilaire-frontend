import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export const runtime = "nodejs"

/* =================================================
   ENV VALIDATION
================================================= */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM")
if (!SUPABASE_SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM")

/* =================================================
   SUPABASE SERVER CLIENT
================================================= */

function getSupabase() {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  })
}

/* =================================================
   GET /api/infrastructure/dashboard
================================================= */

export async function GET() {
  try {
    const supabase = getSupabase()

    /* -------------------------------------------------
       Extract org_id from JWT cookie (aligned to your model)
    ------------------------------------------------- */

    const cookieStore = cookies()
    const token = cookieStore.get("sb-access-token")?.value

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Decode manually (no verification here because middleware handles it)
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    )

    const org_id = payload?.org_id

    if (!org_id) {
      return NextResponse.json(
        { error: "Invalid token — missing org_id" },
        { status: 403 }
      )
    }

    /* =================================================
       1️⃣ TOTAL PIPELINE VALUE
       Status: pipeline
    ================================================= */

    const { data: pipelineData, error: pipelineError } =
      await supabase
        .from("infrastructure_projects")
        .select("project_value")
        .eq("org_id", org_id)
        .eq("status", "pipeline")

    if (pipelineError) throw pipelineError

    const totalPipelineValue =
      pipelineData?.reduce(
        (sum, p) => sum + Number(p.project_value || 0),
        0
      ) || 0

    /* =================================================
       2️⃣ ACTIVE PROJECT VALUE
       Status: active
    ================================================= */

    const { data: activeData, error: activeError } =
      await supabase
        .from("infrastructure_projects")
        .select("project_value")
        .eq("org_id", org_id)
        .eq("status", "active")

    if (activeError) throw activeError

    const activeProjectValue =
      activeData?.reduce(
        (sum, p) => sum + Number(p.project_value || 0),
        0
      ) || 0

    /* =================================================
       3️⃣ PROJECTED MARGIN
       Sum of projected_margin field
    ================================================= */

    const { data: marginData, error: marginError } =
      await supabase
        .from("infrastructure_projects")
        .select("projected_margin")
        .eq("org_id", org_id)

    if (marginError) throw marginError

    const projectedMargin =
      marginData?.reduce(
        (sum, p) => sum + Number(p.projected_margin || 0),
        0
      ) || 0

    /* =================================================
       4️⃣ RECURRING MRR
    ================================================= */

    const { data: recurringData, error: recurringError } =
      await supabase
        .from("infrastructure_recurring")
        .select("monthly_amount, infrastructure_projects!inner(org_id)")
        .eq("infrastructure_projects.org_id", org_id)
        .eq("active", true)

    if (recurringError) throw recurringError

    const recurringMRR =
      recurringData?.reduce(
        (sum, r) => sum + Number(r.monthly_amount || 0),
        0
      ) || 0

    /* =================================================
       RESPONSE
    ================================================= */

    return NextResponse.json({
      success: true,
      metrics: {
        totalPipelineValue,
        activeProjectValue,
        projectedMargin,
        recurringMRR,
      },
    })
  } catch (error: any) {
    console.error("INFRASTRUCTURE_DASHBOARD_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to load dashboard metrics" },
      { status: 500 }
    )
  }
}