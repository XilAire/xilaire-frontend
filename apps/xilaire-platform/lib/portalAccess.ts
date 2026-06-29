export type PlatformRole =
  | "user"
  | "client"
  | "dispatcher"
  | "coordinator"
  | "project_manager"
  | "finance"
  | "admin"
  | "super_admin"
  | "master_admin"
  | string
  | null
  | undefined

export type AccountType =
  | "standard"
  | "client"
  | "vendor"
  | "internal"
  | string
  | null
  | undefined

export type PortalKey =
  | "dashboard"
  | "client"
  | "vendor"
  | "infrastructure"
  | "operations"
  | "finance"
  | "admin"
  | "system"

export type AccessContext = {
  role?: PlatformRole
  accountType?: AccountType
  profileStatus?: string | null
  orgId?: string | null

  /*
    Vendor access is currently resolved by org_id because profiles does not
    have a direct vendor_id / infrastructure_vendor_id relationship yet.
  */
  vendorRecordExists?: boolean | null
  vendorIsActive?: boolean | null
  vendorLegacyActive?: boolean | null
  vendorOnboardingStatus?: string | null
  vendorOnboardingCompletedAt?: string | null
}

export type PortalAccessResult = {
  canAccessDashboard: boolean
  canAccessClient: boolean
  canAccessVendor: boolean
  canAccessInfrastructure: boolean
  canAccessOperations: boolean
  canAccessFinance: boolean
  canAccessAdmin: boolean
  canAccessSystem: boolean
  defaultPortal: PortalKey
  allowedPortals: PortalKey[]
  deniedReason?: string
}

const INTERNAL_ELEVATED_ROLES = new Set([
  "dispatcher",
  "coordinator",
  "project_manager",
  "finance",
  "admin",
  "super_admin",
  "master_admin",
])

const INFRASTRUCTURE_INTERNAL_ROLES = new Set([
  "dispatcher",
  "coordinator",
  "project_manager",
  "finance",
  "admin",
  "super_admin",
  "master_admin",
])

const FINANCE_ROLES = new Set([
  "finance",
  "admin",
  "super_admin",
  "master_admin",
])

const ADMIN_ROLES = new Set([
  "admin",
  "super_admin",
  "master_admin",
])

const SYSTEM_ROLES = new Set([
  "super_admin",
  "master_admin",
])

const ACTIVE_PROFILE_STATUSES = new Set([
  "active",
  "enabled",
  "approved",
  "complete",
  "completed",
])

const ACTIVE_VENDOR_ONBOARDING_STATUSES = new Set([
  "approved",
  "active",
  "completed",
  "complete",
  "onboarded",
])

function normalize(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase()
}

function hasOrg(ctx: AccessContext): boolean {
  return Boolean(normalize(ctx.orgId))
}

export function isVendorUser(ctx: AccessContext): boolean {
  return normalize(ctx.accountType) === "vendor"
}

export function isClientUser(ctx: AccessContext): boolean {
  return normalize(ctx.accountType) === "client"
}

export function isInternalUser(ctx: AccessContext): boolean {
  if (isVendorUser(ctx) || isClientUser(ctx)) return false

  const role = normalize(ctx.role)
  return role === "user" || INTERNAL_ELEVATED_ROLES.has(role)
}

export function isInternalElevatedUser(ctx: AccessContext): boolean {
  return INTERNAL_ELEVATED_ROLES.has(normalize(ctx.role))
}

export function isAdminLevelUser(ctx: AccessContext): boolean {
  return ADMIN_ROLES.has(normalize(ctx.role))
}

export function isProfileActive(ctx: AccessContext): boolean {
  return ACTIVE_PROFILE_STATUSES.has(normalize(ctx.profileStatus))
}

export function vendorRecordIsActive(ctx: AccessContext): boolean {
  if (!ctx.vendorRecordExists) return false
  if (ctx.vendorIsActive === true) return true
  if (ctx.vendorLegacyActive === true) return true

  return ACTIVE_VENDOR_ONBOARDING_STATUSES.has(
    normalize(ctx.vendorOnboardingStatus),
  )
}

export function vendorOnboardingCompleted(ctx: AccessContext): boolean {
  if (!ctx.vendorRecordExists) return false
  if (ctx.vendorOnboardingCompletedAt) return true

  return ACTIVE_VENDOR_ONBOARDING_STATUSES.has(
    normalize(ctx.vendorOnboardingStatus),
  )
}

export function canAccessDashboardPortal(ctx: AccessContext): boolean {
  return isProfileActive(ctx) && hasOrg(ctx)
}

export function canAccessClientPortal(ctx: AccessContext): boolean {
  if (!canAccessDashboardPortal(ctx)) return false

  if (isClientUser(ctx)) return true

  return ADMIN_ROLES.has(normalize(ctx.role))
}

export function canAccessVendorPortal(ctx: AccessContext): boolean {
  if (!canAccessDashboardPortal(ctx)) return false

  /*
    Vendor users access Vendor Portal through active vendor resolution.
  */
  if (isVendorUser(ctx)) {
    if (!ctx.vendorRecordExists) return false
    return vendorRecordIsActive(ctx)
  }

  /*
    Admin-level internal users can access Vendor Portal for oversight,
    management, and support workflows.
  */
  if (isAdminLevelUser(ctx)) {
    return true
  }

  return false
}

export function canAccessVendorWorkflow(ctx: AccessContext): boolean {
  /*
    Full vendor workflow is reserved for real vendor accounts only.
    Admins can see Vendor Portal, but do not become vendor-scoped users.
  */
  if (!isVendorUser(ctx)) return false

  return canAccessVendorPortal(ctx) && vendorOnboardingCompleted(ctx)
}

