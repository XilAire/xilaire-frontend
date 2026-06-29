import {
  AccessContext,
  canAccessPath,
  getDefaultPortalRoute,
  getPortalAccess,
} from "@/lib/portalAccess"

export type AccountRoutingInput = AccessContext

export function getPostLoginRoute(input: AccountRoutingInput): string {
  return getDefaultPortalRoute(input)
}

export function getUnauthorizedFallbackRoute(
  pathname: string,
  input: AccountRoutingInput,
): string {
  const access = getPortalAccess(input)

  if (!access.canAccessDashboard) {
    return "/signin"
  }

  if (canAccessPath(pathname, input)) {
    return pathname
  }

  return getDefaultPortalRoute(input)
}

export function shouldUserAccessPath(
  pathname: string,
  input: AccountRoutingInput,
): boolean {
  return canAccessPath(pathname, input)
}