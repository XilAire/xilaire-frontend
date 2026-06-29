// lib/vendorPortalAccess.ts

import type { SupabaseClient } from "@supabase/supabase-js"

export type AppRole =
  | "master_admin"
  | "super_admin"
  | "admin"
  | "finance"
  | "dispatcher"
  | "project_manager"
  | "vendor"
  | string
  | null

export type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  role: AppRole
  status: string | null
  org_id: string | null
  account_type: string | null
  company_name: string | null
  trade_services: string[] | string | null
  updated_at: string | null
}

export type VendorRow = {
  id: string
  org_id: string
  company_name: string | null
  license_number: string | null
  license_type: string | null
  insurance_expiration: string | null
  active: boolean | null
  created_at: string | null
  vendor_category: string | null
  service_types: string[] | string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  is_active: boolean | null
  notes: string | null
  trade_services: string[] | string | null
  onboarding_status: string | null
  onboarding_completed_at: string | null
}

export type VendorPortalContext = {
  authUserId: string
  authEmail: string | null

  profile: ProfileRow
  vendor: VendorRow | null

  orgId: string
  role: AppRole

  isAdmin: boolean
  isVendorUser: boolean
  requiresOnboarding: boolean
  onboardingComplete: boolean
}

const ADMIN_ROLES = new Set<string>([
  "master_admin",
  "super_admin",
  "admin",
  "finance",
  "project_manager",
])

function normalizeString(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase()
}

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim().toLowerCase()
  return trimmed.length ? trimmed : null
}

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function isAdminRole(role: AppRole): boolean {
  if (!role) return false
  return ADMIN_ROLES.has(normalizeString(String(role)))
}

function isVendorRole(role: AppRole, accountType: string | null): boolean {
  const normalizedRole = normalizeString(role ? String(role) : "")
  const normalizedAccountType = normalizeString(accountType)

  return normalizedRole === "vendor" || normalizedAccountType === "vendor"
}

function isActiveProfileStatus(status: string | null | undefined): boolean {
  return normalizeString(status) === "active"
}

function isVendorRecordActive(vendor: VendorRow | null): boolean {
  if (!vendor) return false

  if (vendor.is_active === true) return true
  if (vendor.active === true) return true

  return false
}

function isVendorOnboardingComplete(vendor: VendorRow | null): boolean {
  if (!vendor) return false

  const status = normalizeString(vendor.onboarding_status)

  if (status === "complete") return true
  if (vendor.onboarding_completed_at) return true

  return false
}

export function getVendorPortalRedirectPath(
  ctx: VendorPortalContext,
  options?: {
    adminPath?: string
    vendorPath?: string
    onboardingPath?: string
    defaultPath?: string
  }
): string {
  const adminPath = options?.adminPath ?? "/dashboard"
  const vendorPath = options?.vendorPath ?? "/vendor/dashboard"
  const onboardingPath = options?.onboardingPath ?? "/vendor/onboarding"
  const defaultPath = options?.defaultPath ?? "/dashboard"

  if (ctx.isAdmin) return adminPath
  if (ctx.isVendorUser && ctx.requiresOnboarding) return onboardingPath
  if (ctx.isVendorUser) return vendorPath

  return defaultPath
}

export async function resolveVendorPortalContext(params: {
  supabase: SupabaseClient
  authUserId: string
  authEmail?: string | null
  requireVendorForVendorUsers?: boolean
  requireActiveProfile?: boolean
  requireActiveVendor?: boolean
}): Promise<VendorPortalContext> {
  const {
    supabase,
    authUserId,
    authEmail = null,
    requireVendorForVendorUsers = true,
    requireActiveProfile = true,
    requireActiveVendor = true,
  } = params

  if (!authUserId) {
    throw new Error("Missing authenticated user id.")
  }

  const normalizedAuthEmail = normalizeEmail(authEmail)

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
        id,
        email,
        full_name,
        role,
        status,
        org_id,
        account_type,
        company_name,
        trade_services,
        updated_at
      `
    )
    .eq("id", authUserId)
    .maybeSingle()

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`)
  }

  if (!profile) {
    throw new Error("No profile record found for the authenticated user.")
  }

  if (requireActiveProfile && !isActiveProfileStatus(profile.status)) {
    throw new Error("Authenticated profile is not active.")
  }

  if (!profile.org_id) {
    throw new Error("Authenticated profile is missing org_id.")
  }

  const role = profile.role
  const orgId = profile.org_id
  const normalizedProfileEmail = normalizeEmail(profile.email)
  const emailForVendorLookup = normalizedAuthEmail ?? normalizedProfileEmail

  const admin = isAdminRole(role)
  const vendorUser = isVendorRole(role, profile.account_type)

  let vendor: VendorRow | null = null

  if (!admin && vendorUser) {
    if (!emailForVendorLookup) {
      throw new Error(
        "Vendor user is missing an email address required for vendor resolution."
      )
    }

    const { data: vendorRows, error: vendorError } = await supabase
      .from("infrastructure_vendors")
      .select(
        `
          id,
          org_id,
          company_name,
          license_number,
          license_type,
          insurance_expiration,
          active,
          created_at,
          vendor_category,
          service_types,
          contact_name,
          phone,
          email,
          website,
          is_active,
          notes,
          trade_services,
          onboarding_status,
          onboarding_completed_at
        `
      )
      .eq("org_id", orgId)
      .ilike("email", emailForVendorLookup)
      .limit(2)

    if (vendorError) {
      throw new Error(`Failed to load vendor record: ${vendorError.message}`)
    }

    if ((vendorRows?.length ?? 0) > 1) {
      throw new Error(
        `Multiple infrastructure_vendors rows found for vendor user ${emailForVendorLookup} in org ${orgId}.`
      )
    }

    vendor = vendorRows?.[0] ?? null

    if (!vendor && requireVendorForVendorUsers) {
      throw new Error(
        `No infrastructure_vendors row found for vendor user ${emailForVendorLookup} in org ${orgId}.`
      )
    }

    if (vendor && requireActiveVendor && !isVendorRecordActive(vendor)) {
      throw new Error(
        `Vendor record ${vendor.id} is inactive for vendor user ${emailForVendorLookup}.`
      )
    }
  }

  const onboardingComplete = isVendorOnboardingComplete(vendor)
  const requiresOnboarding = vendorUser && !admin && !onboardingComplete

  return {
    authUserId,
    authEmail: emailForVendorLookup,
    profile: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      status: profile.status,
      org_id: profile.org_id,
      account_type: profile.account_type,
      company_name: profile.company_name,
      trade_services: profile.trade_services,
      updated_at: profile.updated_at,
    },
    vendor,
    orgId,
    role,
    isAdmin: admin,
    isVendorUser: vendorUser,
    requiresOnboarding,
    onboardingComplete,
  }
}

export function assertVendorAccessibleVendorId(
  ctx: VendorPortalContext,
  requestedVendorId: string | null | undefined
): void {
  if (!requestedVendorId) {
    throw new Error("Missing vendor id.")
  }

  if (ctx.isAdmin) return

  if (!ctx.vendor) {
    throw new Error("Vendor context not resolved for this user.")
  }

  if (ctx.vendor.id !== requestedVendorId) {
    throw new Error("Access denied for the requested vendor record.")
  }
}

export function assertVendorOnboarded(ctx: VendorPortalContext): void {
  if (ctx.isAdmin) return

  if (ctx.isVendorUser && ctx.requiresOnboarding) {
    throw new Error("Vendor onboarding is incomplete.")
  }
}

export function toStringArray(value: unknown): string[] {
  return normalizeArray(value)
}