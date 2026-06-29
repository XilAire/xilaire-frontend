import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { getProfile } from "@/lib/getProfile"

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata = {
  title: "Organization | XilAire Technologies",
  description: "Organization overview and endpoint access.",
}

export const dynamic = "force-dynamic"

interface PageProps {
  params: { orgId: string }
}

export default async function OrgOverviewPage({ params }: PageProps) {
  /* -------------------------------------------------
     🔒 AUTH — REQUIRE SESSION
  ------------------------------------------------- */
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/signin")

  /* -------------------------------------------------
     🔐 ROLE AUTH — ADMIN / MASTER
  ------------------------------------------------- */
  const profile = await getProfile()

  if (!profile || !["admin", "master_admin"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const { orgId } = params

  /* -------------------------------------------------
     🏢 VERIFY ORG ACCESS (RLS ENFORCED)
  ------------------------------------------------- */
  const { data: org, error } = await supabase
    .from("orgs")
    .select(`
      id,
      name,
      slug,
      is_platform_org,
      created_at
    `)
    .eq("id", orgId)
    .single()

  if (error || !org) notFound()

  /* -------------------------------------------------
     🖥️ RENDER — ORG OVERVIEW
  ------------------------------------------------- */
  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{org.name}</h1>

        {org.is_platform_org && (
          <p className="text-xs text-muted-foreground">
            Platform Organization
          </p>
        )}
      </header>

      {/* Org Meta */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-2 max-w-xl">
        <div className="text-sm">
          <span className="font-medium">Organization ID:</span>{" "}
          <span className="text-muted-foreground">{org.id}</span>
        </div>

        {org.slug && (
          <div className="text-sm">
            <span className="font-medium">Slug:</span>{" "}
            <span className="text-muted-foreground">{org.slug}</span>
          </div>
        )}

        <div className="text-sm">
          <span className="font-medium">Created:</span>{" "}
          <span className="text-muted-foreground">
            {new Date(org.created_at).toLocaleDateString()}
          </span>
        </div>
      </section>

      {/* CTAs */}
      <section className="flex gap-3">
        <Link
          href={`/endpoints/org/${org.id}/endpoints`}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          View Endpoints
        </Link>

        <Link
          href="/endpoints/org"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition"
        >
          Back to Organizations
        </Link>
      </section>
    </div>
  )
}
