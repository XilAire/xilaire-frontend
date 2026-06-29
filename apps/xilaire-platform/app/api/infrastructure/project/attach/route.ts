import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!,
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { project_id, service_type, monthly_amount } = body

    if (!project_id || !service_type || !monthly_amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const token = cookieStore.get("sb-access-token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    )

    const org_id = payload?.org_id

    const { data: project } = await supabase
      .from("infrastructure_projects")
      .select("id")
      .eq("id", project_id)
      .eq("org_id", org_id)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from("infrastructure_recurring")
      .insert({
        org_id,
        project_id,
        service_type,
        monthly_amount,
        active: true,
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from("infrastructure_project_logs").insert({
      project_id,
      log_type: "recurring_added",
      message: `Recurring service added: ${service_type} ($${monthly_amount}/mo)`,
    })

    return NextResponse.json({ success: true, recurring: data })
  } catch (err) {
    console.error("ATTACH_RECURRING_ERROR:", err)
    return NextResponse.json(
      { error: "Failed to attach recurring service" },
      { status: 500 }
    )
  }
}