import { createClient } from "@supabase/supabase-js"

/* =================================================
   SUPABASE CLIENT
================================================= */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!,
  { auth: { persistSession: false } }
)

/* =================================================
   PROJECT EVENT LOGGER
================================================= */

type LogParams = {
  project_id: string
  org_id: string
  action: string
  message: string
  user_email?: string | null
}

export async function logProjectEvent({
  project_id,
  org_id,
  action,
  message,
  user_email,
}: LogParams) {

  try {

    const { error } = await supabase
      .from("infrastructure_project_logs")
      .insert({
        project_id,
        org_id,
        action,
        message,
        user_email,
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error("PROJECT_LOG_INSERT_ERROR:", error)
    }

  } catch (err) {

    console.error("PROJECT_LOG_ENGINE_ERROR:", err)

  }

}