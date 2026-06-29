import type { AccessContext } from "@/lib/portalAccess"
import { getPortalAccess } from "@/lib/portalAccess"

export type NavVisibility = {
  showDashboard: boolean
  showClient: boolean
  showVendor: boolean
  showInfrastructure: boolean
  showOperations: boolean
  showFinance: boolean
  showAdmin: boolean
  showSystem: boolean
}

export function getNavigationVisibility(ctx: AccessContext): NavVisibility {
  const access = getPortalAccess(ctx)

  return {
    showDashboard: access.canAccessDashboard,
    showClient: access.canAccessClient,
    showVendor: access.canAccessVendor,
    showInfrastructure: access.canAccessInfrastructure,
    showOperations: access.canAccessOperations,
    showFinance: access.canAccessFinance,
    showAdmin: access.canAccessAdmin,
    showSystem: access.canAccessSystem,
  }
}