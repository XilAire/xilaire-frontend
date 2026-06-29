import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { getProfile } from "@/lib/getProfile"
import OrgSelector from "@/components/endpoints/OrgSelector"

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata = {
  title: "Endpoints | XilAire Technologies",
  description:
    "Manage and monitor endpoints across organizations within the XilAire Technologies platform.",
}

export const dynamic = "force-dynamic"

export default async function EndpointsPage() {
  /* -------------------------------------------------
     🔒 HARD AUTH — REQUIRE SESSION
  ------------------------------------------------- */
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  /* -------------------------------------------------
     🔐 ROLE AUTH — ADMIN OR MASTER ADMIN
  ------------------------------------------------- */
  const profile = await getProfile()

  if (!profile || !["admin", "master_admin"].includes(profile.role)) {
    redirect("/dashboard")
  }

  /* -------------------------------------------------
     📥 DATA LOAD — ORGS USER CAN ACCESS
     (ROLE-AWARE, RLS-SAFE)
  ------------------------------------------------- */
  let orgs: any[] = []
  let error: any = null

  if (profile.role === "master_admin") {
    // 🔓 Platform-wide visibility
    const result = await supabase
      .from("orgs")
      .select(`
        id,
        name,
        slug,
        is_platform_org
      `)
      .order("name")

    orgs = result.data ?? []
    error = result.error
  } else {
    // 🔒 Scoped via org_users
    const result = await supabase
      .from("org_users")
      .select(`
        orgs (
          id,
          name,
          slug,
          is_platform_org
        )
      `)
      .eq("user_id", user.id)

    orgs = result.data?.map(r => r.orgs) ?? []
    error = result.error
  }

  if (error) {
    console.error("Failed to load organizations:", error)
    throw new Error("Failed to load organizations")
  }

  /* -------------------------------------------------
     🧭 RENDER — ORG CONTEXT SELECTOR
     (NO ENDPOINTS SHOWN HERE)
  ------------------------------------------------- */
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Endpoints</h1>
        <p className="text-sm text-muted-foreground">
          Select an organization to manage endpoints
        </p>
      </header>

      <OrgSelector orgs={orgs} />
    </div>
  )
}
