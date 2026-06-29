import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { getProfile } from "@/lib/getProfile"

/* -------------------------------------------------
   🔒 SERVER-ONLY SUPABASE CLIENT (SERVICE ROLE)
------------------------------------------------- */
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM
) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL_PLATFORM or SUPABASE_SERVICE_ROLE_KEY_PLATFORM"
  )
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM,
  {
    auth: { persistSession: false },
  }
)

export type CreateEndpointInput = {
  hostname: string
  device_type: "workstation" | "laptop" | "server"
  os: string
  os_version?: string | null
}

/**
 * Create a new monitored endpoint
 *
 * - Admin / Master Admin only
 * - Generates agent_token (returned once)
 * - Starts endpoint offline
 * - Safe for onboarding UI
 */
export async function createEndpoint(input: CreateEndpointInput) {
  /* -------------------------------------------------
     🔒 AUTH — SESSION + ROLE
  ------------------------------------------------- */
  const supabaseAuth = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const profile = await getProfile()

  if (!profile || !["admin", "master_admin"].includes(profile.role)) {
    throw new Error("Forbidden")
  }

  /* -------------------------------------------------
     🧪 VALIDATION
  ------------------------------------------------- */
  if (!input.hostname || !input.device_type || !input.os) {
    throw new Error("Missing required endpoint fields")
  }

  /* -------------------------------------------------
     🔑 GENERATE TOKEN
  ------------------------------------------------- */
  const agentToken = randomUUID()

  /* -------------------------------------------------
     📥 INSERT ENDPOINT
  ------------------------------------------------- */
  const { data: endpoint, error } = await supabaseAdmin
    .from("endpoints")
    .insert({
      hostname: input.hostname,
      device_type: input.device_type,
      os: input.os,
      os_version: input.os_version ?? null,
      agent_token: agentToken,
      agent_status: "offline",
      last_seen_at: null,
    })
    .select(
      "id, hostname, device_type, os, agent_status"
    )
    .single()

  if (error || !endpoint) {
    throw new Error(error?.message ?? "Failed to create endpoint")
  }

  /* -------------------------------------------------
     🧾 AUDIT LOG
  ------------------------------------------------- */
  await supabaseAdmin.from("endpoint_status_audit_logs").insert({
    endpoint_id: endpoint.id,
    old_status: null,
    new_status: "offline",
    reason: "endpoint_created",
    actor: user.email ?? "admin",
  })

  /* -------------------------------------------------
     ✅ RETURN (TOKEN ONLY ONCE)
  ------------------------------------------------- */
  return {
    endpoint,
    agent_token: agentToken,
  }
}
