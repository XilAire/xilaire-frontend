import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

type OverageEvent = {
  org_id: string
  contract_id: string
  entitlement_type: string
  quantity: number
  work_item_id: string
}

export async function emitOverageEvent(event: OverageEvent) {
  await supabase.from("entitlement_overages").insert({
    ...event,
    occurred_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  })
}