export function canAccessInfrastructurePortal(ctx: AccessContext): boolean {
  if (!canAccessDashboardPortal(ctx)) return false

  const role = normalize(ctx.role)

  /*
    Vendors NEVER access /infrastructure/*
    All vendor work must go through /vendor/*
  */
  if (isVendorUser(ctx)) {
    return false
  }

  /*
    Clients only if admin-level
  */
  if (isClientUser(ctx)) {
    return ADMIN_ROLES.has(role)
  }

  /*
    Internal access only
  */
  return INFRASTRUCTURE_INTERNAL_ROLES.has(role)
}

export function canAccessOperationsPortal(ctx: AccessContext): boolean {
  if (!canAccessDashboardPortal(ctx)) return false
  if (isVendorUser(ctx) || isClientUser(ctx)) return false

  return isInternalElevatedUser(ctx)
}

export function canAccessFinancePortal(ctx: AccessContext): boolean {
  if (!canAccessDashboardPortal(ctx)) return false
  if (isVendorUser(ctx) || isClientUser(ctx)) return false

  return FINANCE_ROLES.has(normalize(ctx.role))
}

export function canAccessAdminPortal(ctx: AccessContext): boolean {
  if (!canAccessDashboardPortal(ctx)) return false

  return ADMIN_ROLES.has(normalize(ctx.role))
}

export function canAccessSystemPortal(ctx: AccessContext): boolean {
  if (!canAccessDashboardPortal(ctx)) return false

  return SYSTEM_ROLES.has(normalize(ctx.role))
}

export function getPortalAccess(ctx: AccessContext): PortalAccessResult {
  const result: PortalAccessResult = {
    canAccessDashboard: canAccessDashboardPortal(ctx),
    canAccessClient: canAccessClientPortal(ctx),
    canAccessVendor: canAccessVendorPortal(ctx),
    canAccessInfrastructure: canAccessInfrastructurePortal(ctx),
    canAccessOperations: canAccessOperationsPortal(ctx),
    canAccessFinance: canAccessFinancePortal(ctx),
    canAccessAdmin: canAccessAdminPortal(ctx),
    canAccessSystem: canAccessSystemPortal(ctx),
    defaultPortal: "dashboard",
    allowedPortals: [],
  }

  if (result.canAccessDashboard) result.allowedPortals.push("dashboard")
  if (result.canAccessClient) result.allowedPortals.push("client")
  if (result.canAccessVendor) result.allowedPortals.push("vendor")
  if (result.canAccessInfrastructure) {
    result.allowedPortals.push("infrastructure")
  }
  if (result.canAccessOperations) result.allowedPortals.push("operations")
  if (result.canAccessFinance) result.allowedPortals.push("finance")
  if (result.canAccessAdmin) result.allowedPortals.push("admin")
  if (result.canAccessSystem) result.allowedPortals.push("system")

  if (!isProfileActive(ctx)) {
    result.deniedReason = "Profile status is not active"
    result.defaultPortal = "dashboard"
    return result
  }

  if (!hasOrg(ctx)) {
    result.deniedReason = "Profile is missing org_id"
    result.defaultPortal = "dashboard"
    return result
  }

  if (isVendorUser(ctx)) {
    result.defaultPortal = result.canAccessVendor ? "vendor" : "dashboard"

    if (!ctx.vendorRecordExists) {
      result.deniedReason =
        "Vendor account org has no infrastructure_vendors row"
    } else if (!vendorRecordIsActive(ctx)) {
      result.deniedReason = "Vendor record is not active or approved"
    }

    return result
  }

  if (isClientUser(ctx)) {
    result.defaultPortal = result.canAccessClient ? "client" : "dashboard"

    if (!result.canAccessClient) {
      result.deniedReason =
        "Client account is not allowed into the client portal"
    }

    return result
  }

  /*
    Internal admin-level users should land on admin first,
    but still be allowed to see Vendor Portal in the sidebar.
  */
  if (result.canAccessOperations) {
    result.defaultPortal = "operations"
    return result
  }

  if (result.canAccessInfrastructure) {
    result.defaultPortal = "infrastructure"
    return result
  }

  if (result.canAccessFinance) {
    result.defaultPortal = "finance"
    return result
  }

  if (result.canAccessAdmin) {
    result.defaultPortal = "admin"
    return result
  }

  if (result.canAccessSystem) {
    result.defaultPortal = "system"
    return result
  }

  result.defaultPortal = "dashboard"
  return result
}

export function canAccessPath(pathname: string, ctx: AccessContext): boolean {
  const path = normalize(pathname)
  const access = getPortalAccess(ctx)

  if (!path || path === "/") return true
  if (path.startsWith("/dashboard")) return access.canAccessDashboard
  if (path.startsWith("/client")) return access.canAccessClient
  if (path.startsWith("/vendor")) return access.canAccessVendor
  if (path.startsWith("/infrastructure")) return access.canAccessInfrastructure
  if (path.startsWith("/operations")) return access.canAccessOperations
  if (path.startsWith("/finance")) return access.canAccessFinance
  if (path.startsWith("/admin")) return access.canAccessAdmin
  if (path.startsWith("/system")) return access.canAccessSystem

  return access.canAccessDashboard
}

export function getDefaultPortalRoute(ctx: AccessContext): string {
  const access = getPortalAccess(ctx)

  switch (access.defaultPortal) {
    case "vendor":
      return "/vendor"
    case "client":
      return "/client"
    case "operations":
      return "/operations"
    case "infrastructure":
      return "/infrastructure"
    case "finance":
      return "/finance"
    case "admin":
      return "/admin"
    case "system":
      return "/system"
    case "dashboard":
    default:
      return "/dashboard"
  }
}