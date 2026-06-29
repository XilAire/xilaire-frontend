import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { getProfile } from "@/lib/getProfile"
import { randomUUID } from "crypto"

export async function POST(req: Request) {
  /* -------------------------------------------------
     🔒 AUTH — SESSION REQUIRED
  ------------------------------------------------- */
  const supabaseAuth = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await getProfile()

  if (!profile || !["admin", "master_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  /* -------------------------------------------------
     📥 INPUT
  ------------------------------------------------- */
  const body = await req.json()

  const {
    hostname,
    device_type,
    os,
    os_version,
  } = body

  if (!hostname || !device_type || !os) {
    return NextResponse.json(
      { error: "hostname, device_type, and os are required" },
      { status: 400 }
    )
  }

  /* -------------------------------------------------
     🔒 SERVICE ROLE CLIENT (SERVER ONLY)
  ------------------------------------------------- */
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM
  ) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM,
    process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM,
    {
      auth: { persistSession: false },
    }
  )

  /* -------------------------------------------------
     🔑 TOKEN GENERATION (ONE-TIME)
  ------------------------------------------------- */
  const agentToken = randomUUID()

  /* -------------------------------------------------
     🧠 CREATE ENDPOINT
  ------------------------------------------------- */
  const { data: endpoint, error } = await supabase
    .from("endpoints")
    .insert({
      org_id: profile.org_id,
      hostname,
      device_type,
      os,
      os_version: os_version ?? null,
      agent_status: "offline",
      agent_token: agentToken,
    })
    .select("id, hostname")
    .single()

  if (error || !endpoint) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create endpoint" },
      { status: 500 }
    )
  }

  /* -------------------------------------------------
     ✅ RESPONSE (USED BY MODAL TOKEN REVEAL)
  ------------------------------------------------- */
  return NextResponse.json({
    endpoint: {
      id: endpoint.id,
      hostname: endpoint.hostname,
    },
    agent_token: agentToken,
    install: {
      powershell: `powershell -ExecutionPolicy Bypass -File xilaire-endpoint-agent.ps1 -Token ${agentToken}`,
    },
  })
}
