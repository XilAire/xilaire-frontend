import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

export async function POST(req: Request) {
  const { org_id, reason, effective_at } = await req.json()

  if (!org_id || !reason) {
    return new Response("Missing parameters", { status: 400 })
  }

  const now = new Date().toISOString()

  switch (reason) {
    /* ---------------------------------------------
       HARD REVOKE (SUBSCRIPTION DELETED)
    --------------------------------------------- */
    case "subscription_deleted": {
      await supabase
        .from("org_entitlements")
        .update({
          active: false,
          revoked_at: effective_at ?? now,
          suspended: false,
        })
        .eq("org_id", org_id)
        .eq("active", true)

      break
    }

    /* ---------------------------------------------
       EXPIRE AT PERIOD END
    --------------------------------------------- */
    case "subscription_cancelled": {
      await supabase
        .from("org_entitlements")
        .update({
          expires_at: effective_at,
        })
        .eq("org_id", org_id)
        .eq("active", true)

      break
    }

    /* ---------------------------------------------
       TEMPORARY SUSPENSION
    --------------------------------------------- */
    case "invoice_overdue": {
      await supabase
        .from("org_entitlements")
        .update({
          suspended: true,
          updated_at: now,
        })
        .eq("org_id", org_id)
        .eq("active", true)

      break
    }

    /* ---------------------------------------------
       UNSUSPEND (PAYMENT RECOVERED)
    --------------------------------------------- */
    case "invoice_paid": {
      await supabase
        .from("org_entitlements")
        .update({
          suspended: false,
          updated_at: now,
        })
        .eq("org_id", org_id)

      break
    }

    default:
      return new Response("Invalid reason", { status: 400 })
  }

  return new Response("Entitlements updated", { status: 200 })
}