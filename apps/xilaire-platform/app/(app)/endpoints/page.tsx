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
     🧠 ORG CONTEXT
  ------------------------------------------------- */
  const org_id =
    (user.app_metadata as any)?.org_id ||
    (user.user_metadata as any)?.org_id

  /* -------------------------------------------------
     🔎 ORG ENTITLEMENT STATE (READ-ONLY)
     Middleware already enforced access.
     This is UX-only.
  ------------------------------------------------- */
  let entitlementState: {
    suspended: boolean
    expires_at: string | null
  } | null = null

  if (profile.role !== "master_admin") {
    const { data } = await supabase
      .from("org_entitlements")
      .select("suspended, expires_at")
      .eq("org_id", org_id)
      .single()

    entitlementState = data
  }

  /* -------------------------------------------------
     📥 DATA LOAD — ORGS USER CAN ACCESS
     (ROLE-AWARE, RLS-SAFE)
  ------------------------------------------------- */
  let orgs: any[] = []
  let error: any = null

  if (profile.role === "master_admin") {
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
     🧭 RENDER
  ------------------------------------------------- */
  const isSuspended = entitlementState?.suspended === true
  const isExpired =
    entitlementState?.expires_at &&
    new Date(entitlementState.expires_at) < new Date()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Endpoints</h1>
        <p className="text-sm text-muted-foreground">
          Select an organization to manage endpoints
        </p>
      </header>

      {/* -------------------------------------------------
         ⚠️ ENTITLEMENT STATUS BANNERS
      ------------------------------------------------- */}
      {profile.role !== "master_admin" && isSuspended && (
        <div className="rounded-md border border-yellow-500 bg-yellow-50 p-4 text-sm">
          <strong>Account Suspended</strong>
          <p className="mt-1">
            Endpoint management is temporarily suspended due to a billing issue.
            Please resolve billing to restore access.
          </p>
        </div>
      )}

      {profile.role !== "master_admin" && isExpired && (
        <div className="rounded-md border border-red-500 bg-red-50 p-4 text-sm">
          <strong>Subscription Expired</strong>
          <p className="mt-1">
            Your subscription has expired. Upgrade or renew to regain access.
          </p>
        </div>
      )}

      <OrgSelector orgs={orgs} />
    </div>
  )
}