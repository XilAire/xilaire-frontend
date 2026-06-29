import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabaseServer"
import Link from "next/link"

export const metadata = {
  title: "Upgrade Required | XilAire Technologies",
}

export default async function BillingUpgradePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-12">
      <h1 className="text-2xl font-semibold">
        Upgrade Required
      </h1>

      <p className="text-sm text-muted-foreground">
        Your current plan does not include access to this feature.
      </p>

      <div className="flex gap-3">
        <Link
          href="/billing"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          View Plans
        </Link>

        <Link
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}