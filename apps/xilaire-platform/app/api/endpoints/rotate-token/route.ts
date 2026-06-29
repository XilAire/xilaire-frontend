// apps/xilaire-platform/app/api/endpoints/rotate-token/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { getProfile } from "@/lib/getProfile"

export async function POST(req: Request) {
  /* -------------------------------------------------
     🔒 AUTH — SESSION + ROLE
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
  const { endpoint_id } = await req.json()
  if (!endpoint_id) {
    return NextResponse.json({ error: "endpoint_id required" }, { status: 400 })
  }

  /* -------------------------------------------------
     🔒 SERVICE ROLE
  ------------------------------------------------- */
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!,
    { auth: { persistSession: false } }
  )

  const newToken = randomUUID()

  /* -------------------------------------------------
     🔁 ROTATE TOKEN
  ------------------------------------------------- */
  const { data: endpoint, error: updateError } = await supabase
    .from("endpoints")
    .update({
      agent_token: newToken,
      agent_status: "offline",
      last_seen_at: null,
    })
    .eq("id", endpoint_id)
    .select("id, hostname")
    .single()

  if (updateError || !endpoint) {
    return NextResponse.json(
      { error: updateError?.message ?? "Endpoint not found" },
      { status: 500 }
    )
  }

  /* -------------------------------------------------
     🧾 AUDIT LOG
  ------------------------------------------------- */
  await supabase.from("endpoint_status_audit_logs").insert({
    endpoint_id,
    old_status: "online",
    new_status: "offline",
    reason: "token_rotated",
    actor: user.email ?? "admin",
  })

  /* -------------------------------------------------
     ✅ RESPONSE
  ------------------------------------------------- */
  return NextResponse.json({
    endpoint_id,
    hostname: endpoint.hostname,
    agent_token: newToken,
  })
}
