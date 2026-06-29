import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import type { AccessContext } from "@/lib/portalAccess"

type ProfileRow = {
  id: string
  org_id: string | null
  role: string | null
  account_type: string | null
  status: string | null
}

type InfrastructureVendorRow = {
  id: string
  org_id: string | null
  active: boolean | null
  is_active: boolean | null
  onboarding_status: string | null
  onboarding_completed_at: string | null
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM")
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM")
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM")
}

export async function getAccessContext(): Promise<
  AccessContext & { userId?: string | null }
> {
  const cookieStore = await cookies()

  const accessToken =
    cookieStore.get("sb-access-token")?.value ||
    cookieStore.get("supabase-access-token")?.value ||
    null

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  })

  const {
    data: { user },
    error: userError,
  } = await anonClient.auth.getUser()

  if (userError) {
    throw new Error(`Failed to resolve auth user: ${userError.message}`)
  }

  if (!user) {
    return {
      userId: null,
      role: null,
      accountType: null,
      profileStatus: null,
      orgId: null,
      vendorRecordExists: false,
      vendorIsActive: false,
      vendorLegacyActive: false,
      vendorOnboardingStatus: null,
      vendorOnboardingCompletedAt: null,
    }
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, org_id, role, account_type, status")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>()

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`)
  }

  if (!profile) {
    return {
      userId: user.id,
      role: null,
      accountType: null,
      profileStatus: null,
      orgId: null,
      vendorRecordExists: false,
      vendorIsActive: false,
      vendorLegacyActive: false,
      vendorOnboardingStatus: null,
      vendorOnboardingCompletedAt: null,
    }
  }

  let vendor: InfrastructureVendorRow | null = null

  if (profile.org_id) {
    const { data: vendorRow, error: vendorError } = await adminClient
      .from("infrastructure_vendors")
      .select(
        "id, org_id, active, is_active, onboarding_status, onboarding_completed_at",
      )
      .eq("org_id", profile.org_id)
      .limit(1)
      .maybeSingle<InfrastructureVendorRow>()

    if (vendorError) {
      throw new Error(
        `Failed to load infrastructure vendor row: ${vendorError.message}`,
      )
    }

    vendor = vendorRow
  }

  return {
    userId: user.id,
    role: profile.role ?? null,
    accountType: profile.account_type ?? null,
    profileStatus: profile.status ?? null,
    orgId: profile.org_id ?? null,
    vendorRecordExists: Boolean(vendor?.id),
    vendorIsActive: vendor?.is_active ?? false,
    vendorLegacyActive: vendor?.active ?? false,
    vendorOnboardingStatus: vendor?.onboarding_status ?? null,
    vendorOnboardingCompletedAt: vendor?.onboarding_completed_at ?? null,
  }
}