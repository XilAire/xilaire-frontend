import { createClient } from "@supabase/supabase-js"
import { sendEndpointAlert } from "./sendEndpointAlert"

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM,
  {
    auth: {
      persistSession: false,
    },
  }
)

/**
 * System heartbeat:
 * - Detect offline / stale endpoints
 * - Update agent_status when needed
 * - Write immutable audit logs for every status transition
 * - Send alerts on meaningful state changes
 */
export async function checkOfflineEndpoints() {
  const now = new Date()

  const OFFLINE_MINUTES = 5
  const STALE_MINUTES = 30

  const offlineThreshold = new Date(
    now.getTime() - OFFLINE_MINUTES * 60 * 1000
  )

  const staleThreshold = new Date(
    now.getTime() - STALE_MINUTES * 60 * 1000
  )

  /* -------------------------------------------------
     📥 LOAD ENDPOINTS
  ------------------------------------------------- */
  const { data: endpoints, error } = await supabase
    .from("endpoints")
    .select("id, hostname, agent_status, last_seen_at")

  if (error) {
    throw new Error(`Heartbeat load failed: ${error.message}`)
  }

  /* -------------------------------------------------
     🔁 STATUS EVALUATION LOOP
  ------------------------------------------------- */
  for (const endpoint of endpoints ?? []) {
    let newStatus: "online" | "offline" | "stale" = "online"

    if (!endpoint.last_seen_at) {
      newStatus = "offline"
    } else {
      const lastSeen = new Date(endpoint.last_seen_at)

      if (lastSeen < staleThreshold) {
        newStatus = "stale"
      } else if (lastSeen < offlineThreshold) {
        newStatus = "offline"
      }
    }

    // ✅ NO CHANGE — SKIP
    if (endpoint.agent_status === newStatus) {
      continue
    }

    /* -------------------------------------------------
       1️⃣ UPDATE ENDPOINT STATUS
    ------------------------------------------------- */
    const { error: updateError } = await supabase
      .from("endpoints")
      .update({ agent_status: newStatus })
      .eq("id", endpoint.id)

    if (updateError) {
      console.error(
        `Failed to update endpoint ${endpoint.id}:`,
        updateError
      )
      continue
    }

    /* -------------------------------------------------
       2️⃣ WRITE IMMUTABLE AUDIT LOG
    ------------------------------------------------- */
    const { error: auditError } = await supabase
      .from("endpoint_status_audit_logs")
      .insert({
        endpoint_id: endpoint.id,
        old_status: endpoint.agent_status,
        new_status: newStatus,
        reason: "heartbeat_check",
        actor: "system_heartbeat",
      })

    if (auditError) {
      console.error(
        `Audit log failed for endpoint ${endpoint.id}:`,
        auditError
      )
    }

    /* -------------------------------------------------
       3️⃣ SEND ALERT (ANTI-SPAM SAFE, NON-BLOCKING)
    ------------------------------------------------- */
    try {
      await sendEndpointAlert({
        endpointId: endpoint.id,
        hostname: endpoint.hostname,
        oldStatus: endpoint.agent_status,
        newStatus,
        lastSeenAt: endpoint.last_seen_at,
      })
    } catch (alertError) {
      console.error(
        `Alert failed for endpoint ${endpoint.id}:`,
        alertError
      )
    }
  }

  return {
    status: "ok",
    checked_at: now.toISOString(),
  }
}
