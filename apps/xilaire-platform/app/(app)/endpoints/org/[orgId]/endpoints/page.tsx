import { redirect, notFound } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { getProfile } from "@/lib/getProfile"
import OrgEndpointTable from "@/components/endpoints/OrgEndpointTable"

export const metadata = {
  title: "Endpoints | XilAire Technologies",
  description: "Organization-scoped endpoint management.",
}

export const dynamic = "force-dynamic"

interface PageProps {
  params: { orgId: string }
  searchParams: {
    page?: string
    status?: string
    location?: string
    q?: string
  }
}

const PAGE_SIZE = 25

export default async function OrgEndpointsPage({
  params,
  searchParams,
}: PageProps) {
  const supabase = await createServerSupabaseClient()
  const profile = await getProfile()

  if (!profile) redirect("/auth/signin")
  if (!["admin", "master_admin"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const orgId = params.orgId
  const page = Number(searchParams.page ?? 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  /* -------------------------------------------------
     🏢 VERIFY ORG ACCESS
  ------------------------------------------------- */
  const { data: org } = await supabase
    .from("orgs")
    .select("id, name")
    .eq("id", orgId)
    .single()

  if (!org) notFound()

  /* -------------------------------------------------
     📥 QUERY ENDPOINTS (SERVER PAGINATED)
  ------------------------------------------------- */
  let query = supabase
    .from("endpoints")
    .select(
      `
        id,
        hostname,
        device_type,
        os,
        agent_status,
        last_seen_at,
        location_id
      `,
      { count: "exact" }
    )
    .eq("org_id", orgId)
    .order("hostname")

  if (searchParams.status) {
    query = query.eq("agent_status", searchParams.status)
  }

  if (searchParams.location) {
    query = query.eq("location_id", searchParams.location)
  }

  if (searchParams.q) {
    query = query.ilike("hostname", `%${searchParams.q}%`)
  }

  const { data: endpoints, count, error } = await query.range(from, to)

  if (error) {
    console.error("Failed to load endpoints", error)
    throw new Error("Failed to load endpoints")
  }

  return (
    <OrgEndpointTable
      org={org}
      endpoints={endpoints ?? []}
      page={page}
      pageSize={PAGE_SIZE}
      total={count ?? 0}
      filters={searchParams}
    />
  )
}
